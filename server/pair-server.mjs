// Serves the phone pairing page and an ntfy-style relay (POST /<topic>, GET /<topic>/sse).
// The relay only forwards sealed envelopes between the phone and the TV and keeps nothing.
import http from 'node:http';
import https from 'node:https';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';

const TOPIC = /^immich-tv-[A-Za-z0-9_-]{22}$/;
const MAX_BODY = 2048;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const PAGE_HEADERS = {
  'cache-control': 'no-store',
  'referrer-policy': 'no-referrer',
  'x-content-type-options': 'nosniff',
  'content-security-policy': "default-src 'self'; img-src 'self' data:; style-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'",
};

export function createPairServer({ staticDir, tls, keepAliveMs = 25000, maxSubscribers = 200 } = {}) {
  const subs = new Map();
  let subscribers = 0;
  const root = staticDir && resolve(staticDir);

  const send = (res, status, headers = {}, body) => res.writeHead(status, headers).end(body);

  function subscribe(topic, req, res) {
    if (subscribers >= maxSubscribers) return send(res, 503);
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store' });
    res.write(`event: open\ndata: ${JSON.stringify({ event: 'open', topic })}\n\n`);
    if (!subs.has(topic)) subs.set(topic, new Set());
    subs.get(topic).add(res);
    subscribers++;
    const timer = setInterval(() => res.write(':ka\n\n'), keepAliveMs);
    req.on('close', () => {
      clearInterval(timer);
      subs.get(topic)?.delete(res);
      if (!subs.get(topic)?.size) subs.delete(topic);
      subscribers--;
    });
  }

  function publish(topic, req, res) {
    if (Number(req.headers['content-length'] ?? 0) > MAX_BODY) return send(res, 413);
    let body = '';
    let tooBig = false;
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > MAX_BODY) { tooBig = true; req.destroy(); }
    });
    req.on('end', () => {
      if (tooBig) return;
      const event = `event: message\ndata: ${JSON.stringify({ event: 'message', topic, message: body })}\n\n`;
      subs.get(topic)?.forEach((r) => r.write(event));
      send(res, 200, { 'content-type': 'application/json' }, '{}');
    });
    req.on('close', () => { if (tooBig && !res.writableEnded) send(res, 413); });
  }

  async function serveStatic(pathname, method, res) {
    if (!root || (method !== 'GET' && method !== 'HEAD')) return send(res, method === 'GET' || method === 'HEAD' ? 404 : 405);
    let path;
    try { path = decodeURIComponent(pathname); } catch { return send(res, 404); }
    const file = resolve(join(root, path === '/' ? 'pair.html' : path));
    if (file !== root && !file.startsWith(root + sep)) return send(res, 404);
    try {
      const data = await readFile(file);
      send(res, 200, { ...PAGE_HEADERS, 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }, method === 'HEAD' ? undefined : data);
    } catch {
      send(res, 404);
    }
  }

  const handler = (req, res) => {
    res.setHeader('access-control-allow-origin', '*');
    res.setHeader('access-control-allow-headers', '*');
    res.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') return send(res, 204);
    const { pathname } = new URL(req.url, 'http://localhost');
    const sse = pathname.match(/^\/([^/]+)\/sse$/);
    const post = req.method === 'POST' && pathname.match(/^\/([^/]+)$/);
    const topic = (sse ?? post)?.[1];
    if (topic !== undefined) {
      if (!TOPIC.test(topic)) return send(res, 400);
      return sse && req.method === 'GET' ? subscribe(topic, req, res) : post ? publish(topic, req, res) : send(res, 405);
    }
    return serveStatic(pathname, req.method, res);
  };

  const server = tls ? https.createServer(tls, handler) : http.createServer(handler);
  return {
    listen: (port, host = '0.0.0.0') => new Promise((done) => server.listen(port, host, () => done({
      port: server.address().port,
      close: () => { server.closeAllConnections(); server.close(); },
    }))),
  };
}
