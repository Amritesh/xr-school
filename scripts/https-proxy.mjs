#!/usr/bin/env node
/**
 * scripts/https-proxy.mjs
 *
 * Creates an HTTPS reverse proxy in front of the Next.js HTTP dev server.
 * Meta Quest Browser requires HTTPS for WebXR (navigator.xr).
 *
 * Usage:
 *   1. npm run dev         (in one terminal — starts Next.js on :3000)
 *   2. node scripts/https-proxy.mjs  (in another terminal — HTTPS on :3443)
 *   3. On Quest Browser → https://<your-laptop-IP>:3443
 *      Accept the self-signed cert warning once, then use normally.
 */

import https from 'https';
import http from 'http';
import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { networkInterfaces } from 'os';

const HTTPS_PORT = 3443;
const DEV_PORT   = 3000;
const CERT_DIR   = new URL('../certificates', import.meta.url).pathname;

// ── Detect local network IP ────────────────────────────────────────────────
function getLocalIP() {
  for (const ifaces of Object.values(networkInterfaces())) {
    for (const addr of ifaces ?? []) {
      if (addr.family === 'IPv4' && !addr.internal) return addr.address;
    }
  }
  return '127.0.0.1';
}

const localIP = getLocalIP();

// ── Generate self-signed cert if not already present ──────────────────────
const keyFile  = `${CERT_DIR}/dev-key.pem`;
const certFile = `${CERT_DIR}/dev-cert.pem`;

if (!existsSync(keyFile) || !existsSync(certFile)) {
  mkdirSync(CERT_DIR, { recursive: true });
  console.log(`Generating self-signed certificate for ${localIP} …`);
  execSync(
    `openssl req -x509 -newkey rsa:2048 \
      -keyout "${keyFile}" -out "${certFile}" \
      -days 365 -nodes \
      -subj "/CN=${localIP}" \
      -addext "subjectAltName=IP:${localIP},IP:127.0.0.1,DNS:localhost"`,
    { stdio: 'inherit' }
  );
  console.log('Certificate generated.\n');
}

// ── HTTPS → HTTP proxy ────────────────────────────────────────────────────
const sslOptions = {
  key:  readFileSync(keyFile),
  cert: readFileSync(certFile),
};

const server = https.createServer(sslOptions, (req, res) => {
  const proxyReq = http.request(
    {
      hostname: '127.0.0.1',
      port: DEV_PORT,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: `localhost:${DEV_PORT}` },
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    }
  );
  req.pipe(proxyReq, { end: true });
  proxyReq.on('error', () => res.writeHead(502).end('Dev server not running on :3000'));
});

// WebSocket passthrough (for Next.js HMR to work on desktop too)
server.on('upgrade', (req, clientSocket, head) => {
  const proxyReq = http.request({
    hostname: '127.0.0.1',
    port: DEV_PORT,
    path: req.url,
    method: req.method,
    headers: req.headers,
  });
  proxyReq.on('upgrade', (_proxyRes, proxySocket) => {
    clientSocket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n');
    proxySocket.pipe(clientSocket, { end: false });
    clientSocket.pipe(proxySocket, { end: false });
  });
  proxyReq.on('error', () => clientSocket.destroy());
  proxyReq.end();
});

server.listen(HTTPS_PORT, '0.0.0.0', () => {
  console.log('');
  console.log('🔒  HTTPS proxy ready — WebXR enabled');
  console.log('');
  console.log(`   Desktop : https://localhost:${HTTPS_PORT}`);
  console.log(`   Quest   : https://${localIP}:${HTTPS_PORT}`);
  console.log('');
  console.log('   On Meta Quest Browser: navigate to the URL above.');
  console.log('   Tap "Advanced" → "Proceed" to accept the self-signed cert.');
  console.log('   The Enter VR button will now appear on both simulations.');
  console.log('');
});
