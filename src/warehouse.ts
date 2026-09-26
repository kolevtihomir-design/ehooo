export type WarehouseItem = {
  sku: string;
  name: string;
  category: string;
  supplier: string;
  factory_price: number;
  negotiated_price: number;
  discount_pct: number;
  delivery_days: number;
  warehouse: string;
  moq: number;
  weight_kg: number;
  tags: string;
  stock_qty: number;
};

export type WarehouseSyncResult = {
  provider: string;
  fetched: number;
  upserted: number;
  error?: string;
};

function num(v: unknown, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function mapExternal(raw: any, i: number): WarehouseItem {
  const price = num(raw.price ?? raw.factory_price ?? raw.unit_price, 0);
  const negotiated = num(raw.negotiated_price ?? raw.sale_price, Math.round(price * 0.7 * 100) / 100);
  const discount = price > 0 ? Math.round((1 - negotiated / price) * 100) : 0;
  const name = String(raw.name ?? raw.title ?? `SKU-${i}`);
  return {
    sku: String(raw.sku ?? raw.id ?? `EXT-${i}`),
    name,
    category: String(raw.category ?? raw.categoryName ?? 'Импорт'),
    supplier: String(raw.supplier ?? raw.brand ?? raw.provider ?? 'Warehouse API'),
    factory_price: price,
    negotiated_price: negotiated,
    discount_pct: num(raw.discount_pct, discount),
    delivery_days: num(raw.delivery_days, 10),
    warehouse: String(raw.warehouse ?? raw.location ?? 'Външен склад'),
    moq: num(raw.moq, 1),
    weight_kg: num(raw.weight_kg ?? raw.weight, 1),
    tags: String(raw.tags ?? raw.description ?? name).slice(0, 240),
    stock_qty: num(raw.stock_qty ?? raw.stock ?? raw.qty ?? raw.availability, 0),
  };
}

async function fetchCustomApi(baseUrl: string, apiKey?: string): Promise<WarehouseItem[]> {
  const url = baseUrl.replace(/\/$/, '');
  const endpoints = [`${url}/inventory`, `${url}/stock`, `${url}/products`, url];
  let lastErr = 'no endpoint';
  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, {
        headers: {
          Accept: 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        lastErr = `${ep} ${res.status}`;
        continue;
      }
      const data = await res.json();
      const rows = Array.isArray(data) ? data : data.items || data.products || data.inventory || data.data || [];
      return rows.map(mapExternal);
    } catch (e: any) {
      lastErr = e.message;
    }
  }
  throw new Error(lastErr);
}

async function fetchDummyJson(): Promise<WarehouseItem[]> {
  const res = await fetch('https://dummyjson.com/products?limit=100', {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`dummyjson ${res.status}`);
  const data = await res.json() as any;
  return (data.products || []).map((p: any, i: number) => mapExternal({
    sku: `DJ-${p.id}`,
    name: p.title,
    category: p.category,
    supplier: p.brand || 'DummyJSON WH',
    price: p.price,
    negotiated_price: Math.round(p.price * (1 - (p.discountPercentage || 0) / 100) * 100) / 100,
    discount_pct: Math.round(p.discountPercentage || 0),
    stock_qty: p.stock,
    warehouse: p.availabilityStatus || 'DummyJSON DC',
    tags: (p.tags || []).join(' '),
    weight_kg: p.weight || 1,
  }, i));
}

export async function pullWarehouse(): Promise<{ items: WarehouseItem[]; provider: string }> {
  const provider = (process.env.WAREHOUSE_PROVIDER || 'dummyjson').toLowerCase();
  const customUrl = process.env.WAREHOUSE_API_URL;
  const key = process.env.WAREHOUSE_API_KEY;

  if (customUrl) {
    const items = await fetchCustomApi(customUrl, key);
    return { items, provider: 'custom' };
  }
  if (provider === 'none' || provider === 'local') {
    return { items: [], provider: 'local' };
  }
  const items = await fetchDummyJson();
  return { items, provider: 'dummyjson' };
}
