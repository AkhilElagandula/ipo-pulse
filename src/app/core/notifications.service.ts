import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SwPush } from '@angular/service-worker';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import { Preferences } from '@capacitor/preferences';
import { environment } from '../../environments/environment';
import { localDate } from './ipo-utils';
import { Ipo } from './models';
import { NativeService } from './native.service';

const REMINDERS_KEY = 'notifications.ipoReminders';
const PUSH_KEY = 'notifications.pushEnabled';

/**
 * Two kinds of notification:
 *  - Local reminders (IPO opens / closes), scheduled on-device. Native shells
 *    deliver these even when the app is closed; in a browser they fire while
 *    the app is open.
 *  - Remote push (new IPO announced, GMP moves, ...), sent by the push server
 *    in /server. Uses FCM/APNs on native and Web Push on the PWA.
 */
@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly native = inject(NativeService);
  private readonly swPush = inject(SwPush);

  readonly reminders = signal<string[]>([]);
  readonly pushEnabled = signal(false);

  constructor() {
    void this.load();
  }

  hasReminder(ipoId: string): boolean {
    return this.reminders().includes(ipoId);
  }

  /** Schedules "opens today" and "closes today" reminders. Returns how many were scheduled. */
  async remindIpo(ipo: Ipo): Promise<number> {
    if (!(await this.ensureLocalPermission())) return 0;
    const now = Date.now();
    const base = idFor(ipo.id);
    const candidates = [
      { id: base, at: localDate(ipo.openDate, 10, 0), title: `${ipo.name} IPO opens today`, body: `Price band ₹${ipo.priceBand[0]}–${ipo.priceBand[1]}, lot ${ipo.lotSize} shares.` },
      { id: base + 1, at: localDate(ipo.closeDate, 14, 0), title: `${ipo.name} IPO closes today`, body: 'Last day to apply. UPI mandates usually need approval by 5 PM.' },
    ].filter((n) => n.at.getTime() > now);

    if (candidates.length) {
      await LocalNotifications.schedule({
        notifications: candidates.map((n) => ({
          id: n.id,
          title: n.title,
          body: n.body,
          schedule: { at: n.at, allowWhileIdle: true },
          extra: { url: `/tabs/ipos/${ipo.id}` },
        })),
      });
    }
    await this.saveReminders([...new Set([...this.reminders(), ipo.id])]);
    return candidates.length;
  }

  async cancelIpo(ipo: Ipo): Promise<void> {
    const base = idFor(ipo.id);
    await LocalNotifications.cancel({ notifications: [{ id: base }, { id: base + 1 }] }).catch(() => undefined);
    await this.saveReminders(this.reminders().filter((id) => id !== ipo.id));
  }

  /** Fires a local notification in a few seconds so you can check the setup. */
  async sendTest(): Promise<boolean> {
    if (!(await this.ensureLocalPermission())) return false;
    await LocalNotifications.schedule({
      notifications: [{ id: 1, title: 'IPO Pulse', body: 'Notifications are working.', schedule: { at: new Date(Date.now() + 3000) } }],
    });
    return true;
  }

  /**
   * Subscribes this device to remote push and registers it with the push server.
   * Returns a short status message for the UI.
   */
  async enablePush(): Promise<string> {
    if (!environment.pushServerUrl) return "Push alerts aren't set up for this version yet. IPO reminders still work.";
    try {
      if (this.native.isNative) {
        const perm = await PushNotifications.requestPermissions();
        if (perm.receive !== 'granted') return 'Permission denied.';
        await PushNotifications.addListener('registration', (t) => {
          void this.registerWithServer({ type: 'native', platform: this.native.platform, token: t.value });
        });
        await PushNotifications.register();
      } else {
        if (!this.swPush.isEnabled) {
          return 'Web push needs the service worker, which only runs in a production build (npm run build:pwa).';
        }
        if (!('PushManager' in window)) {
          return isIos()
            ? 'On iPhone, push only works in the installed app: tap Share → Add to Home Screen, then open IPO Pulse from your home screen.'
            : "This browser doesn't support push notifications.";
        }
        const keyRes = await fetch(`${environment.pushServerUrl}/vapidPublicKey`);
        if (!keyRes.ok) {
          const detail = keyRes.status === 503 ? (await keyRes.text()).replace(/^Push is not configured: /, '') : `error ${keyRes.status}`;
          return `The push server isn't set up correctly (${detail})`;
        }
        const key = await keyRes.text();
        const sub = await this.swPush.requestSubscription({ serverPublicKey: key });
        await this.registerWithServer({ type: 'web', subscription: sub.toJSON() });
      }
      this.pushEnabled.set(true);
      await Preferences.set({ key: PUSH_KEY, value: 'true' });
      return 'Push notifications enabled.';
    } catch (e) {
      if ((e as Error).name === 'NotAllowedError' || /permission/i.test((e as Error).message)) {
        return 'Notifications are blocked. Allow them in your browser or phone settings, then try again.';
      }
      if (e instanceof TypeError) return 'Could not reach the push server.';
      return `Could not enable push: ${(e as Error).message}`;
    }
  }

  /**
   * Asks the server to push one notification back to this device after a few
   * seconds, so you can close the app and watch it arrive.
   */
  async sendTestPush(): Promise<string> {
    if (!this.swPush.isEnabled) return 'Push needs the installed or production app.';
    const sub = await firstValueFrom(this.swPush.subscription);
    if (!sub) {
      this.pushEnabled.set(false);
      return 'This device is not subscribed. Tap Enable first.';
    }
    try {
      const res = await fetch(`${environment.pushServerUrl}/send-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), delaySeconds: 5 }),
        keepalive: true,
      });
      return res.ok ? 'Sent. It should arrive in about 5 seconds, even if you close the app.' : `Push server error (${res.status}).`;
    } catch {
      return 'Sending… if you closed the app, the notification will still arrive.';
    }
  }

  private async registerWithServer(body: unknown): Promise<void> {
    await fetch(`${environment.pushServerUrl}/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  private async ensureLocalPermission(): Promise<boolean> {
    let { display } = await LocalNotifications.checkPermissions();
    if (display !== 'granted') ({ display } = await LocalNotifications.requestPermissions());
    return display === 'granted';
  }

  private async saveReminders(ids: string[]): Promise<void> {
    this.reminders.set(ids);
    await Preferences.set({ key: REMINDERS_KEY, value: JSON.stringify(ids) });
  }

  private async load(): Promise<void> {
    const [r, p] = await Promise.all([Preferences.get({ key: REMINDERS_KEY }), Preferences.get({ key: PUSH_KEY })]);
    try {
      this.reminders.set(r.value ? JSON.parse(r.value) : []);
    } catch {
      this.reminders.set([]);
    }
    this.pushEnabled.set(p.value === 'true');
  }
}

/** Stable 31-bit even id per IPO; +1 is used for the "closes" reminder. */
function idFor(ipoId: string): number {
  let h = 0;
  for (const ch of ipoId) h = (Math.imul(h, 31) + ch.charCodeAt(0)) | 0;
  return ((h & 0x1fffffff) << 1) + 2;
}

function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
