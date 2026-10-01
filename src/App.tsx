import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, TrendingDown, Truck, BarChart3, Brain, Zap,
  ArrowRight, Package, Globe, ShieldCheck, X, Loader2,
  MapPin, Clock, Calculator, AlertTriangle, Award,
  LogOut, User, ChevronDown,
} from 'lucide-react';
import { useLang, makeFmt, DEMO_QUERIES as DEMO_BY_LANG, LANGS, LANG_META, type Lang } from './i18n';

// ─── Types ───────────────────────────────────────────────────
interface Product {
  id: number; name: string; category: string; supplier: string;
  factory_price: number; negotiated_price: number; discount_pct: number;
  delivery_days: number; warehouse: string; moq: number; weight_kg: number;
  tags: string;
}

interface AuthUser {
  id: number; email: string; plan: string;
  actions_used: number; actions_limit: number;
}

// ─── Config ──────────────────────────────────────────────────
const API = ''; // relative — Vercel proxies /api/* to Cloud Run

// ─── API helpers ──────────────────────────────────────────────
async function apiPost(path: string, body: object) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function apiGet(path: string, token?: string) {
  const res = await fetch(`${API}${path}`, {
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
  });
  return res.json();
}

// ─── App ─────────────────────────────────────────────────────
export default function App() {
  const { lang, setLang, t } = useLang();
  const { fmt, fmtDec } = makeFmt(lang);
  const DEMO_QUERIES = DEMO_BY_LANG[lang];

  const [view, setView] = useState<'search' | 'result' | 'catalog' | 'auth'>('search');
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'confirm'>('login');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoResult, setDemoResult] = useState<Product | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [catalogQuery, setCatalogQuery] = useState('');
  const [lcQty, setLcQty] = useState(10);
  const [lcMargin, setLcMargin] = useState(30);
  const [error, setError] = useState('');

  // Auth state
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState(() => localStorage.getItem('jwt') || '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Load user on mount
  useEffect(() => {
    if (!token) return;
    apiGet('/api/auth/me', token).then(d => {
      if (d.user) setUser(d.user);
      else { localStorage.removeItem('jwt'); setToken(''); }
    }).catch(() => {});
  }, [token]);

  // Rotating placeholder
  useEffect(() => {
    const t = setInterval(() => setPlaceholderIdx(i => (i + 1) % DEMO_QUERIES.length), 3000);
    return () => clearInterval(t);
  }, []);

  // Load catalog
  useEffect(() => {
    if (view !== 'catalog') return;
    apiGet('/api/catalog').then(d => { if (d.products) setCatalog(d.products); });
  }, [view]);

  // ── Search ────────────────────────────────────────────────
  const handleDemoSearch = useCallback(async (q?: string) => {
    const sq = (q || query).trim();
    if (!sq) return;
    setLoading(true);
    setError('');
    try {
      const data = await apiPost('/api/search/demo', { query: sq });
      if (data.product) {
        setDemoResult(data.product);
        setView('result');
        setTimeout(() => setShowPaywall(true), 2500);
      } else {
        setError(data.error || t('err.noResults'));
      }
    } catch {
      setError(t('err.server'));
    } finally {
      setLoading(false);
    }
  }, [query, t]);

  // ── Auth ──────────────────────────────────────────────────
  const handleRegister = async () => {
    setAuthLoading(true); setError('');
    const d = await apiPost('/api/auth/register', { email, password });
    setAuthLoading(false);
    if (d.success) { setAuthMode('confirm'); }
    else setError(d.error || t('err.register'));
  };

  const handleConfirm = async () => {
    setAuthLoading(true); setError('');
    const d = await apiPost('/api/auth/confirm', { email, code: confirmCode });
    setAuthLoading(false);
    if (d.token) {
      localStorage.setItem('jwt', d.token);
      setToken(d.token);
      setUser(d.user);
      setView('search');
    } else setError(d.error || t('err.code'));
  };

  const handleLogin = async () => {
    setAuthLoading(true); setError('');
    const d = await apiPost('/api/auth/login', { email, password });
    setAuthLoading(false);
    if (d.token) {
      localStorage.setItem('jwt', d.token);
      setToken(d.token);
      setUser(d.user);
      setView('search');
    } else setError(d.error || t('err.login'));
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt');
    setToken(''); setUser(null);
  };

  // ── Payment ───────────────────────────────────────────────
  const handlePay = async (plan: 'trial' | 'starter' | 'pro' | 'business') => {
    if (!user) { setView('auth'); setAuthMode('login'); setShowPaywall(false); return; }
    setLoading(true);
    const d = await apiPost('/api/checkout', { plan, email: user.email });
    setLoading(false);
    if (d.url) window.location.href = d.url;
    else if (d.test_token) alert('Test mode: ' + d.test_token);
    else setError(d.error || t('err.pay'));
  };

  // ── Catalog filter ────────────────────────────────────────
  const displayed = catalogQuery.trim()
    ? catalog.filter(p =>
        `${p.name} ${p.category} ${p.supplier} ${p.tags}`.toLowerCase().includes(catalogQuery.toLowerCase())
      )
    : catalog;

  const planLabel: Record<string, string> = {
    trial: t('plan.trial'), starter: t('plan.starter'), pro: t('plan.pro'), business: t('plan.business')
  };
  const actionsLeft = user ? user.actions_limit - user.actions_used : 0;

  return (
    <div className="min-h-screen bg-[#070a12] text-white font-sans">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[200px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[200px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/5 bg-black/20 backdrop-blur-xl px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setView('search'); setShowPaywall(false); }}>
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Package size={18} className="text-white" />
            </div>
            <div>
              <span className="font-black text-lg tracking-tight">AI-Покупки</span>
              <span className="text-[10px] text-blue-400 font-mono tracking-wider ml-2">B2B PLATFORM</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LangSwitcher lang={lang} setLang={setLang} />
            <button onClick={() => setView('catalog')}
              className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5">
              {t('nav.catalog')}
            </button>

            {user ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-xs text-gray-400">{user.email}</div>
                  <div className="text-xs">
                    <span className="text-blue-400 font-bold">{planLabel[user.plan] || user.plan}</span>
                    {user.plan === 'trial' && <span className="text-gray-500 ml-1">· {t('nav.actionsLeft', { n: actionsLeft })}</span>}
                  </div>
                </div>
                {actionsLeft === 0 && (
                  <button onClick={() => setShowPaywall(true)}
                    className="text-xs font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-full hover:bg-blue-500/20 transition-all">
                    {t('nav.upgrade')}
                  </button>
                )}
                <button onClick={handleLogout} className="text-gray-500 hover:text-white transition-colors">
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={() => { setView('auth'); setAuthMode('login'); }}
                  className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5">
                  {t('nav.login')}
                </button>
                <button onClick={() => setShowPaywall(true)}
                  className="text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors bg-blue-500/10 border border-blue-500/20 px-4 py-1.5 rounded-full">
                  {t('nav.pricingCta')}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <AnimatePresence mode="wait">

        {/* ── AUTH VIEW ────────────────────────────────────── */}
        {view === 'auth' && (
          <motion.div key="auth" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="relative z-10 max-w-md mx-auto px-6 py-24">
            <div className="bg-white/3 border border-white/10 rounded-3xl p-8">
              <div className="flex items-center gap-3 mb-8">
                <User size={20} className="text-blue-400" />
                <h2 className="text-xl font-black">
                  {authMode === 'login' ? t('auth.title.login') : authMode === 'register' ? t('auth.title.register') : t('auth.title.confirm')}
                </h2>
              </div>

              {authMode !== 'confirm' && (
                <>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder={t('auth.emailPh')}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 mb-3" />
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder={t('auth.passwordPh')}
                    onKeyDown={e => e.key === 'Enter' && (authMode === 'login' ? handleLogin() : handleRegister())}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 mb-5" />
                </>
              )}

              {authMode === 'confirm' && (
                <div className="mb-5">
                  <p className="text-gray-400 text-sm mb-4">{t('auth.confirmSent')} <strong>{email}</strong></p>
                  <input type="text" value={confirmCode} onChange={e => setConfirmCode(e.target.value)}
                    placeholder="000000" maxLength={6}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white text-center text-2xl font-mono tracking-widest focus:outline-none focus:border-blue-500/50" />
                </div>
              )}

              {error && <div className="text-red-400 text-sm mb-4 bg-red-400/10 rounded-xl px-4 py-3">{error}</div>}

              <button
                onClick={() => authMode === 'login' ? handleLogin() : authMode === 'register' ? handleRegister() : handleConfirm()}
                disabled={authLoading}
                className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl font-black text-base hover:opacity-90 transition-all flex items-center justify-center gap-3 disabled:opacity-50 mb-4">
                {authLoading ? <Loader2 size={18} className="animate-spin" /> :
                  authMode === 'login' ? t('auth.btn.login') : authMode === 'register' ? t('auth.btn.register') : t('auth.btn.confirm')}
              </button>

              <p className="text-center text-sm text-gray-500">
                {authMode === 'login' ? (
                  <>{t('auth.noAccount')}{' '}
                    <button onClick={() => { setAuthMode('register'); setError(''); }} className="text-blue-400 hover:underline">{t('auth.registerLink')}</button>
                  </>
                ) : authMode === 'register' ? (
                  <>{t('auth.haveAccount')}{' '}
                    <button onClick={() => { setAuthMode('login'); setError(''); }} className="text-blue-400 hover:underline">{t('auth.loginLink')}</button>
                  </>
                ) : null}
              </p>
            </div>
          </motion.div>
        )}

        {/* ── SEARCH VIEW ──────────────────────────────────── */}
        {view === 'search' && (
          <motion.div key="search" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="relative z-10 max-w-4xl mx-auto px-6 py-24 text-center">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-2 text-xs text-blue-400 font-medium mb-8">
              <Zap size={12} /> {t('search.badge')}
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-[1.05]">
              {t('search.h1a')}<br />
              <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">{t('search.h1b')}</span>
              <br />{t('search.h1c')}
            </motion.h1>

            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              className="text-gray-400 text-lg mb-12 max-w-2xl mx-auto leading-relaxed">
              {t('search.subA')}{' '}
              <span className="text-white font-bold">{t('search.subHighlight')}</span>{t('search.subB')}
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="relative max-w-2xl mx-auto mb-8">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                  <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleDemoSearch()}
                    placeholder={`${t('search.egPrefix')} "${DEMO_QUERIES[placeholderIdx]}"`}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-14 pr-5 py-5 text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 text-base transition-all" />
                </div>
                <button onClick={() => handleDemoSearch()} disabled={loading || !query.trim()}
                  className="px-8 py-5 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl font-bold text-sm tracking-wide hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 flex items-center gap-2 shadow-lg shadow-blue-500/30">
                  {loading ? <Loader2 size={18} className="animate-spin" /> : t('search.btn')}
                </button>
              </div>
              {error && <div className="text-red-400 text-sm mt-3 bg-red-400/10 rounded-xl px-4 py-3">{error}</div>}
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              className="flex flex-wrap justify-center gap-2 mb-16">
              {DEMO_QUERIES.map(q => (
                <button key={q} onClick={() => { setQuery(q); handleDemoSearch(q); }}
                  className="text-xs bg-white/5 border border-white/10 rounded-full px-4 py-2 text-gray-400 hover:text-white hover:border-white/20 transition-all">
                  {q}
                </button>
              ))}
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
              className="grid grid-cols-3 gap-6 max-w-lg mx-auto">
              {[['20,000+', t('stats.products')], ['30–38%', t('stats.discount')], ['CN → BG', t('stats.delivery')]].map(([val, label]) => (
                <div key={label} className="text-center">
                  <div className="text-2xl font-black text-white mb-1">{val}</div>
                  <div className="text-xs text-gray-500 font-medium">{label}</div>
                </div>
              ))}
            </motion.div>

            {/* How it works */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
              className="mt-20 max-w-4xl mx-auto">
              <h2 className="text-2xl font-black mb-8">{t('how.title')}</h2>
              <div className="grid md:grid-cols-3 gap-5 text-left">
                {[
                  { icon: Search, t: t('how.s1t'), d: t('how.s1d') },
                  { icon: Calculator, t: t('how.s2t'), d: t('how.s2d') },
                  { icon: Truck, t: t('how.s3t'), d: t('how.s3d') },
                ].map(({ icon: Icon, t: title, d }) => (
                  <div key={title} className="bg-white/3 border border-white/10 rounded-2xl p-6">
                    <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center mb-4">
                      <Icon size={18} className="text-blue-400" />
                    </div>
                    <div className="font-bold mb-2">{title}</div>
                    <p className="text-sm text-gray-400 leading-relaxed">{d}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ── RESULT VIEW ──────────────────────────────────── */}
        {view === 'result' && demoResult && (
          <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="relative z-10 max-w-4xl mx-auto px-6 py-12">
            <button onClick={() => { setView('search'); setShowPaywall(false); }}
              className="flex items-center gap-2 text-gray-500 hover:text-white text-sm mb-8 transition-colors">
              {t('result.back')}
            </button>
            <div className="text-xs text-blue-400 font-mono tracking-wider mb-4">{t('result.demoBadge')}</div>

            <div className="bg-white/3 border border-white/10 rounded-3xl p-8 mb-6">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <span className="text-xs text-gray-500 bg-white/5 px-3 py-1 rounded-full mb-3 inline-block">{demoResult.category}</span>
                  <h2 className="text-2xl font-bold mb-1">{demoResult.name}</h2>
                  <p className="text-gray-400 text-sm flex items-center gap-2"><Globe size={12} /> {demoResult.supplier}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-3xl font-black">{fmt(demoResult.negotiated_price)}</div>
                  <div className="text-sm text-gray-500 line-through">{fmt(demoResult.factory_price)}</div>
                  <div className="text-green-400 text-sm font-bold">-{demoResult.discount_pct}%</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { icon: MapPin, label: t('result.warehouse'), value: demoResult.warehouse },
                  { icon: Clock, label: t('result.delivery'), value: t('result.days', { n: demoResult.delivery_days }) },
                  { icon: Package, label: t('result.moq'), value: t('result.pcs', { n: demoResult.moq }) },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="bg-white/3 rounded-2xl p-4">
                    <Icon size={14} className="text-gray-500 mb-2" />
                    <div className="text-xs text-gray-500 mb-1">{label}</div>
                    <div className="text-sm font-semibold">{value}</div>
                  </div>
                ))}
              </div>

              {/* ROI */}
              <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingDown size={16} className="text-green-400" />
                  <span className="text-sm font-bold text-green-400">{t('result.roiTitle')}</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-black text-green-400">{fmt(demoResult.factory_price - demoResult.negotiated_price)}</div>
                    <div className="text-xs text-gray-400 mt-1">{t('result.savedPerOrder')}</div>
                  </div>
                  <div className="text-center border-l border-r border-white/10">
                    <div className="text-2xl font-black text-blue-400">{fmt((demoResult.factory_price - demoResult.negotiated_price) * 12)}</div>
                    <div className="text-xs text-gray-400 mt-1">{t('result.roi12')}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-black text-purple-400">{demoResult.discount_pct}%</div>
                    <div className="text-xs text-gray-400 mt-1">{t('result.belowMarket')}</div>
                  </div>
                </div>
              </div>

              {/* Landed Cost Calculator */}
              {(() => {
                const transport = Math.round(demoResult.weight_kg * 1.8 * lcQty);
                const duties = Math.round(demoResult.negotiated_price * lcQty * 0.034);
                const insurance = Math.round(demoResult.negotiated_price * lcQty * 0.008);
                const totalCost = demoResult.negotiated_price * lcQty + transport + duties + insurance;
                const sellPrice = totalCost / lcQty * (1 + lcMargin / 100);
                const profit = (sellPrice - totalCost / lcQty) * lcQty;
                return (
                  <div className="bg-white/3 border border-white/10 rounded-2xl p-6 mb-6">
                    <div className="flex items-center gap-2 mb-5">
                      <Calculator size={16} className="text-blue-400" />
                      <span className="text-sm font-bold text-blue-400">{t('lc.title')}</span>
                      <span className="text-xs text-gray-500 ml-auto">{t('lc.sub')}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-5">
                      <div>
                        <div className="flex justify-between text-xs text-gray-400 mb-2">
                          <span>{t('lc.qty')}</span><span className="font-bold text-white">{t('result.pcs', { n: lcQty })}</span>
                        </div>
                        <input type="range" min={1} max={200} value={lcQty} onChange={e => setLcQty(+e.target.value)}
                          className="w-full accent-blue-500 cursor-pointer" />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-gray-400 mb-2">
                          <span>{t('lc.margin')}</span><span className="font-bold text-white">{lcMargin}%</span>
                        </div>
                        <input type="range" min={10} max={80} value={lcMargin} onChange={e => setLcMargin(+e.target.value)}
                          className="w-full accent-purple-500 cursor-pointer" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                      {[
                        [t('lc.productPrice'), fmt(demoResult.negotiated_price * lcQty)],
                        [t('lc.transport'), fmt(transport)],
                        [t('lc.duties'), fmt(duties)],
                        [t('lc.insurance'), fmt(insurance)],
                      ].map(([label, val]) => (
                        <div key={label} className="flex justify-between bg-white/3 rounded-xl px-3 py-2">
                          <span className="text-gray-500">{label}</span>
                          <span className="font-semibold">{val}</span>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-3 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-2xl p-4">
                      <div className="text-center">
                        <div className="text-lg font-black">{fmtDec(totalCost / lcQty)}</div>
                        <div className="text-xs text-gray-500">{t('lc.landedPer')}</div>
                      </div>
                      <div className="text-center border-l border-r border-white/10">
                        <div className="text-lg font-black text-purple-400">{fmtDec(sellPrice)}</div>
                        <div className="text-xs text-gray-500">{t('lc.sellPer')}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-black text-green-400">{fmt(profit)}</div>
                        <div className="text-xs text-gray-500">{t('lc.profit')}</div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Locked features */}
            <div className="grid grid-cols-3 gap-4 mb-8 opacity-50">
              {[
                { icon: Truck, label: t('locked.dhl'), sub: t('locked.dhlSub') },
                { icon: BarChart3, label: t('locked.audit'), sub: t('locked.auditSub') },
                { icon: Brain, label: t('locked.ai'), sub: t('locked.aiSub') },
              ].map(({ icon: Icon, label, sub }) => (
                <div key={label} className="bg-white/3 border border-white/5 rounded-2xl p-4 relative">
                  <div className="absolute inset-0 bg-black/40 rounded-2xl backdrop-blur-[2px] flex items-center justify-center">
                    <ShieldCheck size={20} className="text-gray-500" />
                  </div>
                  <Icon size={18} className="text-gray-500 mb-2" />
                  <div className="text-sm font-semibold text-gray-400">{label}</div>
                  <div className="text-xs text-gray-600">{sub}</div>
                </div>
              ))}
            </div>

            <button onClick={() => setShowPaywall(true)}
              className="w-full py-5 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl font-black text-lg tracking-wide hover:opacity-90 transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-500/30">
              {t('result.unlock')} <ArrowRight size={20} />
            </button>
          </motion.div>
        )}

        {/* ── CATALOG VIEW ─────────────────────────────────── */}
        {view === 'catalog' && (
          <motion.div key="catalog" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="relative z-10 max-w-6xl mx-auto px-6 py-12">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-black">{t('catalog.title')}</h2>
                <p className="text-gray-500 text-sm">{t('catalog.count', { n: displayed.length })}</p>
              </div>
            </div>

            {catalog.length === 0 ? (
              <div className="text-center py-24 text-gray-500">
                <Loader2 size={32} className="animate-spin mx-auto mb-4" />
                {t('catalog.loading')}
              </div>
            ) : (
              <>
                <div className="relative mb-6">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input value={catalogQuery} onChange={e => setCatalogQuery(e.target.value)}
                    placeholder={t('catalog.searchPh')}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 text-sm transition-all" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {displayed.slice(0, 60).map(p => (
                    <motion.div key={p.id} layout
                      className="bg-white/3 border border-white/8 rounded-2xl p-5 hover:border-blue-500/30 transition-all cursor-pointer"
                      onClick={() => { setDemoResult(p); setView('result'); setShowPaywall(false); }}>
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">{p.category}</span>
                        <span className="text-xs font-bold text-green-400 bg-green-400/10 border border-green-400/20 px-2 py-0.5 rounded-full">-{p.discount_pct}%</span>
                      </div>
                      <h3 className="font-semibold text-sm mb-2 leading-snug">{p.name}</h3>
                      <p className="text-xs text-gray-500 mb-3">{p.supplier}</p>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-black text-lg">{fmt(p.negotiated_price)}</div>
                          <div className="text-xs text-gray-600 line-through">{fmt(p.factory_price)}</div>
                        </div>
                        <div className="text-right text-xs text-gray-500">
                          <div>{t('result.days', { n: p.delivery_days })}</div>
                          <div>{t('catalog.moq', { n: p.moq })}</div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
                {displayed.length > 60 && (
                  <p className="text-center text-gray-500 text-sm mt-6">{t('catalog.shown', { n: displayed.length })}</p>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PAYWALL MODAL ────────────────────────────────────── */}
      <AnimatePresence>
        {showPaywall && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 md:p-6">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setShowPaywall(false)} />
            <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              className="relative w-full max-w-md bg-[#0d1118] border border-white/10 rounded-3xl p-8 shadow-2xl">
              <button onClick={() => setShowPaywall(false)} className="absolute top-5 right-5 text-gray-500 hover:text-white">
                <X size={20} />
              </button>

              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
                  <Package size={24} />
                </div>
                <h2 className="text-2xl font-black mb-2">{t('pay.title')}</h2>
                <p className="text-gray-400 text-sm">{t('pay.sub')}</p>
              </div>

              {demoResult && (
                <div className="bg-green-500/8 border border-green-500/15 rounded-2xl p-4 mb-5">
                  <div className="text-xs text-green-400 font-bold mb-2">{t('pay.basedOn')}</div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-400">{t('pay.savedPerOrder')}</span>
                    <span className="font-bold text-green-400">{fmt(demoResult.factory_price - demoResult.negotiated_price)}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1 pt-2 border-t border-white/5">
                    <span className="text-gray-400">{t('pay.roiLine')}</span>
                    <span className="font-black text-green-400">{Math.round((demoResult.factory_price - demoResult.negotiated_price) / 9.9)}x</span>
                  </div>
                </div>
              )}

              {error && <div className="text-red-400 text-sm mb-4 bg-red-400/10 rounded-xl px-4 py-3">{error}</div>}

              {/* Plans */}
              <div className="grid grid-cols-3 gap-2 mb-5">
                {[
                  { id: 'starter', name: t('plan.starter'), price: '9.90', desc: t('plan.starter.desc'), features: [t('plan.starter.f1'), t('plan.starter.f2')] },
                  { id: 'pro', name: t('plan.pro'), price: '49', desc: t('plan.pro.desc'), features: [t('plan.pro.f1'), t('plan.pro.f2')], highlight: true },
                  { id: 'business', name: t('plan.business'), price: '149', desc: t('plan.business.desc'), features: [t('plan.business.f1'), t('plan.business.f2')] },
                ].map(plan => (
                  <button key={plan.id} onClick={() => handlePay(plan.id as any)}
                    disabled={loading}
                    className={`p-3 rounded-2xl border text-left transition-all hover:scale-105 active:scale-95 ${
                      plan.highlight ? 'border-blue-500/60 bg-blue-500/10 hover:bg-blue-500/20' : 'border-white/10 bg-white/3 hover:bg-white/6'
                    }`}>
                    <div className={`text-[11px] font-bold mb-1 ${plan.highlight ? 'text-blue-400' : 'text-gray-400'}`}>{plan.name}</div>
                    <div className="text-lg font-black">{plan.price} <span className="text-[10px] font-normal text-gray-400">{t('pay.perMonth')}</span></div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{plan.desc}</div>
                    {plan.features.map(f => (
                      <div key={f} className="text-[10px] text-gray-600 mt-0.5">{f}</div>
                    ))}
                  </button>
                ))}
              </div>

              <button onClick={() => handlePay('trial')} disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl font-black text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 mb-3">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <>{t('pay.trial')} <ArrowRight size={16} /></>}
              </button>

              {!user && (
                <button onClick={() => { setShowPaywall(false); setView('auth'); setAuthMode('register'); }}
                  className="w-full py-3 bg-white/5 border border-white/10 rounded-2xl text-sm text-gray-400 hover:text-white hover:bg-white/8 transition-all">
                  {t('pay.noAccountCta')}
                </button>
              )}

              <p className="text-center text-xs text-gray-600 mt-3 flex items-center justify-center gap-2">
                <ShieldCheck size={12} /> {t('pay.secure')}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Language switcher ───────────────────────────────────────
function LangSwitcher({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  const [open, setOpen] = useState(false);
  const meta = LANG_META[lang];
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors px-2.5 py-1.5 rounded-full border border-white/10 hover:border-white/20">
        <span>{meta.flag}</span>
        <span className="hidden sm:inline">{lang.toUpperCase()}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="absolute right-0 mt-2 w-40 bg-[#0d1118] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
            {LANGS.map(l => (
              <button key={l} onMouseDown={() => { setLang(l); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-left transition-colors hover:bg-white/5 ${
                  l === lang ? 'text-white bg-white/5' : 'text-gray-400'
                }`}>
                <span>{LANG_META[l].flag}</span>
                <span>{LANG_META[l].native}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
