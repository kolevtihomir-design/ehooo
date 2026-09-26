export type MarketId = 'bg' | 'ro' | 'gr' | 'de' | 'pl';

export type Market = {
  id: MarketId;
  host: string;
  lang: string;
  currency: 'EUR' | 'PLN';
  vat: number;
  shipZone: number;
  city: string;
  postal: string;
  companyField: string;
  checkoutLang: string;
};

export const MARKETS: Record<MarketId, Market> = {
  bg: { id: 'bg', host: 'bg.ai-pokupki.eu', lang: 'bg', currency: 'EUR', vat: 0.20, shipZone: 1.00, city: 'Sofia', postal: '1000', companyField: 'EIK', checkoutLang: 'bg' },
  ro: { id: 'ro', host: 'ro.ai-pokupki.eu', lang: 'ro', currency: 'EUR', vat: 0.19, shipZone: 1.05, city: 'Bucharest', postal: '010011', companyField: 'CUI', checkoutLang: 'ro' },
  gr: { id: 'gr', host: 'gr.ai-pokupki.eu', lang: 'el', currency: 'EUR', vat: 0.24, shipZone: 1.10, city: 'Athens', postal: '10552', companyField: 'AFM', checkoutLang: 'el' },
  de: { id: 'de', host: 'de.ai-pokupki.eu', lang: 'de', currency: 'EUR', vat: 0.19, shipZone: 1.15, city: 'Berlin', postal: '10115', companyField: 'USt-IdNr', checkoutLang: 'de' },
  pl: { id: 'pl', host: 'pl.ai-pokupki.eu', lang: 'pl', currency: 'PLN', vat: 0.23, shipZone: 1.12, city: 'Warsaw', postal: '00-001', companyField: 'NIP', checkoutLang: 'pl' },
};

export function marketFromHost(host = ''): Market {
  const h = host.toLowerCase();
  const hit = Object.values(MARKETS).find(m => h.includes(`.${m.id}.`) || h.startsWith(`${m.id}.`) || h.includes(`-${m.id}`));
  return hit || MARKETS.bg;
}

export function landedForMarket(goodsEur: number, shippingBaseEur: number, dutyEur: number, m: Market) {
  const shipping = Math.round(shippingBaseEur * m.shipZone);
  const service = Math.round(goodsEur * 0.12);
  const net = goodsEur + shipping + dutyEur + service;
  const vat = Math.round(net * m.vat);
  return { goodsEur, shipping, dutyEur, service, vat, totalEur: net + vat, currency: m.currency };
}
