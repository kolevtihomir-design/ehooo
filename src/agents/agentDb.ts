// Agent drafts store — every piece of content an agent generates is saved here
// as a DRAFT first (dry-run). Nothing is ever sent or posted automatically;
// a human reviews and approves. This keeps the system legal (GDPR) and off the
// spam/ban radar.

import { db } from '../db.js';

db.exec(`
  CREATE TABLE IF NOT EXISTS agent_drafts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    agent       TEXT NOT NULL,          -- 'marketing' | 'sales'
    channel     TEXT NOT NULL,          -- 'social' | 'email'
    product_id  INTEGER,
    subject     TEXT,                   -- email subject (null for social)
    content     TEXT NOT NULL,          -- the generated copy
    model       TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected | sent
    note        TEXT,                   -- optional reviewer note / target
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Add the market/language column if an older DB predates it.
{
  const cols = (db.prepare('PRAGMA table_info(agent_drafts)').all() as any[]).map((c) => c.name);
  if (!cols.includes('lang')) db.exec("ALTER TABLE agent_drafts ADD COLUMN lang TEXT NOT NULL DEFAULT 'bg'");
}

export interface DraftInput {
  agent: 'marketing' | 'sales';
  channel: 'social' | 'email';
  product_id?: number | null;
  subject?: string | null;
  content: string;
  model: string;
  lang?: string;
  note?: string | null;
}

export function insertDraft(d: DraftInput): number {
  const res = db
    .prepare(
      `INSERT INTO agent_drafts (agent, channel, product_id, subject, content, model, lang, note)
       VALUES (?,?,?,?,?,?,?,?)`
    )
    .run(
      d.agent, d.channel, d.product_id ?? null, d.subject ?? null,
      d.content, d.model, d.lang ?? 'bg', d.note ?? null
    );
  return Number(res.lastInsertRowid);
}

export function listDrafts(status?: string, limit = 50) {
  if (status) {
    return db
      .prepare('SELECT * FROM agent_drafts WHERE status = ? ORDER BY id DESC LIMIT ?')
      .all(status, limit);
  }
  return db.prepare('SELECT * FROM agent_drafts ORDER BY id DESC LIMIT ?').all(limit);
}

export function getDraft(id: number) {
  return db.prepare('SELECT * FROM agent_drafts WHERE id = ?').get(id);
}

export function setDraftStatus(id: number, status: 'approved' | 'rejected' | 'sent', note?: string) {
  db.prepare(
    `UPDATE agent_drafts SET status = ?, note = COALESCE(?, note), updated_at = datetime('now') WHERE id = ?`
  ).run(status, note ?? null, id);
  return getDraft(id);
}

export function draftCounts() {
  const rows = db
    .prepare('SELECT status, COUNT(*) as n FROM agent_drafts GROUP BY status')
    .all() as any[];
  const out: Record<string, number> = { pending: 0, approved: 0, rejected: 0, sent: 0 };
  for (const r of rows) out[r.status] = r.n;
  return out;
}
