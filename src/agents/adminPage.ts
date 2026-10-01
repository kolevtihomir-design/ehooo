// Self-contained admin page for reviewing and approving agent drafts.
// Served at GET /admin/agents. Talks to the /api/admin/agent/* endpoints
// using an admin key the reviewer enters once (kept in localStorage).

export const AGENT_ADMIN_HTML = `<!DOCTYPE html>
<html lang="bg"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Агенти — чернови за одобрение</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;font-family:system-ui,-apple-system,sans-serif;background:#0b0710;color:#e6e0ee;padding:24px;max-width:900px;margin:0 auto}
  h1{font-size:24px}h1 small{color:#8a8296;font-size:14px;font-weight:400}
  .bar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:16px 0}
  input,button,select{font:inherit}
  input{background:#1a1620;border:1px solid #3a3145;color:#fff;border-radius:8px;padding:9px 11px}
  button{border:none;border-radius:8px;padding:9px 14px;cursor:pointer;font-weight:600}
  .p{background:#ea4b71;color:#fff}.g{background:#2a7d2a;color:#fff}.r{background:#7a2230;color:#fff}
  .s{background:#2a2433;color:#d8d2e0;border:1px solid #3a3145}
  .counts{color:#b7afc4;font-size:14px;margin:8px 0 18px}
  .counts b{color:#fff}
  .card{background:#161019;border:1px solid #2a2433;border-radius:14px;padding:16px 18px;margin-bottom:14px}
  .meta{font-size:12px;color:#8a8296;margin-bottom:8px}
  .meta .tag{display:inline-block;background:#2a2433;border-radius:6px;padding:2px 8px;margin-right:6px;color:#c9c2d1}
  .subj{font-weight:700;margin-bottom:6px}
  .body{white-space:pre-wrap;line-height:1.55;color:#d8d2e0;font-size:14px}
  .acts{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}
  .st-approved{color:#7bd88f}.st-rejected{color:#ff8098}.st-pending{color:#e8c33d}
  .empty{color:#8a8296;padding:30px 0;text-align:center}
  .note{background:#17120d;border:1px solid #4a3a1a;color:#e8c98d;border-radius:10px;padding:10px 14px;font-size:13px;margin-bottom:16px}
</style></head><body>
<h1>Агенти <small>· чернови за одобрение</small></h1>
<div class="note">⚠️ Нищо не се праща автоматично. Тук преглеждаш какво е написал AI-ят и решаваш.</div>

<div class="bar">
  <input id="key" type="password" placeholder="Admin ключ" style="width:200px">
  <button class="s" onclick="saveKey()">Запомни</button>
  <select id="filter" onchange="load()">
    <option value="pending">Чакащи</option>
    <option value="approved">Одобрени</option>
    <option value="rejected">Отхвърлени</option>
    <option value="">Всички</option>
  </select>
  <button class="p" onclick="run('marketing')">+ Маркетинг пост</button>
  <button class="p" onclick="run('sales')">+ Търговски имейл</button>
  <button class="s" onclick="load()">↻ Обнови</button>
</div>
<div class="counts" id="counts"></div>
<div id="list"></div>

<script>
const $ = id => document.getElementById(id);
function key(){ return localStorage.getItem('adminKey') || ''; }
function saveKey(){ localStorage.setItem('adminKey', $('key').value.trim()); load(); }
function hdr(){ return { 'x-admin-key': key(), 'Content-Type':'application/json' }; }

async function load(){
  if(!key()){ $('list').innerHTML = '<div class="empty">Въведи admin ключа горе.</div>'; return; }
  const status = $('filter').value;
  const r = await fetch('/api/admin/agent/drafts' + (status?('?status='+status):''), { headers: hdr() });
  if(r.status===401){ $('list').innerHTML='<div class="empty">Грешен ключ.</div>'; return; }
  const d = await r.json();
  const c = d.counts||{};
  $('counts').innerHTML = \`Чакащи: <b>\${c.pending||0}</b> · Одобрени: <b>\${c.approved||0}</b> · Отхвърлени: <b>\${c.rejected||0}</b>\`;
  const items = d.drafts||[];
  if(!items.length){ $('list').innerHTML='<div class="empty">Няма чернови.</div>'; return; }
  $('list').innerHTML = items.map(render).join('');
}

function render(x){
  const subj = x.subject ? '<div class="subj">'+esc(x.subject)+'</div>' : '';
  const acts = x.status==='pending'
    ? \`<button class="g" onclick="act(\${x.id},'approve')">✓ Одобри</button>
       <button class="r" onclick="act(\${x.id},'reject')">✕ Отхвърли</button>
       <button class="s" onclick="copyText(\${x.id})">⧉ Копирай</button>\`
    : \`<button class="s" onclick="copyText(\${x.id})">⧉ Копирай</button>\`;
  return \`<div class="card" id="c\${x.id}">
    <div class="meta">
      <span class="tag">\${x.agent==='sales'?'📧 Продажби':'📣 Маркетинг'}</span>
      <span class="tag">\${x.channel}</span>
      <span class="tag">продукт #\${x.product_id||'-'}</span>
      <span class="tag">\${x.model}</span>
      <span class="st-\${x.status}">\${x.status}</span>
    </div>\${subj}
    <div class="body" id="b\${x.id}">\${esc(x.content)}</div>
    <div class="acts">\${acts}</div>
  </div>\`;
}

async function act(id, what){
  await fetch('/api/admin/agent/drafts/'+id+'/'+what, { method:'POST', headers: hdr(), body:'{}' });
  load();
}
async function run(agent){
  const body = JSON.stringify({ agent });
  const r = await fetch('/api/admin/agent/run', { method:'POST', headers: hdr(), body });
  const d = await r.json();
  if(d.error) alert('Грешка: '+d.error);
  load();
}
function copyText(id){
  const el = $('b'+id); navigator.clipboard.writeText(el.innerText).then(()=>{ el.style.outline='2px solid #7bd88f'; setTimeout(()=>el.style.outline='',800); });
}
function esc(s){ return String(s||'').replace(/[&<>]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }

$('key').value = key();
load();
</script>
</body></html>`;
