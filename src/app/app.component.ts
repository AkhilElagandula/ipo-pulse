import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SwPush, SwUpdate } from '@angular/service-worker';
import { App } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import { IonApp, IonRouterOutlet, ToastController } from '@ionic/angular';
import { NativeService } from './core/native.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  private readonly router = inject(Router);
  private readonly native = inject(NativeService);
  private readonly toast = inject(ToastController);

  constructor() {
    this.routeNotificationTaps();
    this.offerUpdates();
    if (this.native.isNative) {
      // Android hardware back button on a root tab should leave the app, like a native app.
      App.addListener('backButton', ({ canGoBack }) => (canGoBack ? history.back() : App.exitApp()));
    }
  }

  /** Tapping any notification deep-links to the screen it's about. */
  private routeNotificationTaps(): void {
    const open = (url: unknown) => typeof url === 'string' && url.startsWith('/') && this.router.navigateByUrl(url);

    LocalNotifications.addListener('localNotificationActionPerformed', (a) => open(a.notification.extra?.url)).catch(() => undefined);
    if (this.native.isNative) {
      PushNotifications.addListener('pushNotificationActionPerformed', (a) => open(a.notification.data?.url)).catch(() => undefined);
    }
    inject(SwPush).notificationClicks.subscribe(({ notification }) => open(notification.data?.url));
  }

  /** When a new version has been downloaded by the service worker, offer to reload. */
  private offerUpdates(): void {
    const updates = inject(SwUpdate);
    if (!updates.isEnabled) return;
    updates.versionUpdates.subscribe(async (e) => {
      if (e.type !== 'VERSION_READY') return;
      const t = await this.toast.create({
        message: 'A new version is available',
        buttons: [{ text: 'Reload', handler: () => document.location.reload() }],
      });
      await t.present();
    });
  }
}
