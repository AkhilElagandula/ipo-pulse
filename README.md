# IPO Pulse

Indian IPO tracker and stock screener, built as an installable PWA with Ionic + Angular,
and Capacitor for native iOS/Android builds.

> Runs on **sample data** (fictional companies) until you plug in a real feed. See *Going live*.

## Features

| | |
|---|---|
| **IPOs** | Mainboard + SME, filtered by open / upcoming / closed / listed. Price band, lot, min. investment, GMP, category-wise subscription, timeline, listing gain |
| **Analyze** | Every stock gets a **short-term** score (trend, 1M momentum, RSI, volume, volatility) and a **long-term** score (ROE, debt, 3Y growth, PEG, 200-day trend, dividend). Each score is broken down factor by factor |
| **Watchlist** | Star IPOs and stocks, saved on the device |
| **Offline** | The service worker caches the app shell. Market data is saved on the device after every fetch and shown when there's no connection |
| **Notifications** | Local "IPO opens / closes today" reminders, plus remote push (Web Push on the PWA, FCM/APNs in native builds) |
| **Native** | Share sheet, haptics, network status, Android back button, install prompt, home-screen shortcuts |

## Run it

The Angular 22 CLI needs **Node ≥ 22.22.3 or ≥ 24.15**. The project pins a local `node@24` dev dependency,
so `npm run …` scripts work even on an older system Node.

```bash
npm install
npm start              # dev server at http://localhost:4200 (service worker off)
npm run build:pwa      # production build + static server at http://localhost:8100 (service worker on)
npm run push-server    # push server at http://localhost:4300
npm test
```

Offline mode and push only work in the production build (`build:pwa`).

**Test push:** open the app in Chrome, go to Settings → Push alerts → Enable, then run:

```bash
curl -X POST localhost:4300/notify -H 'Content-Type: application/json' \
  -d '{"title":"New IPO","body":"Vardhan Green Hydrogen opens Monday","url":"/tabs/ipos/vardhanh2"}'
```

## Push on Vercel

On Vercel, the push server runs as functions in `api/`, on the same domain as the app:

| Endpoint | Purpose | Needs |
|---|---|---|
| `GET /api/vapidPublicKey` | Public key the browser subscribes with | VAPID keys |
| `POST /api/send-test` | Pushes one test notification back to the device that asked (Settings → Send test) | VAPID keys |
| `POST /api/subscribe` | Saves a device for broadcasts | Upstash Redis |
| `POST /api/notify` | Broadcasts to all saved devices; requires `Authorization: Bearer $PUSH_ADMIN_TOKEN` | Redis + token |

Environment variables (Project → Settings → Environment Variables): `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
`VAPID_SUBJECT`, `PUSH_ADMIN_TOKEN`. To create them, run `npx web-push generate-vapid-keys`, or use the values in the
git-ignored `.env.vercel.local`. Upstash, added from the Vercel Marketplace, sets `KV_REST_API_URL` and `KV_REST_API_TOKEN`.
Changing the VAPID keys stops every existing subscription from working.

## Install on a phone

PWAs need HTTPS. Deploy `www/` to Netlify, Vercel, Firebase Hosting or similar, and rewrite all routes to `index.html`. Then:
- **Android / Chrome:** an install prompt appears, or use Settings → Install.
- **iPhone (iOS 16.4+):** Share → Add to Home Screen. On iPhone, Web Push only works after the app is installed this way.

## Native iOS / Android builds (Capacitor)

```bash
npm run cap:sync
npx cap add android && npx cap open android
npx cap add ios && npx cap open ios
```

Native push needs `google-services.json` (Firebase) on Android, and the Push Notifications capability plus an APNs key on iOS.
The push server stores native tokens but only sends Web Push. To send to FCM/APNs, add `firebase-admin`.

## Going live with real data

All data comes through one interface, `MarketDataProvider` (`src/app/core/market-data.provider.ts`).
To use real data, write a class that implements it and swap it in at `src/main.ts`:

```ts
{ provide: MARKET_DATA_PROVIDER, useClass: MyApiProvider }
```

Recommendation: fetch from **your own backend** under `/api/...` rather than calling a vendor straight from the app.
That keeps API keys off the device, and `ngsw-config.json` already caches `/api/**` network-first for offline use.
Sources to look at for India: a licensed market-data vendor (e.g. via your broker's API such as Kite Connect or
Upstox) for prices, and exchange or registrar announcements for IPO details. Check each source's terms of use.
GMP is unofficial and has no authoritative feed.

## Structure

```
src/app/
  core/       models, data provider + mock, analysis engine, stores, notifications, native wrappers
  ipos/       IPO list + detail
  screener/   stock screener + detail
  watchlist/  starred items
  settings/   notifications, install, offline data
  shared/     sparkline chart, data-status banner
server/       push server (web-push)
scripts/      icon generator
```

## Disclaimer

IPO Pulse is an information and screening tool. Scores are fixed rules applied to past data. They are not
forecasts and not investment advice. Before offering analysis to the public in India, review the SEBI
Investment Adviser and Research Analyst regulations.
