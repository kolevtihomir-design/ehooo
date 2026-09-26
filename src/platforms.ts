export type PlatformId = 'dummyjson' | 'fakestore' | 'custom' | 'serpapi' | 'easyship' | 'stripe';

export type PlatformOffer = {
  platform: PlatformId | string;
  external_id: string;
  title: string;
  price: number;
  currency: string;
  url?: string;
  image?: string;
  rating?: number;
  in_stock?: boolean;
};

async function getJson(url: string, headers: Record<string, string> = {}) {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

export async function fetchDummyJsonOffers(q?: string): Promise<PlatformOffer[]> {
  const url = q
    ? `https://dummyjson.com/products/search?q=${encodeURIComponent(q)}`
    : 'https://dummyjson.com/products?limit=30';
  const data = await getJson(url) as any;
  return (data.products || []).map((p: any) => ({
    platform: 'dummyjson',
    external_id: String(p.id),
    title: p.title,
    price: Number(p.price) || 0,
    currency: 'EUR',
    image: p.thumbnail,
    rating: p.rating,
    in_stock: (p.stock || 0) > 0,
  }));
}

export async function fetchFakeStoreOffers(): Promise<PlatformOffer[]> {
  const data = await getJson('https://fakestoreapi.com/products') as any[];
  return (data || []).map((p: any) => ({
    platform: 'fakestore',
    external_id: String(p.id),
    title: p.title,
    price: Number(p.price) || 0,
    currency: 'EUR',
    image: p.image,
    rating: p.rating?.rate,
    in_stock: true,
  }));
}

export async function fetchCustomPlatform(): Promise<PlatformOffer[]> {
  const url = process.env.PLATFORM_API_URL;
  if (!url) return [];
  const key = process.env.PLATFORM_API_KEY;
  const data = await getJson(url, key ? { Authorization: `Bearer ${key}` } : {});
  const rows = Array.isArray(data) ? data : data.items || data.products || data.offers || [];
  return rows.map((p: any, i: number) => ({
    platform: 'custom',
    external_id: String(p.id ?? p.sku ?? i),
    title: String(p.title ?? p.name ?? ''),
    price: Number(p.price ?? p.negotiated_price ?? 0),
    currency: String(p.currency ?? 'EUR'),
    url: p.url,
    image: p.image,
    in_stock: p.in_stock ?? ((p.stock ?? p.stock_qty ?? 1) > 0),
  }));
}

export async function fetchSerpShopping(q: string): Promise<PlatformOffer[]> {
  const key = process.env.SERPAPI_KEY;
  if (!key || !q) return [];
  const data = await getJson(
    `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(q)}&gl=de&hl=de&currency=EUR&api_key=${key}`
  ) as any;
  return (data.shopping_results || []).slice(0, 20).map((p: any) => ({
    platform: p.source || 'serpapi',
    external_id: String(p.product_id || p.position),
    title: p.title,
    price: Number(p.extracted_price) || 0,
    currency: 'EUR',
    url: p.link,
    image: p.thumbnail,
    rating: p.rating,
    in_stock: true,
  }));
}

export function platformStatus() {
  return {
    dummyjson: true,
    fakestore: true,
    custom: !!process.env.PLATFORM_API_URL,
    serpapi: !!process.env.SERPAPI_KEY,
    easyship: !!process.env.EASYSHIP_API_KEY,
    stripe: !!process.env.STRIPE_SECRET_KEY,
  };
}

export async function searchPlatforms(query?: string) {
  const jobs: Promise<PlatformOffer[]>[] = [
    fetchDummyJsonOffers(query).catch(() => []),
    fetchFakeStoreOffers().catch(() => []),
    fetchCustomPlatform().catch(() => []),
  ];
  if (query && process.env.SERPAPI_KEY) jobs.push(fetchSerpShopping(query).catch(() => []));
  const chunks = await Promise.all(jobs);
  let offers = chunks.flat();
  if (query) {
    const q = query.toLowerCase();
    offers = offers.filter(o => o.title.toLowerCase().includes(q) || String(o.platform).toLowerCase().includes(q));
  }
  return offers;
}
