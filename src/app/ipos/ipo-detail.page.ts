import { DatePipe, DecimalPipe, PercentPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import {
  IonBackButton, IonBadge, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonItem, IonLabel,
  IonList, IonListHeader, IonNote, IonProgressBar, IonTitle, IonToolbar, ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { notificationsOffOutline, notificationsOutline, shareOutline, star, starOutline } from 'ionicons/icons';
import { gmpGain, ipoStatus, listingGain, minInvestment, STATUS_COLOR, STATUS_LABEL } from '../core/ipo-utils';
import { MarketStore } from '../core/market.store';
import { NativeService } from '../core/native.service';
import { NotificationsService } from '../core/notifications.service';
import { WatchlistStore } from '../core/watchlist.store';

@Component({
  selector: 'app-ipo-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonIcon, IonContent, IonList,
    IonListHeader, IonItem, IonLabel, IonNote, IonBadge, IonProgressBar, DatePipe, DecimalPipe, PercentPipe,
  ],
  templateUrl: 'ipo-detail.page.html',
})
export class IpoDetailPage {
  /** Bound from the :id route param. */
  readonly id = input.required<string>();

  private readonly store = inject(MarketStore);
  private readonly native = inject(NativeService);
  private readonly toast = inject(ToastController);
  readonly notifications = inject(NotificationsService);
  readonly watchlist = inject(WatchlistStore);

  readonly ipo = computed(() => this.store.ipos().find((i) => i.id === this.id()) ?? null);
  readonly status = computed(() => {
    const ipo = this.ipo();
    return ipo ? ipoStatus(ipo) : null;
  });
  readonly STATUS_LABEL = STATUS_LABEL;
  readonly STATUS_COLOR = STATUS_COLOR;
  readonly minInvestment = minInvestment;
  readonly gmpGain = gmpGain;
  readonly listingGain = listingGain;

  /** Subscription bars are scaled against the most-subscribed category. */
  readonly subBars = computed(() => {
    const s = this.ipo()?.subscription;
    if (!s) return [];
    const max = Math.max(s.qib, s.nii, s.retail, 1);
    return [
      { label: 'QIB', value: s.qib, ratio: s.qib / max },
      { label: 'NII (HNI)', value: s.nii, ratio: s.nii / max },
      { label: 'Retail', value: s.retail, ratio: s.retail / max },
    ];
  });

  constructor() {
    addIcons({ shareOutline, star, starOutline, notificationsOutline, notificationsOffOutline });
    void this.store.init();
  }

  async toggleStar(): Promise<void> {
    const ipo = this.ipo();
    if (!ipo) return;
    await this.native.tap();
    const added = await this.watchlist.toggleIpo(ipo.id);
    await this.say(added ? 'Added to watchlist' : 'Removed from watchlist');
  }

  async toggleReminder(): Promise<void> {
    const ipo = this.ipo();
    if (!ipo) return;
    if (this.notifications.hasReminder(ipo.id)) {
      await this.notifications.cancelIpo(ipo);
      await this.say('Reminder removed');
      return;
    }
    const n = await this.notifications.remindIpo(ipo);
    await this.native.success();
    await this.say(n ? `You'll be reminded when the IPO ${n === 2 ? 'opens and closes' : 'closes'}` : 'Allow notifications to get reminders');
  }

  async share(): Promise<void> {
    const ipo = this.ipo();
    if (!ipo) return;
    const shared = await this.native.share(
      `${ipo.name} IPO`,
      `${ipo.name} IPO: ₹${ipo.priceBand[0]}–${ipo.priceBand[1]}, ${ipo.openDate} to ${ipo.closeDate}.`,
      location.href,
    );
    if (!shared) await this.say('Copied to clipboard');
  }

  private async say(message: string): Promise<void> {
    const t = await this.toast.create({ message, duration: 1800 });
    await t.present();
  }
}
