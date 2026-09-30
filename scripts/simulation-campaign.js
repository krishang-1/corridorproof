import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createCase,transition,ACTIONS,PolicyError} from '../src/policy.js';
import {Store} from '../src/store.js';
import {buildServer} from '../src/server.js';

const integer=(name,defaultValue,min,max)=>{const v=Number(process.env[name]??defaultValue);assert(Number.isSafeInteger(v)&&v>=min&&v<=max,`${name} must be ${min}..${max}`);return v;};
const seeds=integer('CP_SIM_SEEDS',512,1,4096),steps=integer('CP_SIM_STEPS',80,10,500),firstSeed=integer('CP_SIM_FIRST_SEED',1,1,1000000);
const loadCases=integer('CP_SIM_CASES',160,3,500),httpRequests=integer('CP_SIM_HTTP_REQUESTS',480,1,2000),concurrency=integer('CP_SIM_CONCURRENCY',8,1,16);
function random(seed){let x=seed>>>0;return ()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296;};}
const choose=(rand,list)=>list[Math.floor(rand()*list.length)];
function normalCommands(s,rand){
  const credit={amountMinor:rand()<0.5?s.quote.recipientMinor:Math.max(1,Math.floor(s.quote.recipientMinor*(0.25+rand()*0.7)))};
  if(['PAYOUT_PENDING','RECONCILING'].includes(s.status))return [['RECEIVER','OBSERVE_CREDIT',credit],['RECEIVER','OBSERVE_REJECTION',{}],['RECEIVER','OBSERVE_BLOCK',{}],...(s.status==='PAYOUT_PENDING'?[['SENDER','OBSERVE_TIMEOUT',{}]]:[])];
  if(s.status==='SHORTFALL'||s.status==='REFUND_REVIEW')return ['SENDER','RECEIVER'].filter(r=>!s.votes.includes(r)).map(r=>[r,s.status==='SHORTFALL'?'APPROVE_CORRECTION':'APPROVE_REFUND',{}]);
  if(s.status==='CORRECTION_APPROVED')return [['RECEIVER','EXECUTE_CORRECTION',{}]];
  if(s.status==='REFUND_APPROVED')return [['SENDER','EXECUTE_REFUND',{}]];
  if(['CREDITED','REFUNDED'].includes(s.status))return ['SENDER','RECEIVER'].filter(r=>!s.closure.includes(r)).map(r=>[r,'ACK_CLOSE',{}]);
  return [];
}
function invariant(before,after,action){
  assert.deepEqual(after.quote,before.quote,'accepted commitment changed');
  assert.equal(after.version,before.version+1);
  assert(Number.isSafeInteger(after.observedMinor)&&after.observedMinor>=0&&after.observedMinor<=after.quote.recipientMinor);
  assert.equal(new Set(after.votes).size,after.votes.length);assert(after.votes.every(r=>['SENDER','RECEIVER'].includes(r)));
  assert.equal(new Set(after.closure).size,after.closure.length);
  if(['CORRECTION_APPROVED','REFUND_APPROVED','REFUNDED'].includes(after.status))assert.equal(after.votes.length,2);
  if(after.status==='REFUNDED'){assert.equal(after.payout,'REJECTED');assert.equal(after.resolution,'REFUND');}
  if(after.status==='SHORTFALL')assert(after.observedMinor>0&&after.observedMinor<after.quote.recipientMinor);
  if(after.status==='CREDITED')assert.equal(after.observedMinor,after.quote.recipientMinor);
  if(after.status==='MANUAL_REVIEW')assert.equal(after.payout,'BLOCKED');
  if(after.status==='CLOSED'){assert.equal(after.closure.length,2);assert(['CREDITED','REFUNDED'].includes(before.status));}
  if(action==='EXECUTE_CORRECTION'||action==='EXECUTE_REFUND')assert.equal(before.votes.length,2);
}

const started=performance.now(),stats={seeds,firstSeed,stepsPerSeed:steps,attempts:0,accepted:0,rejected:0,cases:0,noiseAttempts:0,statuses:{},denials:{}};
for(let seed=firstSeed;seed<firstSeed+seeds;seed++){
  const rand=random(seed);let state,terminalAttempts=0,serial=0;
  for(let step=0;step<steps;step++){
    if(!state||terminalAttempts>=3){
      const recipient=choose(rand,[1,2,99,620000,1000000000000,100+Math.floor(rand()*10000000)]);
      state=createCase(`SIM-${seed}-${++serial}`,'timeout',{sourceCurrency:'SGD',destinationCurrency:'INR',sourceMinor:1+Math.floor(rand()*1000000),recipientMinor:recipient,feeMinor:Math.floor(rand()*1000),quoteId:`Q-${seed}-${serial}`,synthetic:true});
      terminalAttempts=0;stats.cases++;
    }
    const choices=normalCommands(state,rand),normal=rand()<0.6&&choices.length>0;
    const [role,action,payload]=normal?choose(rand,choices):[choose(rand,['SENDER','RECEIVER','ADMIN']),choose(rand,[...ACTIONS,'NOISY_UNKNOWN_ACTION']),{amountMinor:choose(rand,[0,-1,0.5,state.quote.recipientMinor+1,Number.MAX_SAFE_INTEGER,NaN,Infinity,1])}];
    if(!normal)stats.noiseAttempts++;if(!choices.length)terminalAttempts++;
    const before=structuredClone(state);stats.attempts++;
    try{const next=transition(state,role,action,payload);invariant(before,next,action);assert.deepEqual(state,before,'transition mutated its input');state=next;stats.accepted++;stats.statuses[state.status]=(stats.statuses[state.status]||0)+1;}
    catch(error){
      if(!(error instanceof PolicyError)){error.message=`seed=${seed} step=${step} role=${role} action=${action}: ${error.message}`;throw error;}
      assert.deepEqual(state,before,'denied input changed case');stats.rejected++;stats.denials[error.code]=(stats.denials[error.code]||0)+1;
      if(normal)throw new Error(`Normal-workflow oracle unexpectedly denied seed=${seed} step=${step} code=${error.code}`);
    }
  }
}
for(const status of ['RECONCILING','SHORTFALL','CORRECTION_APPROVED','REFUND_REVIEW','REFUND_APPROVED','REFUNDED','CREDITED','MANUAL_REVIEW','CLOSED'])assert(stats.statuses[status]>0,`Unvisited status: ${status}`);
const policyMs=performance.now()-started;

const directory=mkdtempSync(join(tmpdir(),'cp-campaign-'));let store,server;
const durations=[];let responses=0,noiseResponses=0;
try{
  store=new Store(directory);store.seed();
  for(let n=0;n<loadCases;n++)store.create('SENDER',{id:`CP-LOAD-${n}`,scenario:'timeout'});
  const eventCount=store.export().events.length;
  server=buildServer(store);await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base=`http://127.0.0.1:${server.address().port}`,endpoints=['/api/health','/api/cases','/api/operations','/api/evidence','/api/cases/CP-001/packet','/api/status-reports'];
  let next=0;
  async function worker(){while(next<httpRequests){const n=next++,begin=performance.now();let response;
    if(n%5===0){noiseResponses++;response=await fetch(base+'/api/status-reports/preview',{method:'POST',headers:{'Content-Type':'application/json','X-Operator-Role':'RECEIVER'},body:JSON.stringify(n%2?null:[]),signal:AbortSignal.timeout(10000)});assert.equal(response.status,400);assert.equal((await response.json()).error,'INVALID_REQUEST');}
    else{response=await fetch(base+endpoints[n%endpoints.length],{signal:AbortSignal.timeout(10000)});assert.equal(response.status,200);const body=await response.json();if(n%endpoints.length===2)assert.equal(body.totals.open,loadCases+3);}
    durations.push(performance.now()-begin);responses++;
  }}
  await Promise.all(Array.from({length:concurrency},worker));
  assert.equal(store.export().events.length,eventCount,'read/noise load mutated ledger');assert.equal(store.verify(store.export()).valid,true);
}finally{
  if(server)await new Promise(r=>server.close(r));if(store)store.close();
  assert(directory.startsWith(join(tmpdir(),'cp-campaign-')));rmSync(directory,{recursive:true,force:true});
}
durations.sort((a,b)=>a-b);const percentile=p=>Math.round(durations[Math.min(durations.length-1,Math.ceil(durations.length*p)-1)]*100)/100;
const result={schema:'corridorproof-simulation-campaign-v1',passed:true,recordedAt:new Date().toISOString(),mode:'ISOLATED_LOCAL_SIMULATION',runtime:process.version,
  policy:{...stats,durationMs:Math.round(policyMs)},http:{cases:loadCases+3,requests:responses,malformedRequests:noiseResponses,concurrency,p50Ms:percentile(.5),p95Ms:percentile(.95),p99Ms:percentile(.99),maxMs:percentile(1),timeoutMs:10000},
  totalMs:Math.round(performance.now()-started),caveat:'Deterministic synthetic policy and isolated localhost load; not a live Drunix throughput benchmark, browser rendering measurement, production availability test or commercial impact study. HTTP timings include client JSON parsing and local contention. Noise chooses adversarial inputs; some are valid actions in the selected state.'};
if(process.env.CP_SIM_OUTPUT)writeFileSync(process.env.CP_SIM_OUTPUT,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
