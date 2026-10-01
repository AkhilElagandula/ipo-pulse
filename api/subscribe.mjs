import { isValidSubscription, saveSubscription, storageConfigured } from './_push.mjs';

/** Remembers a device so /api/notify can reach it later. Needs Upstash Redis. */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { type, subscription } = req.body ?? {};
  if (type === 'native') return res.status(202).json({ stored: false, reason: 'native push not implemented yet' });
  if (type !== 'web' || !isValidSubscription(subscription)) return res.status(400).send('bad subscription');
  if (!storageConfigured) return res.status(202).json({ stored: false, reason: 'no database connected' });
  await saveSubscription(subscription);
  res.status(201).json({ stored: true });
}
