// Agent scheduler — runs the content agents on a cron cadence.
//
// SAFETY: Phase 1 is DRY-RUN only. Agents generate drafts into the DB; nothing
// is ever sent or posted automatically. A human approves drafts via the admin
// API. Enable with AGENTS_ENABLED=1. Requires OPENROUTER_API_KEY.

import cron from 'node-cron';
import { runMarketingAgent } from './marketingTask.js';
import { runSalesAgent } from './salesTask.js';

export function startAgents(): void {
  if (process.env.AGENTS_ENABLED !== '1') {
    console.log('   Agents: disabled (set AGENTS_ENABLED=1 to turn on)');
    return;
  }
  if (!process.env.OPENROUTER_API_KEY) {
    console.log('   Agents: OPENROUTER_API_KEY missing — not started');
    return;
  }

  // Marketing: every 4 hours. Generates one social post draft.
  cron.schedule('0 */4 * * *', () => {
    runMarketingAgent();
  });

  // Sales: once a day at 09:17. Generates one email draft.
  cron.schedule('17 9 * * *', () => {
    runSalesAgent();
  });

  console.log('   Agents: ENABLED (dry-run) — marketing every 4h, sales daily 09:17');
}
