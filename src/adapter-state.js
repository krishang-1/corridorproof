import {existsSync,readFileSync} from 'node:fs';
import {basename} from 'node:path';
import {PolicyError} from './policy.js';

export const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);

// A corrupt existing file is never treated as a fresh adapter or overwritten.
// Validation detects structural/content inconsistencies, not malicious rewrites
// by an operator who controls this local file and can recompute its checksums.
export function loadAdapterRecords(file,validate){
  if(!existsSync(file))return Object.create(null);
  try{
    const loaded=JSON.parse(readFileSync(file,'utf8'));
    if(!isRecord(loaded))throw new Error('Invalid root');
    for(const [key,record] of Object.entries(loaded))if(!isRecord(record)||!validate(key,record))throw new Error('Invalid record');
    return Object.assign(Object.create(null),loaded);
  }catch(error){
    throw new PolicyError('ADAPTER_STATE_INVALID',`Cannot safely load ${basename(file)}. Preserve the file and reconcile its original requests before restoring adapter state.`);
  }
}
