import { DatabaseSync } from 'node:sqlite';
import { generateKeyPairSync, sign, createPrivateKey, createPublicKey } from 'node:crypto';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createCase, transition, PolicyError, ROLES } from './policy.js';
import { canonical, hash, verifyExport } from './integrity.js';
export class Store {
  constructor(directory) {
    this.directory = directory;
    mkdirSync(directory, { recursive: true }); this.keys = {}; this.publicKeys = {};
    for (const role of ['SYSTEM', ...ROLES]) {
      const path = join(directory, `${role.toLowerCase()}-private.pem`);
      if (!existsSync(path)) writeFileSync(path, generateKeyPairSync('ed25519').privateKey.export({type:'pkcs8', format:'pem'}), { mode: 0o600 });
      this.keys[role] = createPrivateKey(readFileSync(path));
      this.publicKeys[role] = createPublicKey(this.keys[role]).export({type:'spki',format:'pem'});
    }
    this.db = new DatabaseSync(join(directory, 'journal.sqlite'));
    this.db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS cases (id TEXT PRIMARY KEY, state TEXT NOT NULL); CREATE TABLE IF NOT EXISTS events (sequence INTEGER PRIMARY KEY, body TEXT NOT NULL); CREATE TABLE IF NOT EXISTS requests (key TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, result TEXT NOT NULL);');
  }
  append(caseId, role, type, payload, requestId) {
    const last = this.db.prepare('SELECT sequence, body FROM events ORDER BY sequence DESC LIMIT 1').get();
    const body = { sequence: last ? last.sequence + 1 : 1, previousHash: last ? JSON.parse(last.body).eventHash : 'GENESIS', caseId, role, type, payload, requestId, timestamp: new Date().toISOString(), mode: 'LOCAL_SIGNED_DEMO' };
    const eventHash = hash(body);
    const event = { ...body, eventHash, signature: sign(null, Buffer.from(eventHash), this.keys[role]).toString('base64') };
    this.db.prepare('INSERT INTO events VALUES (?, ?)').run(body.sequence, JSON.stringify(event)); return event;
  }
  seed() {
    if (this.list().length) return;
    for (const [index, scenario] of ['timeout','shortfall','rejection'].entries()) {
      const state = createCase(`CP-00${index + 1}`, scenario);
      this.db.exec('BEGIN IMMEDIATE');
      try { this.db.prepare('INSERT INTO cases VALUES (?, ?)').run(state.id, JSON.stringify(state)); this.append(state.id, 'SYSTEM', 'QUOTE_ACCEPTED', {quote:state.quote,initialState:state}, `seed-${state.id}`); this.db.exec('COMMIT'); }
      catch (e) { this.db.exec('ROLLBACK'); throw e; }
    }
  }
  list() { return this.db.prepare('SELECT state FROM cases ORDER BY id').all().map(r => JSON.parse(r.state)); }
  health() { return { status:'ok', ledger:'LOCAL_SIGNED_DEMO', settlement:'SIMULATED', drunixLive:false, authentication:'Simulated organization selector; localhost only' }; }
  create(role, input) {
    if (role !== 'SENDER') throw new PolicyError('ROLE_DENIED','Sender records the agreed synthetic quote');
    const state = createCase(input.id, input.scenario, input.quote);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      if (this.db.prepare('SELECT id FROM cases WHERE id=?').get(state.id)) throw new PolicyError('CASE_EXISTS','Case ID already exists');
      this.db.prepare('INSERT INTO cases VALUES (?, ?)').run(state.id, JSON.stringify(state));
      const event = this.append(state.id, role, 'QUOTE_ACCEPTED', {quote:state.quote,initialState:state}, `create-${state.id}`);
      this.db.exec('COMMIT'); return {ok:true,state,event};
    } catch (e) { this.db.exec('ROLLBACK'); throw e; }
  }
  get(id) { const row = this.db.prepare('SELECT state FROM cases WHERE id=?').get(id); if (!row) throw new PolicyError('NOT_FOUND','Case not found'); return JSON.parse(row.state); }
  command(id, role, input) {
    if (!ROLES.includes(role)) throw new PolicyError('INVALID_ROLE','Unknown organization');
    if (!input || typeof input.requestId !== 'string' || !/^[A-Za-z0-9_-]{8,100}$/.test(input.requestId)) throw new PolicyError('INVALID_REQUEST','Supply an 8–100 character idempotency key');
    if (!Number.isSafeInteger(input.expectedVersion)) throw new PolicyError('INVALID_VERSION','Supply an integer expectedVersion');
    const key = `${role}:${input.requestId}`;
    const fingerprint = hash({ id, role, input });
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const prior = this.db.prepare('SELECT fingerprint,result FROM requests WHERE key=?').get(key);
      if (prior) {
        if (prior.fingerprint !== fingerprint) throw new PolicyError('IDEMPOTENCY_CONFLICT','Request key already used for different content');
        this.db.exec('COMMIT'); return {...JSON.parse(prior.result), replay: true};
      }
      const current = this.get(id); let result;
      try {
        if (input.expectedVersion !== current.version) throw new PolicyError('STALE_VERSION','Refresh the case before acting');
        const state = transition(current, role, input.action, input.payload || {});
        const railEvidence = input.action === 'EXECUTE_REFUND' ? { synthetic:true, reference:`MOCK-${input.requestId}`, currency:current.quote.sourceCurrency, amountMinor:current.quote.sourceMinor, status:'REFUNDED', feeTreatment:'Principal only; source fee treatment requires partner policy' }
          : input.action === 'EXECUTE_CORRECTION' ? { synthetic:true, reference:`MOCK-${input.requestId}`, currency:current.quote.destinationCurrency, amountMinor:current.quote.recipientMinor-current.observedMinor, status:'CREDITED' }
          : input.action.startsWith('OBSERVE_') ? { synthetic:true, reference:`MOCK-${input.requestId}`, status:state.payout, currency:current.quote.destinationCurrency, amountMinor:state.observedMinor } : null;
        const event = this.append(id, role, input.action, { ...input.payload, beforeVersion: current.version, afterVersion: state.version, railEvidence }, input.requestId);
        this.db.prepare('UPDATE cases SET state=? WHERE id=?').run(JSON.stringify(state), id);
        result = { ok: true, state, event };
      } catch (e) {
        if (!(e instanceof PolicyError)) throw e;
        const event = this.append(id, role, 'COMMAND_REJECTED', { action: input.action, code: e.code, reason: e.message, expectedVersion: input.expectedVersion, currentVersion: current.version }, input.requestId);
        result = { ok: false, code: e.code, message: e.message, state: current, event };
      }
      this.db.prepare('INSERT INTO requests VALUES (?, ?, ?)').run(key, fingerprint, JSON.stringify(result)); this.db.exec('COMMIT'); return result;
    } catch (e) { this.db.exec('ROLLBACK'); throw e; }
  }
  export() { const events = this.db.prepare('SELECT body FROM events ORDER BY sequence').all().map(r => JSON.parse(r.body)); return { schema: 'corridorproof-evidence-v1', mode: 'LOCAL_SIGNED_DEMO', exportedAt: new Date().toISOString(), publicKeys: this.publicKeys, cases: this.list(), events, head: events.at(-1)?.eventHash || 'GENESIS', caveat: 'Synthetic rail evidence. Local server holds all demo signing keys. Pin public keys and a previously witnessed chain head independently to establish provenance and completeness.' }; }
  verify(bundle) { return verifyExport(bundle, this.publicKeys); }
  close() { this.db.close(); }
}
