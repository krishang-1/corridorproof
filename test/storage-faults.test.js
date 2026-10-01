import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,rmSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {Store} from '../src/store.js';
import {StatusInbox} from '../src/status-inbox.js';
import {LiveStore} from '../src/live-store.js';
function directory(t,close=()=>{}){const dir=mkdtempSync(join(tmpdir(),'cp-storage-'));t.after(()=>{close();rmSync(dir,{recursive:true,force:true});});return dir;}

test('failed inbox prepare stays fail-closed on retry until the exact command can be saved',async t=>{
  let store;const dir=directory(t,()=>store?.close());store=new Store(dir);store.seed();
  const inbox=new StatusInbox(dir),input={messageId:'storage-fault-001',caseId:'CP-001',quoteId:'Q-CP-001',statusCode:'ACCC',currency:'INR',amountMinor:620000,source:'SYNTHETIC_RECEIVER',synthetic:true};
  const blocker=join(dir,'status-inbox.json.tmp');mkdirSync(blocker);
  const before=store.export().events.length;
  for(let n=0;n<3;n++){
    await assert.rejects(()=>inbox.apply(store,'RECEIVER',input));
    assert.equal(store.export().events.length,before,`Attempt ${n} submitted despite unavailable original-request storage`);
    assert.equal(store.get('CP-001').version,0);
  }
  rmSync(blocker,{recursive:true});
  assert.equal((await inbox.apply(store,'RECEIVER',input)).ok,true);
  assert.equal(store.export().events.length,before+1);
  assert.equal((await new StatusInbox(dir).apply(store,'RECEIVER',input)).inboxReplay,true);
});

test('malformed adapter root and records are refused without overwriting the original file',t=>{
  for(const [name,Constructor] of [['status-inbox.json',StatusInbox],['requests.json',LiveStore]]){
    for(const input of ['null','[]','false','42','"noise"','{"message":null}','{"message":{}}','{']){
      const dir=directory(t),file=join(dir,name);writeFileSync(file,input);
      assert.throws(()=>new Constructor(dir),e=>e.code==='ADAPTER_STATE_INVALID',`${name}: ${input}`);
      assert.equal(readFileSync(file,'utf8'),input,'Corrupted bookkeeping was overwritten');
    }
  }
});

test('legacy inbox versions remain compatible while changed command bindings fail closed',async t=>{
  let store;const dir=directory(t,()=>store?.close());store=new Store(dir);store.seed();
  const inbox=new StatusInbox(dir),input={messageId:'legacy-storage-001',caseId:'CP-001',quoteId:'Q-CP-001',statusCode:'ACCC',currency:'INR',amountMinor:620000,source:'SYNTHETIC_RECEIVER',synthetic:true};
  await inbox.apply(store,'RECEIVER',input);
  const records=JSON.parse(readFileSync(inbox.file,'utf8'));delete records[input.messageId].expectedVersion;
  writeFileSync(inbox.file,JSON.stringify(records));
  assert.equal((await new StatusInbox(dir).apply(store,'RECEIVER',input)).inboxReplay,true);
  for(const mutate of [r=>r.digest='changed',r=>r.command.requestId='replacement-command',r=>r.command.expectedVersion=-1,r=>r.command.payload.statusReport.amountMinor++]){
    const altered=structuredClone(records);mutate(altered[input.messageId]);const text=JSON.stringify(altered);writeFileSync(inbox.file,text);
    assert.throws(()=>new StatusInbox(dir),e=>e.code==='ADAPTER_STATE_INVALID');assert.equal(readFileSync(inbox.file,'utf8'),text);
  }
});

test('post-commit result-write failures recover accepted and denied commands without duplicate events',async t=>{
  for(const profile of ['LOCAL_INBOX','LIVE_INBOX','LIVE_REQUESTS'])for(let variant=0;variant<4;variant++){
    let store;const dir=directory(t,()=>store?.close());store=new Store(dir);store.seed();
    const adapterDir=join(dir,'adapter'),input={messageId:`result-fault-${profile}-${variant}`,caseId:'CP-001',quoteId:'Q-CP-001',statusCode:'ACCC',currency:'INR',amountMinor:620000,source:'SYNTHETIC_RECEIVER',synthetic:true};
    const denied=variant%2===1,blocker=join(adapterDir,profile==='LIVE_REQUESTS'?'requests.json.tmp':'status-inbox.json.tmp');let inject=true;
    const execute=async(id,role,command)=>{
      await new Promise(r=>setTimeout(r,variant%3));
      if(inject&&denied)store.command(id,'SENDER',{requestId:`intervening-timeout-${profile}-${variant}`,expectedVersion:0,action:'OBSERVE_TIMEOUT'});
      const result=store.command(id,role,command);
      if(inject&&profile==='LIVE_REQUESTS'){inject=false;mkdirSync(blocker);}
      return result;
    };
    const runner=async request=>request.method==='query'?{ok:true,result:{cases:store.list(),events:[]}}:{ok:true,result:await execute(request.args[0],request.role,JSON.parse(request.args[1])),receipt:{successful:true,validationCode:'VALID',transactionId:`synthetic-result-${variant}`}};
    let live=profile==='LOCAL_INBOX'?null:new LiveStore(adapterDir,runner);
    let inbox=new StatusInbox(adapterDir);
    const adapter={list:async()=>store.list(),command:async(...args)=>{
      const result=live?await live.command(...args):await execute(...args);
      if(inject){inject=false;mkdirSync(blocker);}return result;
    }};
    await assert.rejects(()=>inbox.apply(adapter,'RECEIVER',input));
    const original=JSON.parse(readFileSync(inbox.file,'utf8'))[input.messageId];assert.equal(original.status,'PREPARED');assert.equal(original.command.expectedVersion,0);
    const current=store.get('CP-001');assert.equal(current.version,1);assert.equal(current.payout,denied?'UNKNOWN':'CREDITED');
    // Another actor advances the case after the result was lost locally.
    assert.equal(store.command('CP-001',denied?'RECEIVER':'SENDER',{requestId:`later-command-${profile}-${variant}`,expectedVersion:1,action:denied?'OBSERVE_CREDIT':'ACK_CLOSE',payload:{amountMinor:620000}}).ok,true);
    const before=store.export(),state=store.get('CP-001');rmSync(blocker,{recursive:true});
    if(live)live=new LiveStore(adapterDir,runner);inbox=new StatusInbox(adapterDir);
    const recovered=await inbox.apply(adapter,'RECEIVER',input);
    assert.equal(recovered.ok,!denied);if(denied)assert.equal(recovered.code,'STALE_VERSION');assert.equal(recovered.replay,true);
    assert.deepEqual(store.get('CP-001'),state);assert.equal(store.export().head,before.head);
    const replay=await new StatusInbox(adapterDir).apply(adapter,'RECEIVER',input);assert.equal(replay.ok,!denied);assert.equal(store.export().head,before.head);assert.equal(store.verify(store.export()).valid,true);
  }
});
