import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = typeof import.meta.url === 'string' && import.meta.url.startsWith('file:')
  ? fileURLToPath(import.meta.url)
  : process.argv[1];
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '..', 'data', 'pokupki.db');

fs.mkdirSync(path.join(__dirname, '..', 'data'), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    category    TEXT NOT NULL,
    supplier    TEXT NOT NULL,
    factory_price    REAL NOT NULL,
    negotiated_price REAL NOT NULL,
    discount_pct     REAL NOT NULL,
    delivery_days    INTEGER NOT NULL,
    warehouse        TEXT NOT NULL,
    moq              INTEGER NOT NULL DEFAULT 1,
    weight_kg        REAL NOT NULL DEFAULT 1,
    tags             TEXT NOT NULL DEFAULT '',
    active           INTEGER NOT NULL DEFAULT 1,
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS paid_sessions (
    token       TEXT PRIMARY KEY,
    expires_at  TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS api_cache (
    cache_key   TEXT PRIMARY KEY,
    data        TEXT NOT NULL,
    expires_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS analytics (
    id              INTEGER PRIMARY KEY CHECK (id = 1),
    total_searches  INTEGER NOT NULL DEFAULT 0,
    paid_searches   INTEGER NOT NULL DEFAULT 0,
    total_savings_eur REAL NOT NULL DEFAULT 0,
    total_orders    INTEGER NOT NULL DEFAULT 0,
    avg_discount_pct REAL NOT NULL DEFAULT 31.2,
    demo_to_paid_rate REAL NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS order_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id  INTEGER,
    query       TEXT,
    savings_eur REAL,
    token       TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  INSERT OR IGNORE INTO analytics (id, total_searches, paid_searches, total_savings_eur, total_orders)
  VALUES (1, 0, 0, 0, 0);
`);

// ── Products helpers ──────────────────────────────────────────
export function getAllProducts() {
  return db.prepare('SELECT * FROM products WHERE active = 1 ORDER BY id').all();
}

export function getProductById(id: number) {
  return db.prepare('SELECT * FROM products WHERE id = ? AND active = 1').get(id);
}

export function upsertProduct(p: {
  id?: number; name: string; category: string; supplier: string;
  factory_price: number; negotiated_price: number; discount_pct: number;
  delivery_days: number; warehouse: string; moq: number; weight_kg: number; tags: string;
}) {
  if (p.id) {
    db.prepare(`UPDATE products SET name=?,category=?,supplier=?,factory_price=?,negotiated_price=?,
      discount_pct=?,delivery_days=?,warehouse=?,moq=?,weight_kg=?,tags=?,updated_at=datetime('now')
      WHERE id=?`).run(
      p.name, p.category, p.supplier, p.factory_price, p.negotiated_price,
      p.discount_pct, p.delivery_days, p.warehouse, p.moq, p.weight_kg, p.tags, p.id
    );
    return p.id;
  }
  const res = db.prepare(`INSERT INTO products (name,category,supplier,factory_price,negotiated_price,
    discount_pct,delivery_days,warehouse,moq,weight_kg,tags) VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
    p.name, p.category, p.supplier, p.factory_price, p.negotiated_price,
    p.discount_pct, p.delivery_days, p.warehouse, p.moq, p.weight_kg, p.tags
  );
  return Number(res.lastInsertRowid);
}

export function deleteProduct(id: number) {
  db.prepare("UPDATE products SET active=0,updated_at=datetime('now') WHERE id=?").run(id);
}

// ── Session helpers ───────────────────────────────────────────
export function saveSession(token: string, days = 30) {
  const exp = new Date(Date.now() + days * 86400000).toISOString();
  db.prepare('INSERT OR REPLACE INTO paid_sessions (token, expires_at) VALUES (?,?)').run(token, exp);
}

export function sessionExists(token: string): boolean {
  const row = db.prepare("SELECT 1 FROM paid_sessions WHERE token=? AND expires_at > datetime('now')").get(token) as any;
  return !!row;
}

// ── Cache helpers ─────────────────────────────────────────────
export function dbCacheGet<T>(key: string): T | null {
  const row = db.prepare("SELECT data FROM api_cache WHERE cache_key=? AND expires_at > datetime('now')").get(key) as any;
  return row ? JSON.parse(row.data) : null;
}

export function dbCacheSet<T>(key: string, data: T, ttlMs: number) {
  const exp = new Date(Date.now() + ttlMs).toISOString();
  db.prepare('INSERT OR REPLACE INTO api_cache (cache_key,data,expires_at) VALUES (?,?,?)').run(key, JSON.stringify(data), exp);
}

// ── Analytics helpers ─────────────────────────────────────────
export function getAnalytics() {
  return db.prepare('SELECT * FROM analytics WHERE id=1').get() as any;
}

export function bumpAnalytics(field: 'total_searches' | 'paid_searches' | 'total_orders', savingsEur = 0) {
  db.prepare(`UPDATE analytics SET ${field}=${field}+1, total_savings_eur=total_savings_eur+? WHERE id=1`).run(savingsEur);
}
