// Sales agent — generates a personalized B2B sales-email DRAFT for a product,
// in the target market's language. DRY-RUN & consent-safe: it does NOT scrape
// leads and does NOT send anything. You review and send yourself to contacts
// that agreed to be contacted (GDPR-compliant).

import { db } from '../db.js';
import { generateText } from './openRouterClient.js';
import { insertDraft } from './agentDb.js';
import { LANGS, pickMarket, randomMarket, type Market } from './langs.js';

function pickRandomProduct(): any {
  return db
    .prepare('SELECT * FROM products WHERE active = 1 ORDER BY RANDOM() LIMIT 1')
    .get();
}

export async function runSalesAgent(
  targetCompany?: string,
  market?: Market
): Promise<{ ok: boolean; draftId?: number; error?: string }> {
  try {
    const p = pickRandomProduct();
    if (!p) return { ok: false, error: 'no active products' };

    const m = market ? pickMarket(market) : randomMarket();
    const lang = LANGS[m];
    const model = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct:free';
    const who = targetCompany?.trim() || 'a company in the manufacturing sector';

    const content = await generateText({
      model,
      maxTokens: 450,
      system:
        `You are a B2B sales rep for AI-Pokupki. Write short, polite, personalized ` +
        `emails. No spam, no invented facts. Professional and helpful, not pushy. ` +
        `IMPORTANT: write the entire email in ${lang.name} (${lang.native}).`,
      user:
        `Write a short sales email (max 120 words) to ${who}, offering this product. ` +
        `Write it in ${lang.name}:\n` +
        `Name: ${p.name}\nCategory: ${p.category}\nPrice: €${p.negotiated_price} ` +
        `(${p.discount_pct}% off €${p.factory_price})\nDelivery: ${p.delivery_days} days.\n` +
        `Start with a respectful greeting, explain the value briefly, end with a clear ` +
        `call to a meeting/quote. Put a subject line as the first line prefixed with "SUBJECT:".`,
    });

    let subject: string | null = `Offer: ${p.name}`;
    let body = content;
    const mm = content.match(/^\s*SUBJECT:\s*(.+)\s*\n+([\s\S]+)$/i);
    if (mm) {
      subject = mm[1].trim();
      body = mm[2].trim();
    }

    const draftId = insertDraft({
      agent: 'sales',
      channel: 'email',
      product_id: p.id,
      subject,
      content: body,
      model,
      lang: m,
      note: targetCompany ? `target: ${targetCompany}` : null,
    });
    console.log(`[sales/${m}] draft #${draftId} for product ${p.id} (${p.name})`);
    return { ok: true, draftId };
  } catch (e: any) {
    console.error('[sales] failed:', e?.message || e);
    return { ok: false, error: String(e?.message || e) };
  }
}
