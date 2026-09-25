# AI-Покупки — B2B Платформа

Директен B2B достъп до индустриални продукти от производителя. Без прекупвачи. Средно 31% под пазарна цена.

## Технологии

- **Frontend**: React 19, Vite, Tailwind CSS, Framer Motion, MiniSearch v7
- **Backend**: Express.js, SQLite (better-sqlite3), JWT auth
- **Плащания**: Lemon Squeezy (trial 0.99 EUR / Стартер 9.90 EUR / Про 49 EUR / Business 149 EUR)
- **Логистика**: Easyship API → weight-based fallback
- **Ценов одит**: SerpAPI Google Shopping
- **ML**: HuggingFace all-MiniLM-L6-v2 → TF-IDF fallback
- **Deployment**: Vercel (frontend) + Google Cloud Run (backend)

## Стартиране

```bash
npm install
npm run dev        # http://localhost:3000
```

## Продукция

```bash
npm run build
npm start
```

## Environment Variables

```env
LEMON_SQUEEZY_API_KEY="..."
LEMON_SQUEEZY_WEBHOOK_SECRET="..."
LEMON_SQUEEZY_STORE_ID="..."
LS_VARIANT_TRIAL="..."
LS_VARIANT_STARTER="..."
LS_VARIANT_PRO="..."
LS_VARIANT_BUSINESS="..."
EASYSHIP_API_KEY=prod_...
HF_API_TOKEN=hf_...
SERPAPI_KEY=...
ADMIN_PASSWORD=...
JWT_SECRET=...
GMAIL_USER=...
GMAIL_APP_PASSWORD=...
APP_URL=https://...
```

## Seed каталог (20,000 продукта)

```bash
npx tsx scripts/seed-20k.ts
```
