import { allSubscriptions, pushConfigured, removeSubscription, send, storageConfigured } from './_push.mjs';

/**
 * Broadcasts to every stored device. Protected by PUSH_ADMIN_TOKEN:
 *   curl -X POST https://<app>/api/notify -H "Authorization: Bearer $PUSH_ADMIN_TOKEN" \
 *        -H 'Content-Type: application/json' -d '{"title":"New IPO","body":"...","url":"/tabs/ipos"}'
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const token = process.env.PUSH_ADMIN_TOKEN;
  if (!token || req.headers.authorization !== `Bearer ${token}`) return res.status(401).send('unauthorized');
  if (!pushConfigured || !storageConfigured) return res.status(503).send('Push or storage is not configured');

  const subs = await allSubscriptions();
  const results = await Promise.allSettled(subs.map((s) => send(s, req.body ?? {})));
  let removed = 0;
  for (const [i, r] of results.entries()) {
    if (r.status === 'rejected' && [404, 410].includes(r.reason?.statusCode)) {
      await removeSubscription(subs[i].endpoint);
      removed++;
    }
  }
  res.status(200).json({ sent: results.filter((r) => r.status === 'fulfilled').length, removed, total: subs.length });
}
