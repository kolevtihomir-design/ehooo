import { createHmac, timingSafeEqual } from 'node:crypto';

const TIMEOUT = 8000;
const MAX_BODY = 32_000;
const PUBLIC = new Set(['status', 'health', 'login']);
const ACTIONS = new Set(['status', 'health', 'login', 'warehouse.sync', 'platforms.search']);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CTRL = /[\u0000-\u001F\u007F]/;

export const handler = async (event = {}) => {
  if (event.requestContext?.http?.method === 'OPTIONS' || event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors(), body: '' };
  }

  const parsed = parse(event);
  if (parsed.error) return fail(400, parsed.error, parsed.details);
  const body = parsed.body;
  const action = String(body.action || fromPath(event) || 'status');

  const actionErr = validateAction(action);
  if (actionErr.length) return fail(400, 'validation failed', actionErr);

  try {
    if (action === 'login') {
      const v = validateLogin(body);
      if (v.length) return fail(400, 'validation failed', v);
      const email = clean(body.email, 120);
      const password = clean(body.password, 128);
      if (!checkPassword(email, password)) return fail(401, 'invalid credentials');
      const token = signToken({ sub: email || 'admin', role: 'admin' });
      return ok({ token, expires_in: 86400 * 7 });
    }

    if (!PUBLIC.has(action)) {
      const gate = authorize(event, body);
      if (!gate.ok) return fail(401, gate.error);
    }

    if (action === 'status' || action === 'health') {
      return ok({
        runtime: 'lambda',
        auth: 'api-key|jwt',
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
      const q = clean(body.query || body.q, 80);
      const v = validateQuery(q);
      if (v.length) return fail(400, 'validation failed', v);
      const offers = await searchPlatforms(q);
      return ok({ count: offers.length, query: q, offers });
    }
    return fail(400, 'unknown action');
  } catch (e) {
    return fail(500, e.message || 'lambda error');
  }
};

function validateAction(action) {
  if (!ACTIONS.has(action)) return [{ field: 'action', message: 'invalid action' }];
  return [];
}

function validateLogin(body) {
  const errs = [];
  const email = clean(body.email, 120);
  const password = clean(body.password, 128);
  if (!email) errs.push({ field: 'email', message: 'required' });
  else if (email !== 'admin' && !EMAIL_RE.test(email)) errs.push({ field: 'email', message: 'invalid email' });
  if (password.length < 8) errs.push({ field: 'password', message: 'min 8 chars' });
  if (CTRL.test(email) || CTRL.test(password)) errs.push({ field: 'input', message: 'control chars' });
  return errs;
}

function validateQuery(q) {
  if (!q) return [{ field: 'query', message: 'required' }];
  if (q.length < 2) return [{ field: 'query', message: 'min 2 chars' }];
  if (CTRL.test(q)) return [{ field: 'query', message: 'invalid chars' }];
  return [];
}

function clean(v, max) {
  return String(v ?? '').trim().slice(0, max);
}

function authorize(event, body) {
  const hdrs = lowerHeaders(event.headers || {});
  const bearer = (hdrs.authorization || '').replace(/^Bearer\s+/i, '').trim();
  const apiKey = clean(hdrs['x-api-key'] || body.api_key || '', 200);
  const expectedKey = process.env.API_KEY || '';
  if (expectedKey && apiKey && safeEq(apiKey, expectedKey)) return { ok: true, via: 'api-key' };
  if (bearer && verifyToken(bearer)) return { ok: true, via: 'jwt' };
  if (!expectedKey && !process.env.JWT_SECRET) return { ok: true, via: 'open-dev' };
  return { ok: false, error: 'unauthorized' };
}

function checkPassword(email, password) {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin';
  const adminPass = process.env.ADMIN_PASSWORD || '';
  if (adminPass && safeEq(password, adminPass) && (!email || email === adminEmail)) return true;
  try {
    const users = JSON.parse(process.env.API_USERS || '[]');
    return users.some((u) => u.email === email && u.password === password);
  } catch {
    return false;
  }
}

function signToken(payload) {
  const secret = process.env.JWT_SECRET || process.env.API_KEY || 'dev-secret';
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify({ ...payload, iat: unix(), exp: unix() + 86400 * 7 }));
  const sig = b64url(createHmac('sha256', secret).update(`${header}.${body}`).digest());
  return `${header}.${body}.${sig}`;
}

function verifyToken(token) {
  const secret = process.env.JWT_SECRET || process.env.API_KEY || 'dev-secret';
  const parts = String(token).split('.');
  if (parts.length !== 3) return false;
  const [h, b, s] = parts;
  const expect = b64url(createHmac('sha256', secret).update(`${h}.${b}`).digest());
  if (!safeEq(s, expect)) return false;
  try {
    const payload = JSON.parse(Buffer.from(b, 'base64url').toString());
    return !payload.exp || payload.exp > unix();
  } catch {
    return false;
  }
}

function safeEq(a, b) {
  const A = Buffer.from(String(a));
  const B = Buffer.from(String(b));
  if (A.length !== B.length) return false;
  return timingSafeEqual(A, B);
}

function unix() { return Math.floor(Date.now() / 1000); }
function b64url(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString('base64url');
}
function lowerHeaders(h) {
  const out = {};
  for (const [k, v] of Object.entries(h)) out[String(k).toLowerCase()] = v;
  return out;
}

async function pullWarehouse() {
  const custom = process.env.WAREHOUSE_API_URL;
  if (custom) {
    const data = await getJson(custom, bearerHdr(process.env.WAREHOUSE_API_KEY));
    return asList(data).map(mapItem);
  }
  const data = await getJson('https://dummyjson.com/products?limit=100');
  return (data.products || []).map(mapItem);
}

async function searchPlatforms(q) {
  const jobs = [
    getJson(`https://dummyjson.com/products/search?q=${encodeURIComponent(q)}`)
      .then(d => (d.products || []).map(p => mapOffer('dummyjson', p)))
      .catch(() => []),
    getJson('https://fakestoreapi.com/products')
      .then(d => (d || []).map(p => mapOffer('fakestore', p)))
      .catch(() => []),
  ];
  if (process.env.PLATFORM_API_URL) {
    jobs.push(
      getJson(process.env.PLATFORM_API_URL, bearerHdr(process.env.PLATFORM_API_KEY))
        .then(d => asList(d).map(p => mapOffer('custom', p)))
        .catch(() => [])
    );
  }
  const rows = (await Promise.all(jobs)).flat();
  const s = q.toLowerCase();
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
  let raw = event.body;
  if (typeof raw === 'string') {
    if (raw.length > MAX_BODY) return { error: 'payload too large', details: [{ field: 'body', message: 'max 32KB' }] };
    if (!raw.trim()) return { body: {} };
    try { raw = JSON.parse(raw); } catch { return { error: 'invalid JSON', details: [{ field: 'body', message: 'malformed JSON' }] }; }
  } else {
    raw = raw || event.queryStringParameters || {};
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { error: 'invalid body', details: [{ field: 'body', message: 'expected object' }] };
  }
  return { body: raw };
}

function fromPath(event) {
  const p = event.rawPath || event.path || '';
  if (p.includes('warehouse')) return 'warehouse.sync';
  if (p.includes('platforms')) return 'platforms.search';
  if (p.includes('login')) return 'login';
  if (p.includes('health')) return 'health';
  return '';
}

function asList(data) {
  if (Array.isArray(data)) return data;
  return data.items || data.products || data.inventory || [];
}
function bearerHdr(key) {
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
function fail(statusCode, error, details) {
  return { statusCode, headers: cors(), body: JSON.stringify({ success: false, error, details: details || undefined }) };
}
function cors() {
  return {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'authorization,content-type,x-api-key',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
  };
}
