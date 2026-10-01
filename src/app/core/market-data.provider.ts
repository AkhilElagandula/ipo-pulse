import { InjectionToken } from '@angular/core';
import { MarketSnapshot } from './models';

/**
 * Anything that can supply IPOs and stocks. Swap the mock for a real feed
 * (your own backend, a broker API, etc.) by providing a different class
 * for MARKET_DATA_PROVIDER in main.ts.
 */
export interface MarketDataProvider {
  fetchSnapshot(): Promise<MarketSnapshot>;
}

export const MARKET_DATA_PROVIDER = new InjectionToken<MarketDataProvider>('MARKET_DATA_PROVIDER');
