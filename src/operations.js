import { transition, PolicyError } from './policy.js';
import { hash, canonical } from './integrity.js';

export function operationsReport(bundle, pending = [], {now = Date.now(), reviewMinutes = 15, reports = []} = {}) {
  const rows = bundle.cases.map(state => {
    const events = bundle.events.filter(e => e.caseId === state.id);
    const accepted = events.filter(e => e.type !== 'COMMAND_REJECTED');
    const first = Date.parse(accepted[0]?.timestamp), last = Date.parse(accepted.at(-1)?.timestamp);
    const ageMinutes = Number.isFinite(first) ? Math.max(0, Math.floor((now-first)/60000)) : null;
    const idleMinutes = Number.isFinite(last) ? Math.max(0, Math.floor((now-last)/60000)) : null;
    const uncertain = pending.filter(p => p.caseId === state.id);
    const denied = events.filter(e => e.type === 'COMMAND_REJECTED');
    const conflicts = denied.filter(e => (e.payload?.code || e.payload?.result?.code) === 'CONFLICTING_EVIDENCE');
    const reportConflicts = reports.filter(r=>r.report?.caseId===state.id && r.status==='HELD' && r.code==='CONFLICTING_EVIDENCE');
    let owners=[], nextStep='', lane='EVIDENCE';
    if (state.status === 'CLOSED') { lane='CLOSED'; nextStep='Inspect retained evidence'; }
    else if (uncertain.length) { lane='UNCERTAIN_COMMIT'; owners=[...new Set(uncertain.map(p=>p.role))]; nextStep='Reconcile the exact saved request before a replacement action'; }
    else if (conflicts.length || reportConflicts.length) { lane='EVIDENCE_CONFLICT'; owners=['SENDER','RECEIVER']; nextStep='Review contradictory evidence with both institutions; advisory flag does not override ledger policy'; }
    else if (state.status === 'MANUAL_REVIEW') { lane='COMPLIANCE_REVIEW'; owners=['RECEIVER']; nextStep='Escalate to the responsible compliance process; no automatic release or refund'; }
    else if (['SHORTFALL','REFUND_REVIEW'].includes(state.status)) { lane='AWAITING_APPROVAL'; owners=['SENDER','RECEIVER'].filter(r=>!state.votes.includes(r)); nextStep=`Obtain remaining ${state.resolution || (state.status==='SHORTFALL'?'CORRECTION':'REFUND')} approvals`; }
    else if (['CORRECTION_APPROVED','REFUND_APPROVED'].includes(state.status)) { lane='APPROVED_EXECUTION'; owners=[state.status==='REFUND_APPROVED'?'SENDER':'RECEIVER']; nextStep='Record the permitted synthetic execution evidence'; }
    else if (['CREDITED','REFUNDED'].includes(state.status)) { lane='AWAITING_CLOSURE'; owners=['SENDER','RECEIVER'].filter(r=>!state.closure.includes(r)); nextStep='Obtain remaining closure acknowledgments'; }
    else { owners=['RECEIVER']; nextStep='Obtain authoritative payout status; missing response is insufficient for refund'; }
    const escalationDue = state.status !== 'CLOSED' && (['EVIDENCE_CONFLICT','COMPLIANCE_REVIEW','UNCERTAIN_COMMIT'].includes(lane) || idleMinutes !== null && idleMinutes >= reviewMinutes);
    return {caseId:state.id,quoteId:state.quote.quoteId,status:state.status,lane,owners,nextStep,ageMinutes,idleMinutes,escalationDue,
      deniedActions:denied.length,conflictingEvidence:conflicts.length,heldReportConflicts:reportConflicts.length,
      unresolvedCommitmentMinor:state.status==='CLOSED'?0:state.quote.recipientMinor,
      shortfallMinor:state.status==='SHORTFALL'||state.status==='CORRECTION_APPROVED'?state.quote.recipientMinor-state.observedMinor:0};
  }).sort((a,b)=>Number(b.escalationDue)-Number(a.escalationDue)||(b.idleMinutes||0)-(a.idleMinutes||0)||a.caseId.localeCompare(b.caseId));
  return {schema:'corridorproof-operations-v1',mode:bundle.mode,generatedAt:new Date(now).toISOString(),reviewMinutes,
    caveat:'Operator review threshold is a prototype configuration, not a scheme SLA. Commitment totals are synthetic case amounts, not funds held or measured losses.',
    totals:{open:rows.filter(r=>r.status!=='CLOSED').length,closed:rows.filter(r=>r.status==='CLOSED').length,escalationDue:rows.filter(r=>r.escalationDue).length,
      awaitingApproval:rows.filter(r=>r.lane==='AWAITING_APPROVAL').length,uncertainCommits:pending.length,deniedActions:rows.reduce((n,r)=>n+r.deniedActions,0),
      unresolvedCommitmentMinor:rows.reduce((n,r)=>n+r.unresolvedCommitmentMinor,0),currency:'INR'},cases:rows};
}

export function casePacket(bundle,id,pending=[],reports=[]) {
  const state=bundle.cases.find(s=>s.id===id); if(!state)throw new PolicyError('NOT_FOUND','Case not found');
  const events=bundle.events.filter(e=>e.caseId===id);
  const packet={schema:'corridorproof-case-packet-v1',mode:bundle.mode,caseId:id,state,events,
    operations:operationsReport(bundle,pending,{reports}).cases.find(c=>c.caseId===id),
    adapterReports:reports.filter(r=>r.report?.caseId===id),
    workspaceDigest:hash({cases:bundle.cases,events:bundle.events}),workspaceEventCount:bundle.events.length,
    caveat:'Convenience dossier, not a standalone proof. Verify the included full workspace using its mode-specific verifier. Live verification requires the current authenticated ledger; local provenance requires independently pinned keys and witnessed heads.',
    fullWorkspace:bundle};
  return {...packet,packetDigest:hash(packet)};
}

export async function compareOrganizations(store) {
  if(!store.workspace)return {supported:false,matched:null,reason:'Organization comparison requires the live Drunix backend'};
  const sender=await store.workspace('SENDER',true),receiver=await store.workspace('RECEIVER',true);
  const select=b=>({cases:b.cases,events:b.events});
  return {supported:true,matched:canonical(select(sender))===canonical(select(receiver)),senderDigest:hash(select(sender)),receiverDigest:hash(select(receiver)),
    senderRecords:sender.events.length,receiverRecords:receiver.events.length,checkedAt:new Date().toISOString(),
    caveat:'Sequential authenticated reads can differ if a new commit occurs between them. Equal reads on one laptop do not prove independent institutional operation.'};
}

export function normalizeStatusReport(report,state) {
  if(!report||report.synthetic!==true||report.source!=='SYNTHETIC_RECEIVER')throw new PolicyError('SYNTHETIC_ONLY','Only explicitly synthetic receiver reports are accepted');
  if(typeof report.messageId!=='string'||!/^[A-Za-z0-9_-]{8,90}$/.test(report.messageId))throw new PolicyError('INVALID_REPORT','Use an 8–90 character message ID');
  if(report.caseId!==state.id||report.quoteId!==state.quote.quoteId)throw new PolicyError('REFERENCE_MISMATCH','Case and accepted quote references must match');
  if(report.currency!=='INR'||!Number.isSafeInteger(report.amountMinor)||report.amountMinor<0||report.amountMinor>1000000000000)throw new PolicyError('INVALID_REPORT','Use integer INR minor units');
  if(!['ACCC','RJCT','BLCK','PDNG','ACWP'].includes(report.statusCode))throw new PolicyError('UNSUPPORTED_STATUS','Unsupported status requires adapter review');
  if(report.statusCode!=='ACCC'&&report.amountMinor!==0)throw new PolicyError('INVALID_REPORT','A non-credit report must not claim credited funds');
  if(report.statusCode==='ACCC'&&report.amountMinor===0)throw new PolicyError('INVALID_REPORT','Credited amount must be positive');
  const normalized={messageId:report.messageId,caseId:state.id,quoteId:state.quote.quoteId,statusCode:report.statusCode,currency:'INR',amountMinor:report.amountMinor,source:report.source,synthetic:true};
  const digest=hash(normalized);
  if(['PDNG','ACWP'].includes(report.statusCode))return {report:normalized,digest,disposition:'HOLD',action:null,reason:'Pending or accepted-without-posting does not prove beneficiary credit or permit refund'};
  if(report.amountMinor>state.quote.recipientMinor)return {report:normalized,digest,disposition:'HOLD',action:null,reason:'Over-credit is outside this contract; escalate without automatic mutation'};
  const action={ACCC:'OBSERVE_CREDIT',RJCT:'OBSERVE_REJECTION',BLCK:'OBSERVE_BLOCK'}[report.statusCode];
  const payload={...(action==='OBSERVE_CREDIT'?{amountMinor:report.amountMinor}:{}),statusReport:normalized,statusReportDigest:digest};
  try { const next=transition(state,'RECEIVER',action,payload); return {report:normalized,digest,disposition:'READY',action,payload,nextStatus:next.status,reason:'Preview only. Receiver must explicitly record through the existing policy and commit check'}; }
  catch(error){if(!(error instanceof PolicyError))throw error;return {report:normalized,digest,disposition:'CONFLICT',action:null,code:error.code,reason:error.message};}
}
