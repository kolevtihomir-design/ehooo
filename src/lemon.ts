/** Lemon Squeezy — ONLY SaaS plans. Never attach a physical SKU. */
import { SAAS_PLANS, type SaasPlan } from './commerce.js';

export function lemonCheckoutUrl(plan: SaasPlan, email: string) {
  const store = process.env.LEMON_STORE_ID || '';
  const variants: Record<SaasPlan, string> = {
    starter: process.env.LEMON_VARIANT_STARTER || '',
    pro: process.env.LEMON_VARIANT_PRO || '',
    business: process.env.LEMON_VARIANT_BUSINESS || '',
  };
  const variant = variants[plan];
  if (!store || !variant) {
    return {
      ok: false,
      error: 'Lemon Squeezy variants not configured',
      plan,
      price_eur: SAAS_PLANS[plan].eur,
    };
  }
  const url = new URL(`https://${store}.lemonsqueezy.com/checkout/buy/${variant}`);
  if (email) url.searchParams.set('checkout[email]', email);
  return { ok: true, url: url.toString(), plan, price_eur: SAAS_PLANS[plan].eur };
}

export function isLemonWebhookForSaas(meta: { product_type?: string }) {
  return meta.product_type !== 'physical';
}
