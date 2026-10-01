// Sales agent — generates a personalized B2B cold-email DRAFT for a product.
// DRY-RUN & consent-safe: it does NOT scrape leads and does NOT send anything.
// It writes a reusable draft (optionally aimed at a company name you provide),
// which you review and send yourself to contacts that have agreed to be
// contacted — keeping it GDPR-compliant.

import { db } from '../db.js';
import { generateText } from './openRouterClient.js';
import { insertDraft } from './agentDb.js';

function pickRandomProduct(): any {
  return db
    .prepare('SELECT * FROM products WHERE active = 1 ORDER BY RANDOM() LIMIT 1')
    .get();
}

export async function runSalesAgent(
  targetCompany?: string
): Promise<{ ok: boolean; draftId?: number; error?: string }> {
  try {
    const p = pickRandomProduct();
    if (!p) return { ok: false, error: 'no active products' };

    const model = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct:free';
    const who = targetCompany?.trim() || 'компания от производствения сектор';

    const content = await generateText({
      model,
      maxTokens: 450,
      system:
        'Ти си B2B търговски представител на AI-Pokupki. Пишеш кратки, учтиви ' +
        'и персонализирани имейли на български. Никакъв спам, никакви измислени ' +
        'факти. Тонът е професионален и полезен, не агресивен.',
      user:
        `Напиши кратък имейл за продажба (макс 120 думи) до ${who}, предлагащ този продукт:\n` +
        `Име: ${p.name}\nКатегория: ${p.category}\nЦена: €${p.negotiated_price} ` +
        `(отстъпка ${p.discount_pct}% от €${p.factory_price})\nДоставка: ${p.delivery_days} дни.\n` +
        `Започни с уважителен поздрав, обясни стойността накратко, и завърши с ясна покана за среща/оферта. ` +
        `Добави и ред "Относно:" на първия ред.`,
    });

    // Split "Относно:" subject line if the model included one.
    let subject: string | null = `Оферта: ${p.name}`;
    let body = content;
    const m = content.match(/^\s*Относно:\s*(.+)\s*\n+([\s\S]+)$/i);
    if (m) {
      subject = m[1].trim();
      body = m[2].trim();
    }

    const draftId = insertDraft({
      agent: 'sales',
      channel: 'email',
      product_id: p.id,
      subject,
      content: body,
      model,
      note: targetCompany ? `target: ${targetCompany}` : null,
    });
    console.log(`[sales] draft #${draftId} generated for product ${p.id} (${p.name})`);
    return { ok: true, draftId };
  } catch (e: any) {
    console.error('[sales] failed:', e?.message || e);
    return { ok: false, error: String(e?.message || e) };
  }
}
