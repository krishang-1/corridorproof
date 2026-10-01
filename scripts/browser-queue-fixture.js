import {Store} from '../src/store.js';
import {buildServer} from '../src/server.js';
import {StatusInbox} from '../src/status-inbox.js';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const dir=mkdtempSync(join(tmpdir(),'cp-browser-'));const store=new Store(dir);let server;
try{
  const inbox=new StatusInbox(dir);
  for(let n=0;n<120;n++){
    const id=n===0?'BROWSER-'+ 'L'.repeat(92):`BROWSER-${String(n).padStart(3,'0')}`;
    store.create('SENDER',{id,scenario:n%3===0?'shortfall':'timeout'});
    if(n%4===1)store.command(id,'RECEIVER',{requestId:`browser-credit-${n}`,expectedVersion:0,action:'OBSERVE_CREDIT',payload:{amountMinor:608000}});
    if(n%4===2)store.command(id,'RECEIVER',{requestId:`browser-block-${n}`,expectedVersion:0,action:'OBSERVE_BLOCK'});
    if(n%4===3){store.command(id,'RECEIVER',{requestId:`browser-full-${n}`,expectedVersion:0,action:'OBSERVE_CREDIT',payload:{amountMinor:620000}});for(const [step,role] of ['SENDER','RECEIVER'].entries())store.command(id,role,{requestId:`browser-close-${n}-${step}`,expectedVersion:step+1,action:'ACK_CLOSE'});}
    await inbox.apply(store,'RECEIVER',{messageId:`browser-pending-${n}`,caseId:id,quoteId:`Q-${id}`,statusCode:'PDNG',currency:'INR',amountMinor:0,source:'SYNTHETIC_RECEIVER',synthetic:true});
  }
  const before=store.export();server=buildServer(store);await new Promise(r=>server.listen(0,'127.0.0.1',r));
  console.log(JSON.stringify({url:`http://127.0.0.1:${server.address().port}/`,cases:120,events:before.events.length,head:before.head}));
  await new Promise(resolve=>{const timer=setTimeout(resolve,720000);process.stdin.setEncoding('utf8');process.stdin.on('data',data=>{if(data.includes('stop')){clearTimeout(timer);resolve();}});});
  const after=store.export();console.log(JSON.stringify({finished:true,unchanged:after.head===before.head,verified:store.verify(after).valid,events:after.events.length}));
}finally{if(server)await new Promise(r=>server.close(r));store.close();if(!dir.startsWith(join(tmpdir(),'cp-browser-')))throw Error('Unexpected cleanup directory');rmSync(dir,{recursive:true,force:true});}
