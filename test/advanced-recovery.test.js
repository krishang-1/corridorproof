import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store} from '../src/store.js';
import {LiveStore} from '../src/live-store.js';
import {StatusInbox} from '../src/status-inbox.js';

test('lost-ack reconciliation preserves the original result after another actor advances or closes the case',async()=>{
  for(let variant=0;variant<12;variant++){
    const dir=mkdtempSync(join(tmpdir(),'cp-advance-'));let store;
    try{
      store=new Store(dir);store.seed();let drop=true,calls=0;
      const runner=async request=>{
        if(request.method==='query')return {ok:true,result:{cases:store.list(),events:[]}};
        calls++;await new Promise(r=>setTimeout(r,variant%4));
        const result=store.command(request.args[0],request.role,JSON.parse(request.args[1]));
        if(drop){drop=false;throw Error('Injected acknowledgment loss');}
        return {ok:true,result,receipt:{successful:true,validationCode:'VALID',transactionId:`synthetic-advance-${variant}`}};
      };
      const adapterDir=join(dir,'adapter'),input={messageId:`advance-report-${variant}`,caseId:'CP-001',quoteId:'Q-CP-001',statusCode:'ACCC',currency:'INR',amountMinor:620000,source:'SYNTHETIC_RECEIVER',synthetic:true};
      let live=new LiveStore(adapterDir,runner),inbox=new StatusInbox(adapterDir);
      assert.equal((await inbox.apply(live,'RECEIVER',input)).pending,true);
      // Models another actor completing acknowledgments at the ledger while
      // this adapter has lost its receipt. No real institution is represented.
      assert.equal(store.command('CP-001','SENDER',{requestId:`external-sender-${variant}`,expectedVersion:1,action:'ACK_CLOSE'}).ok,true);
      if(variant%2===0)assert.equal(store.command('CP-001','RECEIVER',{requestId:`external-receiver-${variant}`,expectedVersion:2,action:'ACK_CLOSE'}).ok,true);
      const before=store.export(),current=store.get('CP-001');
      live=new LiveStore(adapterDir,runner);inbox=new StatusInbox(adapterDir);
      const recovered=await inbox.apply(live,'RECEIVER',input);
      assert.equal(recovered.ok,true);assert.equal(recovered.replay,true);assert.equal(recovered.state.version,1,'Original request result must not be replaced by a later snapshot');
      assert.deepEqual(store.get('CP-001'),current);assert.equal(store.export().events.length,before.events.length);
      assert.equal(live.pending().length,0);assert.equal(calls,2);
      assert.equal((await inbox.apply(live,'RECEIVER',input)).inboxReplay,true);assert.equal(calls,2);assert.equal(store.verify(store.export()).valid,true);
    }finally{store?.close();rmSync(dir,{recursive:true,force:true});}
  }
});
