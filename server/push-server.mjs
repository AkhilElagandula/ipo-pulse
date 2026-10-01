// Minimal push server for IPO Pulse.
//
//   GET  /vapidPublicKey   -> public key the PWA subscribes with
//   POST /subscribe        -> { type: 'web', subscription } | { type: 'native', platform, token }
//   POST /notify           -> { title, body, url } sends to every web subscriber
//
// Try it:  curl -X POST localhost:4300/notify -H 'Content-Type: application/json' \
//            -d '{"title":"New IPO","body":"Vardhan Green Hydrogen opens Monday","url":"/tabs/ipos/vardhanh2"}'
//
// Native (FCM/APNs) tokens are stored but not sent to: that needs a Firebase
// service account (firebase-admin). Subscriptions live in a JSON file, which
// is fine for development; use a database in production.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import webpush from 'web-push';

const here = dirname(fileURLToPath(import.meta.url));
const VAPID_FILE = join(here, '.vapid.json');
const SUBS_FILE = join(here, '.subscriptions.json');
const PORT = Number(process.env.PORT ?? 4300);
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? '*';

const vapid = existsSync(VAPID_FILE) ? JSON.parse(readFileSync(VAPID_FILE, 'utf8')) : webpush.generateVAPIDKeys();
if (!existsSync(VAPID_FILE)) writeFileSync(VAPID_FILE, JSON.stringify(vapid, null, 2));
webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com', vapid.publicKey, vapid.privateKey);

let subs = existsSync(SUBS_FILE) ? JSON.parse(readFileSync(SUBS_FILE, 'utf8')) : { web: [], native: [] };
const save = () => writeFileSync(SUBS_FILE, JSON.stringify(subs, null, 2));

const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.writeHead(204).end();

  try {
    if (req.method === 'GET' && req.url === '/vapidPublicKey') {
      return res.writeHead(200, { 'Content-Type': 'text/plain' }).end(vapid.publicKey);
    }

    if (req.method === 'POST' && req.url === '/subscribe') {
      const body = await readJson(req);
      if (body.type === 'web' && body.subscription?.endpoint) {
        subs.web = subs.web.filter((s) => s.endpoint !== body.subscription.endpoint).concat(body.subscription);
      } else if (body.type === 'native' && typeof body.token === 'string') {
        subs.native = subs.native.filter((s) => s.token !== body.token).concat({ platform: body.platform, token: body.token });
      } else {
        return res.writeHead(400).end('bad subscription');
      }
      save();
      return res.writeHead(201).end();
    }

    if (req.method === 'POST' && req.url === '/notify') {
      const { title = 'IPO Pulse', body = '', url = '/tabs/ipos' } = await readJson(req);
      // Payload format understood by Angular's service worker (ngsw).
      const payload = JSON.stringify({
        notification: {
          title,
          body,
          icon: 'assets/icons/icon-192.png',
          badge: 'assets/icons/icon-192.png',
          data: { url, onActionClick: { default: { operation: 'navigateLastFocusedOrOpen', url } } },
        },
      });
      const results = await Promise.allSettled(subs.web.map((s) => webpush.sendNotification(s, payload)));
      // Drop subscriptions the browser has revoked.
      const gone = new Set(results.flatMap((r, i) => (r.status === 'rejected' && [404, 410].includes(r.reason?.statusCode) ? [subs.web[i].endpoint] : [])));
      if (gone.size) {
        subs.web = subs.web.filter((s) => !gone.has(s.endpoint));
        save();
      }
      const sent = results.filter((r) => r.status === 'fulfilled').length;
      return res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ sent, removed: gone.size, nativePending: subs.native.length }));
    }

    res.writeHead(404).end();
  } catch (e) {
    res.writeHead(500).end(String(e?.message ?? e));
  }
});

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 64_000) reject(new Error('body too large'));
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
}

server.listen(PORT, () => console.log(`push server on http://localhost:${PORT}`));
