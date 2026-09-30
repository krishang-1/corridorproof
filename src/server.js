import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store } from './store.js';
const root = fileURLToPath(new URL('../public/', import.meta.url));
export function buildServer(store) {
  return createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'");
    const json = (data, status = 200) => { res.writeHead(status, {'Content-Type':'application/json', 'Cache-Control':'no-store'}); res.end(JSON.stringify(data)); };
    try {
      if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(req.headers.host || '')) return json({error:'Localhost host required'},403);
      const url = new URL(req.url, 'http://localhost');
      if (req.method === 'GET' && url.pathname === '/api/health') return json({ status:'ok', ledger:'LOCAL_SIGNED_DEMO', settlement:'SIMULATED', drunixLive:false, authentication:'Simulated organization selector; localhost only' });
      if (req.method === 'GET' && url.pathname === '/api/cases') return json(store.list());
      if (req.method === 'GET' && url.pathname === '/api/evidence') return json(store.export());
      const match = url.pathname.match(/^\/api\/cases\/([A-Za-z0-9_-]+)\/commands$/);
      if (req.method === 'POST') {
        const origin = req.headers.origin;
        if (origin && ![`http://${req.headers.host}`].includes(origin)) return json({error:'Cross-origin commands rejected'},403);
        if (req.headers['content-type']?.split(';')[0] !== 'application/json') return json({error:'JSON required'},415);
        let body = ''; for await (const chunk of req) { body += chunk; if (body.length > 1000000) return json({error:'Request too large'},413); }
        let input; try { input = JSON.parse(body); } catch { return json({error:'Malformed JSON'},400); }
        if (match) { const result = store.command(match[1], req.headers['x-demo-role'], input); return json(result, result.ok ? 200 : 409); }
        if (url.pathname === '/api/verify') return json(store.verify(input));
      }
      if (req.method !== 'GET' || url.pathname.startsWith('/api/')) return json({error:'Not found'},404);
      const path = resolve(root, '.' + (url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)));
      if (!path.startsWith(root)) return json({error:'Not found'},404);
      const bytes = await readFile(path);
      const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'}[extname(path)] || 'application/octet-stream';
      res.writeHead(200,{'Content-Type':mime}); res.end(bytes);
    } catch (e) { json({error:e.code || 'REQUEST_FAILED', message:e.code === 'ENOENT' ? 'Not found' : e.message}, e.code === 'ENOENT' || e.code === 'NOT_FOUND' ? 404 : 400); }
  });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const store = new Store(resolve(process.env.CORRIDORPROOF_DATA || '.data')); store.seed();
  const server = buildServer(store); const port = Number(process.env.PORT || 8787);
  server.listen(port, '127.0.0.1', () => console.log(`CorridorProof http://127.0.0.1:${port} — LOCAL_SIGNED_DEMO · simulated payments`));
  process.on('SIGINT', () => server.close(() => { store.close(); process.exit(0); }));
}
