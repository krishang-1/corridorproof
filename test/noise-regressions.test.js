import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Store} from '../src/store.js';
import {LiveStore} from '../src/live-store.js';
import {StatusInbox} from '../src/status-inbox.js';
import {buildServer} from '../src/server.js';

function setup(t){const dir=mkdtempSync(join(tmpdir(),'cp-noise-'));const store=new Store(dir);store.seed();t.after(()=>{store.close();rmSync(dir,{recursive:true,force:true});});return {dir,store};}
function report(store,messageId){return {messageId,caseId:'CP-001',quoteId:store.get('CP-001').quote.quoteId,statusCode:'ACCC',currency:'INR',amountMinor:620000,source:'SYNTHETIC_RECEIVER',synthetic:true};}

test('valid message identities cannot collide with inherited object properties',async t=>{
  for(const id of ['constructor','__proto__','toString','hasOwnProperty']){
    const {dir,store}=setup(t);let inbox=new StatusInbox(dir);const input=report(store,id);
    assert.equal((await inbox.apply(store,'RECEIVER',input)).ok,true,id);
    inbox=new StatusInbox(dir);
    assert.equal((await inbox.apply(store,'RECEIVER',input)).inboxReplay,true,id);
    assert.equal(inbox.list().length,1,id);
    await assert.rejects(()=>inbox.apply(store,'RECEIVER',{...input,amountMinor:610000}),e=>e.code==='REPORT_CONFLICT');
  }
});

test('malformed report roots and negative versions fail before evidence mutation',async t=>{
  const {dir,store}=setup(t),inbox=new StatusInbox(dir),before=store.export().events.length;
  for(const bad of [null,[],false,'not-an-object',42])await assert.rejects(()=>inbox.preview(store,'RECEIVER',bad),e=>e.code==='INVALID_REPORT');
  assert.throws(()=>store.command('CP-001','SENDER',{requestId:'negative-version-0001',expectedVersion:-1,action:'OBSERVE_TIMEOUT'}),e=>e.code==='INVALID_VERSION');
  assert.equal(store.export().events.length,before);assert.equal(inbox.list().length,0);
});

test('lost commit acknowledgments recover across both adapter restarts without a second business event',async t=>{
  for(let seed=1;seed<=24;seed++){
    const {dir,store}=setup(t);const ledgerDir=join(dir,'adapter');let calls=0,drop=true;
    const runner=async req=>{
      if(req.method==='query')return {ok:true,result:{cases:store.list(),events:[]}};
      calls++;await new Promise(r=>setTimeout(r,seed%5));
      const result=store.command(req.args[0],req.role,JSON.parse(req.args[1]));
      if(drop){drop=false;throw new Error('Injected lost acknowledgment after commit');}
      return {ok:true,result,receipt:{successful:true,validationCode:'VALID',transactionId:`synthetic-${seed}`,blockNumber:seed}};
    };
    let live=new LiveStore(ledgerDir,runner),inbox=new StatusInbox(ledgerDir);const input=report(store,`recovery-message-${seed}`);
    assert.equal((await inbox.apply(live,'RECEIVER',input)).pending,true);
    const eventCount=store.export().events.length;
    live=new LiveStore(ledgerDir,runner);inbox=new StatusInbox(ledgerDir);
    assert.equal((await inbox.apply(live,'RECEIVER',input)).ok,true);
    assert.equal(store.export().events.length,eventCount);assert.equal(live.pending().length,0);assert.equal(calls,2);
    assert.equal((await inbox.apply(live,'RECEIVER',input)).inboxReplay,true);assert.equal(calls,2);
    assert.equal(store.verify(store.export()).valid,true);
  }
});

test('HTTP JSON primitives return a stable client error without revealing implementation exceptions',async t=>{
  const {store}=setup(t),server=buildServer(store);await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
  const base=`http://127.0.0.1:${server.address().port}`;
  for(const path of ['/api/cases','/api/status-reports/preview','/api/status-reports/apply','/api/cases/CP-001/commands']){
    for(const value of [null,[],false,'noise',42]){
      const response=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json','X-Operator-Role':'RECEIVER'},body:JSON.stringify(value)});
      assert.equal(response.status,400);assert.equal((await response.json()).error,'INVALID_REQUEST');
    }
  }
  assert.equal(store.export().events.length,3);
});
