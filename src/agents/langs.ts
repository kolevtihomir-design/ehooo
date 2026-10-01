// Per-market language config for the agents. Matches the 5 target markets in
// src/markets.ts (BG, RO, GR/EL, DE, PL). The agents generate copy directly in
// the market's language so each country's content is native.

export type Market = 'bg' | 'ro' | 'el' | 'de' | 'pl';

export const LANGS: Record<Market, { name: string; native: string }> = {
  bg: { name: 'Bulgarian', native: 'български' },
  ro: { name: 'Romanian', native: 'limba română' },
  el: { name: 'Greek', native: 'ελληνικά' },
  de: { name: 'German', native: 'Deutsch' },
  pl: { name: 'Polish', native: 'polski' },
};

export const ALL_MARKETS: Market[] = ['bg', 'ro', 'el', 'de', 'pl'];

export function isMarket(x: unknown): x is Market {
  return typeof x === 'string' && (ALL_MARKETS as string[]).includes(x);
}

export function pickMarket(x?: unknown): Market {
  return isMarket(x) ? x : 'bg';
}

export function randomMarket(): Market {
  return ALL_MARKETS[Math.floor(Math.random() * ALL_MARKETS.length)];
}
