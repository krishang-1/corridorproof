import { readFileSync } from 'node:fs';
import { verifyExport } from '../src/integrity.js';
const path = process.argv[2];
if (!path) { console.error('Usage: npm run verify -- evidence.json [trusted-public-keys.json]'); process.exit(2); }
const bundle = JSON.parse(readFileSync(path));
const anchors = process.argv[3] ? JSON.parse(readFileSync(process.argv[3])) : bundle.publicKeys;
const result = verifyExport(bundle, anchors); console.log(JSON.stringify(result, null, 2)); process.exit(result.valid ? 0 : 1);
