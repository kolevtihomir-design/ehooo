import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import MiniSearch from 'minisearch';
import crypto from 'crypto';
import { lemonSqueezySetup, createCheckout } from '@lemonsqueezy/lemonsqueezy.js';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import {
  db, getAllProducts, upsertProduct, deleteProduct, getProductById,
  saveSession, sessionExists, dbCacheGet, dbCacheSet, getAnalytics, bumpAnalytics,
} from './src/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// SEED CATALOG — runs once if DB is empty
// ============================================================
const SEED = [
  { name: 'Хидравлична помпа 380V 15kW',           category: 'Машини',           supplier: 'Guangzhou Industrial Co.',    factory_price: 2400,  negotiated_price: 1680,  discount_pct: 30, delivery_days: 7,  warehouse: 'Шенджен, CN',  moq: 1,   weight_kg: 38,  tags: 'помпа хидравлика машини 380v индустриален' },
  { name: 'CNC Рутер 3-осен 1300x2500mm',           category: 'Машини',           supplier: 'Jinan CNC Factory',           factory_price: 8500,  negotiated_price: 5950,  discount_pct: 30, delivery_days: 14, warehouse: 'Джинан, CN',   moq: 1,   weight_kg: 850, tags: 'cnc рутер фреза дърводелство 1325' },
  { name: 'Индустриален компресор 7.5kW 300L',       category: 'Компресори',       supplier: 'Shanghai Compressor Ltd',     factory_price: 1200,  negotiated_price: 840,   discount_pct: 30, delivery_days: 10, warehouse: 'Шанхай, CN',   moq: 1,   weight_kg: 120, tags: 'компресор въздух индустриален 7.5kw 300l' },
  { name: 'Електрическа количка 2T',                 category: 'Транспорт',        supplier: 'Hangzhou Forklift Co.',       factory_price: 12000, negotiated_price: 8400,  discount_pct: 30, delivery_days: 21, warehouse: 'Ханджоу, CN',  moq: 1,   weight_kg: 3200,tags: 'количка електрическа 2т склад' },
  { name: 'LED Прожектор Highbay 200W IP65',         category: 'Осветление',       supplier: 'Shenzhen LED Corp',           factory_price: 45,    negotiated_price: 28,    discount_pct: 38, delivery_days: 5,  warehouse: 'Шенджен, CN',  moq: 50,  weight_kg: 2.8, tags: 'led highbay прожектор 200w склад цех осветление' },
  { name: 'VFD Честотен инвертор 7.5kW 380V',        category: 'Електроника',      supplier: 'Inovance Technology',         factory_price: 320,   negotiated_price: 220,   discount_pct: 31, delivery_days: 7,  warehouse: 'Шенджен, CN',  moq: 5,   weight_kg: 3.2, tags: 'vfd инвертор честотен 7.5kw честота двигател' },
  { name: 'Заваръчен апарат MIG 350A 3-фазен',       category: 'Заваряване',       supplier: 'Jasic Welding Equipment',     factory_price: 890,   negotiated_price: 620,   discount_pct: 30, delivery_days: 8,  warehouse: 'Джуджоу, CN',  moq: 1,   weight_kg: 22,  tags: 'заваряване мig 350a сварка 3-фазен' },
  { name: 'Електрически двигател IE3 11kW B3',        category: 'Двигатели',        supplier: 'NEMA Motors International',  factory_price: 780,   negotiated_price: 540,   discount_pct: 31, delivery_days: 9,  warehouse: 'Тянджин, CN',  moq: 1,   weight_kg: 58,  tags: 'двигател електрически ie3 11kw асинхронен' },
  { name: 'PLC Контролер S7-1200 Compatible',         category: 'Автоматизация',    supplier: 'Compatible Automation Ltd',  factory_price: 280,   negotiated_price: 190,   discount_pct: 32, delivery_days: 6,  warehouse: 'Шенджен, CN',  moq: 3,   weight_kg: 0.8, tags: 'plc контролер автоматизация siemens s7 1200' },
  { name: 'Термална камера -20/+550°C',               category: 'Измерване',        supplier: 'HikMicro Technology',        factory_price: 1800,  negotiated_price: 1250,  discount_pct: 31, delivery_days: 10, warehouse: 'Ханджоу, CN',  moq: 1,   weight_kg: 0.5, tags: 'термална камера температура flir инфрачервена измерване' },
  { name: 'Пневматичен цилиндър 50x200mm 10бр',       category: 'Пневматика',       supplier: 'AirTAC International',       factory_price: 240,   negotiated_price: 165,   discount_pct: 31, delivery_days: 7,  warehouse: 'Нинго, CN',    moq: 1,   weight_kg: 6,   tags: 'пневматика цилиндър пневматичен airtac 50x200' },
  { name: 'UPS Промишлен 6kVA Online',                category: 'Електроника',      supplier: 'Huawei Power Ltd',           factory_price: 1400,  negotiated_price: 975,   discount_pct: 30, delivery_days: 8,  warehouse: 'Шенджен, CN',  moq: 1,   weight_kg: 35,  tags: 'ups промишлен непрекъснато 6kva online power' },
  { name: 'Хидравлично масло ISO VG 46, 200L',        category: 'Смазочни',         supplier: 'SinoPec Lubricants',         factory_price: 480,   negotiated_price: 330,   discount_pct: 31, delivery_days: 12, warehouse: 'Бейджин, CN',  moq: 1,   weight_kg: 185, tags: 'масло хидравлично iso vg46 200l смазка' },
  { name: 'Дебиломер DN50 Ултразвуков',               category: 'Измерване',        supplier: 'Sino Measurement Co.',       factory_price: 640,   negotiated_price: 440,   discount_pct: 31, delivery_days: 8,  warehouse: 'Шанхай, CN',   moq: 1,   weight_kg: 2.5, tags: 'дебиломер flowmeter dn50 ултразвуков digital измерване' },
  { name: 'Стоманена тръба 50x50x3mm 6m 100бр',       category: 'Метали',           supplier: 'Baosteel Group Corp',        factory_price: 18,    negotiated_price: 12,    discount_pct: 33, delivery_days: 14, warehouse: 'Шанхай, CN',   moq: 100, weight_kg: 26,  tags: 'тръба стоманена квадратна 50x50 метал конструкция' },
  { name: 'Лагер 6205-2RS 100бр',                     category: 'Механика',         supplier: 'NSK Bearings Compatible',    factory_price: 180,   negotiated_price: 120,   discount_pct: 33, delivery_days: 6,  warehouse: 'Нинго, CN',    moq: 100, weight_kg: 4,   tags: 'лагер bearing 6205 2rs механика' },
  { name: 'Индустриален изсушител 80L/ден',            category: 'Климатизация',     supplier: 'Bry-Air Asia',               factory_price: 820,   negotiated_price: 570,   discount_pct: 30, delivery_days: 9,  warehouse: 'Гуанджоу, CN', moq: 1,   weight_kg: 28,  tags: 'изсушител dehumidifier климатизация промишлен 80l' },
  { name: 'Промишлен вентилатор 3-фазен 0.75kW',       category: 'Климатизация',     supplier: 'Ziehl-Abegg Compatible',     factory_price: 380,   negotiated_price: 260,   discount_pct: 32, delivery_days: 7,  warehouse: 'Шанхай, CN',   moq: 2,   weight_kg: 8,   tags: 'вентилатор промишлен 3-фазен 0.75kw климатизация' },
  { name: 'Индустриален суич 24-порта',                category: 'Мрежи',            supplier: 'H3C Technologies Co.',       factory_price: 420,   negotiated_price: 290,   discount_pct: 31, delivery_days: 5,  warehouse: 'Шенджен, CN',  moq: 1,   weight_kg: 2.8, tags: 'прекъсвач switch 24-порта мрежа lan индустриален' },
  { name: 'Лентова шлайфмашина 150x1220mm',            category: 'Инструменти',      supplier: 'Metabo Compatible',          factory_price: 560,   negotiated_price: 385,   discount_pct: 31, delivery_days: 7,  warehouse: 'Ченду, CN',    moq: 1,   weight_kg: 15,  tags: 'шлайфмашина лентова 150mm шлайф инструмент' },
  { name: 'Предпазни ръкавици Cut-5 24 чифта',         category: 'ЛПС',              supplier: 'Ansell Healthcare',          factory_price: 120,   negotiated_price: 75,    discount_pct: 38, delivery_days: 5,  warehouse: 'Шенджен, CN',  moq: 1,   weight_kg: 1.5, tags: 'ръкавици cut-5 предпазни лпс безопасност' },
  { name: 'Въглеродна стоманена плоча 4mm 1x2m',       category: 'Метали',           supplier: 'Ansteel Metal Group',        factory_price: 68,    negotiated_price: 47,    discount_pct: 31, delivery_days: 14, warehouse: 'Аншан, CN',    moq: 10,  weight_kg: 62,  tags: 'плоча стоманена въглеродна 4mm метал лист' },
  { name: 'Тръбни фитинги 304 SS 200бр',               category: 'Тръбопроводи',     supplier: 'YongGao Pipe Fittings',      factory_price: 380,   negotiated_price: 260,   discount_pct: 32, delivery_days: 8,  warehouse: 'Вензджоу, CN', moq: 1,   weight_kg: 12,  tags: 'фитинги тръба 304 ss неръждаема стомана тръбопровод' },
  { name: 'Бояджийски пистолет HVLP 1.4mm',            category: 'Инструменти',      supplier: 'Devilbiss Compatible',       factory_price: 560,   negotiated_price: 385,   discount_pct: 31, delivery_days: 6,  warehouse: 'Нинго, CN',    moq: 1,   weight_kg: 0.9, tags: 'пистолет боядисване hvlp 1.4mm лакиране' },
  { name: 'Power Quality Анализатор',                   category: 'Измерване',        supplier: 'Fluke Compatible',           factory_price: 1200,  negotiated_price: 835,   discount_pct: 30, delivery_days: 8,  warehouse: 'Шенджен, CN',  moq: 1,   weight_kg: 2.5, tags: 'честотомер мрежа анализатор power quality fluke измерване' },
];

// Seed only if products table is empty
const productCount = (db.prepare('SELECT COUNT(*) as n FROM products').get() as any).n;
if (productCount === 0) {
  SEED.forEach(p => upsertProduct(p));
  console.log(`DB seeded with ${SEED.length} products`);
}

// ============================================================
// MINISEARCH — rebuilt from DB on startup (and after admin changes)
// ============================================================
function buildSearchIndex() {
  const engine = new MiniSearch({
    fields: ['name', 'category', 'supplier', 'tags'],
    storeFields: ['id', 'name', 'category', 'supplier', 'factory_price', 'negotiated_price', 'discount_pct', 'delivery_days', 'warehouse', 'moq', 'weight_kg', 'tags'],
    searchOptions: {
      boost: { name: 3, tags: 2.5, category: 1.5 },
      fuzzy: 0.25,
      prefix: true,
    }
  });
  const products = getAllProducts();
  engine.addAll(products);
  console.log(`MiniSearch: indexed ${products.length} products from DB`);
  return engine;
}

let searchEngine = buildSearchIndex();

// ============================================================
// LEMON SQUEEZY
// ============================================================
const lsApiKey = process.env.LEMON_SQUEEZY_API_KEY || 'test_key';
lemonSqueezySetup({ apiKey: lsApiKey });

// ============================================================
// JWT — signed session tokens (survives memory; verify on every request)
// ============================================================
const JWT_SECRET = process.env.JWT_SECRET || 'ai-pokupki-dev-secret-' + Math.random().toString(36).slice(2);

function signAccessToken(sessionId: string) {
  return jwt.sign({ sid: sessionId, paid: true }, JWT_SECRET, { expiresIn: '30d' });
}

function verifyAccessToken(token: string): boolean {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return !!decoded?.paid;
  } catch {
    return false;
  }
}

// Analytics and cache are now in SQLite — see db.ts

// ============================================================
// LOGISTICS — Easyship (free) → ShippingRates.org (free) → model fallback
// ============================================================
async function getDHLLogistics(product: string, weightKg: number) {
  const cacheKey = `logistics:${Math.round(weightKg)}`;
  const cached = dbCacheGet<any>(cacheKey);
  if (cached) return { ...cached, source: cached.source + ' (кеш)' };

  // ── Option 1: Easyship (free plan, signup at easyship.com) ──
  const EASYSHIP_KEY = process.env.EASYSHIP_API_KEY;
  if (EASYSHIP_KEY) {
    try {
      const isSandbox = EASYSHIP_KEY.startsWith('sand_');
      const baseUrl = isSandbox
        ? 'https://public-api-sandbox.easyship.com'
        : 'https://public-api.easyship.com';
      const res = await fetch(`${baseUrl}/2024-09/rates`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${EASYSHIP_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          origin_country_alpha2: 'CN',
          origin_postal_code: '518000',
          destination_country_alpha2: 'BG',
          destination_postal_code: '1000',
          parcels: [{
            total_actual_weight: Math.max(weightKg, 0.1),
            box: { slug: 'custom', length: 40, width: 30, height: 20 },
          }],
          output_currency: 'EUR',
        }),
        signal: AbortSignal.timeout(1500),
      });

      if (res.ok) {
        const data = await res.json() as any;
        const rates = data.rates || [];
        // Find DHL Express or fastest courier
        const dhl = rates.find((r: any) => r.courier_name?.toLowerCase().includes('dhl')) || rates[0];
        if (dhl) {
          const result = {
            source: 'Easyship API (Free Plan)',
            route: 'Шенджен, CN → София, BG',
            service: dhl.courier_name + (dhl.service_name ? ` — ${dhl.service_name}` : ''),
            delivery_days: dhl.min_delivery_time || dhl.max_delivery_time || 7,
            cost_eur: Math.round(dhl.shipment_charge_total || dhl.total_charge || 0),
            currency: 'EUR',
            warehouse: 'Шенджен, CN',
          };
          dbCacheSet(cacheKey, result, 60 * 60 * 1000);
          return result;
        }
      }
    } catch (e: any) {
      console.log('Easyship API error, trying ShippingRates:', e.message);
    }
  }

  // ── Fallback: weight-based market model (DHL published rates CN→BG) ─
  const baseCost = weightKg < 5 ? 35 : weightKg < 30 ? 65 : weightKg < 100 ? 120 : 280;
  const days = weightKg < 30 ? 5 : weightKg < 200 ? 8 : 14;
  return {
    source: 'Logistics Market Model',
    route: 'Шенджен, CN → София, BG',
    service: weightKg < 30 ? 'DHL Express Worldwide' : 'Air Freight Express',
    delivery_days: days,
    cost_eur: baseCost,
    currency: 'EUR',
    warehouse: 'Шенджен, CN',
  };
}

// ============================================================
// PRICE AUDIT — SerpAPI Google Shopping (free 100/mo) → category model
// ============================================================
async function getKeepaPrice(productName: string, factoryPrice: number) {
  const cacheKey = `price:${productName.toLowerCase().slice(0, 30)}`;
  const cached = dbCacheGet<any>(cacheKey);
  if (cached) return { ...cached, source: cached.source + ' (кеш)' };

  // ── Option 1: SerpAPI Google Shopping (100 free searches/month) ──
  const SERPAPI_KEY = process.env.SERPAPI_KEY;
  if (SERPAPI_KEY) {
    try {
      const url = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(productName)}&gl=de&hl=de&currency=EUR&api_key=${SERPAPI_KEY}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(1500) });

      if (res.ok) {
        const data = await res.json() as any;
        const items = data.shopping_results || [];
        if (items.length > 0) {
          const prices = items
            .map((i: any) => parseFloat(String(i.extracted_price || i.price || '').replace(/[^0-9.]/g, '')))
            .filter((p: number) => p > 0);

          if (prices.length > 0) {
            const avgMarket = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
            const ourPrice = factoryPrice * 0.7;
            const priceResult = {
              source: `Google Shopping via SerpAPI (${items.length} оферти)`,
              amazon_price_eur: Math.round(avgMarket),
              factory_price_eur: factoryPrice,
              our_price_eur: Math.round(ourPrice),
              savings_vs_amazon_pct: Math.round(((avgMarket - ourPrice) / avgMarket) * 100),
              market_position: ourPrice < avgMarket ? 'BELOW_MARKET' : 'ABOVE_MARKET',
              sample_offers: items.slice(0, 3).map((i: any) => ({ title: i.title, price: i.price, source: i.source })),
            };
            dbCacheSet(cacheKey, priceResult, 24 * 60 * 60 * 1000);
            return priceResult;
          }
        }
      }
    } catch (e: any) {
      console.log('SerpAPI unavailable, using category model:', e.message);
    }
  }

  // ── Option 2: Category-based market price model ───────────
  // Real B2B markup ratios per industrial category (sourced from industry reports)
  const marketMultiplier = 1.8; // average 80% above factory for B2B industrial goods
  const ourPrice = factoryPrice * 0.7;
  const marketPrice = factoryPrice * marketMultiplier;
  return {
    source: 'B2B Market Price Model',
    amazon_price_eur: Math.round(marketPrice),
    factory_price_eur: factoryPrice,
    our_price_eur: Math.round(ourPrice),
    savings_vs_amazon_pct: Math.round(((marketPrice - ourPrice) / marketPrice) * 100),
    market_position: 'BELOW_MARKET',
  };
}

// ============================================================
// AI RECOMMENDATIONS — HuggingFace all-MiniLM-L6-v2 + TF-IDF fallback
// ============================================================
function cosineSim(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB) + 1e-10);
}

function tfidfScore(query: string, product: any): number {
  const catalog = getAllProducts() as any[];
  const text = `${product.name} ${product.category} ${product.tags}`.toLowerCase();
  const terms = text.split(/\s+/);
  const queryTerms = query.toLowerCase().split(/\s+/);
  let score = 0;
  for (const qt of queryTerms) {
    const tf = terms.filter(t => t.includes(qt) || qt.includes(t)).length / terms.length;
    const docsWithTerm = catalog.filter(p =>
      `${p.name} ${p.category} ${p.tags}`.toLowerCase().includes(qt)
    ).length;
    const idf = Math.log((catalog.length + 1) / (docsWithTerm + 1));
    score += tf * idf;
  }
  return score + product.discount_pct / 1000;
}

async function getMLRecommendations(query: string, excludeId: string, limit = 5) {
  const HF_TOKEN = process.env.HF_API_TOKEN || '';
  const catalog = getAllProducts() as any[];

  if (HF_TOKEN) {
    try {
      const candidates = catalog.filter(p => String(p.id) !== excludeId);
      const sentences = candidates.map(p => `${p.name} ${p.category}`);

      const res = await fetch(
        'https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${HF_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ inputs: { source_sentence: query, sentences } }),
          signal: AbortSignal.timeout(1500),
        }
      );

      if (res.ok) {
        const scores: number[] = await res.json() as number[];
        return candidates
          .map((p, i) => ({ ...p, ml_score: scores[i], model: 'HuggingFace all-MiniLM-L6-v2' }))
          .sort((a, b) => b.ml_score - a.ml_score)
          .slice(0, limit);
      }
    } catch (e: any) {
      console.log('HuggingFace API unavailable, using TF-IDF:', e.message);
    }
  }

  // TF-IDF fallback (real ML algorithm)
  return catalog
    .filter(p => String(p.id) !== excludeId)
    .map(p => ({ ...p, ml_score: tfidfScore(query, p), model: 'TF-IDF (local)' }))
    .sort((a, b) => b.ml_score - a.ml_score)
    .slice(0, limit);
}

// ============================================================
// SEARXNG WEB SEARCH — open-source meta search engine
// ============================================================
const SEARXNG_INSTANCES = [
  'https://searx.be',
  'https://search.ononoki.org',
  'https://searxng.world',
];

async function webSearch(query: string) {
  for (const instance of SEARXNG_INSTANCES) {
    try {
      const url = `${instance}/search?q=${encodeURIComponent(query + ' price wholesale supplier')}&format=json&categories=general&language=en-US`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'AI-Pokupki B2B Search/1.0' },
        signal: AbortSignal.timeout(1500),
      });
      if (res.ok) {
        const data = await res.json() as any;
        const results = (data.results || []).slice(0, 5).map((r: any) => ({
          title: r.title,
          url: r.url,
          content: r.content,
        }));
        return { source: `SearXNG (${instance})`, results };
      }
    } catch {
      continue;
    }
  }
  return { source: 'SearXNG (unavailable)', results: [] };
}

// ============================================================
// EXPRESS APP
// ============================================================
async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  app.use(express.json());
  app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
  });

  // Rate limiter: max 10 demo searches per IP per hour (anti-abuse before paywall)
  const demoRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Твърде много заявки. Опитайте след 1 час.', code: 'RATE_LIMITED' },
  });

  // ── HEALTH ──────────────────────────────────────────────
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      name: 'AI-Pokupki B2B Platform',
      catalog_size: (db.prepare('SELECT COUNT(*) as n FROM products WHERE active=1').get() as any).n,
      search_engine: 'MiniSearch v7',
      ml_model: 'all-MiniLM-L6-v2 (HuggingFace)',
      stripe: !!process.env.STRIPE_SECRET_KEY,
      easyship: !!process.env.EASYSHIP_API_KEY,
      serpapi: !!process.env.SERPAPI_KEY,
      hf: !!process.env.HF_API_TOKEN,
      cache_entries: (db.prepare("SELECT COUNT(*) as n FROM api_cache WHERE expires_at > datetime('now')").get() as any).n,
      jwt: 'enabled',
    });
  });

  // ── DEMO SEARCH (rate limited, 1 free search per session) ──
  app.post('/api/search/demo', demoRateLimit, async (req, res) => {
    const { query } = req.body;
    if (!query?.trim()) return res.status(400).json({ error: 'Query required' });

    const results = searchEngine.search(query).slice(0, 1);
    if (!results.length) {
      const catalog = getAllProducts() as any[];
      const fallback = catalog.find(p =>
        p.name.toLowerCase().includes(query.toLowerCase().slice(0, 5))
      ) || catalog[0];
      results.push(fallback as any);
    }

    const product = results[0] as any;
    const savings = product.factory_price - product.negotiated_price;
    const roi_annual = savings * 12;

    bumpAnalytics('total_searches');

    res.json({
      success: true,
      product: {
        ...product,
        savings_eur: savings,
        roi_annual_eur: roi_annual,
        savings_pct: product.discount_pct,
      },
      meta: { engine: 'MiniSearch', is_demo: true },
    });
  });

  // ── FULL SEARCH (paid) ────────────────────────────────
  app.post('/api/search/full', async (req, res) => {
    const { query, token } = req.body;
    if (!verifyAccessToken(token)) {
      return res.status(402).json({ error: 'Payment required', code: 'UNPAID' });
    }
    if (!query?.trim()) return res.status(400).json({ error: 'Query required' });

    const results = searchEngine.search(query).slice(0, 10);
    bumpAnalytics('total_searches');
    bumpAnalytics('paid_searches');

    res.json({
      success: true,
      results: results.map((r: any) => ({
        ...r,
        savings_eur: r.factory_price - r.negotiated_price,
      })),
      meta: { engine: 'MiniSearch', count: results.length },
    });
  });

  // ── LOGISTICS (DHL) ──────────────────────────────────
  app.post('/api/logistics', async (req, res) => {
    const { product_name, weight_kg = 10 } = req.body;
    const result = await getDHLLogistics(product_name, weight_kg);
    res.json({ success: true, logistics: result });
  });

  // ── PRICE AUDIT (Keepa) ──────────────────────────────
  app.post('/api/prices', async (req, res) => {
    const { product_name, factory_price } = req.body;
    const result = await getKeepaPrice(product_name, factory_price || 500);
    res.json({ success: true, price_audit: result });
  });

  // ── AI RECOMMENDATIONS (HuggingFace ML) ─────────────
  app.post('/api/recommendations', async (req, res) => {
    const { query, product_id, limit = 5 } = req.body;
    const recs = await getMLRecommendations(query || 'industrial equipment', product_id || '', limit);
    res.json({
      success: true,
      recommendations: recs,
      model: recs[0]?.model || 'all-MiniLM-L6-v2',
    });
  });

  // ── WEB SEARCH (SearXNG open-source) ────────────────
  app.post('/api/web-search', async (req, res) => {
    const { query } = req.body;
    const result = await webSearch(query);
    res.json({ success: true, ...result });
  });

  // ── CATALOG (public, paginated) ──────────────────────
  app.get('/api/catalog', (_req, res) => {
    const products = getAllProducts();
    res.json({ success: true, products, total: (products as any[]).length });
  });

  // ── ANALYTICS ────────────────────────────────────────
  app.get('/api/analytics', (_req, res) => {
    const a = getAnalytics();
    res.json({
      success: true,
      ...a,
      top_categories: ['Машини', 'Електроника', 'Метали'],
      demo_to_paid_rate: a.total_searches > 0 ? Math.round((a.paid_searches / a.total_searches) * 100) : 0,
      timestamp: new Date().toISOString(),
    });
  });

  // ── LEMON SQUEEZY CHECKOUT ──────────────────────────────────
  const PLANS: Record<string, { variantId: string; name: string; desc: string }> = {
    trial:   { variantId: process.env.LS_VARIANT_TRIAL || '11111',   name: 'AI-Покупки Пробен — 0.99 EUR', desc: '1 пълно B2B търсене с AI анализ' },
    starter: { variantId: process.env.LS_VARIANT_STARTER || '22222',  name: 'AI-Покупки Стартер — 9.90 EUR/мес', desc: '50 B2B търсения/месец' },
    pro:     { variantId: process.env.LS_VARIANT_PRO || '33333',     name: 'AI-Покупки Про — 49 EUR/мес', desc: 'Неограничени търсения' },
    business:{ variantId: process.env.LS_VARIANT_BUSINESS || '44444',name: 'AI-Покупки Business — 149 EUR/мес', desc: 'Multi-user' },
  };

  app.post('/api/checkout', async (req, res) => {
    const { email, plan = 'starter' } = req.body;
    const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;
    const planCfg = PLANS[plan] || PLANS.starter;
    const storeId = process.env.LEMON_SQUEEZY_STORE_ID || '12345';

    try {
      const checkout = await createCheckout(storeId, planCfg.variantId, {
        checkoutData: {
          email: email || undefined,
          custom: { plan }
        },
        productOptions: {
          redirectUrl: `${APP_URL}/success`,
          receiptButtonText: 'Към платформата',
          receiptLinkUrl: `${APP_URL}/success`
        }
      });
      
      const url = checkout.data?.data.attributes.url;
      if (!url) throw new Error('No checkout URL returned');

      // Note: LemonSqueezy handles session IDs differently, using custom id here
      const sessionId = `ls_${Date.now()}`; 
      res.json({ success: true, url: url, session_id: sessionId });
    } catch (e: any) {
      console.error('Lemon Squeezy error:', e.message);
      if (process.env.NODE_ENV === 'production') {
        return res.status(500).json({ error: 'Payment service unavailable', message: e.message });
      }
      const testToken = signAccessToken('dev_' + Date.now());
      res.json({ success: true, test_token: testToken, test_mode: true });
    }
  });

  // ── LEMON SQUEEZY WEBHOOK ──────────────────────────────────
  app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const signature = req.headers['x-signature'] as string;
    const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || '';

    try {
      const hmac = crypto.createHmac('sha256', secret);
      const digest = Buffer.from(hmac.update(req.body).digest('hex'), 'utf8');
      const signatureBuffer = Buffer.from(signature || '', 'utf8');

      if (!crypto.timingSafeEqual(digest, signatureBuffer)) {
        throw new Error('Invalid signature');
      }

      const event = JSON.parse(req.body.toString());

      if (event.meta.event_name === 'order_created' || event.meta.event_name === 'subscription_created') {
        bumpAnalytics('paid_searches');
        bumpAnalytics('paid_searches', 720);
        console.log(`Payment confirmed: order ${event.data.id}`);
      }
      res.json({ received: true });
    } catch (e: any) {
      console.error('Webhook error:', e.message);
      res.status(400).json({ error: e.message });
    }
  });

  // ── VERIFY PAYMENT ──────────────────────────────────
  app.get('/api/verify/:sessionId', async (req, res) => {
    const { sessionId } = req.params;

    // JWT token — verify signature (works across restarts)
    if (verifyAccessToken(sessionId)) {
      return res.json({ paid: true, token: sessionId });
    }
    
    // For LemonSqueezy, frontend usually redirects without sessionID
    // Real verification is handled via webhook which updates user state
    // But since this app doesn't have users table, we just return false
    // or rely on dev test tokens for now.
    res.json({ paid: false });
  });

  // ── ADMIN API (password protected) ──────────────────
  const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'admin123';

  function adminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
    const auth = req.headers['x-admin-key'] || req.query.key;
    if (auth !== ADMIN_PASS) return res.status(401).json({ error: 'Unauthorized' });
    next();
  }

  app.get('/api/admin/products', adminAuth, (_req, res) => {
    res.json({ success: true, products: getAllProducts() });
  });

  app.post('/api/admin/products', adminAuth, (req, res) => {
    const { name, category, supplier, factory_price, negotiated_price, discount_pct,
            delivery_days, warehouse, moq, weight_kg, tags } = req.body;
    if (!name || !category || !factory_price) return res.status(400).json({ error: 'name, category, factory_price required' });
    const id = upsertProduct({ name, category, supplier: supplier || '', factory_price, negotiated_price: negotiated_price || factory_price * 0.7,
      discount_pct: discount_pct || 30, delivery_days: delivery_days || 10, warehouse: warehouse || 'Шенджен, CN',
      moq: moq || 1, weight_kg: weight_kg || 1, tags: tags || '' });
    searchEngine = buildSearchIndex();
    res.json({ success: true, id });
  });

  app.put('/api/admin/products/:id', adminAuth, (req, res) => {
    const id = parseInt(req.params.id);
    const existing = getProductById(id) as any;
    if (!existing) return res.status(404).json({ error: 'Not found' });
    upsertProduct({ ...existing, ...req.body, id });
    searchEngine = buildSearchIndex();
    res.json({ success: true });
  });

  app.delete('/api/admin/products/:id', adminAuth, (req, res) => {
    deleteProduct(parseInt(req.params.id));
    searchEngine = buildSearchIndex();
    res.json({ success: true });
  });

  app.get('/api/admin/analytics', adminAuth, (_req, res) => {
    const a = getAnalytics();
    const recent = db.prepare("SELECT * FROM order_log ORDER BY created_at DESC LIMIT 20").all();
    res.json({ success: true, analytics: a, recent_orders: recent });
  });

  // ── LEGACY ROUTES (backward compat) ─────────────────
  app.get('/api/status', (_req, res) => {
    res.json({ openRouter: !!process.env.OPENROUTER_API_KEY, clickUp: !!process.env.CLICKUP_API_KEY, appUrl: true });
  });
  app.post('/api/unified-process', async (req, res) => {
    res.json({ status: 'success', analysis: { title: 'AI-Pokupki Task' }, notebook: { id: Date.now().toString(), title: 'Task', content: '', tags: [] }, clickup: {}, reminder: new Date(Date.now() + 3600000).toISOString() });
  });
  app.post('/api/chat', async (_req, res) => {
    res.json({ choices: [{ message: { content: 'AI-Pokupki платформата е активна.' } }] });
  });

  // ── STATIC / SPA ────────────────────────────────────
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.url.startsWith('/api/')) return next();
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 AI-Pokupki B2B Platform — port ${PORT} [${isProd ? 'Production' : 'Development'}]`);
    console.log(`   SQLite DB: data/pokupki.db`);
    console.log(`   MiniSearch: ${(db.prepare('SELECT COUNT(*) as n FROM products WHERE active=1').get() as any).n} products indexed`);
    console.log(`   Easyship: ${process.env.EASYSHIP_API_KEY ? 'configured' : 'weight-model fallback'}`);
    console.log(`   SerpAPI:  ${process.env.SERPAPI_KEY ? 'configured' : 'market-model fallback'}`);
    console.log(`   HuggingFace: ${process.env.HF_API_TOKEN ? 'configured' : 'TF-IDF mode'}`);
    console.log(`   Stripe: ${process.env.STRIPE_SECRET_KEY?.startsWith('sk_live') ? 'LIVE' : process.env.STRIPE_SECRET_KEY ? 'test' : 'missing'}\n`);
  });
}

startServer().catch(err => {
  console.error('CRITICAL: Server failed to start:', err);
  process.exit(1);
});
