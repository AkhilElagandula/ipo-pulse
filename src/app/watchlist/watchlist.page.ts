import { DatePipe, DecimalPipe, PercentPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonBadge, IonContent, IonHeader, IonIcon, IonItem, IonItemOption, IonItemOptions, IonItemSliding,
  IonLabel, IonList, IonListHeader, IonNote, IonTitle, IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { starOutline } from 'ionicons/icons';
import { strengthColor } from '../core/analysis';
import { ipoStatus, STATUS_COLOR, STATUS_LABEL } from '../core/ipo-utils';
import { MarketStore } from '../core/market.store';
import { WatchlistStore } from '../core/watchlist.store';
import { DataStatusComponent } from '../shared/data-status.component';
import { SparklineComponent } from '../shared/sparkline.component';

@Component({
  selector: 'app-watchlist',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonListHeader, IonItem, IonItemSliding,
    IonItemOptions, IonItemOption, IonLabel, IonNote, IonBadge, IonIcon,
    RouterLink, DatePipe, DecimalPipe, PercentPipe, SparklineComponent, DataStatusComponent,
  ],
  templateUrl: 'watchlist.page.html',
})
export class WatchlistPage {
  readonly store = inject(MarketStore);
  readonly watchlist = inject(WatchlistStore);
  readonly STATUS_LABEL = STATUS_LABEL;
  readonly STATUS_COLOR = STATUS_COLOR;
  readonly strengthColor = strengthColor;

  readonly stocks = computed(() => {
    const starred = new Set(this.watchlist.stocks());
    return this.store.analyses().filter((a) => starred.has(a.stock.symbol));
  });

  readonly ipos = computed(() => {
    const starred = new Set(this.watchlist.ipos());
    return this.store.ipos().filter((i) => starred.has(i.id)).map((ipo) => ({ ipo, status: ipoStatus(ipo) }));
  });

  readonly spark = (closes: { close: number }[]) => closes.slice(-63).map((c) => c.close);

  constructor() {
    addIcons({ starOutline });
    void this.store.init();
  }
}
