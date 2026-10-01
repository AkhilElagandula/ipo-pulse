import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { cloudOfflineOutline, flaskOutline } from 'ionicons/icons';
import { MarketStore } from '../core/market.store';
import { NativeService } from '../core/native.service';

/** Banner explaining where the data on screen came from. */
@Component({
  selector: 'app-data-status',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon, DatePipe],
  template: `
    @if (!native.online() || store.stale()) {
      <div class="banner banner-offline">
        <ion-icon name="cloud-offline-outline" aria-hidden="true"></ion-icon>
        <span>Offline · showing data saved {{ store.snapshot()?.fetchedAt | date: 'd MMM, h:mm a' }}</span>
      </div>
    } @else if (store.snapshot()?.sample) {
      <div class="banner banner-sample">
        <ion-icon name="flask-outline" aria-hidden="true"></ion-icon>
        <span>Sample data · fictional companies for demo purposes</span>
      </div>
    }
  `,
})
export class DataStatusComponent {
  readonly store = inject(MarketStore);
  readonly native = inject(NativeService);

  constructor() {
    addIcons({ cloudOfflineOutline, flaskOutline });
  }
}
