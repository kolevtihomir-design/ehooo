// Marketing agent — picks a random active product and generates an engaging
// B2B social post for it, in the target market's language. DRY-RUN: the post
// is saved as a draft only; a human approves it, then posts it manually.

import { db } from '../db.js';
import { generateText } from './openRouterClient.js';
import { insertDraft } from './agentDb.js';
import { LANGS, pickMarket, randomMarket, type Market } from './langs.js';

function pickRandomProduct(): any {
  return db
    .prepare('SELECT * FROM products WHERE active = 1 ORDER BY RANDOM() LIMIT 1')
    .get();
}

export async function runMarketingAgent(
  market?: Market
): Promise<{ ok: boolean; draftId?: number; error?: string }> {
  try {
    const p = pickRandomProduct();
    if (!p) return { ok: false, error: 'no active products' };

    const m = market ? pickMarket(market) : randomMarket();
    const lang = LANGS[m];
    const model = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct:free';

    const content = await generateText({
      model,
      system:
        `You are a B2B marketing copywriter for AI-Pokupki, a platform that delivers ` +
        `industrial machines and equipment at factory prices. Write short, engaging ` +
        `posts for LinkedIn/Facebook. No invented claims. ` +
        `IMPORTANT: write the entire post in ${lang.name} (${lang.native}).`,
      user:
        `Write one short promotional post (3-5 sentences + 3 hashtags) for this product. ` +
        `Write it in ${lang.name}:\n` +
        `Name: ${p.name}\nCategory: ${p.category}\nPrice: €${p.negotiated_price} ` +
        `(was €${p.factory_price}, ${p.discount_pct}% off)\nDelivery: ${p.delivery_days} days.\n` +
        `Emphasize the savings and fast delivery. End with a call to contact us.`,
    });

    const draftId = insertDraft({
      agent: 'marketing',
      channel: 'social',
      product_id: p.id,
      content,
      model,
      lang: m,
    });
    console.log(`[marketing/${m}] draft #${draftId} for product ${p.id} (${p.name})`);
    return { ok: true, draftId };
  } catch (e: any) {
    console.error('[marketing] failed:', e?.message || e);
    return { ok: false, error: String(e?.message || e) };
  }
}
