/**
 * Buyer checkout for physical goods.
 * Money is authorized/escrowed, released only after carrier POD.
 * Do NOT use Lemon Squeezy for this path.
 */

export type OrderStatus =
  | 'quote'
  | 'awaiting_payment'
  | 'escrow_held'
  | 'packing'
  | 'in_transit'
  | 'delivered'
  | 'released'
  | 'refunded'
  | 'disputed';

export type ShipTo = {
  name: string;
  country: string;
  city: string;
  postal: string;
  address: string;
  kind: 'address' | 'forwarder';
  forwarder?: string;
};

export type LandedQuote = {
  goods_eur: number;
  shipping_eur: number;
  duty_eur: number;
  insurance_eur: number;
  total_eur: number;
  eta_days: number;
  carrier: string;
};

export type Order = {
  id: string;
  sku: string;
  qty: number;
  ship_to: ShipTo;
  quote: LandedQuote;
  status: OrderStatus;
  escrow_id: string | null;
  tracking: string | null;
};

export function landedCost(goods: number, weightKg: number, qty: number, destCountry: string): LandedQuote {
  const w = Math.max(weightKg * qty, 0.2);
  const zone = destCountry === 'BG' || destCountry === 'RO' || destCountry === 'GR' ? 1 : 1.35;
  const shipping = Math.round((w < 5 ? 35 : w < 30 ? 65 : w < 100 ? 120 : 280) * zone);
  const duty = Math.round(goods * qty * 0.034);
  const insurance = Math.round(goods * qty * 0.008);
  return {
    goods_eur: goods * qty,
    shipping_eur: shipping,
    duty_eur: duty,
    insurance_eur: insurance,
    total_eur: goods * qty + shipping + duty + insurance,
    eta_days: w < 30 ? 8 : 16,
    carrier: w < 30 ? 'DHL Express' : 'Air freight + forwarder',
  };
}

export const ESCROW_RULES = {
  processor: 'not_lemonsqueezy',
  hold: 'until carrier POD or forwarder inbound scan',
  release: 'auto on delivered webhook, else manual after SLA',
  refund: 'if no scan by lead_days + buffer',
};
