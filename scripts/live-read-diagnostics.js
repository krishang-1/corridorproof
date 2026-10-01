import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
const base=process.env.CP_URL||'http://127.0.0.1:8787',samples=[];
const health=await fetch(base+'/api/health').then(r=>r.json());assert.equal(health.drunixLive,true);
for(let index=0;index<4;index++){
  const started=performance.now();
  try{
    const response=await fetch(base+'/api/consistency',{signal:AbortSignal.timeout(30000)}),body=await response.json();
    // Retain only diagnostic classifications and public snapshot digests/counts;
    // omit raw gateway messages and private runtime paths from publishable data.
    samples.push({index,httpStatus:response.status,elapsedMs:Math.round((performance.now()-started)*100)/100,matched:body.matched??null,errorCode:body.error??null,senderRecords:body.senderRecords??null,receiverRecords:body.receiverRecords??null,senderDigest:body.senderDigest??null,receiverDigest:body.receiverDigest??null});
  }catch(error){samples.push({index,httpStatus:null,elapsedMs:Math.round((performance.now()-started)*100)/100,matched:null,errorCode:error.name});}
}
const result={schema:'corridorproof-live-read-diagnostics-v1',passed:samples.every(s=>s.httpStatus===200&&s.matched===true),checkedAt:new Date().toISOString(),mode:health.ledger,paymentRails:'SIMULATED',requests:4,retries:0,samples,
  caveat:'Four sequential read-only comparisons on the existing laptop network. No writes or restarts. Failure classification is retained before judging success. Passing samples do not explain the earlier transient failure or establish continuous availability, independent institutions or production throughput.'};
if(process.env.CP_READ_OUTPUT)writeFileSync(process.env.CP_READ_OUTPUT,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));if(!result.passed)process.exitCode=1;
