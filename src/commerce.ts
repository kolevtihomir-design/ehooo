/**
 * Real-goods model
 * - Catalog item = offer from a supplier (not our warehouse)
 * - RFQ / proforma = how goods are sold (bank / Wise)
 * - Lemon Squeezy = SaaS subscription only (search access)
 */

export type Incoterm = 'EXW' | 'FOB' | 'CIF' | 'DAP' | 'DDP';

export type CatalogOffer = {
  sku: string;
  name: string;
  category: string;
  supplier_id: string;
  supplier_name: string;
  origin_country: string;
  currency: 'EUR' | 'USD' | 'CNY';
  unit_price: number;
  moq: number;
  stock_qty: number | null;
  lead_days: number;
  incoterm: Incoterm;
  weight_kg: number;
  source_feed: string;
  last_verified: string | null;
  buyable: false;
};

export type RfqStatus = 'draft' | 'sent' | 'quoted' | 'accepted' | 'invoiced' | 'paid_bank' | 'cancelled';

export type Rfq = {
  id: string;
  buyer_email: string;
  sku: string;
  qty: number;
  note: string;
  status: RfqStatus;
  quote_eur: number | null;
  created_at: string;
};

export type SaasPlan = 'starter' | 'pro' | 'business';

export const SAAS_PLANS: Record<SaasPlan, { eur: number; searches: number }> = {
  starter: { eur: 9.9, searches: 50 },
  pro: { eur: 49, searches: 9999 },
  business: { eur: 149, searches: 9999 },
};

export function assertNotCheckoutForGoods() {
  return {
    channel: 'rfq',
    lemon_squeezy: 'saas_only',
    goods_payment: ['bank_transfer', 'wise'],
  };
}
