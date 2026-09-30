let cases = [], bundle, selected = 'CP-001', busy = false;
const $ = id => document.getElementById(id);
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = (amount, currency) => new Intl.NumberFormat('en-IN',{style:'currency',currency,minimumFractionDigits:2}).format(amount/100);
const names = { timeout:'Missing payout response',shortfall:'Recipient amount shortfall',rejection:'Rejected payout & refund' };
const labels = {OBSERVE_TIMEOUT:'Simulate missing response',OBSERVE_CREDIT:'Record mock full credit',OBSERVE_REJECTION:'Record definitive rejection',OBSERVE_BLOCK:'Record compliance block',APPROVE_REFUND:'Approve refund',APPROVE_CORRECTION:'Approve correction',EXECUTE_REFUND:'Record mock refund',EXECUTE_CORRECTION:'Record mock correction',ACK_CLOSE:'Acknowledge & close',SHORT_CREDIT:'Record mock shortfall'};
const guidance = {
  PAYOUT_PENDING:'Awaiting receiver evidence. A missing response does not prove that payment failed.',
  RECONCILING:'Keep funds resolution on hold. Reconcile the receiver’s authoritative outcome before approving a refund.',
  SHORTFALL:'Recipient received less than the immutable quote. Both organizations must approve the exact correction.',
  CORRECTION_APPROVED:'Both organizations approved the shortfall correction. Receiver records synthetic correction evidence.',
  CREDITED:'Full recipient credit is evidenced. Both organizations acknowledge the outcome before closing.',
  REFUND_REVIEW:'Receiver has recorded definitive rejection. Both organizations must approve refund before execution.',
  REFUND_APPROVED:'Both organizations approved. Sender may record a synthetic refund to the original payer.',
  REFUNDED:'Refund evidence recorded. Both organizations acknowledge the outcome before closing.',
  CLOSED:'Both parties acknowledged this resolved case. Its signed trail remains inspectable.',
  MANUAL_REVIEW:'Compliance block requires manual review. This demo deliberately offers no automatic refund.'
};
function toast(message, error=false) { $('toast').textContent=message;$('toast').className='toast'+(error?' error':'');$('toast').hidden=false;setTimeout(()=>{$('toast').hidden=true},5500); }
async function refresh() {
  [cases,bundle]=await Promise.all([fetch('/api/cases').then(r=>r.json()),fetch('/api/evidence').then(r=>r.json())]); render();
}
function actions(s,role) {
  let out=[];
  if(s.status==='PAYOUT_PENDING') out.push('OBSERVE_TIMEOUT');
  if(['PAYOUT_PENDING','RECONCILING'].includes(s.status)) {
    if(role==='RECEIVER') out.push(s.scenario==='shortfall'?'SHORT_CREDIT':'OBSERVE_CREDIT','OBSERVE_REJECTION','OBSERVE_BLOCK');
    out.push('APPROVE_REFUND'); // Deliberate denied-action probe, clearly labelled below.
  }
  if(s.status==='SHORTFALL'&&!s.votes.includes(role))out.push('APPROVE_CORRECTION');
  if(s.status==='REFUND_REVIEW'&&!s.votes.includes(role))out.push('APPROVE_REFUND');
  if(s.status==='CORRECTION_APPROVED'&&role==='RECEIVER')out.push('EXECUTE_CORRECTION');
  if(s.status==='REFUND_APPROVED'&&role==='SENDER')out.push('EXECUTE_REFUND');
  if(['CREDITED','REFUNDED'].includes(s.status)&&!s.closure.includes(role))out.push('ACK_CLOSE');
  return out;
}
function render() {
  $('active-count').textContent=cases.filter(c=>c.status!=='CLOSED').length;$('event-count').textContent=bundle.events.length;
  $('case-list').innerHTML=cases.map(c=>`<button class="case-card ${c.id===selected?'selected':''}" data-case="${c.id}"><strong>${c.id} · ${names[c.scenario]}</strong><small>SGD 100.00 → INR 6,200.00</small><span class="tag ${c.status==='CLOSED'?'green':'amber'}">${c.status.replaceAll('_',' ')}</span></button>`).join('');
  const s=cases.find(c=>c.id===selected), role=$('role').value, caseEvents=bundle.events.filter(e=>e.caseId===s.id);
  $('case-panel').innerHTML=`<div class="case-title"><div><span class="eyebrow">${s.id} / ${names[s.scenario]}</span><h2>${s.status.replaceAll('_',' ')}</h2><p>${s.beneficiary} · Quote ${s.quote.quoteId}</p></div><span class="version">Version ${s.version}</span></div><div class="quote"><div><span>Source principal</span><strong>${money(s.quote.sourceMinor,'SGD')}</strong><small>Fee ${money(s.quote.feeMinor,'SGD')} · synthetic</small></div><div><span>Recipient commitment</span><strong>${money(s.quote.recipientMinor,'INR')}</strong><small>Immutable accepted quote</small></div><div><span>Observed recipient credit</span><strong>${money(s.observedMinor,'INR')}</strong><small>${s.payout} · simulated rail</small></div></div><div class="guidance"><strong>Resolution rule</strong><br>${guidance[s.status]}</div><div class="actions"><h3>Available actions · ${role==='SENDER'?'Sender':'Receiver'} operations</h3><div class="action-grid">${actions(s,role).map(a=>{const denied=a==='APPROVE_REFUND'&&s.payout==='UNKNOWN';return `<button data-action="${a}" ${busy?'disabled':''} class="${denied?'danger':''}">${denied?'Test blocked refund':labels[a]}</button>`}).join('')||'<p class="muted">No action for this organization. Switch organizations to continue, or review the journal.</p>'}</div><div class="votes"><span>Resolution approvals: ${s.votes.length}/2</span><span>Closure acknowledgments: ${s.closure.length}/2</span>${s.status==='SHORTFALL'?`<span>Shortfall: ${money(s.quote.recipientMinor-s.observedMinor,'INR')}</span>`:''}</div></div><div class="timeline"><h3>Recent case evidence</h3>${caseEvents.slice(-5).reverse().map(e=>`<div class="timeline-item"><i></i><div><strong>${escape(e.type.replaceAll('_',' '))}</strong><small>${e.role} · ${new Date(e.timestamp).toLocaleTimeString('en-IN')} · ${escape(e.payload.code||'signed record')}</small></div></div>`).join('')}</div>`;
  $('journal').innerHTML=bundle.events.slice().reverse().map(e=>`<tr><td>${e.sequence}</td><td>${e.caseId}</td><td>${escape(e.type.replaceAll('_',' '))}</td><td>${e.role}</td><td><code>${e.eventHash.slice(0,14)}…</code></td></tr>`).join('');
}
document.addEventListener('click',async e=>{
  const card=e.target.closest('[data-case]');if(card){selected=card.dataset.case;render();}
  const button=e.target.closest('[data-action]');if(!button||busy)return;
  busy=true;render();const s=cases.find(c=>c.id===selected),action=button.dataset.action;
  try {
    const input={requestId:crypto.randomUUID(),expectedVersion:s.version,action:action==='SHORT_CREDIT'?'OBSERVE_CREDIT':action,payload:{}};
    if(['OBSERVE_CREDIT','SHORT_CREDIT'].includes(action)) input.payload.amountMinor=action==='SHORT_CREDIT'?s.quote.recipientMinor-12000:s.quote.recipientMinor;
    const r=await fetch(`/api/cases/${s.id}/commands`,{method:'POST',headers:{'Content-Type':'application/json','X-Demo-Role':$('role').value},body:JSON.stringify(input)});const result=await r.json();
    toast(result.ok?'Signed evidence recorded. Case state updated.':`${result.code||result.error}: ${result.message}`,!result.ok);
  } catch(e){toast(e.message,true)}finally{busy=false;await refresh();}
});
$('role').addEventListener('change',render);
$('export').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(bundle,null,2)],{type:'application/json'}));a.download='corridorproof-evidence.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
async function check(tamper){const copy=structuredClone(bundle);if(tamper)copy.events[0].payload.quote.recipientMinor++;const result=await fetch('/api/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(copy)}).then(r=>r.json());$('integrity').textContent=result.valid?`✓ ${result.checked} signed events and case-state replay verified against this server’s keys.`:`Alteration detected · ${result.errors.join(' · ')}. The stored journal was not changed.`;}
$('verify').onclick=()=>check(false);$('tamper').onclick=()=>check(true);refresh().catch(e=>toast(e.message,true));
