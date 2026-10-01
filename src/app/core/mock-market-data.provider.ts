import { Injectable } from '@angular/core';
import { MarketDataProvider } from './market-data.provider';
import { Candle, Fundamentals, Ipo, IpoSubscription, MarketSnapshot, Stock } from './models';

/**
 * Generates a realistic-looking but entirely fictional Indian market:
 * company names, prices and fundamentals are made up. IPO dates are laid out
 * relative to today so every status (upcoming/open/closed/listed) is populated.
 */
@Injectable()
export class MockMarketDataProvider implements MarketDataProvider {
  async fetchSnapshot(): Promise<MarketSnapshot> {
    await new Promise((r) => setTimeout(r, 400));
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error('offline');
    }
    const today = startOfDay(new Date());
    return {
      ipos: IPO_SEEDS.map((s, i) => buildIpo(s, i, today)),
      stocks: STOCK_SEEDS.map((s, i) => buildStock(s, i, today)),
      fetchedAt: new Date().toISOString(),
      sample: true,
    };
  }
}

interface IpoSeed {
  name: string;
  symbol: string;
  segment: Ipo['segment'];
  sector: string;
  band: [number, number];
  lot: number;
  sizeCr: number;
  /** Open date relative to today, in days. */
  openOffset: number;
  gmpPct: number;
  demand: number; // overall subscription multiple once closed
  about: string;
}

const IPO_SEEDS: IpoSeed[] = [
  { name: 'Vardhan Green Hydrogen Ltd', symbol: 'VARDHANH2', segment: 'Mainboard', sector: 'Energy', band: [312, 328], lot: 45, sizeCr: 1850, openOffset: 6, gmpPct: 0.18, demand: 0, about: 'Builds electrolyser-based green hydrogen plants for fertiliser and refinery customers.' },
  { name: 'Kaveri Precision Castings Ltd', symbol: 'KAVERIPC', segment: 'SME', sector: 'Capital Goods', band: [96, 101], lot: 1200, sizeCr: 42, openOffset: 9, gmpPct: 0.35, demand: 0, about: 'Supplies investment castings to auto and defence OEMs from two plants in Coimbatore.' },
  { name: 'Nimbus Cloud Systems Ltd', symbol: 'NIMBUSCLD', segment: 'Mainboard', sector: 'IT Services', band: [540, 568], lot: 26, sizeCr: 2420, openOffset: 13, gmpPct: 0.09, demand: 0, about: 'Managed cloud and data-centre services for BFSI clients.' },
  { name: 'Sahyadri Agro Foods Ltd', symbol: 'SAHYAGRO', segment: 'Mainboard', sector: 'FMCG', band: [215, 226], lot: 66, sizeCr: 760, openOffset: -1, gmpPct: 0.22, demand: 6.4, about: 'Packaged pulses, millets and ready-to-cook mixes sold across western India.' },
  { name: 'Orbitron Defence Electronics Ltd', symbol: 'ORBITRON', segment: 'Mainboard', sector: 'Defence', band: [710, 748], lot: 20, sizeCr: 1320, openOffset: -2, gmpPct: 0.41, demand: 38.2, about: 'Radar sub-systems and electronic warfare modules for the armed forces.' },
  { name: 'Lotus Micro Finance Ltd', symbol: 'LOTUSMFI', segment: 'Mainboard', sector: 'Financials', band: [122, 128], lot: 117, sizeCr: 980, openOffset: -4, gmpPct: -0.03, demand: 1.7, about: 'Joint-liability group loans to women entrepreneurs in tier-3 towns.' },
  { name: 'Tejas Cold Chain Logistics Ltd', symbol: 'TEJASCOLD', segment: 'SME', sector: 'Logistics', band: [58, 61], lot: 2000, sizeCr: 28, openOffset: -6, gmpPct: 0.52, demand: 212.5, about: 'Refrigerated trucking and warehousing for pharma and dairy.' },
  { name: 'Aarohan Hospitals Ltd', symbol: 'AAROHAN', segment: 'Mainboard', sector: 'Healthcare', band: [402, 423], lot: 35, sizeCr: 3100, openOffset: -14, gmpPct: 0.12, demand: 14.9, about: 'Chain of 11 multi-speciality hospitals across Telangana and Karnataka.' },
  { name: 'Brightpath EdTech Ltd', symbol: 'BRIGHTPATH', segment: 'Mainboard', sector: 'Education', band: [180, 190], lot: 78, sizeCr: 640, openOffset: -21, gmpPct: -0.08, demand: 0.9, about: 'Test-prep platform for engineering and medical entrance exams.' },
  { name: 'Shakti Solar Glass Ltd', symbol: 'SHAKTISG', segment: 'Mainboard', sector: 'Energy', band: [265, 279], lot: 53, sizeCr: 1450, openOffset: -30, gmpPct: 0.31, demand: 72.3, about: 'Tempered and anti-reflective glass for solar modules.' },
  { name: 'Mehta Specialty Chemicals Ltd', symbol: 'MEHTACHEM', segment: 'SME', sector: 'Chemicals', band: [140, 147], lot: 1000, sizeCr: 36, openOffset: -40, gmpPct: 0.15, demand: 44.0, about: 'Speciality intermediates for agrochemical formulators.' },
];

interface StockSeed {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  drift: number; // annual
  vol: number; // annual
  f: Fundamentals;
}

const f = (marketCapCr: number, pe: number, pb: number, roe: number, debtToEquity: number, revenueCagr3y: number, epsCagr3y: number, dividendYield: number): Fundamentals =>
  ({ marketCapCr, pe, pb, roe, debtToEquity, revenueCagr3y, epsCagr3y, dividendYield });

const STOCK_SEEDS: StockSeed[] = [
  { symbol: 'INDRAPOWER', name: 'Indra Power Grid', sector: 'Utilities', price: 342, drift: 0.14, vol: 0.2, f: f(98000, 17, 2.9, 18, 1.4, 11, 13, 2.8) },
  { symbol: 'GANGAFIN', name: 'Ganga Finance', sector: 'Financials', price: 1580, drift: 0.22, vol: 0.26, f: f(124000, 24, 4.1, 19, 3.8, 24, 27, 0.5) },
  { symbol: 'MERIDIANIT', name: 'Meridian Infotech', sector: 'IT Services', price: 1745, drift: 0.05, vol: 0.22, f: f(212000, 26, 7.8, 31, 0.05, 9, 8, 2.1) },
  { symbol: 'SURYAAUTO', name: 'Surya Auto Components', sector: 'Auto', price: 860, drift: 0.32, vol: 0.3, f: f(41000, 34, 6.2, 21, 0.3, 22, 29, 0.6) },
  { symbol: 'NANDIDAIRY', name: 'Nandi Dairy Products', sector: 'FMCG', price: 512, drift: 0.09, vol: 0.18, f: f(36000, 48, 11.5, 24, 0.1, 12, 10, 1.2) },
  { symbol: 'VAJRASTEEL', name: 'Vajra Steel', sector: 'Metals', price: 148, drift: -0.12, vol: 0.38, f: f(52000, 9, 1.1, 8, 1.9, 4, -6, 3.4) },
  { symbol: 'AYUSHPHARMA', name: 'Ayush Pharma Labs', sector: 'Healthcare', price: 1220, drift: 0.27, vol: 0.24, f: f(67000, 29, 5.0, 19, 0.15, 17, 21, 0.8) },
  { symbol: 'KRISHIFERT', name: 'Krishi Fertilisers', sector: 'Chemicals', price: 278, drift: 0.02, vol: 0.28, f: f(18000, 13, 1.8, 13, 0.7, 6, 3, 2.5) },
  { symbol: 'SETUINFRA', name: 'Setu Infra Projects', sector: 'Construction', price: 96, drift: 0.4, vol: 0.45, f: f(9200, 41, 3.6, 9, 1.6, 28, 35, 0) },
  { symbol: 'PRAGATIBANK', name: 'Pragati Bank', sector: 'Financials', price: 728, drift: 0.12, vol: 0.21, f: f(186000, 14, 2.2, 15, 0, 15, 18, 1.1) },
  { symbol: 'ANANTTELE', name: 'Anant Telecom', sector: 'Telecom', price: 64, drift: -0.2, vol: 0.42, f: f(28000, -1, 0.9, -12, 4.5, -3, -40, 0) },
  { symbol: 'RATNAJEWEL', name: 'Ratna Jewellers', sector: 'Consumer', price: 2310, drift: 0.35, vol: 0.27, f: f(54000, 52, 14.0, 28, 0.6, 26, 31, 0.3) },
  { symbol: 'VAYUAERO', name: 'Vayu Aerospace', sector: 'Defence', price: 3895, drift: 0.45, vol: 0.33, f: f(72000, 61, 12.0, 22, 0.05, 30, 38, 0.4) },
  { symbol: 'KSHITIJREAL', name: 'Kshitij Realty', sector: 'Real Estate', price: 418, drift: 0.08, vol: 0.36, f: f(15500, 38, 2.4, 7, 0.9, 14, 9, 0.2) },
  { symbol: 'AMRITBEV', name: 'Amrit Beverages', sector: 'FMCG', price: 945, drift: 0.18, vol: 0.2, f: f(48000, 39, 9.4, 26, 0.2, 16, 19, 1.0) },
  { symbol: 'DHRUVCHEM', name: 'Dhruv Specialty Chem', sector: 'Chemicals', price: 1612, drift: -0.05, vol: 0.29, f: f(23000, 33, 4.4, 14, 0.4, 7, -2, 0.7) },
];

function buildIpo(s: IpoSeed, index: number, today: Date): Ipo {
  const open = addDays(today, s.openOffset);
  const close = addDays(open, 2);
  const allotment = addDays(close, 1);
  const listing = addDays(close, 3);
  const rand = mulberry32(index * 7919 + 17);
  const upper = s.band[1];
  const started = s.openOffset <= 0;
  const closed = addDays(close, 1) <= today;
  const listed = listing <= today;

  let subscription: IpoSubscription | null = null;
  if (started) {
    // Subscription builds up over the bidding window.
    const elapsed = closed ? 1 : Math.min(1, (daysBetween(open, today) + 1) / 3);
    const total = (s.demand || 3) * elapsed;
    subscription = {
      qib: round(total * (1.2 + rand() * 0.8), 2),
      nii: round(total * (0.9 + rand() * 0.9), 2),
      retail: round(total * (0.4 + rand() * 0.5), 2),
      total: round(total, 2),
    };
  }

  let listingPrice: number | null = null;
  let lastPrice: number | null = null;
  if (listed) {
    listingPrice = round(upper * (1 + s.gmpPct * (0.7 + rand() * 0.6)), 2);
    lastPrice = round(listingPrice * (0.85 + rand() * 0.35), 2);
  }

  return {
    id: s.symbol.toLowerCase(),
    name: s.name,
    symbol: s.symbol,
    exchange: s.segment === 'SME' ? 'NSE' : 'NSE, BSE',
    segment: s.segment,
    sector: s.sector,
    priceBand: s.band,
    lotSize: s.lot,
    issueSizeCr: s.sizeCr,
    openDate: isoDate(open),
    closeDate: isoDate(close),
    allotmentDate: isoDate(allotment),
    listingDate: isoDate(listing),
    gmp: listed ? null : Math.round(upper * s.gmpPct),
    subscription,
    listingPrice,
    lastPrice,
    about: s.about,
  };
}

function buildStock(s: StockSeed, index: number, today: Date): Stock {
  const rand = mulberry32(index * 104729 + 3);
  const days = 260;
  const dt = 1 / 252;
  const closes: number[] = [];
  // Walk backwards from today's price so the series ends at s.price.
  let p = s.price;
  for (let i = 0; i < days; i++) {
    closes.unshift(p);
    const shock = gaussian(rand) * s.vol * Math.sqrt(dt);
    p = p / Math.exp((s.drift - 0.5 * s.vol * s.vol) * dt + shock);
  }
  const dates = tradingDaysEndingAt(today, days);
  const baseVol = Math.round(s.f.marketCapCr * 25 / s.price);
  const history: Candle[] = closes.map((close, i) => {
    const move = i > 0 ? Math.abs(close / closes[i - 1] - 1) : 0;
    return {
      date: dates[i],
      close: round(close, 2),
      volume: Math.round(baseVol * (0.6 + rand() * 0.8) * (1 + move * 20)),
    };
  });
  return { symbol: s.symbol, name: s.name, sector: s.sector, exchange: 'NSE', fundamentals: s.f, history };
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rand: () => number): number {
  const u = Math.max(rand(), 1e-9);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

function tradingDaysEndingAt(end: Date, count: number): string[] {
  const out: string[] = [];
  const d = new Date(end);
  while (out.length < count) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) out.unshift(isoDate(d));
    d.setDate(d.getDate() - 1);
  }
  return out;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function isoDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function round(n: number, dp: number): number {
  const k = 10 ** dp;
  return Math.round(n * k) / k;
}
