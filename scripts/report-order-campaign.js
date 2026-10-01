import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {Store} from '../src/store.js';
import {StatusInbox} from '../src/status-inbox.js';

function permutations(items){return items.length?items.flatMap((item,i)=>permutations(items.filter((_,j)=>i!==j)).map(rest=>[item,...rest])):[[]];}
const codes=['PDNG','ACWP','ACCC','RJCT','BLCK'];

export async function runReportOrderCampaign(){
  const dir=mkdtempSync(join(tmpdir(),'cp-order-'));let store;
  const stats={cases:0,reportAttempts:0,initialAccepted:0,initialHeld:0,initialPending:0,initialDenied:0,restartedReplays:0,changedContentRejected:0,unsafeRefundDenied:0,outcomes:{}};
  try{
    store=new Store(dir);
    for(const [orderIndex,order] of permutations(codes).entries())for(const mode of ['SERIAL','BURST'])for(const partial of [false,true]){
      const index=stats.cases++,id=`ORDER-${index}`,recipientMinor=[2,620000,1000000000000][index%3];
      store.create('SENDER',{id,scenario:'timeout',quote:{sourceCurrency:'SGD',sourceMinor:10000,destinationCurrency:'INR',recipientMinor,feeMinor:0,quoteId:`Q-${id}`,synthetic:true}});
      const quote=store.get(id).quote,inboxDir=join(dir,id);let inbox=new StatusInbox(inboxDir),commandCalls=0;
      // Burst previews all see version zero. Small deterministic completion delays
      // vary the winner; real network timing and Drunix MVCC are separate checks.
      const adapter={list:async()=>[store.get(id)],command:async(...args)=>{commandCalls++;if(mode==='BURST')await new Promise(r=>setTimeout(r,(orderIndex+codes.indexOf(args[2].payload.statusReport.statusCode))%4));return store.command(...args);}};
      const reports=order.map(code=>({messageId:`order-${index}-${code}`,caseId:id,quoteId:quote.quoteId,statusCode:code,currency:'INR',amountMinor:code==='ACCC'?(partial?recipientMinor-1:recipientMinor):0,source:'SYNTHETIC_RECEIVER',synthetic:true}));
      let results;
      if(mode==='SERIAL'){results=[];for(const input of reports){results.push(await inbox.apply(adapter,'RECEIVER',input));stats.reportAttempts++;}}
      else {results=await Promise.all(reports.flatMap(input=>[input,input]).map(input=>inbox.apply(adapter,'RECEIVER',input)));stats.reportAttempts+=10;}
      for(const r of results){if(r.ok)stats.initialAccepted++;else if(r.held)stats.initialHeld++;else if(r.pending)stats.initialPending++;else stats.initialDenied++;}
      const state=store.get(id);assert.equal(state.version,1);assert.deepEqual(state.quote,quote);assert.equal(state.votes.length,0);assert.equal(state.resolution,null);
      assert(['CREDITED','REJECTED','BLOCKED'].includes(state.payout));stats.outcomes[state.status]=(stats.outcomes[state.status]||0)+1;
      if(mode==='SERIAL')assert.equal(state.payout,{ACCC:'CREDITED',RJCT:'REJECTED',BLCK:'BLOCKED'}[order.find(code=>['ACCC','RJCT','BLCK'].includes(code))]);
      const eventsBefore=store.db.prepare('SELECT COUNT(*) AS n FROM events').get().n;
      inbox=new StatusInbox(inboxDir);
      for(const input of reports){const r=await inbox.apply(adapter,'RECEIVER',input);stats.reportAttempts++;if(r.inboxReplay||r.replay)stats.restartedReplays++;assert(r.ok||r.held||r.code==='STALE_VERSION');}
      assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM events').get().n,eventsBefore);
      assert.equal(commandCalls,mode==='SERIAL'?1:5); // 3 submissions plus 2 exact durable-denial replays
      await assert.rejects(()=>inbox.apply(adapter,'RECEIVER',{...reports[0],quoteId:'different-quote'}),e=>e.code==='REFERENCE_MISMATCH');
      const credited=reports.find(r=>r.statusCode==='ACCC');
      await assert.rejects(()=>inbox.apply(adapter,'RECEIVER',{...credited,amountMinor:credited.amountMinor===recipientMinor?recipientMinor-1:recipientMinor}),e=>e.code==='REPORT_CONFLICT');stats.changedContentRejected++;
      if(state.payout!=='REJECTED'){const denied=store.command(id,'SENDER',{requestId:`unsafe-refund-${index}`,expectedVersion:state.version,action:'APPROVE_REFUND'});assert.equal(denied.ok,false);assert.equal(store.get(id).version,1);stats.unsafeRefundDenied++;}
    }
    const bundle=store.export();assert.equal(store.verify(bundle).valid,true);
    return {schema:'corridorproof-report-order-campaign-v1',passed:true,recordedAt:new Date().toISOString(),mode:'ISOLATED_LOCAL_SIMULATION',permutations:120,profiles:['SERIAL_FULL','SERIAL_PARTIAL','BURST_FULL','BURST_PARTIAL'],...stats,journalEvents:bundle.events.length,
      caveat:'Exhaustive orderings of five modeled synthetic codes, not arbitrary bank messages. Deterministic short delays exercise in-process stale previews and duplicate suppression; they do not simulate independent institutions, Drunix load or multi-process storage. First accepted definitive evidence wins; later contradictions are held or denied, not automatically adjudicated.'};
  }finally{store?.close();assert(dir.startsWith(join(tmpdir(),'cp-order-')));rmSync(dir,{recursive:true,force:true});}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const result=await runReportOrderCampaign();if(process.env.CP_ORDER_OUTPUT)writeFileSync(process.env.CP_ORDER_OUTPUT,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));}
