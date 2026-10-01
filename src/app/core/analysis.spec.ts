import { analyze, computeIndicators, rsi, sma, strength } from './analysis';
import { ipoStatus, minInvestment } from './ipo-utils';
import { MockMarketDataProvider } from './mock-market-data.provider';
import { Ipo, Stock } from './models';

describe('analysis', () => {
  it('sma averages the trailing window', () => {
    expect(sma([1, 2, 3, 4, 5], 2)).toBe(4.5);
  });

  it('rsi is 100 for a series that only rises and low for one that only falls', () => {
    const up = Array.from({ length: 30 }, (_, i) => 100 + i);
    const down = Array.from({ length: 30 }, (_, i) => 100 - i);
    expect(rsi(up)).toBe(100);
    expect(rsi(down)).toBeLessThan(5);
  });

  it('a steady uptrend beats a steady downtrend on the short-term score', () => {
    const series = (slope: number) => Array.from({ length: 260 }, (_, i) => 100 * Math.exp(slope * i) * (1 + 0.01 * Math.sin(i)));
    const vols = Array(260).fill(1000);
    const upStock = stock(series(0.002), vols);
    const downStock = stock(series(-0.002), vols);
    expect(analyze(upStock).shortTerm.score).toBeGreaterThan(analyze(downStock).shortTerm.score);
    expect(computeIndicators(series(0.002), vols).price).toBeGreaterThan(computeIndicators(series(0.002), vols).sma200);
  });

  it('scores stay within 0–100 and factor points never exceed their max', async () => {
    const snap = await new MockMarketDataProvider().fetchSnapshot();
    for (const s of snap.stocks) {
      const a = analyze(s);
      for (const sc of [a.shortTerm, a.longTerm]) {
        expect(sc.score).toBeGreaterThanOrEqual(0);
        expect(sc.score).toBeLessThanOrEqual(100);
        expect(sc.factors.reduce((t, f) => t + f.max, 0)).toBe(100);
        for (const f of sc.factors) expect(f.points).toBeLessThanOrEqual(f.max);
      }
    }
  });

  it('loss-making companies get no valuation points', () => {
    const s = stock(Array(260).fill(100), Array(260).fill(1000));
    s.fundamentals.pe = -4;
    expect(analyze(s).longTerm.factors.find((f) => f.label.startsWith('Valuation'))!.points).toBe(0);
  });

  it('labels strength bands', () => {
    expect(strength(75)).toBe('Strong');
    expect(strength(55)).toBe('Moderate');
    expect(strength(20)).toBe('Weak');
  });
});

describe('ipo-utils', () => {
  const ipo = { openDate: '2026-10-05', closeDate: '2026-10-07', listingDate: '2026-10-10', lotSize: 45, priceBand: [312, 328] } as Ipo;

  it('derives status from dates', () => {
    expect(ipoStatus(ipo, new Date(2026, 9, 4))).toBe('upcoming');
    expect(ipoStatus(ipo, new Date(2026, 9, 7, 18))).toBe('open');
    expect(ipoStatus(ipo, new Date(2026, 9, 9))).toBe('closed');
    expect(ipoStatus(ipo, new Date(2026, 9, 10))).toBe('listed');
  });

  it('min investment is one lot at the upper band', () => {
    expect(minInvestment(ipo)).toBe(14760);
  });

  it('mock data covers every IPO status', async () => {
    const snap = await new MockMarketDataProvider().fetchSnapshot();
    expect(new Set(snap.ipos.map((i) => ipoStatus(i)))).toEqual(new Set(['upcoming', 'open', 'closed', 'listed']));
  });
});

function stock(closes: number[], volumes: number[]): Stock {
  return {
    symbol: 'TEST', name: 'Test', sector: 'Test', exchange: 'NSE',
    fundamentals: { marketCapCr: 1000, pe: 20, pb: 3, roe: 18, debtToEquity: 0.4, revenueCagr3y: 12, epsCagr3y: 15, dividendYield: 1 },
    history: closes.map((close, i) => ({ date: `d${i}`, close, volume: volumes[i] })),
  };
}
