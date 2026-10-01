// ─── Storefront i18n ─────────────────────────────────────────
// Five markets: BG, RO, GR(el), DE, PL. Language auto-detects from the
// hostname subdomain (bg./ro./gr./de./pl.ai-pokupki.eu), then ?lang=,
// then a saved manual choice, then the browser, falling back to BG.
//
// NOTE: BG and DE strings are native-quality. RO / EL / PL were machine-
// drafted and should get a quick native-speaker review before a big push.
import { useCallback, useState } from 'react';

export type Lang = 'bg' | 'ro' | 'el' | 'de' | 'pl';
export const LANGS: Lang[] = ['bg', 'ro', 'el', 'de', 'pl'];

// Hostname subdomain → language. markets.ts uses 'gr' for Greece; the
// Greek *language* code is 'el', so we map gr → el here.
const HOST_TO_LANG: Record<string, Lang> = {
  bg: 'bg', ro: 'ro', gr: 'el', el: 'el', de: 'de', pl: 'pl',
};

// What each language shows in the switcher.
export const LANG_META: Record<Lang, { flag: string; native: string }> = {
  bg: { flag: '🇧🇬', native: 'Български' },
  ro: { flag: '🇷🇴', native: 'Română' },
  el: { flag: '🇬🇷', native: 'Ελληνικά' },
  de: { flag: '🇩🇪', native: 'Deutsch' },
  pl: { flag: '🇵🇱', native: 'Polski' },
};

const LOCALE: Record<Lang, string> = {
  bg: 'bg-BG', ro: 'ro-RO', el: 'el-GR', de: 'de-DE', pl: 'pl-PL',
};

const STORAGE_KEY = 'lang';

function fromHost(host: string): Lang | null {
  const sub = host.toLowerCase().split('.')[0];
  return HOST_TO_LANG[sub] || null;
}

function fromNavigator(): Lang | null {
  if (typeof navigator === 'undefined') return null;
  const code = (navigator.language || '').slice(0, 2).toLowerCase();
  return (LANGS as string[]).includes(code) ? (code as Lang) : null;
}

/** Resolve the active language: ?lang= > saved choice > hostname > browser > bg. */
export function detectLang(): Lang {
  try {
    const qp = new URLSearchParams(window.location.search).get('lang');
    if (qp && (LANGS as string[]).includes(qp)) return qp as Lang;
  } catch { /* ignore */ }
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && (LANGS as string[]).includes(saved)) return saved as Lang;
  } catch { /* ignore */ }
  try {
    const h = fromHost(window.location.hostname);
    if (h) return h;
  } catch { /* ignore */ }
  return fromNavigator() || 'bg';
}

export function saveLang(lang: Lang) {
  try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* ignore */ }
}

// Prices in the DB are in EUR. We keep EUR across every market (correct for
// B2B) and only localize the number grouping — no fake currency conversion.
export function makeFmt(lang: Lang) {
  const loc = LOCALE[lang];
  const fmt = (n: number) =>
    new Intl.NumberFormat(loc, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
  const fmtDec = (n: number) =>
    new Intl.NumberFormat(loc, { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  return { fmt, fmtDec };
}

// Example search chips, per language.
export const DEMO_QUERIES: Record<Lang, string[]> = {
  bg: ['хидравлична помпа', 'компресор', 'led прожектор', 'заваръчен апарат', 'cnc рутер'],
  ro: ['pompă hidraulică', 'compresor', 'proiector led', 'aparat de sudură', 'router cnc'],
  el: ['υδραυλική αντλία', 'συμπιεστής', 'προβολέας led', 'μηχανή συγκόλλησης', 'cnc router'],
  de: ['Hydraulikpumpe', 'Kompressor', 'LED-Strahler', 'Schweißgerät', 'CNC-Fräse'],
  pl: ['pompa hydrauliczna', 'kompresor', 'naświetlacz led', 'spawarka', 'router cnc'],
};

type Dict = Record<string, string>;

const STRINGS: Record<Lang, Dict> = {
  // ─── Bulgarian (source) ────────────────────────────────────
  bg: {
    'nav.catalog': 'Каталог',
    'nav.actionsLeft': '{n} действия',
    'nav.upgrade': 'Надгради',
    'nav.login': 'Вход',
    'nav.pricingCta': 'от 9.90 EUR / мес →',
    'plan.trial': 'Пробен',
    'plan.starter': 'Стартер',
    'plan.pro': 'Про',
    'plan.business': 'Business',

    'auth.title.login': 'Вход',
    'auth.title.register': 'Регистрация',
    'auth.title.confirm': 'Потвърди имейл',
    'auth.emailPh': 'имейл@адрес.com',
    'auth.passwordPh': 'парола',
    'auth.confirmSent': 'Изпратихме 6-цифрен код на',
    'auth.btn.login': 'Влез',
    'auth.btn.register': 'Регистрирай се',
    'auth.btn.confirm': 'Потвърди',
    'auth.noAccount': 'Нямаш акаунт?',
    'auth.registerLink': 'Регистрирай се',
    'auth.haveAccount': 'Вече имаш акаунт?',
    'auth.loginLink': 'Влез',

    'err.register': 'Грешка при регистрация',
    'err.code': 'Невалиден код',
    'err.login': 'Грешен имейл или парола',
    'err.noResults': 'Няма резултати',
    'err.server': 'Сървърът не отговаря. Проверете връзката.',
    'err.pay': 'Грешка при плащане',

    'search.badge': 'B2B Промишлен AI — директно от производителя',
    'search.h1a': 'Намери всеки',
    'search.h1b': 'B2B продукт',
    'search.h1c': 'на фабрична цена',
    'search.subA': 'Директен достъп до производителя — без прекупвачи. Средно',
    'search.subHighlight': '31% под пазарна цена',
    'search.subB': '. Landed Cost калкулатор. DHL логистика. Ценов одит.',
    'search.egPrefix': 'Напр.',
    'search.btn': 'Търси',
    'stats.products': 'B2B продукта',
    'stats.discount': 'средна отстъпка FOB',
    'stats.delivery': 'директна доставка',

    'result.back': '← Ново търсене',
    'result.demoBadge': 'ДЕМО РЕЗУЛТАТ — 1 безплатно търсене',
    'result.warehouse': 'Склад',
    'result.delivery': 'Доставка',
    'result.days': '{n} дни',
    'result.moq': 'МОК',
    'result.pcs': '{n} бр.',
    'result.roiTitle': 'ROI ДОКАЗАТЕЛСТВО',
    'result.savedPerOrder': 'спестено на поръчка',
    'result.roi12': 'ROI за 12 месеца',
    'result.belowMarket': 'под пазарна цена',

    'lc.title': 'LANDED COST КАЛКУЛАТОР',
    'lc.sub': 'транспорт · мита · застраховка',
    'lc.qty': 'Количество',
    'lc.margin': 'Твой марж',
    'lc.productPrice': 'Продуктова цена',
    'lc.transport': 'DHL транспорт',
    'lc.duties': 'Мита (3.4%)',
    'lc.insurance': 'Застраховка (0.8%)',
    'lc.landedPer': 'landed cost / бр.',
    'lc.sellPer': 'продажна / бр.',
    'lc.profit': 'чиста печалба',

    'locked.dhl': 'DHL Логистика',
    'locked.dhlSub': 'Реална цена Шенджен → BG',
    'locked.audit': 'Ценови Одит',
    'locked.auditSub': 'Google Shopping · 50+ оферти',
    'locked.ai': 'AI Препоръки',
    'locked.aiSub': 'Подобни продукти · ML модел',
    'result.unlock': 'Отключи пълния достъп — от 9.90 EUR',

    'catalog.title': 'B2B Каталог',
    'catalog.count': '{n} продукта · Директно от производителя',
    'catalog.loading': 'Зарежда каталог...',
    'catalog.searchPh': 'Търси продукт, категория, доставчик...',
    'catalog.moq': 'MOQ {n}',
    'catalog.shown': 'Показани 60 от {n} — използвай търсачката',

    'pay.title': 'Отключи пълния достъп',
    'pay.sub': 'Неограничено търсене · DHL логистика · AI препоръки · Ценов одит',
    'pay.basedOn': 'ВЪЗ ОСНОВА НА ДЕМОТО ТИ:',
    'pay.savedPerOrder': 'Спестено на поръчка',
    'pay.roiLine': 'ROI в посока 9.90 EUR/мес.',
    'pay.perMonth': '€/мес',
    'plan.starter.desc': '50 търсения',
    'plan.starter.f1': 'Каталог',
    'plan.starter.f2': 'Landed Cost',
    'plan.pro.desc': 'Неограничени',
    'plan.pro.f1': '+ AI препоръки',
    'plan.pro.f2': '+ Ценов одит',
    'plan.business.desc': 'Multi-user',
    'plan.business.f1': '+ ERP export',
    'plan.business.f2': '+ AI договори',
    'pay.trial': 'Пробвай 1 търсене — 0.99 EUR',
    'pay.noAccountCta': 'Нямаш акаунт? Регистрирай се безплатно',
    'pay.secure': 'Stripe · Сигурно плащане · Отказ по всяко време',
  },

  // ─── Romanian ──────────────────────────────────────────────
  ro: {
    'nav.catalog': 'Catalog',
    'nav.actionsLeft': '{n} acțiuni',
    'nav.upgrade': 'Upgrade',
    'nav.login': 'Autentificare',
    'nav.pricingCta': 'de la 9.90 EUR / lună →',
    'plan.trial': 'Test',
    'plan.starter': 'Starter',
    'plan.pro': 'Pro',
    'plan.business': 'Business',

    'auth.title.login': 'Autentificare',
    'auth.title.register': 'Înregistrare',
    'auth.title.confirm': 'Confirmă e-mailul',
    'auth.emailPh': 'email@adresa.com',
    'auth.passwordPh': 'parolă',
    'auth.confirmSent': 'Am trimis un cod din 6 cifre la',
    'auth.btn.login': 'Intră',
    'auth.btn.register': 'Înregistrează-te',
    'auth.btn.confirm': 'Confirmă',
    'auth.noAccount': 'Nu ai cont?',
    'auth.registerLink': 'Înregistrează-te',
    'auth.haveAccount': 'Ai deja cont?',
    'auth.loginLink': 'Intră',

    'err.register': 'Eroare la înregistrare',
    'err.code': 'Cod invalid',
    'err.login': 'E-mail sau parolă greșită',
    'err.noResults': 'Niciun rezultat',
    'err.server': 'Serverul nu răspunde. Verifică conexiunea.',
    'err.pay': 'Eroare la plată',

    'search.badge': 'AI Industrial B2B — direct de la producător',
    'search.h1a': 'Găsește orice',
    'search.h1b': 'produs B2B',
    'search.h1c': 'la preț de fabrică',
    'search.subA': 'Acces direct la producător — fără intermediari. În medie',
    'search.subHighlight': '31% sub prețul pieței',
    'search.subB': '. Calculator Landed Cost. Logistică DHL. Audit de preț.',
    'search.egPrefix': 'Ex.',
    'search.btn': 'Caută',
    'stats.products': 'produse B2B',
    'stats.discount': 'reducere medie FOB',
    'stats.delivery': 'livrare directă',

    'result.back': '← Căutare nouă',
    'result.demoBadge': 'REZULTAT DEMO — 1 căutare gratuită',
    'result.warehouse': 'Depozit',
    'result.delivery': 'Livrare',
    'result.days': '{n} zile',
    'result.moq': 'MOQ',
    'result.pcs': '{n} buc.',
    'result.roiTitle': 'DOVADĂ ROI',
    'result.savedPerOrder': 'economisit pe comandă',
    'result.roi12': 'ROI pe 12 luni',
    'result.belowMarket': 'sub prețul pieței',

    'lc.title': 'CALCULATOR LANDED COST',
    'lc.sub': 'transport · taxe · asigurare',
    'lc.qty': 'Cantitate',
    'lc.margin': 'Marja ta',
    'lc.productPrice': 'Preț produs',
    'lc.transport': 'Transport DHL',
    'lc.duties': 'Taxe vamale (3.4%)',
    'lc.insurance': 'Asigurare (0.8%)',
    'lc.landedPer': 'landed cost / buc.',
    'lc.sellPer': 'preț vânzare / buc.',
    'lc.profit': 'profit net',

    'locked.dhl': 'Logistică DHL',
    'locked.dhlSub': 'Preț real Shenzhen → RO',
    'locked.audit': 'Audit de Preț',
    'locked.auditSub': 'Google Shopping · 50+ oferte',
    'locked.ai': 'Recomandări AI',
    'locked.aiSub': 'Produse similare · model ML',
    'result.unlock': 'Deblochează acces complet — de la 9.90 EUR',

    'catalog.title': 'Catalog B2B',
    'catalog.count': '{n} produse · Direct de la producător',
    'catalog.loading': 'Se încarcă catalogul...',
    'catalog.searchPh': 'Caută produs, categorie, furnizor...',
    'catalog.moq': 'MOQ {n}',
    'catalog.shown': 'Afișate 60 din {n} — folosește căutarea',

    'pay.title': 'Deblochează acces complet',
    'pay.sub': 'Căutări nelimitate · Logistică DHL · Recomandări AI · Audit de preț',
    'pay.basedOn': 'PE BAZA DEMO-ULUI TĂU:',
    'pay.savedPerOrder': 'Economisit pe comandă',
    'pay.roiLine': 'ROI față de 9.90 EUR/lună',
    'pay.perMonth': '€/lună',
    'plan.starter.desc': '50 de căutări',
    'plan.starter.f1': 'Catalog',
    'plan.starter.f2': 'Landed Cost',
    'plan.pro.desc': 'Nelimitat',
    'plan.pro.f1': '+ Recomandări AI',
    'plan.pro.f2': '+ Audit de preț',
    'plan.business.desc': 'Multi-user',
    'plan.business.f1': '+ Export ERP',
    'plan.business.f2': '+ Contracte AI',
    'pay.trial': 'Încearcă 1 căutare — 0.99 EUR',
    'pay.noAccountCta': 'Nu ai cont? Înregistrează-te gratuit',
    'pay.secure': 'Stripe · Plată securizată · Anulare oricând',
  },

  // ─── Greek ─────────────────────────────────────────────────
  el: {
    'nav.catalog': 'Κατάλογος',
    'nav.actionsLeft': '{n} ενέργειες',
    'nav.upgrade': 'Αναβάθμιση',
    'nav.login': 'Σύνδεση',
    'nav.pricingCta': 'από 9.90 EUR / μήνα →',
    'plan.trial': 'Δοκιμή',
    'plan.starter': 'Starter',
    'plan.pro': 'Pro',
    'plan.business': 'Business',

    'auth.title.login': 'Σύνδεση',
    'auth.title.register': 'Εγγραφή',
    'auth.title.confirm': 'Επιβεβαίωση email',
    'auth.emailPh': 'email@dieuthynsi.com',
    'auth.passwordPh': 'κωδικός',
    'auth.confirmSent': 'Στείλαμε έναν 6ψήφιο κωδικό στο',
    'auth.btn.login': 'Είσοδος',
    'auth.btn.register': 'Εγγραφή',
    'auth.btn.confirm': 'Επιβεβαίωση',
    'auth.noAccount': 'Δεν έχεις λογαριασμό;',
    'auth.registerLink': 'Εγγράψου',
    'auth.haveAccount': 'Έχεις ήδη λογαριασμό;',
    'auth.loginLink': 'Είσοδος',

    'err.register': 'Σφάλμα κατά την εγγραφή',
    'err.code': 'Μη έγκυρος κωδικός',
    'err.login': 'Λάθος email ή κωδικός',
    'err.noResults': 'Κανένα αποτέλεσμα',
    'err.server': 'Ο διακομιστής δεν απαντά. Έλεγξε τη σύνδεση.',
    'err.pay': 'Σφάλμα πληρωμής',

    'search.badge': 'Βιομηχανικό B2B AI — απευθείας από τον κατασκευαστή',
    'search.h1a': 'Βρες κάθε',
    'search.h1b': 'προϊόν B2B',
    'search.h1c': 'σε τιμή εργοστασίου',
    'search.subA': 'Άμεση πρόσβαση στον κατασκευαστή — χωρίς μεσάζοντες. Κατά μέσο όρο',
    'search.subHighlight': '31% κάτω από την τιμή αγοράς',
    'search.subB': '. Υπολογιστής Landed Cost. Logistics DHL. Έλεγχος τιμών.',
    'search.egPrefix': 'Π.χ.',
    'search.btn': 'Αναζήτηση',
    'stats.products': 'προϊόντα B2B',
    'stats.discount': 'μέση έκπτωση FOB',
    'stats.delivery': 'άμεση παράδοση',

    'result.back': '← Νέα αναζήτηση',
    'result.demoBadge': 'ΑΠΟΤΕΛΕΣΜΑ DEMO — 1 δωρεάν αναζήτηση',
    'result.warehouse': 'Αποθήκη',
    'result.delivery': 'Παράδοση',
    'result.days': '{n} ημέρες',
    'result.moq': 'MOQ',
    'result.pcs': '{n} τεμ.',
    'result.roiTitle': 'ΑΠΟΔΕΙΞΗ ROI',
    'result.savedPerOrder': 'εξοικονόμηση ανά παραγγελία',
    'result.roi12': 'ROI σε 12 μήνες',
    'result.belowMarket': 'κάτω από την τιμή αγοράς',

    'lc.title': 'ΥΠΟΛΟΓΙΣΤΗΣ LANDED COST',
    'lc.sub': 'μεταφορά · δασμοί · ασφάλιση',
    'lc.qty': 'Ποσότητα',
    'lc.margin': 'Το περιθώριό σου',
    'lc.productPrice': 'Τιμή προϊόντος',
    'lc.transport': 'Μεταφορά DHL',
    'lc.duties': 'Δασμοί (3.4%)',
    'lc.insurance': 'Ασφάλιση (0.8%)',
    'lc.landedPer': 'landed cost / τεμ.',
    'lc.sellPer': 'τιμή πώλησης / τεμ.',
    'lc.profit': 'καθαρό κέρδος',

    'locked.dhl': 'Logistics DHL',
    'locked.dhlSub': 'Πραγματική τιμή Shenzhen → GR',
    'locked.audit': 'Έλεγχος Τιμών',
    'locked.auditSub': 'Google Shopping · 50+ προσφορές',
    'locked.ai': 'Προτάσεις AI',
    'locked.aiSub': 'Παρόμοια προϊόντα · μοντέλο ML',
    'result.unlock': 'Ξεκλείδωσε πλήρη πρόσβαση — από 9.90 EUR',

    'catalog.title': 'Κατάλογος B2B',
    'catalog.count': '{n} προϊόντα · Απευθείας από τον κατασκευαστή',
    'catalog.loading': 'Φόρτωση καταλόγου...',
    'catalog.searchPh': 'Αναζήτηση προϊόντος, κατηγορίας, προμηθευτή...',
    'catalog.moq': 'MOQ {n}',
    'catalog.shown': 'Εμφανίζονται 60 από {n} — χρησιμοποίησε την αναζήτηση',

    'pay.title': 'Ξεκλείδωσε πλήρη πρόσβαση',
    'pay.sub': 'Απεριόριστες αναζητήσεις · Logistics DHL · Προτάσεις AI · Έλεγχος τιμών',
    'pay.basedOn': 'ΜΕ ΒΑΣΗ ΤΟ DEMO ΣΟΥ:',
    'pay.savedPerOrder': 'Εξοικονόμηση ανά παραγγελία',
    'pay.roiLine': 'ROI έναντι 9.90 EUR/μήνα',
    'pay.perMonth': '€/μήνα',
    'plan.starter.desc': '50 αναζητήσεις',
    'plan.starter.f1': 'Κατάλογος',
    'plan.starter.f2': 'Landed Cost',
    'plan.pro.desc': 'Απεριόριστες',
    'plan.pro.f1': '+ Προτάσεις AI',
    'plan.pro.f2': '+ Έλεγχος τιμών',
    'plan.business.desc': 'Multi-user',
    'plan.business.f1': '+ Εξαγωγή ERP',
    'plan.business.f2': '+ Συμβόλαια AI',
    'pay.trial': 'Δοκίμασε 1 αναζήτηση — 0.99 EUR',
    'pay.noAccountCta': 'Δεν έχεις λογαριασμό; Εγγράψου δωρεάν',
    'pay.secure': 'Stripe · Ασφαλής πληρωμή · Ακύρωση ανά πάσα στιγμή',
  },

  // ─── German ────────────────────────────────────────────────
  de: {
    'nav.catalog': 'Katalog',
    'nav.actionsLeft': '{n} Aktionen',
    'nav.upgrade': 'Upgrade',
    'nav.login': 'Anmelden',
    'nav.pricingCta': 'ab 9,90 EUR / Monat →',
    'plan.trial': 'Test',
    'plan.starter': 'Starter',
    'plan.pro': 'Pro',
    'plan.business': 'Business',

    'auth.title.login': 'Anmelden',
    'auth.title.register': 'Registrieren',
    'auth.title.confirm': 'E-Mail bestätigen',
    'auth.emailPh': 'email@adresse.com',
    'auth.passwordPh': 'Passwort',
    'auth.confirmSent': 'Wir haben einen 6-stelligen Code gesendet an',
    'auth.btn.login': 'Einloggen',
    'auth.btn.register': 'Registrieren',
    'auth.btn.confirm': 'Bestätigen',
    'auth.noAccount': 'Kein Konto?',
    'auth.registerLink': 'Registrieren',
    'auth.haveAccount': 'Schon ein Konto?',
    'auth.loginLink': 'Einloggen',

    'err.register': 'Fehler bei der Registrierung',
    'err.code': 'Ungültiger Code',
    'err.login': 'Falsche E-Mail oder falsches Passwort',
    'err.noResults': 'Keine Ergebnisse',
    'err.server': 'Server antwortet nicht. Prüfe die Verbindung.',
    'err.pay': 'Fehler bei der Zahlung',

    'search.badge': 'B2B-Industrie-KI — direkt vom Hersteller',
    'search.h1a': 'Finde jedes',
    'search.h1b': 'B2B-Produkt',
    'search.h1c': 'zum Fabrikpreis',
    'search.subA': 'Direkter Zugang zum Hersteller — ohne Zwischenhändler. Im Schnitt',
    'search.subHighlight': '31% unter Marktpreis',
    'search.subB': '. Landed-Cost-Rechner. DHL-Logistik. Preis-Audit.',
    'search.egPrefix': 'z. B.',
    'search.btn': 'Suchen',
    'stats.products': 'B2B-Produkte',
    'stats.discount': 'Ø Rabatt FOB',
    'stats.delivery': 'Direktlieferung',

    'result.back': '← Neue Suche',
    'result.demoBadge': 'DEMO-ERGEBNIS — 1 kostenlose Suche',
    'result.warehouse': 'Lager',
    'result.delivery': 'Lieferung',
    'result.days': '{n} Tage',
    'result.moq': 'MBM',
    'result.pcs': '{n} Stk.',
    'result.roiTitle': 'ROI-NACHWEIS',
    'result.savedPerOrder': 'gespart pro Bestellung',
    'result.roi12': 'ROI über 12 Monate',
    'result.belowMarket': 'unter Marktpreis',

    'lc.title': 'LANDED-COST-RECHNER',
    'lc.sub': 'Transport · Zölle · Versicherung',
    'lc.qty': 'Menge',
    'lc.margin': 'Deine Marge',
    'lc.productPrice': 'Produktpreis',
    'lc.transport': 'DHL-Transport',
    'lc.duties': 'Zölle (3,4%)',
    'lc.insurance': 'Versicherung (0,8%)',
    'lc.landedPer': 'Landed Cost / Stk.',
    'lc.sellPer': 'Verkaufspreis / Stk.',
    'lc.profit': 'Nettogewinn',

    'locked.dhl': 'DHL-Logistik',
    'locked.dhlSub': 'Echter Preis Shenzhen → DE',
    'locked.audit': 'Preis-Audit',
    'locked.auditSub': 'Google Shopping · 50+ Angebote',
    'locked.ai': 'KI-Empfehlungen',
    'locked.aiSub': 'Ähnliche Produkte · ML-Modell',
    'result.unlock': 'Vollzugang freischalten — ab 9,90 EUR',

    'catalog.title': 'B2B-Katalog',
    'catalog.count': '{n} Produkte · Direkt vom Hersteller',
    'catalog.loading': 'Katalog wird geladen...',
    'catalog.searchPh': 'Produkt, Kategorie, Lieferant suchen...',
    'catalog.moq': 'MBM {n}',
    'catalog.shown': '60 von {n} angezeigt — nutze die Suche',

    'pay.title': 'Vollzugang freischalten',
    'pay.sub': 'Unbegrenzte Suche · DHL-Logistik · KI-Empfehlungen · Preis-Audit',
    'pay.basedOn': 'BASIEREND AUF DEINER DEMO:',
    'pay.savedPerOrder': 'Gespart pro Bestellung',
    'pay.roiLine': 'ROI gegenüber 9,90 EUR/Monat',
    'pay.perMonth': '€/Monat',
    'plan.starter.desc': '50 Suchen',
    'plan.starter.f1': 'Katalog',
    'plan.starter.f2': 'Landed Cost',
    'plan.pro.desc': 'Unbegrenzt',
    'plan.pro.f1': '+ KI-Empfehlungen',
    'plan.pro.f2': '+ Preis-Audit',
    'plan.business.desc': 'Multi-User',
    'plan.business.f1': '+ ERP-Export',
    'plan.business.f2': '+ KI-Verträge',
    'pay.trial': '1 Suche testen — 0,99 EUR',
    'pay.noAccountCta': 'Kein Konto? Kostenlos registrieren',
    'pay.secure': 'Stripe · Sichere Zahlung · Jederzeit kündbar',
  },

  // ─── Polish ────────────────────────────────────────────────
  pl: {
    'nav.catalog': 'Katalog',
    'nav.actionsLeft': '{n} akcji',
    'nav.upgrade': 'Ulepsz',
    'nav.login': 'Logowanie',
    'nav.pricingCta': 'od 9.90 EUR / mies. →',
    'plan.trial': 'Próbny',
    'plan.starter': 'Starter',
    'plan.pro': 'Pro',
    'plan.business': 'Business',

    'auth.title.login': 'Logowanie',
    'auth.title.register': 'Rejestracja',
    'auth.title.confirm': 'Potwierdź e-mail',
    'auth.emailPh': 'email@adres.com',
    'auth.passwordPh': 'hasło',
    'auth.confirmSent': 'Wysłaliśmy 6-cyfrowy kod na',
    'auth.btn.login': 'Wejdź',
    'auth.btn.register': 'Zarejestruj się',
    'auth.btn.confirm': 'Potwierdź',
    'auth.noAccount': 'Nie masz konta?',
    'auth.registerLink': 'Zarejestruj się',
    'auth.haveAccount': 'Masz już konto?',
    'auth.loginLink': 'Wejdź',

    'err.register': 'Błąd podczas rejestracji',
    'err.code': 'Nieprawidłowy kod',
    'err.login': 'Błędny e-mail lub hasło',
    'err.noResults': 'Brak wyników',
    'err.server': 'Serwer nie odpowiada. Sprawdź połączenie.',
    'err.pay': 'Błąd płatności',

    'search.badge': 'Przemysłowe AI B2B — bezpośrednio od producenta',
    'search.h1a': 'Znajdź każdy',
    'search.h1b': 'produkt B2B',
    'search.h1c': 'w cenie fabrycznej',
    'search.subA': 'Bezpośredni dostęp do producenta — bez pośredników. Średnio',
    'search.subHighlight': '31% poniżej ceny rynkowej',
    'search.subB': '. Kalkulator Landed Cost. Logistyka DHL. Audyt cen.',
    'search.egPrefix': 'Np.',
    'search.btn': 'Szukaj',
    'stats.products': 'produktów B2B',
    'stats.discount': 'śr. rabat FOB',
    'stats.delivery': 'dostawa bezpośrednia',

    'result.back': '← Nowe wyszukiwanie',
    'result.demoBadge': 'WYNIK DEMO — 1 darmowe wyszukiwanie',
    'result.warehouse': 'Magazyn',
    'result.delivery': 'Dostawa',
    'result.days': '{n} dni',
    'result.moq': 'MOQ',
    'result.pcs': '{n} szt.',
    'result.roiTitle': 'DOWÓD ROI',
    'result.savedPerOrder': 'oszczędność na zamówienie',
    'result.roi12': 'ROI przez 12 miesięcy',
    'result.belowMarket': 'poniżej ceny rynkowej',

    'lc.title': 'KALKULATOR LANDED COST',
    'lc.sub': 'transport · cła · ubezpieczenie',
    'lc.qty': 'Ilość',
    'lc.margin': 'Twoja marża',
    'lc.productPrice': 'Cena produktu',
    'lc.transport': 'Transport DHL',
    'lc.duties': 'Cła (3,4%)',
    'lc.insurance': 'Ubezpieczenie (0,8%)',
    'lc.landedPer': 'landed cost / szt.',
    'lc.sellPer': 'cena sprzedaży / szt.',
    'lc.profit': 'zysk netto',

    'locked.dhl': 'Logistyka DHL',
    'locked.dhlSub': 'Realna cena Shenzhen → PL',
    'locked.audit': 'Audyt Cen',
    'locked.auditSub': 'Google Shopping · 50+ ofert',
    'locked.ai': 'Rekomendacje AI',
    'locked.aiSub': 'Podobne produkty · model ML',
    'result.unlock': 'Odblokuj pełny dostęp — od 9.90 EUR',

    'catalog.title': 'Katalog B2B',
    'catalog.count': '{n} produktów · Bezpośrednio od producenta',
    'catalog.loading': 'Ładowanie katalogu...',
    'catalog.searchPh': 'Szukaj produktu, kategorii, dostawcy...',
    'catalog.moq': 'MOQ {n}',
    'catalog.shown': 'Pokazano 60 z {n} — użyj wyszukiwarki',

    'pay.title': 'Odblokuj pełny dostęp',
    'pay.sub': 'Nielimitowane wyszukiwania · Logistyka DHL · Rekomendacje AI · Audyt cen',
    'pay.basedOn': 'NA PODSTAWIE TWOJEGO DEMO:',
    'pay.savedPerOrder': 'Oszczędność na zamówienie',
    'pay.roiLine': 'ROI wobec 9.90 EUR/mies.',
    'pay.perMonth': '€/mies.',
    'plan.starter.desc': '50 wyszukiwań',
    'plan.starter.f1': 'Katalog',
    'plan.starter.f2': 'Landed Cost',
    'plan.pro.desc': 'Bez limitu',
    'plan.pro.f1': '+ Rekomendacje AI',
    'plan.pro.f2': '+ Audyt cen',
    'plan.business.desc': 'Multi-user',
    'plan.business.f1': '+ Eksport ERP',
    'plan.business.f2': '+ Umowy AI',
    'pay.trial': 'Wypróbuj 1 wyszukiwanie — 0.99 EUR',
    'pay.noAccountCta': 'Nie masz konta? Zarejestruj się za darmo',
    'pay.secure': 'Stripe · Bezpieczna płatność · Anuluj w każdej chwili',
  },
};

export type TFunc = (key: string, vars?: Record<string, string | number>) => string;

export function makeT(lang: Lang): TFunc {
  const dict = STRINGS[lang] || STRINGS.bg;
  const fallback = STRINGS.bg;
  return (key, vars) => {
    let s = dict[key] ?? fallback[key] ?? key;
    if (vars) for (const k in vars) s = s.replace(`{${k}}`, String(vars[k]));
    return s;
  };
}

/** React hook: current language + a setter that persists the choice. */
export function useLang(): { lang: Lang; setLang: (l: Lang) => void; t: TFunc } {
  const [lang, setLangState] = useState<Lang>(() => detectLang());
  const setLang = useCallback((l: Lang) => {
    saveLang(l);
    setLangState(l);
    try { document.documentElement.lang = l; } catch { /* ignore */ }
  }, []);
  const t = makeT(lang);
  return { lang, setLang, t };
}
