import { readFileSync } from 'node:fs';
import { createPairServer } from './pair-server.mjs';

const { PORT = '8443', STATIC_DIR, TLS_KEY, TLS_CERT } = process.env;
const tls = TLS_KEY && TLS_CERT ? { key: readFileSync(TLS_KEY), cert: readFileSync(TLS_CERT) } : undefined;
const { port } = await createPairServer({ staticDir: STATIC_DIR, tls }).listen(Number(PORT));
console.log(`pair server on :${port} (${tls ? 'https' : 'http'})`);
