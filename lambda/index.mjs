const TIMEOUT = 8000;

export const handler = async (event = {}) => {
  const body = parse(event);
  const action = body.action || fromPath(event) || 'status';
  try {
    if (action === 'status' || action === 'health') {
      return ok({
        runtime: 'lambda',
        region: process.env.AWS_REGION || null,
        warehouse: process.env.WAREHOUSE_API_URL ? 'custom' : (process.env.WAREHOUSE_PROVIDER || 'dummyjson'),
        platform: !!process.env.PLATFORM_API_URL,
      });
    }
    if (action === 'warehouse.sync') {
      const items = await pullWarehouse();
      return ok({ fetched: items.length, items: items.slice(0, 50) });
    }
    if (action === 'platforms.search') {
      const offers = await searchPlatforms(body.query || body.q);
      return ok({ count: offers.length, offers });
    }
    return fail(400, 'unknown action');
  } catch (e) {
    return fail(500, e.message || 'lambda error');
  }
};

async function pullWarehouse() {
  const custom = process.env.WAREHOUSE_API_URL;
  if (custom) {
    const data = await getJson(custom, auth(process.env.WAREHOUSE_API_KEY));
    return asList(data).map(mapItem);
  }
  const data = await getJson('https://dummyjson.com/products?limit=100');
  return (data.products || []).map(mapItem);
}

async function searchPlatforms(q) {
  const jobs = [
    getJson(q ? `https://dummyjson.com/products/search?q=${encodeURIComponent(q)}` : 'https://dummyjson.com/products?limit=30')
      .then(d => (d.products || []).map(p => mapOffer('dummyjson', p)))
      .catch(() => []),
    getJson('https://fakestoreapi.com/products')
      .then(d => (d || []).map(p => mapOffer('fakestore', p)))
      .catch(() => []),
  ];
  if (process.env.PLATFORM_API_URL) {
    jobs.push(
      getJson(process.env.PLATFORM_API_URL, auth(process.env.PLATFORM_API_KEY))
        .then(d => asList(d).map(p => mapOffer('custom', p)))
        .catch(() => [])
    );
  }
  const rows = (await Promise.all(jobs)).flat();
  if (!q) return rows;
  const s = String(q).toLowerCase();
  return rows.filter(o => o.title.toLowerCase().includes(s));
}

function mapItem(p, i = 0) {
  const price = Number(p.price ?? p.factory_price ?? 0);
  return {
    sku: String(p.sku ?? p.id ?? i),
    name: p.title || p.name || `SKU-${i}`,
    price,
    stock_qty: Number(p.stock ?? p.stock_qty ?? 0),
    category: p.category || '',
  };
}

function mapOffer(platform, p) {
  return {
    platform,
    external_id: String(p.id ?? p.sku ?? ''),
    title: p.title || p.name || '',
    price: Number(p.price ?? p.extracted_price ?? 0),
    currency: p.currency || 'EUR',
    in_stock: (p.stock ?? p.stock_qty ?? 1) > 0,
  };
}

function parse(event) {
  if (typeof event.body === 'string') {
    try { return JSON.parse(event.body); } catch { return {}; }
  }
  return event.body || event.queryStringParameters || event;
}

function fromPath(event) {
  const p = event.rawPath || event.path || '';
  if (p.includes('warehouse')) return 'warehouse.sync';
  if (p.includes('platforms')) return 'platforms.search';
  if (p.includes('health')) return 'health';
  return '';
}

function asList(data) {
  if (Array.isArray(data)) return data;
  return data.items || data.products || data.inventory || [];
}

function auth(key) {
  return key ? { Authorization: `Bearer ${key}` } : {};
}

async function getJson(url, headers = {}) {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT) });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

function ok(body) {
  return { statusCode: 200, headers: cors(), body: JSON.stringify({ success: true, ...body }) };
}
function fail(statusCode, error) {
  return { statusCode, headers: cors(), body: JSON.stringify({ success: false, error }) };
}
function cors() {
  return { 'content-type': 'application/json', 'access-control-allow-origin': '*' };
}
