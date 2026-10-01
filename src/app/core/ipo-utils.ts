import { Ipo, IpoStatus } from './models';

/** Parses a YYYY-MM-DD string as a local date (not UTC). */
export function localDate(iso: string, hour = 0, minute = 0): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, hour, minute);
}

export function ipoStatus(ipo: Ipo, now = new Date()): IpoStatus {
  if (now < localDate(ipo.openDate)) return 'upcoming';
  if (now < localDate(ipo.closeDate, 23, 59)) return 'open';
  if (now < localDate(ipo.listingDate)) return 'closed';
  return 'listed';
}

export function minInvestment(ipo: Ipo): number {
  return ipo.lotSize * ipo.priceBand[1];
}

/** Expected listing gain implied by GMP, as a fraction of the upper band. */
export function gmpGain(ipo: Ipo): number | null {
  return ipo.gmp === null ? null : ipo.gmp / ipo.priceBand[1];
}

/** Actual listing-day gain, for listed IPOs. */
export function listingGain(ipo: Ipo): number | null {
  return ipo.listingPrice === null ? null : ipo.listingPrice / ipo.priceBand[1] - 1;
}

export const STATUS_LABEL: Record<IpoStatus, string> = {
  upcoming: 'Upcoming',
  open: 'Open now',
  closed: 'Closed',
  listed: 'Listed',
};

export const STATUS_COLOR: Record<IpoStatus, string> = {
  upcoming: 'tertiary',
  open: 'success',
  closed: 'warning',
  listed: 'medium',
};
