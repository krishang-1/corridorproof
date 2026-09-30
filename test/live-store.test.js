import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,rmSync,readFileSync } from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {LiveStore} from '../src/live-store.js';
import {Store} from '../src/store.js';
import {createCase} from '../src/policy.js';
const quotes=JSON.parse(readFileSync(new URL('./quote-validation.json',import.meta.url)));
test('custom quotes validate consistently and remain immutable through correction',t=>{
  for(const f of quotes){if(f.valid)assert.deepEqual(createCase('CP-CUSTOM','shortfall',f.quote).quote,f.quote);else assert.throws(()=>createCase('CP-CUSTOM','timeout',f.quote),e=>e.code==='INVALID_QUOTE',f.name);}
  const dir=mkdtempSync(join(tmpdir(),'cp-quote-'));const store=new Store(dir);t.after(()=>{store.close();rmSync(dir,{recursive:true,force:true});});
  const quote=quotes[0].quote;assert.throws(()=>store.create('RECEIVER',{id:'CP-CUSTOM',scenario:'shortfall',quote}),e=>e.code==='ROLE_DENIED');
  store.create('SENDER',{id:'CP-CUSTOM',scenario:'shortfall',quote});
  assert.throws(()=>store.create('SENDER',{id:'CP-CUSTOM',scenario:'shortfall',quote}),e=>e.code==='CASE_EXISTS');
  let n=0;for(const [role,action,payload] of [['RECEIVER','OBSERVE_CREDIT',{amountMinor:1500000}],['SENDER','APPROVE_CORRECTION',{}],['RECEIVER','APPROVE_CORRECTION',{}],['RECEIVER','EXECUTE_CORRECTION',{}]]){
    assert.equal(store.command('CP-CUSTOM',role,{requestId:`custom-request-${++n}`,expectedVersion:store.get('CP-CUSTOM').version,action,payload}).ok,true);
  }
  assert.deepEqual(store.get('CP-CUSTOM').quote,quote);assert.equal(store.export().events.at(-1).payload.railEvidence.amountMinor,50000);assert.equal(store.verify(store.export()).valid,true);
});
test('live uncertainty survives restart and exact reconciliation retains identity',async t=>{
  const dir=mkdtempSync(join(tmpdir(),'cp-live-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));let calls=[];
  let store=new LiveStore(dir,async req=>{calls.push(req);throw new Error('Connection lost after submit');});
  const input={requestId:'uncertain-request-001',expectedVersion:0,action:'OBSERVE_TIMEOUT',payload:{}};
  const result=await store.command('CP-U','SENDER',input);assert.equal(result.pending,true);assert.equal(store.pending().length,1);
  store=new LiveStore(dir,async req=>{calls.push(req);return {ok:true,result:{ok:true,state:{id:'CP-U',version:1,status:'RECONCILING'}},receipt:{successful:true,validationCode:'VALID',transactionId:'abc',blockNumber:12}};});
  await assert.rejects(()=>store.command('CP-U','SENDER',{...input,action:'EXECUTE_REFUND'}),e=>e.code==='IDEMPOTENCY_CONFLICT');
  const recovered=await store.reconcile('SENDER:uncertain-request-001');assert.equal(recovered.ok,true);assert.deepEqual(calls[0],calls[1]);assert.equal(store.pending().length,0);
  assert.equal((await store.command('CP-U','SENDER',input)).replay,true);assert.equal(calls.length,2);
});
test('live comparison rejects altered and incomplete evidence without pretending offline proof',async t=>{
  const dir=mkdtempSync(join(tmpdir(),'cp-live-evidence-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
  const state=createCase('CP-V'),event={caseId:'CP-V',role:'SENDER',type:'QUOTE_ACCEPTED',seconds:1790755200,nanos:1,actorId:'demo',transactionId:'tx-demo',payload:state};
  const store=new LiveStore(dir,async()=>({ok:true,result:{cases:[state],events:[event]}}));
  const bundle=await store.export();assert.equal((await store.verify(bundle)).valid,true);
  const copy=structuredClone(bundle);copy.events[0].payload.quote.recipientMinor++;const check=await store.verify(copy);assert.equal(check.valid,false);assert.equal(check.method,'LIVE_LEDGER_COMPARISON');
  const truncated=structuredClone(bundle);truncated.events=[];assert.equal((await store.verify(truncated)).valid,false);
});
test('known invalid commit permits a fresh decision but an uncertain one blocks replacement',async t=>{
  const dir=mkdtempSync(join(tmpdir(),'cp-live-invalid-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));let calls=0;
  const store=new LiveStore(dir,async()=>{calls++;return {ok:false,receipt:{successful:false,validationCode:'MVCC_READ_CONFLICT',transactionId:'conflict-tx',blockNumber:13},error:'Conflict'};});
  const input={requestId:'conflict-request-001',expectedVersion:0,action:'OBSERVE_TIMEOUT',payload:{}};
  const invalid=await store.command('CP-I','SENDER',input);assert.equal(invalid.code,'INVALID_COMMIT');assert.equal(store.pending().length,0);
  await store.command('CP-I','SENDER',input);assert.equal(calls,1);
  store.run=async()=>{calls++;throw new Error('Disconnected');};
  assert.equal((await store.command('CP-I','SENDER',{...input,requestId:'uncertain-request-002'})).pending,true);
  const replacement=await store.command('CP-I','SENDER',{...input,requestId:'replacement-request-003'});
  assert.equal(replacement.code,'UNRESOLVED_SUBMISSION');assert.equal(calls,2);
});
