import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store} from '../src/store.js';
import {StatusInbox} from '../src/status-inbox.js';
import {operationsReport,casePacket,normalizeStatusReport,compareOrganizations} from '../src/operations.js';
import {buildServer} from '../src/server.js';
function setup(t){const dir=mkdtempSync(join(tmpdir(),'cp-ops-'));const store=new Store(dir);store.seed();t.after(()=>{store.close();rmSync(dir,{recursive:true,force:true});});return {dir,store};}
const report=(store,statusCode='ACCC',amountMinor=620000)=>({messageId:'message-test-0001',caseId:'CP-001',quoteId:store.get('CP-001').quote.quoteId,statusCode,currency:'INR',amountMinor,source:'SYNTHETIC_RECEIVER',synthetic:true});
test('status semantics hold pending and unposted reports and reject mismatched references',t=>{
  const {store}=setup(t),state=store.get('CP-001');
  for(const code of ['PDNG','ACWP'])assert.equal(normalizeStatusReport(report(store,code,0),state).disposition,'HOLD');
  assert.equal(normalizeStatusReport(report(store,'ACCC',630000),state).disposition,'HOLD');
  assert.equal(normalizeStatusReport(report(store,'BLCK',0),state).nextStatus,'MANUAL_REVIEW');
  assert.throws(()=>normalizeStatusReport({...report(store),quoteId:'other'},state),e=>e.code==='REFERENCE_MISMATCH');
  assert.throws(()=>normalizeStatusReport({...report(store),synthetic:false},state),e=>e.code==='SYNTHETIC_ONLY');
  assert.throws(()=>normalizeStatusReport(report(store,'RJCT',100),state),e=>e.code==='INVALID_REPORT');
});
test('status inbox records once, binds contents and replays exact request after restart',async t=>{
  const {store,dir}=setup(t);let inbox=new StatusInbox(dir);const input=report(store);
  await assert.rejects(()=>inbox.apply(store,'SENDER',input),e=>e.code==='ROLE_DENIED');
  const first=await inbox.apply(store,'RECEIVER',input);assert.equal(first.state.status,'CREDITED');
  const count=store.export().events.length;inbox=new StatusInbox(dir);
  assert.equal((await inbox.apply(store,'RECEIVER',input)).inboxReplay,true);assert.equal(store.export().events.length,count);
  await assert.rejects(()=>inbox.apply(store,'RECEIVER',{...input,amountMinor:610000}),e=>e.code==='REPORT_CONFLICT');
  assert.equal(store.export().events.at(-1).payload.statusReportDigest,inbox.list()[0].digest);
  assert.equal(store.verify(store.export()).valid,true);
});
test('held and conflicting reports never mutate payment state',async t=>{
  const {store,dir}=setup(t),inbox=new StatusInbox(dir);
  assert.equal((await inbox.apply(store,'RECEIVER',report(store,'PDNG',0))).held,true);
  assert.equal(store.get('CP-001').version,0);
  await inbox.apply(store,'RECEIVER',{...report(store),messageId:'message-credit-0002'});
  assert.equal((await inbox.apply(store,'RECEIVER',{...report(store,'RJCT',0),messageId:'message-conflict-0003'})).held,true);
  assert.equal(store.get('CP-001').payout,'CREDITED');assert.equal(inbox.list().length,3);
});
test('concurrent reuse cannot overwrite the inbox identity or submit twice',async t=>{
  const {store,dir}=setup(t),inbox=new StatusInbox(dir),command=store.command.bind(store);let calls=0;
  store.command=async(...args)=>{calls++;await new Promise(r=>setTimeout(r,20));return command(...args);};
  const input=report(store);
  const first=inbox.apply(store,'RECEIVER',input);
  const changed=inbox.apply(store,'RECEIVER',{...input,amountMinor:610000});
  const same=inbox.apply(store,'RECEIVER',input);
  const results=await Promise.allSettled([first,changed,same]);
  assert.equal(results[0].value.ok,true);assert.equal(results[1].reason.code,'REPORT_CONFLICT');assert.equal(results[2].value.pending,true);
  assert.equal(calls,1);assert.equal(inbox.list()[0].report.amountMinor,620000);assert.equal(inbox.list()[0].status,'RECORDED');
});
test('operations identify missing approval, uncertain commits and denial-resistant ageing',t=>{
  const {store}=setup(t);store.command('CP-002','RECEIVER',{requestId:'ops-credit-0001',expectedVersion:0,action:'OBSERVE_CREDIT',payload:{amountMinor:608000}});
  store.command('CP-002','SENDER',{requestId:'ops-approve-0001',expectedVersion:1,action:'APPROVE_CORRECTION'});
  const bundle=store.export();for(const e of bundle.events)e.timestamp='2026-09-30T10:00:00.000Z';
  const ops=operationsReport(bundle,[{caseId:'CP-001',role:'SENDER'}],{now:Date.parse('2026-09-30T10:20:00Z')});
  assert.deepEqual(ops.cases.find(c=>c.caseId==='CP-002').owners,['RECEIVER']);
  assert.equal(ops.cases.find(c=>c.caseId==='CP-002').shortfallMinor,12000);
  assert.equal(ops.cases.find(c=>c.caseId==='CP-001').lane,'UNCERTAIN_COMMIT');
  assert.equal(ops.totals.escalationDue,3);
  const conflictReport={report:{caseId:'CP-002'},status:'HELD',code:'CONFLICTING_EVIDENCE'};
  assert.equal(operationsReport(bundle,[],{reports:[conflictReport]}).cases.find(c=>c.caseId==='CP-002').lane,'EVIDENCE_CONFLICT');
  bundle.events.push({caseId:'CP-002',type:'COMMAND_REJECTED',timestamp:'2026-09-30T10:19:00Z',payload:{code:'DUPLICATE_VOTE'}});
  assert.equal(operationsReport(bundle,[],{now:Date.parse('2026-09-30T10:20:00Z')}).cases.find(c=>c.caseId==='CP-002').idleMinutes,20);
});
test('case dossier retains full verification context and consistency detects mismatch',async t=>{
  const {store}=setup(t),bundle=store.export(),packet=casePacket(bundle,'CP-001');
  assert.equal(packet.events.length,1);assert.equal(packet.fullWorkspace.events.length,3);assert.equal(packet.packetDigest.length,64);
  const live={workspace:async(role,fresh)=>{assert.equal(fresh,true);return role==='SENDER'?bundle:{...bundle,cases:[]};}};
  assert.equal((await compareOrganizations(live)).matched,false);assert.equal((await compareOrganizations(store)).supported,false);
});
test('HTTP operations and receiver report workflow use the active backend',async t=>{
  const {store}=setup(t),server=buildServer(store);await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
  const base=`http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(base+'/api/operations').then(r=>r.json())).totals.open,3);
  const options={method:'POST',headers:{'Content-Type':'application/json','X-Operator-Role':'RECEIVER'},body:JSON.stringify(report(store))};
  assert.equal((await fetch(base+'/api/status-reports/preview',options).then(r=>r.json())).disposition,'READY');
  assert.equal((await fetch(base+'/api/status-reports/apply',options).then(r=>r.json())).ok,true);
  const packet=await fetch(base+'/api/cases/CP-001/packet').then(r=>r.json());assert.equal(packet.state.status,'CREDITED');
});
