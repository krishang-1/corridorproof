import { execFile } from 'node:child_process';
import { mkdirSync, existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { createCase, PolicyError, ROLES } from './policy.js';
import { canonical, hash } from './integrity.js';

export function gatewayRunner({infra=process.env.CP_INFRA_DIR || '/home/krish/corridorproof-infra', distribution=process.env.CP_WSL_DISTRO || 'Ubuntu'}={}) {
  return request => new Promise((resolve, reject) => {
    const child = execFile('wsl.exe', ['-d',distribution,'--','python3',`${infra}/corridorproof/scripts/gateway-bridge.py`,infra],
      {timeout:115000,maxBuffer:8*1024*1024,windowsHide:true}, (error,stdout) => {
        if(error) return reject(new Error('Gateway bridge unavailable or timed out; reconcile the request before any financial action.'));
        try { resolve(JSON.parse(stdout)); } catch { reject(new Error('Invalid gateway response; outcome requires reconciliation.')); }
      });
    child.stdin.on('error',()=>{}); child.stdin.end(JSON.stringify(request));
  });
}
export class LiveStore {
  constructor(directory, run=gatewayRunner()) {
    mkdirSync(directory,{recursive:true}); this.file=join(directory,'requests.json');this.run=run;
    this.requests=existsSync(this.file)?JSON.parse(readFileSync(this.file,'utf8')):{};
    this.cache=null;this.loading=null;this.inFlight=new Set();
    for(const request of Object.values(this.requests)) if(request.status==='SUBMITTING') request.status='UNCERTAIN';
    this.save();
  }
  save(){writeFileSync(this.file+'.tmp',JSON.stringify(this.requests,null,2),{mode:0o600});renameSync(this.file+'.tmp',this.file);}
  health(){return {status:'ok',ledger:'LIVE_DRUNIX_TEST_NETWORK',settlement:'SIMULATED',drunixLive:true,
    authentication:'Local operator selects generated User1 test certificates; no production user authentication',
    channel:'mychannel',chaincode:'corridorproof',endorsement:'Org1 AND Org2',
    connection:this.cache?'Last workspace query succeeded':'Connection checked when workspace is queried'};}
  async invoke(role,method,fn,args=[]){
    const response=await this.run({role,method,function:fn,args});
    if(!response.ok){const error=new PolicyError('GATEWAY_UNCERTAIN',response.error||'Gateway outcome uncertain');error.gateway=response;throw error;}
    if(method==='submit'&&(!response.receipt?.successful||response.receipt.validationCode!=='VALID'))throw new PolicyError('GATEWAY_UNCERTAIN','No VALID commit receipt returned');
    return response;
  }
  async workspace(role='SENDER',fresh=false){
    if(!ROLES.includes(role))throw new PolicyError('INVALID_ROLE','Unknown test identity');
    if(!fresh&&this.cache&&this.cache.role===role&&Date.now()-this.cache.time<2000)return this.cache.bundle;
    if(this.loading?.role===role&&!fresh)return this.loading.promise;
    const promise=this.invoke(role,'query','ReadWorkspace').then(({result})=>{
      const events=result.events.slice().sort((a,b)=>a.seconds-b.seconds||(a.nanos||0)-(b.nanos||0)||a.transactionId.localeCompare(b.transactionId))
        .map((e,i)=>({...e,sequence:i+1,timestamp:new Date(e.seconds*1000+(e.nanos||0)/1e6).toISOString(),
          mode:'LIVE_DRUNIX_TEST_NETWORK',eventHash:e.transactionId}));
      const bundle={schema:'corridorproof-drunix-evidence-v1',mode:'LIVE_DRUNIX_TEST_NETWORK',exportedAt:new Date().toISOString(),
        channel:'mychannel',chaincode:'corridorproof',cases:result.cases,events,
        caveat:'Live local ledger query. Quotes and payment execution are synthetic. Transaction IDs are not standalone cryptographic proofs. Comparison requires a trusted live connection; no block-signature or inclusion-proof verifier is supplied.'};
      this.cache={role,time:Date.now(),bundle};return bundle;
    });
    this.loading={role,promise};try{return await promise;}finally{if(this.loading?.promise===promise)this.loading=null;}
  }
  async list(role){return (await this.workspace(role)).cases;}
  async export(role){return this.workspace(role);}
  pending(){return Object.entries(this.requests).filter(([,r])=>['SUBMITTING','UNCERTAIN'].includes(r.status)).map(([key,r])=>({key,caseId:r.caseId,role:r.role,requestId:JSON.parse(r.inputJSON).requestId,status:r.status,transactionId:r.transactionId,startedAt:r.startedAt}));}
  async create(role,input){
    if(role!=='SENDER')throw new PolicyError('ROLE_DENIED','Sender records the agreed synthetic quote');
    const state=createCase(input.id,input.scenario,input.quote);
    const response=await this.invoke(role,'submit','CreateCase',[state.id,state.scenario,JSON.stringify(state.quote)]);
    this.cache=null;return {ok:true,state:response.result,receipt:response.receipt};
  }
  async command(id,role,input){
    if(!ROLES.includes(role))throw new PolicyError('INVALID_ROLE','Unknown test identity');
    if(!/^[A-Za-z0-9_-]{1,100}$/.test(id)||!input||typeof input.requestId!=='string'||!/^[A-Za-z0-9_-]{8,100}$/.test(input.requestId)||!Number.isSafeInteger(input.expectedVersion)||input.expectedVersion<0||typeof input.action!=='string')throw new PolicyError('INVALID_REQUEST','Valid case, requestId, version and action required');
    const key=`${role}:${input.requestId}`,inputJSON=JSON.stringify(input),fingerprint=hash({id,role,inputJSON});
    const prior=this.requests[key];
    if(prior&&prior.fingerprint!==fingerprint)throw new PolicyError('IDEMPOTENCY_CONFLICT','Request key already used for different content');
    if(prior?.status==='COMMITTED')return {...prior.result,replay:true,receipt:prior.receipt};
    if(prior?.status==='INVALID')return {...prior.result,receipt:prior.receipt};
    if(!prior&&Object.values(this.requests).some(r=>r.caseId===id&&['SUBMITTING','UNCERTAIN'].includes(r.status)))return {ok:false,code:'UNRESOLVED_SUBMISSION',message:'Reconcile the existing uncertain request before a replacement action.',pending:true};
    if(this.inFlight.has(key))return {ok:false,code:'OUTCOME_UNCERTAIN',message:'This exact request is still submitting. Refresh and reconcile.',pending:true};
    const record=this.requests[key]||{caseId:id,role,inputJSON,fingerprint,startedAt:new Date().toISOString()};
    record.status='SUBMITTING';this.requests[key]=record;this.save();this.inFlight.add(key);
    try{
      const response=await this.invoke(role,'submit','Command',[id,record.inputJSON]);
      record.status='COMMITTED';record.result=response.result;record.receipt=response.receipt;record.transactionId=response.receipt.transactionId;this.save();this.cache=null;
      return {...response.result,receipt:response.receipt};
    }catch(error){
      if(error.gateway?.receipt?.validationCode && error.gateway.receipt.successful===false){
        record.status='INVALID';record.receipt=error.gateway.receipt;record.result={ok:false,code:'INVALID_COMMIT',message:`Transaction was invalid: ${record.receipt.validationCode}. Refresh the case before a new decision.`};this.save();this.cache=null;return {...record.result,receipt:record.receipt};
      }
      record.status='UNCERTAIN';record.transactionId=error.gateway?.transactionId||error.gateway?.receipt?.transactionId;record.error=error.message;this.save();this.cache=null;
      return {ok:false,code:'OUTCOME_UNCERTAIN',message:'Submission outcome uncertain. Reconcile or replay this exact request; do not create a replacement financial action.',pending:true,transactionId:record.transactionId};
    }finally{this.inFlight.delete(key);}
  }
  async reconcile(key){const record=this.requests[key];if(!record)throw new PolicyError('NOT_FOUND','Request not found');return this.command(record.caseId,record.role,JSON.parse(record.inputJSON));}
  async verify(bundle,role='SENDER'){
    const current=await this.workspace(role,true),errors=[];
    if(bundle?.schema!==current.schema||bundle.mode!==current.mode||bundle.channel!==current.channel||bundle.chaincode!==current.chaincode)errors.push('Wrong ledger schema or network');
    if(canonical(bundle?.cases)!==canonical(current.cases))errors.push('Case snapshot differs from current ledger');
    if(canonical(bundle?.events)!==canonical(current.events))errors.push('Evidence differs from current ledger');
    return {valid:!errors.length,checked:current.events.length,errors,method:'LIVE_LEDGER_COMPARISON',caveat:'An older valid export can differ after new commits. This comparison is not offline signature verification or an independently witnessed completeness proof.'};
  }
  close(){}
}
