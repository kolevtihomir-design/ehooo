import { randomUUID } from 'node:crypto';
import { db } from './db.js';
import type { Rfq, RfqStatus } from './commerce.js';

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS rfqs (
      id TEXT PRIMARY KEY,
      buyer_email TEXT NOT NULL,
      sku TEXT NOT NULL,
      qty INTEGER NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'sent',
      quote_eur REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
} catch {}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function createRfq(input: { email: string; sku: string; qty: number; note?: string }): Rfq {
  const email = String(input.email || '').trim().toLowerCase();
  const sku = String(input.sku || '').trim().slice(0, 64);
  const qty = Number(input.qty);
  if (!EMAIL.test(email)) throw Object.assign(new Error('invalid email'), { status: 400 });
  if (!sku) throw Object.assign(new Error('sku required'), { status: 400 });
  if (!Number.isInteger(qty) || qty < 1 || qty > 100000) throw Object.assign(new Error('invalid qty'), { status: 400 });

  const row: Rfq = {
    id: randomUUID(),
    buyer_email: email,
    sku,
    qty,
    note: String(input.note || '').slice(0, 500),
    status: 'sent',
    quote_eur: null,
    created_at: new Date().toISOString(),
  };
  db.prepare(`INSERT INTO rfqs (id,buyer_email,sku,qty,note,status,created_at) VALUES (?,?,?,?,?,?,?)`).run(
    row.id, row.buyer_email, row.sku, row.qty, row.note, row.status, row.created_at
  );
  return row;
}

export function listRfqs(email?: string) {
  if (email) return db.prepare('SELECT * FROM rfqs WHERE buyer_email=? ORDER BY created_at DESC').all(email);
  return db.prepare('SELECT * FROM rfqs ORDER BY created_at DESC LIMIT 200').all();
}

export function setRfqStatus(id: string, status: RfqStatus, quote_eur?: number) {
  db.prepare(`UPDATE rfqs SET status=?, quote_eur=COALESCE(?, quote_eur) WHERE id=?`).run(status, quote_eur ?? null, id);
}
