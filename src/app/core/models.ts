export type IpoSegment = 'Mainboard' | 'SME';
export type IpoStatus = 'upcoming' | 'open' | 'closed' | 'listed';

export interface IpoSubscription {
  qib: number;
  nii: number;
  retail: number;
  total: number;
}

export interface Ipo {
  id: string;
  name: string;
  symbol: string;
  exchange: 'NSE' | 'BSE' | 'NSE, BSE';
  segment: IpoSegment;
  sector: string;
  priceBand: [number, number];
  lotSize: number;
  issueSizeCr: number;
  openDate: string; // ISO date
  closeDate: string;
  allotmentDate: string;
  listingDate: string;
  /** Grey market premium in ₹ per share (unofficial). */
  gmp: number | null;
  subscription: IpoSubscription | null;
  listingPrice: number | null;
  lastPrice: number | null;
  about: string;
}

export interface Fundamentals {
  marketCapCr: number;
  pe: number;
  pb: number;
  roe: number; // %
  debtToEquity: number;
  revenueCagr3y: number; // %
  epsCagr3y: number; // %
  dividendYield: number; // %
}

export interface Candle {
  date: string;
  close: number;
  volume: number;
}

export interface Stock {
  symbol: string;
  name: string;
  sector: string;
  exchange: 'NSE' | 'BSE';
  fundamentals: Fundamentals;
  /** Daily closes, oldest first, about one trading year. */
  history: Candle[];
}

export interface MarketSnapshot {
  ipos: Ipo[];
  stocks: Stock[];
  fetchedAt: string;
  /** True when the snapshot is generated sample data rather than a live feed. */
  sample: boolean;
}
