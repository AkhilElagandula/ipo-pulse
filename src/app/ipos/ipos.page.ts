import { DatePipe, DecimalPipe, PercentPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  IonBadge, IonChip, IonContent, IonHeader, IonItem, IonLabel, IonList, IonNote, IonRefresher,
  IonRefresherContent, IonSearchbar, IonSegment, IonSegmentButton, IonSkeletonText, IonTitle, IonToolbar,
} from '@ionic/angular';
import { RouterLink } from '@angular/router';
import { gmpGain, ipoStatus, listingGain, STATUS_COLOR, STATUS_LABEL } from '../core/ipo-utils';
import { MarketStore } from '../core/market.store';
import { IpoSegment, IpoStatus } from '../core/models';
import { DataStatusComponent } from '../shared/data-status.component';

type Filter = 'current' | 'open' | 'upcoming' | 'listed';

@Component({
  selector: 'app-ipos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent, IonSearchbar, IonSegment, IonSegmentButton, IonList, IonItem,
    IonLabel, IonBadge, IonNote, IonChip, IonRefresher, IonRefresherContent, IonSkeletonText,
    RouterLink, DatePipe, DecimalPipe, PercentPipe, DataStatusComponent,
  ],
  templateUrl: 'ipos.page.html',
})
export class IposPage {
  readonly store = inject(MarketStore);

  readonly filter = signal<Filter>('current');
  readonly segment = signal<IpoSegment | 'all'>('all');
  readonly query = signal('');

  readonly STATUS_LABEL = STATUS_LABEL;
  readonly STATUS_COLOR = STATUS_COLOR;
  readonly gmpGain = gmpGain;
  readonly listingGain = listingGain;

  readonly rows = computed(() => {
    const now = new Date();
    const q = this.query().trim().toLowerCase();
    const order: Record<IpoStatus, number> = { open: 0, upcoming: 1, closed: 2, listed: 3 };
    return this.store
      .ipos()
      .map((ipo) => ({ ipo, status: ipoStatus(ipo, now) }))
      .filter(({ ipo, status }) => {
        const f = this.filter();
        if (f === 'current' && status === 'listed') return false;
        if (f !== 'current' && f !== status) return false;
        if (this.segment() !== 'all' && ipo.segment !== this.segment()) return false;
        return !q || ipo.name.toLowerCase().includes(q) || ipo.symbol.toLowerCase().includes(q) || ipo.sector.toLowerCase().includes(q);
      })
      .sort((a, b) =>
        order[a.status] - order[b.status] ||
        (a.status === 'listed' ? b.ipo.listingDate.localeCompare(a.ipo.listingDate) : a.ipo.openDate.localeCompare(b.ipo.openDate)),
      );
  });

  constructor() {
    void this.store.init();
  }

  async onRefresh(ev: CustomEvent): Promise<void> {
    await this.store.refresh();
    (ev.target as HTMLIonRefresherElement).complete();
  }

  setFilter(v: unknown): void {
    this.filter.set(v as Filter);
  }
}
