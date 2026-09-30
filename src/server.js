import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store } from './store.js';
import { LiveStore } from './live-store.js';
import { operationsReport, casePacket, compareOrganizations } from './operations.js';
import { StatusInbox } from './status-inbox.js';
const root = fileURLToPath(new URL('../public/', import.meta.url));
export function buildServer(store) {
  const inbox = new StatusInbox(store.directory);
  return createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'");
    const json = (data, status = 200) => { res.writeHead(status, {'Content-Type':'application/json', 'Cache-Control':'no-store'}); res.end(JSON.stringify(data)); };
    try {
      if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.host || '')) return json({error:'Localhost host required'},403);
      const url = new URL(req.url, 'http://localhost');
      const role = req.headers['x-operator-role'] || req.headers['x-demo-role'] || 'SENDER';
      if (req.method === 'GET' && url.pathname === '/api/health') return json(await store.health());
      if (req.method === 'GET' && url.pathname === '/api/cases') return json(await store.list(role));
      if (req.method === 'GET' && url.pathname === '/api/evidence') return json(await store.export(role));
      if (req.method === 'GET' && url.pathname === '/api/pending') return json(store.pending?await store.pending():[]);
      if (req.method === 'GET' && url.pathname === '/api/operations') return json(operationsReport(await store.export(role),store.pending?await store.pending():[],{reports:inbox.list()}));
      if (req.method === 'GET' && url.pathname === '/api/consistency') return json(await compareOrganizations(store));
      if (req.method === 'GET' && url.pathname === '/api/status-reports') return json(inbox.list());
      const packet = url.pathname.match(/^\/api\/cases\/([A-Za-z0-9_-]+)\/packet$/);
      if (req.method === 'GET' && packet) return json(casePacket(await store.export(role),packet[1],store.pending?await store.pending():[],inbox.list()));
      const match = url.pathname.match(/^\/api\/cases\/([A-Za-z0-9_-]+)\/commands$/);
      if (req.method === 'POST') {
        const origin = req.headers.origin;
        if (origin && ![`http://${req.headers.host}`].includes(origin)) return json({error:'Cross-origin commands rejected'},403);
        if (req.headers['content-type']?.split(';')[0] !== 'application/json') return json({error:'JSON required'},415);
        let body = ''; for await (const chunk of req) { body += chunk; if (body.length > 1000000) return json({error:'Request too large'},413); }
        let input; try { input = JSON.parse(body); } catch { return json({error:'Malformed JSON'},400); }
        if (match) { const result = await store.command(match[1], role, input); return json(result, result.ok ? 200 : result.pending ? 202 : 409); }
        if (url.pathname === '/api/cases') return json(await store.create(role,input),201);
        if (url.pathname === '/api/reconcile' && store.reconcile) { const result=await store.reconcile(input.key);return json(result,result.pending?202:result.ok?200:409); }
        if (url.pathname === '/api/verify') return json(await store.verify(input,role));
        if (url.pathname === '/api/status-reports/preview') return json(await inbox.preview(store,role,input));
        if (url.pathname === '/api/status-reports/apply') {const result=await inbox.apply(store,role,input);return json(result,result.ok?200:result.pending?202:409);}
      }
      if (req.method !== 'GET' || url.pathname.startsWith('/api/')) return json({error:'Not found'},404);
      const path = resolve(root, '.' + (url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)));
      if (!path.startsWith(root)) return json({error:'Not found'},404);
      const bytes = await readFile(path);
      const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'}[extname(path)] || 'application/octet-stream';
      res.writeHead(200,{'Content-Type':mime}); res.end(bytes);
    } catch (e) { json({error:e.code || 'REQUEST_FAILED', message:e.code === 'ENOENT' ? 'Not found' : e.message}, e.code === 'ENOENT' || e.code === 'NOT_FOUND' ? 404 : e.code==='GATEWAY_UNCERTAIN'?503:400); }
  });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const live=process.env.CORRIDORPROOF_LEDGER==='drunix';
  const store = live ? new LiveStore(resolve(process.env.CORRIDORPROOF_DATA || '.data-live')) : new Store(resolve(process.env.CORRIDORPROOF_DATA || '.data')); if(!live)store.seed();
  const server = buildServer(store); const port = Number(process.env.PORT || 8787);
  server.listen(port, '127.0.0.1', () => console.log(`CorridorProof http://127.0.0.1:${port} — ${live?'LIVE_DRUNIX_TEST_NETWORK':'LOCAL_SIGNED_DEMO'} · simulated payments`));
  process.on('SIGINT', () => server.close(() => { store.close(); process.exit(0); }));
}
