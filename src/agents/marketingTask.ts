// Marketing agent — picks a random active product and generates an engaging
// B2B social post for it. DRY-RUN: the post is saved as a draft only; a human
// approves it, then posts it manually (or via an approved channel later).

import { db } from '../db.js';
import { generateText } from './openRouterClient.js';
import { insertDraft } from './agentDb.js';

function pickRandomProduct(): any {
  return db
    .prepare('SELECT * FROM products WHERE active = 1 ORDER BY RANDOM() LIMIT 1')
    .get();
}

export async function runMarketingAgent(): Promise<{ ok: boolean; draftId?: number; error?: string }> {
  try {
    const p = pickRandomProduct();
    if (!p) return { ok: false, error: 'no active products' };

    const model = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.1-8b-instruct:free';
    const content = await generateText({
      model,
      system:
        'Ти си B2B маркетинг копирайтър за AI-Pokupki — платформа, която доставя ' +
        'индустриални машини и оборудване на фабрични цени. Пишеш кратки, ' +
        'ангажиращи постове на български за LinkedIn/Facebook. Без измислени твърдения.',
      user:
        `Напиши един кратък рекламен пост (3-5 изречения + 3 хаштага) за този продукт:\n` +
        `Име: ${p.name}\nКатегория: ${p.category}\nЦена: €${p.negotiated_price} ` +
        `(вместо €${p.factory_price}, отстъпка ${p.discount_pct}%)\nДоставка: ${p.delivery_days} дни.\n` +
        `Наблегни на спестяването и бързата доставка. Завърши с подкана да се свържат с нас.`,
    });

    const draftId = insertDraft({
      agent: 'marketing',
      channel: 'social',
      product_id: p.id,
      content,
      model,
    });
    console.log(`[marketing] draft #${draftId} generated for product ${p.id} (${p.name})`);
    return { ok: true, draftId };
  } catch (e: any) {
    console.error('[marketing] failed:', e?.message || e);
    return { ok: false, error: String(e?.message || e) };
  }
}
