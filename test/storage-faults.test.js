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
