import { Injectable, WritableSignal, signal } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

const STOCKS_KEY = 'watchlist.stocks';
const IPOS_KEY = 'watchlist.ipos';

/** Starred stocks and IPOs, persisted on-device. */
@Injectable({ providedIn: 'root' })
export class WatchlistStore {
  readonly stocks = signal<string[]>([]);
  readonly ipos = signal<string[]>([]);

  constructor() {
    void this.load();
  }

  hasStock(symbol: string): boolean {
    return this.stocks().includes(symbol);
  }

  hasIpo(id: string): boolean {
    return this.ipos().includes(id);
  }

  async toggleStock(symbol: string): Promise<boolean> {
    return this.toggle(this.stocks, STOCKS_KEY, symbol);
  }

  async toggleIpo(id: string): Promise<boolean> {
    return this.toggle(this.ipos, IPOS_KEY, id);
  }

  private async toggle(list: WritableSignal<string[]>, key: string, value: string): Promise<boolean> {
    const added = !list().includes(value);
    list.update((xs) => (added ? [...xs, value] : xs.filter((x) => x !== value)));
    await Preferences.set({ key, value: JSON.stringify(list()) });
    return added;
  }

  private async load(): Promise<void> {
    const [s, i] = await Promise.all([Preferences.get({ key: STOCKS_KEY }), Preferences.get({ key: IPOS_KEY })]);
    this.stocks.set(parse(s.value));
    this.ipos.set(parse(i.value));
  }
}

function parse(v: string | null): string[] {
  try {
    const x = v ? JSON.parse(v) : [];
    return Array.isArray(x) ? x : [];
  } catch {
    return [];
  }
}
