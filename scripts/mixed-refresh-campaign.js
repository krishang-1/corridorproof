import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {performance} from 'node:perf_hooks';
import {Store} from '../src/store.js';
import {StatusInbox} from '../src/status-inbox.js';
import {buildServer} from '../src/server.js';

const directory=mkdtempSync(join(tmpdir(),'cp-mixed-refresh-'));let store,server;
const samples=[];let result;
try{
  store=new Store(directory);const inbox=new StatusInbox(directory);
  const workflows=[[],[['RECEIVER','OBSERVE_BLOCK']], [['RECEIVER','OBSERVE_CREDIT',{amountMinor:608000}]],
    [['RECEIVER','OBSERVE_REJECTION'],['SENDER','APPROVE_REFUND'],['RECEIVER','APPROVE_REFUND'],['SENDER','EXECUTE_REFUND'],['SENDER','ACK_CLOSE'],['RECEIVER','ACK_CLOSE']],
    [['RECEIVER','OBSERVE_CREDIT',{amountMinor:620000}],['SENDER','ACK_CLOSE'],['RECEIVER','ACK_CLOSE']], [['RECEIVER','OBSERVE_REJECTION']]];
  for(let index=0;index<120;index++){
    const id=`MIXED-${index}`;store.create('SENDER',{id,scenario:'timeout'});
    for(const [step,[role,action,payload]] of workflows[index%6].entries())assert.equal(store.command(id,role,{requestId:`mixed-command-${index}-${step}`,expectedVersion:store.get(id).version,action,payload}).ok,true);
    assert.equal((await inbox.apply(store,'RECEIVER',{messageId:`mixed-pending-${index}`,caseId:id,quoteId:`Q-${id}`,statusCode:'PDNG',currency:'INR',amountMinor:0,source:'SYNTHETIC_RECEIVER',synthetic:true})).held,true);
  }
  const before=store.export();server=buildServer(store);await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base=`http://127.0.0.1:${server.address().port}`;
  // Two overlapping six-endpoint refreshes, repeated six times with role and
  // selected-case variation. This reproduces API fan-out, not DOM rendering.
  for(let round=0;round<6;round++)await Promise.all(['SENDER','RECEIVER'].map(async role=>{
    const id=`MIXED-${round*19}`,paths=['/api/health','/api/cases','/api/evidence','/api/pending','/api/operations','/api/status-reports'];
    const values=await Promise.all(paths.map(async path=>{const started=performance.now();const response=await fetch(base+path,{headers:{'X-Operator-Role':role},signal:AbortSignal.timeout(10000)});assert.equal(response.status,200);const body=await response.json();samples.push(performance.now()-started);return body;}));
    const [health,cases,evidence,pending,operations,reports]=values;
    assert.equal(health.drunixLive,false);assert.equal(cases.length,120);assert.equal(evidence.events.length,before.events.length);assert.deepEqual(cases,before.cases);assert.equal(pending.length,0);
    assert.equal(operations.totals.open,80);assert.equal(operations.totals.closed,40);assert.equal(reports.length,120);
    const response=await fetch(base+`/api/cases/${id}/packet`,{headers:{'X-Operator-Role':role},signal:AbortSignal.timeout(10000)});assert.equal(response.status,200);const packet=await response.json();assert.equal(packet.caseId,id);assert.deepEqual(packet.state,store.get(id));assert.equal(packet.fullWorkspace.events.length,before.events.length);
  }));
  const after=store.export();assert.equal(after.head,before.head);assert.deepEqual(after.cases,before.cases);assert.equal(store.verify(after).valid,true);
  samples.sort((a,b)=>a-b);const percentile=p=>Math.round(samples[Math.ceil(samples.length*p)-1]*100)/100;
  result={schema:'corridorproof-mixed-refresh-campaign-v1',passed:true,recordedAt:new Date().toISOString(),mode:'ISOLATED_LOCAL_SIMULATION',cases:120,closed:40,open:80,heldInboxReports:120,journalEvents:before.events.length,refreshes:12,refreshRequests:72,dossierRequests:12,maxRefreshConcurrency:12,p50Ms:percentile(.5),p95Ms:percentile(.95),maximumMs:percentile(1),timeoutMs:10000,
    caveat:'API fan-out and current selected-case dossiers only. Browser control timed out, so visual rendering, viewport layout and browser interaction latency were not measured. Local timings include client parsing and machine contention; they are not live Drunix throughput or production capacity.'};
}finally{if(server)await new Promise(r=>server.close(r));store?.close();assert(directory.startsWith(join(tmpdir(),'cp-mixed-refresh-')));rmSync(directory,{recursive:true,force:true});}
if(process.env.CP_MIXED_OUTPUT)writeFileSync(process.env.CP_MIXED_OUTPUT,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
