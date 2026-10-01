import { DecimalPipe, PercentPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import {
  IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonLabel, IonListHeader,
  IonProgressBar, IonSegment, IonSegmentButton, IonTitle, IonToolbar, ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { shareOutline, star, starOutline } from 'ionicons/icons';
import { Score, strength, strengthColor } from '../core/analysis';
import { MarketStore } from '../core/market.store';
import { NativeService } from '../core/native.service';
import { WatchlistStore } from '../core/watchlist.store';
import { SparklineComponent } from '../shared/sparkline.component';

const RANGES = { '1M': 21, '3M': 63, '1Y': 252 } as const;
type Range = keyof typeof RANGES;

@Component({
  selector: 'app-stock-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonIcon, IonContent,
    IonSegment, IonSegmentButton, IonLabel, IonListHeader, IonProgressBar,
    DecimalPipe, PercentPipe, SparklineComponent,
  ],
  templateUrl: 'stock-detail.page.html',
})
export class StockDetailPage {
  /** Bound from the :symbol route param. */
  readonly symbol = input.required<string>();
  /** Bound from the ?h= query param: which horizon to show first. */
  readonly h = input<string>();

  private readonly store = inject(MarketStore);
  private readonly native = inject(NativeService);
  private readonly toast = inject(ToastController);
  readonly watchlist = inject(WatchlistStore);

  readonly range = signal<Range>('3M');
  readonly ranges = Object.keys(RANGES) as Range[];

  readonly analysis = computed(() => this.store.analyses().find((a) => a.stock.symbol === this.symbol()) ?? null);
  readonly series = computed(() => (this.analysis()?.stock.history ?? []).slice(-RANGES[this.range()]).map((c) => c.close));
  readonly rangeReturn = computed(() => {
    const s = this.series();
    return s.length > 1 ? s[s.length - 1] / s[0] - 1 : 0;
  });

  /** Short-term first if the user arrived from the short-term tab. */
  readonly scores = computed<{ title: string; score: Score }[]>(() => {
    const a = this.analysis();
    if (!a) return [];
    const short = { title: 'Short-term signal', score: a.shortTerm };
    const long = { title: 'Long-term signal', score: a.longTerm };
    return this.h() === 'short' ? [short, long] : [long, short];
  });

  readonly strength = strength;
  readonly strengthColor = strengthColor;

  constructor() {
    addIcons({ shareOutline, star, starOutline });
    void this.store.init();
  }

  async toggleStar(): Promise<void> {
    await this.native.tap();
    const added = await this.watchlist.toggleStock(this.symbol());
    const t = await this.toast.create({ message: added ? 'Added to watchlist' : 'Removed from watchlist', duration: 1500 });
    await t.present();
  }

  async share(): Promise<void> {
    const a = this.analysis();
    if (!a) return;
    await this.native.share(
      `${a.stock.symbol} on IPO Pulse`,
      `${a.stock.name}: long-term score ${a.longTerm.score}/100, short-term ${a.shortTerm.score}/100.`,
      location.href,
    );
  }
}
