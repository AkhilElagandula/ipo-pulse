import { configError, pushConfigured, vapidPublicKey } from './_push.mjs';

export default function handler(req, res) {
  if (!pushConfigured) return res.status(503).send(`Push is not configured: ${configError}.`);
  res.setHeader('Content-Type', 'text/plain');
  res.status(200).send(vapidPublicKey);
}
