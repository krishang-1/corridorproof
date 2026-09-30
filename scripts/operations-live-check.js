import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
const base=process.env.CP_URL||'http://127.0.0.1:8787',suffix=Date.now().toString(36),id=`CP-OPS-${suffix}`;
async function api(path,role='SENDER',input){const res=await fetch(base+path,{method:input?'POST':'GET',headers:{'Content-Type':'application/json','X-Operator-Role':role},body:input?JSON.stringify(input):undefined});const data=await res.json();return {status:res.status,data};}
const health=(await api('/api/health')).data;assert.equal(health.drunixLive,true);
const create=await api('/api/cases','SENDER',{id,scenario:'shortfall',quote:{sourceCurrency:'SGD',sourceMinor:10000,destinationCurrency:'INR',recipientMinor:620000,feeMinor:300,quoteId:`Q-${id}`,synthetic:true}});assert.equal(create.data.receipt.validationCode,'VALID');
const packet={messageId:`MSG-${suffix}-pending`,caseId:id,quoteId:`Q-${id}`,statusCode:'PDNG',currency:'INR',amountMinor:0,source:'SYNTHETIC_RECEIVER',synthetic:true};
const pending=await api('/api/status-reports/apply','RECEIVER',packet);assert.equal(pending.data.held,true);
const read=async()=> (await api('/api/cases')).data.find(c=>c.id===id);
assert.equal((await read()).version,0);
const credit={...packet,messageId:`MSG-${suffix}-credit`,statusCode:'ACCC',amountMinor:608000};
const preview=await api('/api/status-reports/preview','RECEIVER',credit);assert.equal(preview.data.nextStatus,'SHORTFALL');
const applied=await api('/api/status-reports/apply','RECEIVER',credit);assert.equal(applied.data.receipt.validationCode,'VALID');assert.equal(applied.data.state.status,'SHORTFALL');
const replay=await api('/api/status-reports/apply','RECEIVER',credit);assert.equal(replay.data.inboxReplay,true);assert.equal((await read()).version,1);
const altered=await api('/api/status-reports/apply','RECEIVER',{...credit,amountMinor:610000});assert.equal(altered.data.error,'REPORT_CONFLICT');
const conflicting=await api('/api/status-reports/apply','RECEIVER',{...packet,messageId:`MSG-${suffix}-conflict`,statusCode:'RJCT'});assert.equal(conflicting.data.held,true);assert.equal((await read()).payout,'CREDITED');
const ops=(await api('/api/operations')).data;assert.equal(ops.cases.find(c=>c.caseId===id).shortfallMinor,12000);
assert.equal(ops.cases.find(c=>c.caseId===id).lane,'EVIDENCE_CONFLICT');
const dossier=(await api(`/api/cases/${id}/packet`)).data;assert.equal(dossier.state.id,id);assert.equal(dossier.events.length,2);assert.ok(dossier.fullWorkspace.events.length>=130);
assert.equal(dossier.events[1].payload.command.payload.statusReportDigest,applied.data.statusReportDigest);assert.equal(dossier.adapterReports.length,3);
const consistency=(await api('/api/consistency')).data;assert.equal(consistency.matched,true);
const evidence={passed:true,checkedAt:new Date().toISOString(),mode:health.ledger,paymentRails:'SIMULATED',caseId:id,create:create.data,credit:applied.data,
  checks:{pendingHeld:true,noPendingMutation:true,partialCreditNormalized:true,exactReplay:true,alteredMessageRejected:true,conflictingReportHeld:true,exactShortfall:12000,caseDossier:true,organizationReadsMatch:true},consistency,
  caveat:'Inbox metadata is local to the adapter. Only accepted observations are Drunix contract events. Status reports are synthetic JSON, not authenticated bank messages or ISO 20022 XML.'};
writeFileSync('submission/drunix-operations-evidence.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify({passed:true,caseId:id,records:consistency.senderRecords}));
