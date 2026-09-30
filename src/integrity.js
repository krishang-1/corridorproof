import { createHash, createPublicKey, verify } from 'node:crypto';
import { transition, createCase } from './policy.js';
export function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
}
export const hash = value => createHash('sha256').update(canonical(value)).digest('hex');
export function verifyExport(bundle, anchors = bundle.publicKeys) {
  if (!bundle || bundle.schema !== 'corridorproof-evidence-v1' || !Array.isArray(bundle.events) || !Array.isArray(bundle.cases)) return {valid:false,checked:0,errors:['Invalid evidence schema']};
  let previous = 'GENESIS';
  const errors = [];
  const states = new Map();
  for (const [index, event] of bundle.events.entries()) {
    const { signature, eventHash, ...body } = event;
    if (body.sequence !== index + 1 || body.previousHash !== previous) errors.push(`Event ${index + 1}: broken sequence`);
    if (hash(body) !== eventHash) errors.push(`Event ${index + 1}: changed content`);
    try { if (!verify(null, Buffer.from(eventHash), createPublicKey(anchors[body.role]), Buffer.from(signature, 'base64'))) errors.push(`Event ${index + 1}: invalid signature`); }
    catch { errors.push(`Event ${index + 1}: unknown or invalid signing key`); }
    previous = eventHash;
    try {
      if (body.type === 'QUOTE_ACCEPTED') {
        if (!['SYSTEM','SENDER'].includes(body.role) || states.has(body.caseId) || !body.payload.initialState || body.payload.initialState.id !== body.caseId || canonical(body.payload.initialState)!==canonical(createCase(body.caseId,body.payload.initialState.scenario,body.payload.quote))) throw new Error('Invalid genesis state');
        states.set(body.caseId, structuredClone(body.payload.initialState));
      } else if (body.type !== 'COMMAND_REJECTED') {
        const current = states.get(body.caseId);
        if (!current || current.version !== body.payload.beforeVersion) throw new Error('State version mismatch');
        const next = transition(current, body.role, body.type, body.payload);
        if (next.version !== body.payload.afterVersion) throw new Error('Result version mismatch');
        states.set(body.caseId,next);
      }
    } catch (e) { errors.push(`Event ${index + 1}: policy replay failed (${e.message})`); }
  }
  if (bundle.head !== previous) errors.push('Export head mismatch');
  if (states.size !== bundle.cases.length || new Set(bundle.cases.map(s=>s.id)).size !== bundle.cases.length) errors.push('Case set mismatch');
  for (const state of bundle.cases) if (canonical(states.get(state.id)) !== canonical(state)) errors.push(`Case ${state.id}: snapshot differs from signed evidence`);
  return { valid: !errors.length, checked: bundle.events.length, errors,
    trust: 'Integrity relative to supplied trust anchors. Embedded demo keys do not establish institutional identity or truth of rail evidence.' };
}
