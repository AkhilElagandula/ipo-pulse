import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { analyze, StockAnalysis } from './analysis';
import { MARKET_DATA_PROVIDER } from './market-data.provider';
import { MarketSnapshot } from './models';
import { NativeService } from './native.service';

const SNAPSHOT_KEY = 'market.snapshot.v1';

/**
 * Network-first, cache-fallback store. Every successful fetch is persisted
 * on-device so the app opens with data even with no connection.
 */
@Injectable({ providedIn: 'root' })
export class MarketStore {
  private readonly provider = inject(MARKET_DATA_PROVIDER);
  private readonly native = inject(NativeService);

  readonly snapshot = signal<MarketSnapshot | null>(null);
  readonly loading = signal(false);
  /** True when what's on screen came from the on-device cache because the fetch failed. */
  readonly stale = signal(false);
  readonly error = signal<string | null>(null);

  readonly ipos = computed(() => this.snapshot()?.ipos ?? []);
  readonly analyses = computed<StockAnalysis[]>(() => (this.snapshot()?.stocks ?? []).map(analyze));

  private loaded = false;

  constructor() {
    // Refresh automatically when connectivity comes back.
    let wasOnline = this.native.online();
    effect(() => {
      const online = this.native.online();
      if (online && !wasOnline && this.loaded) void this.refresh();
      wasOnline = online;
    });
  }

  /** Loads once per session: shows cache instantly, then refreshes. */
  async init(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    const cached = await this.readCache();
    if (cached) this.snapshot.set(cached);
    await this.refresh();
  }

  async refresh(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const snap = await this.provider.fetchSnapshot();
      this.snapshot.set(snap);
      this.stale.set(false);
      await Preferences.set({ key: SNAPSHOT_KEY, value: JSON.stringify(snap) });
    } catch {
      const cached = this.snapshot() ?? (await this.readCache());
      if (cached) {
        this.snapshot.set(cached);
        this.stale.set(true);
      } else {
        this.error.set('No connection and no saved data yet. Connect once to download market data.');
      }
    } finally {
      this.loading.set(false);
    }
  }

  ipo(id: string) {
    return computed(() => this.ipos().find((i) => i.id === id) ?? null);
  }

  analysis(symbol: string) {
    return computed(() => this.analyses().find((a) => a.stock.symbol === symbol) ?? null);
  }

  private async readCache(): Promise<MarketSnapshot | null> {
    const { value } = await Preferences.get({ key: SNAPSHOT_KEY });
    if (!value) return null;
    try {
      return JSON.parse(value) as MarketSnapshot;
    } catch {
      return null;
    }
  }
}
