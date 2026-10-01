import { Stock } from './models';

/**
 * Rule-based scoring. Every point awarded is traceable to a factor so the UI
 * can show *why* a stock scored the way it did. This is a screening aid, not
 * a recommendation.
 */

export interface Factor {
  label: string;
  value: string;
  points: number;
  max: number;
}

export interface Score {
  score: number; // 0–100
  factors: Factor[];
}

export interface Indicators {
  price: number;
  change1d: number;
  return1m: number;
  return3m: number;
  return1y: number;
  sma20: number;
  sma50: number;
  sma200: number;
  rsi14: number;
  volatility: number; // annualised
  volumeRatio: number; // 5d avg / 50d avg
  fromHigh52w: number; // negative fraction below the 52-week high
}

export interface StockAnalysis {
  stock: Stock;
  indicators: Indicators;
  shortTerm: Score;
  longTerm: Score;
}

export type Strength = 'Strong' | 'Moderate' | 'Weak';

export function strength(score: number): Strength {
  if (score >= 70) return 'Strong';
  if (score >= 50) return 'Moderate';
  return 'Weak';
}

export function strengthColor(score: number): string {
  return score >= 70 ? 'success' : score >= 50 ? 'warning' : 'danger';
}

export function analyze(stock: Stock): StockAnalysis {
  const indicators = computeIndicators(stock.history.map((c) => c.close), stock.history.map((c) => c.volume));
  return {
    stock,
    indicators,
    shortTerm: shortTermScore(indicators),
    longTerm: longTermScore(stock, indicators),
  };
}

export function computeIndicators(closes: number[], volumes: number[]): Indicators {
  const price = closes[closes.length - 1];
  return {
    price,
    change1d: pctChange(closes, 1),
    return1m: pctChange(closes, 21),
    return3m: pctChange(closes, 63),
    return1y: pctChange(closes, closes.length - 1),
    sma20: sma(closes, 20),
    sma50: sma(closes, 50),
    sma200: sma(closes, 200),
    rsi14: rsi(closes, 14),
    volatility: annualisedVolatility(closes.slice(-63)),
    volumeRatio: sma(volumes, 5) / sma(volumes, 50),
    fromHigh52w: price / Math.max(...closes.slice(-252)) - 1,
  };
}

/** Momentum and trend over weeks: trend alignment, 1M momentum, RSI zone, volume, volatility. */
export function shortTermScore(i: Indicators): Score {
  const trendPts = (i.price > i.sma20 ? 12 : 0) + (i.sma20 > i.sma50 ? 13 : 0);

  const momentumPts = scale(i.return1m, -0.08, 0.1, 0, 25);

  // RSI sweet spot is 50–65: rising but not stretched.
  let rsiPts: number;
  if (i.rsi14 >= 50 && i.rsi14 <= 65) rsiPts = 20;
  else if (i.rsi14 > 65 && i.rsi14 <= 75) rsiPts = 12;
  else if (i.rsi14 > 75) rsiPts = 4;
  else if (i.rsi14 >= 40) rsiPts = 10;
  else rsiPts = 5;

  const volumePts = scale(i.volumeRatio, 0.8, 1.6, 0, 15);
  const volPts = scale(i.volatility, 0.5, 0.2, 0, 15);

  const factors: Factor[] = [
    { label: 'Trend (price > 20D > 50D)', value: `${fmt(i.price)} / ${fmt(i.sma20)} / ${fmt(i.sma50)}`, points: trendPts, max: 25 },
    { label: '1-month momentum', value: pct(i.return1m), points: momentumPts, max: 25 },
    { label: 'RSI (14)', value: i.rsi14.toFixed(1), points: rsiPts, max: 20 },
    { label: 'Volume vs 50D avg', value: `${i.volumeRatio.toFixed(2)}×`, points: volumePts, max: 15 },
    { label: 'Volatility (3M, annualised)', value: pct(i.volatility), points: volPts, max: 15 },
  ];
  return total(factors);
}

/** Business quality, growth and valuation, plus the long-term trend. */
export function longTermScore(stock: Stock, i: Indicators): Score {
  const f = stock.fundamentals;
  const roePts = scale(f.roe, 5, 25, 0, 20);
  const debtPts = scale(f.debtToEquity, 2, 0.3, 0, 15);
  const growthPts = scale(f.revenueCagr3y, 0, 20, 0, 12.5) + scale(f.epsCagr3y, 0, 25, 0, 12.5);

  // PEG: price paid per unit of earnings growth. Loss-makers and shrinking earnings get zero.
  const peg = f.pe > 0 && f.epsCagr3y > 0 ? f.pe / f.epsCagr3y : null;
  const valuationPts = peg === null ? 0 : scale(peg, 3, 1, 0, 15);

  const trendPts = (i.price > i.sma200 ? 10 : 0) + scale(i.return1y, -0.1, 0.25, 0, 10);
  const divPts = scale(f.dividendYield, 0, 2.5, 0, 5);

  const factors: Factor[] = [
    { label: 'Return on equity', value: `${f.roe}%`, points: roePts, max: 20 },
    { label: 'Debt / equity', value: f.debtToEquity.toFixed(2), points: debtPts, max: 15 },
    { label: '3Y revenue & EPS growth', value: `${f.revenueCagr3y}% / ${f.epsCagr3y}%`, points: growthPts, max: 25 },
    { label: 'Valuation (PEG)', value: peg === null ? 'n/a' : peg.toFixed(2), points: valuationPts, max: 15 },
    { label: 'Long-term trend (200D, 1Y)', value: `${i.price > i.sma200 ? 'Above' : 'Below'} 200D, ${pct(i.return1y)}`, points: trendPts, max: 20 },
    { label: 'Dividend yield', value: `${f.dividendYield}%`, points: divPts, max: 5 },
  ];
  return total(factors);
}

export function sma(values: number[], period: number): number {
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

/** Wilder's RSI. */
export function rsi(closes: number[], period = 14): number {
  if (closes.length <= period) return 50;
  let gain = 0;
  let loss = 0;
  for (let k = 1; k <= period; k++) {
    const d = closes[k] - closes[k - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  gain /= period;
  loss /= period;
  for (let k = period + 1; k < closes.length; k++) {
    const d = closes[k] - closes[k - 1];
    gain = (gain * (period - 1) + Math.max(d, 0)) / period;
    loss = (loss * (period - 1) + Math.max(-d, 0)) / period;
  }
  if (loss === 0) return 100;
  return 100 - 100 / (1 + gain / loss);
}

export function annualisedVolatility(closes: number[]): number {
  const rets: number[] = [];
  for (let k = 1; k < closes.length; k++) rets.push(Math.log(closes[k] / closes[k - 1]));
  if (rets.length < 2) return 0;
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance = rets.reduce((a, r) => a + (r - mean) ** 2, 0) / (rets.length - 1);
  return Math.sqrt(variance * 252);
}

function pctChange(values: number[], lookback: number): number {
  const n = values.length;
  const from = values[Math.max(0, n - 1 - lookback)];
  return values[n - 1] / from - 1;
}

/** Linear map of `x` from [lo, hi] onto [outLo, outHi], clamped. `lo` may exceed `hi` for inverse scales. */
function scale(x: number, lo: number, hi: number, outLo: number, outHi: number): number {
  const t = Math.min(1, Math.max(0, (x - lo) / (hi - lo)));
  return Math.round((outLo + t * (outHi - outLo)) * 10) / 10;
}

function total(factors: Factor[]): Score {
  const score = Math.round(factors.reduce((a, f) => a + f.points, 0));
  return { score, factors };
}

function fmt(n: number): string {
  return n.toFixed(n >= 100 ? 0 : 1);
}

function pct(n: number): string {
  return `${n >= 0 ? '+' : ''}${(n * 100).toFixed(1)}%`;
}
