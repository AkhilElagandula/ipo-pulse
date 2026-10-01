import { isValidSubscription, pushConfigured, send } from './_push.mjs';

/**
 * Sends one test notification back to the device that asked, after an optional
 * delay so you can close the app first. Needs no database.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!pushConfigured) return res.status(503).send('Push is not configured');
  const { subscription, delaySeconds = 0 } = req.body ?? {};
  if (!isValidSubscription(subscription)) return res.status(400).send('bad subscription');

  await new Promise((r) => setTimeout(r, Math.min(Math.max(Number(delaySeconds) || 0, 0), 8) * 1000));
  try {
    await send(subscription, { title: 'IPO Pulse test', body: 'Push notifications are working 🎉 Tap to open IPOs.', url: '/tabs/ipos' });
    res.status(200).json({ sent: true });
  } catch (e) {
    res.status(502).json({ sent: false, status: e.statusCode ?? null, error: e.body || e.message });
  }
}
