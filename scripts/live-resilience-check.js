import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {nativeGatewayRunner} from '../src/live-store.js';
import {hash} from '../src/integrity.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const binary=process.env.CP_GATEWAY_BIN||resolve(root,'gateway/gateway.exe'),certRoot=process.env.CP_CERT_ROOT||resolve(root,'.data-live/certs');
const run=nativeGatewayRunner(binary,certRoot),file=resolve(root,'submission/drunix-resilience-evidence.json'),baselineFile=resolve(root,'.data-live/restart-baseline.json');
const normalize=workspace=>({cases:workspace.cases.slice().sort((a,b)=>a.id.localeCompare(b.id)),events:workspace.events.slice().sort((a,b)=>a.transactionId.localeCompare(b.transactionId))});
async function query(role,fn,args=[]){const response=await run({role,method:'query',function:fn,args});assert.equal(response.ok,true,response.error);return response.result;}
if(process.argv.includes('--verify-restart')){
  const baseline=JSON.parse(readFileSync(baselineFile)),evidence=JSON.parse(readFileSync(file));
  for(const role of ['SENDER','RECEIVER'])assert.equal(hash(normalize(await query(role,'ReadWorkspace'))),baseline.digest,`${role} differs after restart`);
  evidence.restart={passed:true,checkedAt:new Date().toISOString(),cases:baseline.cases,events:baseline.events,digest:baseline.digest,scope:'Both existing lite peers restarted; databases and volumes preserved'};
  writeFileSync(file,JSON.stringify(evidence,null,2));console.log('Both organizations match the pre-restart workspace:',baseline.cases,'cases,',baseline.events,'events');
}else{
  const stamp=Date.now().toString(36),id=`CP-RACE-${stamp}`;
  const created=await fetch('http://127.0.0.1:8787/api/cases',{method:'POST',headers:{'Content-Type':'application/json','X-Operator-Role':'SENDER'},body:JSON.stringify({id,scenario:'timeout'})});
  const result=await created.json();assert.equal(created.status,201,JSON.stringify(result));assert.equal(result.receipt.validationCode,'VALID');
  const commands=['A','B'].map(suffix=>JSON.stringify({requestId:`race-${stamp}-${suffix}`,expectedVersion:0,action:'OBSERVE_TIMEOUT',payload:{}}));
  const response=await run({role:'SENDER',method:'race',function:id,args:commands});assert.equal(response.ok,true,response.error);
  const receipts=response.result;assert.equal(receipts.length,2);assert.ok(receipts.every(r=>r.proposedResult.ok));
  assert.equal(receipts.filter(r=>r.validationCode==='VALID').length,1);assert.equal(receipts.filter(r=>r.validationCode==='MVCC_READ_CONFLICT').length,1);
  const sender=await query('SENDER','ReadCase',[id]),receiver=await query('RECEIVER','ReadCase',[id]);assert.deepEqual(sender,receiver);assert.equal(sender.version,1);assert.equal(sender.status,'RECONCILING');
  const org=resolve(certRoot,'Org1MSP');
  const unauthorized=await new Promise(resolveResult=>execFile(binary,['query','ReadCase',id],{windowsHide:true,timeout:20000,env:{...process.env,CP_MSP_ID:'UntrustedMSP',CP_CLIENT_CERT:resolve(org,'client.pem'),CP_CLIENT_KEY:resolve(org,'client-key.pem'),CP_TLS_CERT:resolve(org,'tls-ca.crt'),CP_PEER_ENDPOINT:'localhost:7051',CP_PEER_HOST:'peer0.org1.example.com',CP_CHANNEL:'mychannel',CP_CHAINCODE:'corridorproof'}},(error,stdout,stderr)=>resolveResult({rejected:!!error,code:error?.code,error:stderr.slice(-1600)})));
  assert.equal(unauthorized.rejected,true);assert.equal(unauthorized.code,1,'Expected an authorization rejection, not a transport timeout');
  const workspace=normalize(await query('SENDER','ReadWorkspace'));assert.equal(workspace.events.filter(e=>e.caseId===id).length,2,'Invalid envelope must not write business evidence');
  const evidence={mode:'LIVE_DRUNIX_TEST_NETWORK',paymentRails:'SIMULATED',checkedAt:new Date().toISOString(),race:{passed:true,id,receipts,matchingOrganizationReads:true,finalState:sender},untrustedMSP:unauthorized,restart:{passed:false,status:'Awaiting explicit peer restart and verification'}};
  mkdirSync(resolve(root,'.data-live'),{recursive:true});writeFileSync(baselineFile,JSON.stringify({digest:hash(workspace),cases:workspace.cases.length,events:workspace.events.length}));writeFileSync(file,JSON.stringify(evidence,null,2));
  console.log('Real conflict verified:',receipts.map(r=>r.validationCode).join(', '));console.log('Untrusted MSP rejected. Restart baseline saved.');
}
