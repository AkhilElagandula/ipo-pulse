import { DecimalPipe, PercentPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonContent, IonHeader, IonItem, IonLabel, IonList, IonRefresher, IonRefresherContent,
  IonSearchbar, IonSegment, IonSegmentButton, IonSelect, IonSelectOption, IonTitle, IonToolbar,
} from '@ionic/angular';
import { strength, strengthColor } from '../core/analysis';
import { MarketStore } from '../core/market.store';
import { DataStatusComponent } from '../shared/data-status.component';
import { SparklineComponent } from '../shared/sparkline.component';

export type Horizon = 'short' | 'long';

@Component({
  selector: 'app-screener',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent, IonSegment, IonSegmentButton, IonLabel, IonList, IonItem,
    IonSelect, IonSelectOption, IonSearchbar, IonRefresher, IonRefresherContent,
    RouterLink, DecimalPipe, PercentPipe, SparklineComponent, DataStatusComponent,
  ],
  templateUrl: 'screener.page.html',
})
export class ScreenerPage {
  readonly store = inject(MarketStore);

  readonly horizon = signal<Horizon>('long');
  readonly sector = signal<string>('all');
  readonly minScore = signal<number>(0);
  readonly query = signal('');

  readonly strength = strength;
  readonly strengthColor = strengthColor;

  readonly sectors = computed(() => [...new Set(this.store.analyses().map((a) => a.stock.sector))].sort());

  readonly rows = computed(() => {
    const h = this.horizon();
    const q = this.query().trim().toLowerCase();
    return this.store
      .analyses()
      .map((a) => ({ a, score: h === 'short' ? a.shortTerm.score : a.longTerm.score, spark: a.stock.history.slice(h === 'short' ? -63 : -252).map((c) => c.close) }))
      .filter(({ a, score }) =>
        score >= this.minScore() &&
        (this.sector() === 'all' || a.stock.sector === this.sector()) &&
        (!q || a.stock.name.toLowerCase().includes(q) || a.stock.symbol.toLowerCase().includes(q)),
      )
      .sort((x, y) => y.score - x.score);
  });

  constructor() {
    void this.store.init();
  }

  async onRefresh(ev: CustomEvent): Promise<void> {
    await this.store.refresh();
    (ev.target as HTMLIonRefresherElement).complete();
  }
}
