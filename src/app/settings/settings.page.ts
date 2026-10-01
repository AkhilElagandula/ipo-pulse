import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  IonButton, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonListHeader, IonNote,
  IonTitle, IonToolbar, ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { cloudDownloadOutline, downloadOutline, megaphoneOutline, notificationsOutline, phonePortraitOutline } from 'ionicons/icons';
import { MarketStore } from '../core/market.store';
import { NativeService } from '../core/native.service';
import { NotificationsService } from '../core/notifications.service';

@Component({
  selector: 'app-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonListHeader, IonItem, IonLabel, IonNote, IonButton, IonIcon, DatePipe],
  templateUrl: 'settings.page.html',
})
export class SettingsPage {
  readonly store = inject(MarketStore);
  readonly native = inject(NativeService);
  readonly notifications = inject(NotificationsService);
  private readonly toast = inject(ToastController);

  constructor() {
    addIcons({ notificationsOutline, megaphoneOutline, downloadOutline, cloudDownloadOutline, phonePortraitOutline });
    void this.store.init();
  }

  async testNotification(): Promise<void> {
    const ok = await this.notifications.sendTest();
    await this.say(ok ? 'A test notification will arrive in 3 seconds' : 'Notifications are blocked. Enable them in your browser or phone settings.');
  }

  async enablePush(): Promise<void> {
    await this.say(await this.notifications.enablePush());
  }

  async refresh(): Promise<void> {
    await this.store.refresh();
    await this.say(this.store.stale() ? 'Still offline, keeping saved data' : 'Market data updated and saved for offline use');
  }

  private async say(message: string): Promise<void> {
    const t = await this.toast.create({ message, duration: 2500 });
    await t.present();
  }
}
