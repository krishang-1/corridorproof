import assert from 'node:assert/strict';
import {writeFileSync,readFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url)),stamp=Date.now().toString(36);
const evidence={mode:'LIVE_DRUNIX_TEST_NETWORK',entryPoint:'Dashboard HTTP API',paymentRails:'SIMULATED',startedAt:new Date().toISOString(),transactions:[],cases:[]};
async function api(role,path,body){const response=await fetch('http://127.0.0.1:8787'+path,{headers:{'Content-Type':'application/json','X-Operator-Role':role},...(body?{method:'POST',body:JSON.stringify(body)}:{})});const result=await response.json();assert.ok([200,201,409].includes(response.status),JSON.stringify(result));return result;}
function committed(role,action,result){assert.equal(result.receipt?.validationCode,'VALID');assert.equal(result.receipt.successful,true);evidence.transactions.push({role,action,result});console.log(role,action,result.receipt.blockNumber,result.receipt.validationCode);}
try{
  const health=await api('SENDER','/api/health');assert.equal(health.drunixLive,true);
  const fixtures=JSON.parse(readFileSync(resolve(root,'test/conformance.json')));
  for(let index=0;index<fixtures.length;index++){
    const id=`CP-API-${stamp}-${index}`,scenario=['timeout','shortfall','rejection','timeout','timeout'][index];
    const quote={sourceCurrency:'SGD',destinationCurrency:'INR',sourceMinor:10000,feeMinor:300,recipientMinor:620000,quoteId:`Q-API-${stamp}-${index}`,synthetic:true};
    const created=await api('SENDER','/api/cases',{id,scenario,quote});committed('SENDER','CreateCase',created);let state=created.state,n=0;
    for(const step of fixtures[index].steps){
      const input={requestId:`api-${stamp}-${index}-${n++}`,expectedVersion:state.version,action:step.action,payload:step.payload||{}};
      const result=await api(step.role,`/api/cases/${id}/commands`,input);committed(step.role,step.action,result);
      if(step.error){assert.equal(result.ok,false);assert.equal(result.code,step.error);}else{assert.equal(result.ok,true);assert.equal(result.state.status,step.status);}
      state=result.state;
    }
    if(index===1)for(const role of ['SENDER','RECEIVER']){const result=await api(role,`/api/cases/${id}/commands`,{requestId:`api-${stamp}-${index}-${n++}`,expectedVersion:state.version,action:'ACK_CLOSE',payload:{}});committed(role,'ACK_CLOSE',result);assert.equal(result.ok,true);state=result.state;}
    const sender=(await api('SENDER','/api/cases')).find(c=>c.id===id),receiver=(await api('RECEIVER','/api/cases')).find(c=>c.id===id);
    assert.deepEqual(sender,receiver);assert.deepEqual(sender,state);assert.deepEqual(state.quote,quote);evidence.cases.push({id,status:state.status,matchingOrganizationReads:true,state});
  }
  const bundle=await api('SENDER','/api/evidence');assert.ok(bundle.cases.length>10,'Workspace case scan is truncated');assert.ok(bundle.events.length>10,'Workspace event scan is truncated');assert.equal((await api('SENDER','/api/verify',bundle)).valid,true);
  const altered=structuredClone(bundle);altered.events[0].payload={...altered.events[0].payload,alterationTest:true};assert.equal((await api('SENDER','/api/verify',altered)).valid,false);
  const truncated=structuredClone(bundle);truncated.events.pop();assert.equal((await api('SENDER','/api/verify',truncated)).valid,false);
  evidence.exportCheck={originalMatches:true,alteredRejected:true,truncatedRejected:true,method:'LIVE_LEDGER_COMPARISON'};evidence.completedAt=new Date().toISOString();evidence.passed=true;
}catch(error){evidence.passed=false;evidence.error=error.message;throw error;}finally{const destination=resolve(root,evidence.passed?'submission/drunix-dashboard-evidence.json':'.data-live/failed-check-'+stamp+'.json');mkdirSync(resolve(root,evidence.passed?'submission':'.data-live'),{recursive:true});writeFileSync(destination,JSON.stringify(evidence,null,2));}
