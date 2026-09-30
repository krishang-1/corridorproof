import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';
import {Store} from '../src/store.js';
const directory=mkdtempSync(join(tmpdir(),'corridorproof-demo-check-'));const store=new Store(directory);store.seed();let n=0;
const cmd=(id,role,action,payload={})=>store.command(id,role,{requestId:`demo-check-${++n}`,expectedVersion:store.get(id).version,action,payload});
try{
 cmd('CP-001','SENDER','OBSERVE_TIMEOUT');assert.equal(cmd('CP-001','SENDER','APPROVE_REFUND').ok,false);cmd('CP-001','RECEIVER','OBSERVE_CREDIT',{amountMinor:620000});
 cmd('CP-002','RECEIVER','OBSERVE_CREDIT',{amountMinor:608000});cmd('CP-002','SENDER','APPROVE_CORRECTION');cmd('CP-002','RECEIVER','APPROVE_CORRECTION');cmd('CP-002','RECEIVER','EXECUTE_CORRECTION');
 cmd('CP-003','RECEIVER','OBSERVE_REJECTION');cmd('CP-003','SENDER','APPROVE_REFUND');cmd('CP-003','RECEIVER','APPROVE_REFUND');cmd('CP-003','SENDER','EXECUTE_REFUND');
 for(const id of ['CP-001','CP-002','CP-003']){cmd(id,'SENDER','ACK_CLOSE');cmd(id,'RECEIVER','ACK_CLOSE');assert.equal(store.get(id).status,'CLOSED');}
 const bundle=store.export();assert.equal(store.verify(bundle).valid,true);if(process.argv[2])writeFileSync(resolve(process.argv[2]),JSON.stringify(bundle,null,2));
 console.log(`PASS: three cases closed, ${bundle.events.length} events verified, unsafe refund denied. Synthetic payments only.`);
}finally{store.close();rmSync(directory,{recursive:true,force:true});}
