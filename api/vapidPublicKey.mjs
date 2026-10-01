import { pushConfigured, vapidPublicKey } from './_push.mjs';

export default function handler(req, res) {
  if (!pushConfigured) return res.status(503).send('Push is not configured: set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.');
  res.setHeader('Content-Type', 'text/plain');
  res.status(200).send(vapidPublicKey);
}
