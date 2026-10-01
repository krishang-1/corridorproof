import {mkdirSync,writeFileSync,renameSync} from 'node:fs';
import {join} from 'node:path';
import {PolicyError} from './policy.js';
import {normalizeStatusReport} from './operations.js';
import {hash} from './integrity.js';
import {loadAdapterRecords,isRecord} from './adapter-state.js';

function validInboxRecord(id,r){
  if(!/^[A-Za-z0-9_-]{8,90}$/.test(id)||!isRecord(r.report)||r.report.messageId!==id||r.digest!==hash(r.report))return false;
  // Earlier inbox files kept the version only inside the original command.
  if(r.expectedVersion!==undefined&&(!Number.isSafeInteger(r.expectedVersion)||r.expectedVersion<0))return false;
  if(!['PREPARED','HELD','UNCERTAIN','RECORDED','DENIED'].includes(r.status))return false;
  if(r.status==='HELD')return !r.command&&['HOLD','CONFLICT'].includes(r.disposition)&&r.action===null;
  if(!isRecord(r.command)||r.command.requestId!==`report-${id}`||!Number.isSafeInteger(r.command.expectedVersion)||r.command.expectedVersion<0||(r.expectedVersion!==undefined&&r.command.expectedVersion!==r.expectedVersion)||r.command.action!==r.action||!isRecord(r.command.payload)||r.command.payload.statusReportDigest!==r.digest||hash(r.command.payload.statusReport)!==r.digest)return false;
  if(r.status==='RECORDED')return isRecord(r.result)&&r.result.ok===true;
  if(r.status==='DENIED')return isRecord(r.result)&&r.result.ok===false&&!r.result.pending;
  return true;
}

export class StatusInbox {
  constructor(directory){mkdirSync(directory,{recursive:true});this.file=join(directory,'status-inbox.json');this.records=loadAdapterRecords(this.file,validInboxRecord);this.inFlight=new Set();}
  save(){writeFileSync(this.file+'.tmp',JSON.stringify(this.records,null,2),{mode:0o600});renameSync(this.file+'.tmp',this.file);}
  list(){return Object.values(this.records).map(({command,...r})=>r);}
  async preview(store,role,input){
    if(role!=='RECEIVER')throw new PolicyError('ROLE_DENIED','Receiver test identity required');
    if(!input||typeof input!=='object'||Array.isArray(input))throw new PolicyError('INVALID_REPORT','A status report must be a JSON object');
    const state=(await store.list(role)).find(c=>c.id===input.caseId);if(!state)throw new PolicyError('NOT_FOUND','Case not found');
    const result=normalizeStatusReport(input,state),prior=this.records[input.messageId];
    if(prior&&prior.digest!==result.digest)throw new PolicyError('REPORT_CONFLICT','Message ID already bound to different contents');
    return {...result,expectedVersion:state.version,...(prior?.status==='RECORDED'?{disposition:'REPLAY',reason:'Message already recorded; exact replay retrieves the original result without another state change'}:{}),prior:prior?{status:prior.status,result:prior.result}:null};
  }
  async apply(store,role,input){
    const preview=await this.preview(store,role,input),id=input.messageId;
    let record=this.records[id];
    if(record && record.digest!==preview.digest)throw new PolicyError('REPORT_CONFLICT','Message ID already bound to different contents');
    if(record?.status==='RECORDED')return {...record.result,inboxReplay:true};
    if(record?.status==='HELD')return {ok:false,code:'REPORT_HELD',message:record.reason,held:true};
    if(this.inFlight.has(id))return {ok:false,pending:true,code:'REPORT_SUBMITTING',message:'This message is already submitting; reconcile its exact command'};
    if(!record){
      record={...preview,status:'PREPARED',receivedAt:new Date().toISOString()};delete record.prior;
      if(preview.disposition!=='READY'){record.status='HELD';this.records[id]=record;this.save();return {ok:false,code:'REPORT_HELD',message:preview.reason,held:true};}
      record.command={requestId:`report-${id}`,expectedVersion:preview.expectedVersion,action:preview.action,payload:preview.payload};
      this.records[id]=record;
    }
    // A previous prepare may exist only in memory after a failed save. Every
    // submission/reconciliation attempt must first persist its exact command.
    this.save();
    this.inFlight.add(id);
    try {const result=await store.command(input.caseId,role,record.command);record.result=result;record.status=result.pending?'UNCERTAIN':result.ok?'RECORDED':'DENIED';this.save();return {...result,statusReportDigest:record.digest};}
    finally {this.inFlight.delete(id);}
  }
}
