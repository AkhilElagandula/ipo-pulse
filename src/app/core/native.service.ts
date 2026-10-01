import { Injectable, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Network } from '@capacitor/network';
import { Share } from '@capacitor/share';

/**
 * Thin wrappers over Capacitor plugins. Each one works in the browser too
 * (falling back to Web APIs) and uses the real native API inside the
 * iOS/Android shell.
 */
@Injectable({ providedIn: 'root' })
export class NativeService {
  readonly isNative = Capacitor.isNativePlatform();
  readonly platform = Capacitor.getPlatform();
  readonly online = signal(typeof navigator === 'undefined' ? true : navigator.onLine);
  /** Set when the browser offers "Add to Home Screen" (Chrome/Edge/Android). */
  readonly canInstall = signal(false);
  readonly installed = signal(typeof matchMedia !== 'undefined' && matchMedia('(display-mode: standalone)').matches);

  private installPrompt: (Event & { prompt(): Promise<void> }) | null = null;

  constructor() {
    Network.getStatus().then((s) => this.online.set(s.connected)).catch(() => undefined);
    Network.addListener('networkStatusChange', (s) => this.online.set(s.connected)).catch(() => undefined);

    if (!this.isNative && typeof window !== 'undefined') {
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        this.installPrompt = e as Event & { prompt(): Promise<void> };
        this.canInstall.set(true);
      });
      window.addEventListener('appinstalled', () => {
        this.installed.set(true);
        this.canInstall.set(false);
      });
    }
  }

  async install(): Promise<void> {
    await this.installPrompt?.prompt();
    this.installPrompt = null;
    this.canInstall.set(false);
  }

  async tap(): Promise<void> {
    if (!this.isNative) return;
    await Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
  }

  async success(): Promise<void> {
    if (this.isNative) await Haptics.notification().catch(() => undefined);
    else navigator.vibrate?.(30);
  }

  /** Opens the native share sheet; returns false if sharing isn't available. */
  async share(title: string, text: string, url?: string): Promise<boolean> {
    const { value } = await Share.canShare().catch(() => ({ value: false }));
    if (!value) {
      await navigator.clipboard?.writeText(`${title}\n${text}${url ? `\n${url}` : ''}`).catch(() => undefined);
      return false;
    }
    await Share.share({ title, text, url, dialogTitle: title }).catch(() => undefined);
    return true;
  }
}
