# AI-Покупки — реални стоки

```
Каталог (feed → индекс)     ≠ магазин количка
RFQ / проформа / банк   = продажба на стока
Lemon Squeezy              = само SaaS достъп (9.90 / 49 / 149 EUR)
```

Lemon Squeezy забранява physical goods и marketplace на чужди SKU.

## API
- `POST /api/rfq` `{ email, sku, qty, note }` — заявка за стока
- `GET /api/rfq?email=`
- `GET /api/billing/lemon?plan=starter` — checkout за абонамент

## Env
```
LEMON_STORE_ID=
LEMON_VARIANT_STARTER=
LEMON_VARIANT_PRO=
LEMON_VARIANT_BUSINESS=
LEMON_WEBHOOK_SECRET=
```
