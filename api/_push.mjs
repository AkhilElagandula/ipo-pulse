// Shared helpers for the push functions. Files starting with "_" are not routes on Vercel.
import webpush from 'web-push';

const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT = 'mailto:admin@example.com' } = process.env;

export const vapidPublicKey = VAPID_PUBLIC_KEY ?? '';
export const pushConfigured = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
if (pushConfigured) webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// Only real browser push services; stops the functions being used to POST to arbitrary URLs.
const PUSH_HOSTS = [/\.googleapis\.com$/, /\.mozilla\.com$/, /\.push\.apple\.com$/, /\.notify\.windows\.com$/];

export function isValidSubscription(sub) {
  try {
    const u = new URL(sub?.endpoint);
    return u.protocol === 'https:' && PUSH_HOSTS.some((re) => re.test(u.hostname)) && !!sub.keys?.p256dh && !!sub.keys?.auth;
  } catch {
    return false;
  }
}

/** Payload format understood by Angular's service worker (ngsw). */
export function payload({ title = 'IPO Pulse', body = '', url = '/tabs/ipos' }) {
  return JSON.stringify({
    notification: {
      title,
      body,
      icon: '/assets/icons/icon-192.png',
      badge: '/assets/icons/icon-192.png',
      data: { url, onActionClick: { default: { operation: 'navigateLastFocusedOrOpen', url } } },
    },
  });
}

export const send = (sub, message) => webpush.sendNotification(sub, payload(message));

// ---- Storage: Upstash Redis over REST (added from the Vercel Marketplace). Optional. ----

const REDIS_URL = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
export const storageConfigured = Boolean(REDIS_URL && REDIS_TOKEN);
const KEY = 'push:web';

async function redis(...command) {
  const r = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  if (!r.ok) throw new Error(`redis ${r.status}`);
  return (await r.json()).result;
}

export const saveSubscription = (sub) => redis('HSET', KEY, sub.endpoint, JSON.stringify(sub));
export const removeSubscription = (endpoint) => redis('HDEL', KEY, endpoint);

export async function allSubscriptions() {
  const flat = (await redis('HGETALL', KEY)) ?? [];
  const out = [];
  for (let i = 1; i < flat.length; i += 2) out.push(JSON.parse(flat[i]));
  return out;
}
