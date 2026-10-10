// Maps Supabase's "/rest/v1/*" path prefix onto a bare PostgREST server, so supabase-js can talk to a local PostgREST in tests.
// Usage: node rest-proxy.mjs <listenPort> <postgrestPort>
import http from 'node:http';
const [listen, target] = process.argv.slice(2).map(Number);
http.createServer((req, res) => {
  const p = http.request({ host: '127.0.0.1', port: target, method: req.method, path: req.url.replace(/^\/rest\/v1/, '') || '/', headers: req.headers }, (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
  p.on('error', () => { res.writeHead(502); res.end(); }); req.pipe(p);
}).listen(listen, '127.0.0.1');
