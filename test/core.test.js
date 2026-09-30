import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request } from 'node:http';
import { createCase, transition } from '../src/policy.js';
import { Store } from '../src/store.js';
import { buildServer } from '../src/server.js';
import { verifyExport } from '../src/integrity.js';
const fixtures=JSON.parse(readFileSync(new URL('./conformance.json',import.meta.url)));
for(const fixture of fixtures)test(fixture.name,()=>{
  let state=createCase('TEST');const quote=structuredClone(state.quote);
  for(const step of fixture.steps){if(step.error)assert.throws(()=>transition(state,step.role,step.action,step.payload),e=>e.code===step.error);
    else {const before=state.version;state=transition(state,step.role,step.action,step.payload);assert.equal(state.status,step.status);assert.equal(state.version,before+1);assert.deepEqual(state.quote,quote);}}
});
function setup(t){const dir=mkdtempSync(join(tmpdir(),'corridorproof-test-'));const store=new Store(dir);store.seed();const resource={store,dir};t.after(()=>{try{resource.store.close()}catch{}rmSync(dir,{recursive:true,force:true})});return resource;}
test('idempotency replay, conflicting key, stale version and rejection persistence',t=>{
  const {store}=setup(t), input={requestId:'request-0001',expectedVersion:0,action:'OBSERVE_TIMEOUT'};
  const first=store.command('CP-001','SENDER',input),count=store.export().events.length;
  assert.equal(first.state.status,'RECONCILING');assert.equal(store.command('CP-001','SENDER',input).replay,true);assert.equal(store.export().events.length,count);
  assert.throws(()=>store.command('CP-002','SENDER',input),e=>e.code==='IDEMPOTENCY_CONFLICT');
  const stale=store.command('CP-001','SENDER',{...input,requestId:'request-0002'});assert.equal(stale.code,'STALE_VERSION');assert.equal(stale.state.version,1);
  const unsafe=store.command('CP-001','SENDER',{requestId:'request-0003',expectedVersion:1,action:'APPROVE_REFUND'});assert.equal(unsafe.code,'UNKNOWN_OR_UNSAFE');assert.equal(store.get('CP-001').status,'RECONCILING');assert.equal(store.export().events.at(-1).type,'COMMAND_REJECTED');
});
test('persistent restart and tamper detection against trusted keys',t=>{
  const resource=setup(t);let {store,dir}=resource;store.command('CP-001','SENDER',{requestId:'persist-0001',expectedVersion:0,action:'OBSERVE_TIMEOUT'});
  const export1=store.export();assert.equal(store.verify(export1).valid,true);store.close();store=new Store(dir);resource.store=store;
  assert.equal(store.get('CP-001').status,'RECONCILING');assert.deepEqual(store.publicKeys,export1.publicKeys);
  const copy=structuredClone(export1);copy.events[0].payload.quote.recipientMinor++;assert.equal(store.verify(copy).valid,false);
  const alteredState=structuredClone(export1);alteredState.cases[0].observedMinor=620000;assert.equal(store.verify(alteredState).valid,false);
  const missing=structuredClone(export1);missing.events.splice(1,1);assert.equal(store.verify(missing).valid,false);
  const truncated=structuredClone(export1);truncated.events.pop();assert.equal(store.verify(truncated).valid,false);
  assert.equal(verifyExport(export1,store.publicKeys).valid,true);
});
test('HTTP contract discloses mode, denies cross-origin mutation and invalid role',async t=>{
  const {store}=setup(t),server=buildServer(store);await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
  const base=`http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(base+'/api/health').then(r=>r.json())).drunixLive,false);
  const input={requestId:'http-test-0001',expectedVersion:0,action:'OBSERVE_TIMEOUT'};
  const forbidden=await fetch(base+'/api/cases/CP-001/commands',{method:'POST',headers:{'Content-Type':'application/json','X-Demo-Role':'SENDER',Origin:'https://evil.example'},body:JSON.stringify(input)});assert.equal(forbidden.status,403);
  const wrongHost=await new Promise((resolve,reject)=>{const req=request(base+'/api/health',{headers:{Host:'evil.example:8787'}},res=>{res.resume();resolve(res.statusCode)});req.on('error',reject);req.end()});assert.equal(wrongHost,403);
  const invalid=await fetch(base+'/api/cases/CP-001/commands',{method:'POST',headers:{'Content-Type':'application/json','X-Demo-Role':'ADMIN'},body:JSON.stringify(input)});assert.equal(invalid.status,400);
  const response=await fetch(base+'/api/cases/CP-001/commands',{method:'POST',headers:{'Content-Type':'application/json','X-Demo-Role':'SENDER'},body:JSON.stringify(input)});assert.equal(response.status,200);assert.equal((await response.json()).state.status,'RECONCILING');
});
test('mock correction and refund evidence record exact integer amounts',t=>{
  const {store}=setup(t);let n=0;
  const command=(id,role,action,payload={})=>store.command(id,role,{requestId:`amount-test-${++n}`,expectedVersion:store.get(id).version,action,payload});
  command('CP-002','RECEIVER','OBSERVE_CREDIT',{amountMinor:608000});command('CP-002','SENDER','APPROVE_CORRECTION');command('CP-002','RECEIVER','APPROVE_CORRECTION');
  const correction=command('CP-002','RECEIVER','EXECUTE_CORRECTION');assert.equal(correction.event.payload.railEvidence.amountMinor,12000);assert.equal(correction.event.payload.railEvidence.synthetic,true);
  command('CP-003','RECEIVER','OBSERVE_REJECTION');command('CP-003','SENDER','APPROVE_REFUND');command('CP-003','RECEIVER','APPROVE_REFUND');
  const refund=command('CP-003','SENDER','EXECUTE_REFUND');assert.equal(refund.event.payload.railEvidence.amountMinor,10000);assert.equal(refund.event.payload.railEvidence.currency,'SGD');assert.equal(store.verify(store.export()).valid,true);
});
