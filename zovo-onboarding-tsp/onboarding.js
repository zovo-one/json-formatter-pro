/* ============================================================
   JSON Formatter Pro — Onboarding controller (Zovo serif design)
   7-step flow. Works in the extension (chrome.*) and standalone
   (graceful fallback for manual preview). NASA-clean: bounded
   loops, guarded returns, no globals leaked, no inline handlers.
   ============================================================ */
(function () {
  'use strict';

  const TOTAL = 7;
  const CHECKOUT = 'https://zovo.one/pricing?ext=json-formatter-pro&ref=onboarding';
  const hasChrome = typeof chrome !== 'undefined' && !!chrome.storage;

  let current = 1;
  let plan = 'monthly';

  const $ = (id) => document.getElementById(id);
  const steps = Array.from(document.querySelectorAll('.step'));
  const dots = Array.from(document.querySelectorAll('.dot'));
  const nextBtn = $('nextBtn'), backBtn = $('backBtn'), nextLabel = $('nextLabel');
  const counter = $('counter'), fill = $('progressFill');

  const GENERIC = { 1: 'Show me', 2: 'Looks good, next', 3: 'Save and continue', 4: 'See who built it', 5: 'See what Pro includes', 6: 'Start free trial', 7: 'Start formatting' };
  function nextLabelFor(n) {
    const s = steps.find((x) => +x.dataset.step === n);
    if (n === 6) { return plan === 'lifetime' ? 'Get Lifetime for $99' : 'Start 7-day free trial'; }
    if (s && s.dataset.next) { return s.dataset.next; }
    return GENERIC[n] || 'Next';
  }

  /* ---------- render ---------- */
  function render() {
    steps.forEach((s) => s.classList.toggle('active', +s.dataset.step === current));
    dots.forEach((d) => {
      const n = +d.dataset.step;
      d.classList.toggle('active', n === current);
      d.classList.toggle('done', n < current);
    });
    counter.textContent = String(current).padStart(2, '0') + ' / ' + String(TOTAL).padStart(2, '0');
    fill.style.width = (current / TOTAL) * 100 + '%';
    backBtn.hidden = current === 1;
    nextLabel.textContent = nextLabelFor(current);
    const svg = nextBtn.querySelector('svg');
    if (svg) { svg.style.display = current === 6 ? 'none' : ''; }
    if (current === 2) { enterDemo(); } else { clearDemo(); }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function go(n) { current = Math.max(1, Math.min(TOTAL, n)); render(); }

  nextBtn.addEventListener('click', () => {
    if (current === 3) { persistSetup(); }
    if (current === 6) { convert(); return; }
    if (current === 7) { finish(); return; }
    go(current + 1);
  });
  backBtn.addEventListener('click', () => go(current - 1));
  dots.forEach((d) => d.addEventListener('click', () => go(+d.dataset.step)));
  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement ? document.activeElement.tagName : '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') { return; }
    if (e.key === 'ArrowRight' && current < TOTAL) { go(current + 1); }
    if (e.key === 'ArrowLeft' && current > 1) { go(current - 1); }
  });

  /* ---------- Step 2: real local format + collapsible tree ---------- */
  const SAMPLE = '{"user":{"id":8842,"name":"Ada Lovelace","active":true,"roles":["admin","dev"],"meta":{"seen":"2026-07-08T11:04:22Z","org":441}},"tokens":["read","write","billing"],"ok":true,"balance":148.5,"note":null}';
  const NODE_BUDGET = 6000;
  const demoInput = $('demoInput'), demoOut = $('demoOutput'), demoStatus = $('demoStatus');
  let demoSeeded = false;

  function enterDemo() {
    if (!demoInput) { return; }
    if (!demoSeeded) { demoInput.value = SAMPLE; demoSeeded = true; }
    if (!demoOut.firstChild) { formatDemo(); }
  }
  function clearDemo() {
    if (demoOut) { demoOut.textContent = ''; }
  }

  function formatDemo() {
    if (!demoInput || !demoOut) { return; }
    const raw = demoInput.value.trim();
    demoOut.textContent = '';
    if (!raw) { setStatus('Paste some JSON above, then format.', 'idle'); return; }
    let parsed;
    const t0 = performance.now();
    try { parsed = JSON.parse(raw); }
    catch (err) {
      setStatus('Not valid JSON. ' + friendlyError(err), 'err');
      return;
    }
    const budget = { n: 0 };
    demoOut.appendChild(buildNode(null, parsed, true, budget));
    const ms = Math.max(1, Math.round(performance.now() - t0));
    const count = countKeys(parsed);
    setStatus('Valid. ' + count + ' ' + (count === 1 ? 'field' : 'fields') + ', formatted on this page in ' + ms + ' ms.', 'ok');
  }
  function setStatus(msg, kind) {
    if (!demoStatus) { return; }
    demoStatus.textContent = msg;
    demoStatus.className = 'demo-status ' + (kind || 'idle');
  }
  function friendlyError(err) {
    const m = err && err.message ? err.message : 'Check your brackets and quotes.';
    return m.length > 90 ? m.slice(0, 90) + '…' : m;
  }
  function countKeys(v) {
    if (Array.isArray(v)) { return v.length; }
    if (v && typeof v === 'object') { return Object.keys(v).length; }
    return 1;
  }

  // Build one DOM node for a value. Bounded by budget.n so a huge paste can't freeze the page.
  function buildNode(key, value, isLast, budget) {
    budget.n += 1;
    const isArr = Array.isArray(value);
    const isObj = value && typeof value === 'object';
    if (!isObj || budget.n > NODE_BUDGET) {
      const line = el('div', 'jt-line');
      if (key !== null) { line.appendChild(keySpan(key)); line.appendChild(punct(': ')); }
      if (budget.n > NODE_BUDGET) { line.appendChild(el('span', 'jt-ellipsis', '… trimmed for the demo')); }
      else { line.appendChild(primSpan(value)); if (!isLast) { line.appendChild(punct(',')); } }
      return line;
    }
    const entries = isArr ? value.map((v, i) => [i, v]) : Object.entries(value);
    const open = isArr ? '[' : '{';
    const close = isArr ? ']' : '}';
    const node = el('div', 'jt-node');

    const head = el('div', 'jt-line');
    const caret = document.createElement('button');
    caret.type = 'button'; caret.className = 'jt-caret'; caret.setAttribute('aria-expanded', 'true');
    caret.setAttribute('aria-label', 'Collapse');
    caret.addEventListener('click', () => {
      const collapsed = node.classList.toggle('collapsed');
      caret.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      caret.setAttribute('aria-label', collapsed ? 'Expand' : 'Collapse');
    });
    head.appendChild(caret);
    if (key !== null) { head.appendChild(keySpan(key)); head.appendChild(punct(': ')); }
    head.appendChild(punct(open));
    const summary = entries.length + ' ' + (isArr ? (entries.length === 1 ? 'item' : 'items') : (entries.length === 1 ? 'key' : 'keys'));
    head.appendChild(el('span', 'jt-ellipsis', ' … ' + summary + ' ' + close));
    node.appendChild(head);

    const kids = el('div', 'jt-children');
    for (let i = 0; i < entries.length; i++) {
      if (budget.n > NODE_BUDGET) { kids.appendChild(el('div', 'jt-line', '… trimmed for the demo')); break; }
      kids.appendChild(buildNode(isArr ? null : entries[i][0], entries[i][1], i === entries.length - 1, budget));
    }
    node.appendChild(kids);

    const foot = el('div', 'jt-line jt-close');
    foot.appendChild(punct(close + (isLast ? '' : ',')));
    node.appendChild(foot);
    return node;
  }
  function el(tag, cls, text) { const n = document.createElement(tag); if (cls) { n.className = cls; } if (text != null) { n.textContent = text; } return n; }
  function punct(t) { return el('span', 'jt-punct', t); }
  function keySpan(k) { return el('span', 'jt-key', JSON.stringify(String(k))); }
  function primSpan(v) {
    if (v === null) { return el('span', 'jt-null', 'null'); }
    if (typeof v === 'string') { return el('span', 'jt-str', JSON.stringify(v)); }
    if (typeof v === 'number') { return el('span', 'jt-num', String(v)); }
    if (typeof v === 'boolean') { return el('span', 'jt-bool', String(v)); }
    return el('span', 'jt-str', JSON.stringify(v));
  }

  if ($('demoFormatBtn')) { $('demoFormatBtn').addEventListener('click', formatDemo); }
  if ($('demoResetBtn')) { $('demoResetBtn').addEventListener('click', () => { if (demoInput) { demoInput.value = SAMPLE; } formatDemo(); }); }

  /* ---------- Step 3: setup persisted to the real storage keys ---------- */
  function readIndent() {
    const sel = document.querySelector('#indentChips input:checked');
    const v = sel ? sel.value : '2';
    return v === 'tab' ? '\t' : Number(v);
  }
  function persistSetup() {
    if (!hasChrome) { return; }
    const settings = {
      indent: readIndent(),
      autoFormat: !!($('setAutoFormat') && $('setAutoFormat').checked),
      sortKeys: !!($('setSortKeys') && $('setSortKeys').checked),
      theme: ($('setTheme') && $('setTheme').checked) ? 'dark' : 'light'
    };
    try { chrome.storage.local.set(settings); }
    catch (e) { console.warn('[onboarding] persistSetup failed:', e && e.message); }
  }
  function loadSettings() {
    if (!hasChrome) { return; }
    try {
      chrome.storage.local.get(['indent', 'autoFormat', 'sortKeys', 'theme'], (r) => {
        if (!r) { return; }
        if (r.indent !== undefined) {
          const want = r.indent === '\t' ? 'tab' : String(r.indent);
          const hit = document.querySelector('#indentChips input[value="' + want + '"]');
          if (hit) { hit.checked = true; }
        }
        if ($('setAutoFormat') && r.autoFormat !== undefined) { $('setAutoFormat').checked = !!r.autoFormat; }
        if ($('setSortKeys') && r.sortKeys !== undefined) { $('setSortKeys').checked = !!r.sortKeys; }
        if ($('setTheme') && r.theme !== undefined) { $('setTheme').checked = r.theme !== 'light'; }
      });
    } catch (_) {}
  }

  /* ---------- Step 6: pricing toggle + FAQ + convert + skip ---------- */
  const PLANS = {
    monthly: { amt: '$4.99', per: '/ month', sub: '7-day free trial, no card to start', r1: 'No card to start' },
    lifetime: { amt: '$99', per: 'once', sub: 'One payment, every Zovo tool included', r1: 'One-time payment' }
  };
  const seg = $('planSeg');
  if (seg) seg.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-plan]'); if (!btn) { return; }
    plan = btn.dataset.plan;
    Array.from(seg.querySelectorAll('button')).forEach((b) => b.classList.toggle('on', b === btn));
    const p = PLANS[plan] || PLANS.monthly;
    if ($('priceAmt')) { $('priceAmt').textContent = p.amt; }
    if ($('pricePer')) { $('pricePer').textContent = p.per; }
    if ($('priceSub')) { $('priceSub').textContent = p.sub; }
    if ($('reassure1')) { $('reassure1').textContent = p.r1; }
    if (current === 6) { nextLabel.textContent = nextLabelFor(6); }
  });

  Array.from(document.querySelectorAll('#faq .faq-item')).forEach((item) => {
    const q = item.querySelector('.faq-q'), a = item.querySelector('.faq-a');
    if (!q || !a) { return; }
    q.addEventListener('click', () => {
      const open = item.classList.toggle('open');
      a.style.maxHeight = open ? a.scrollHeight + 'px' : '0';
    });
  });

  function convert() {
    if (hasChrome) { try { chrome.storage.local.set({ upgradeIntentAt: Date.now(), upgradePlan: plan }); } catch (_) {} }
    const url = CHECKOUT + '&plan=' + encodeURIComponent(plan);
    if (hasChrome && chrome.tabs && chrome.tabs.create) { try { chrome.tabs.create({ url }); } catch (_) { window.open(url, '_blank'); } }
    else { window.open(url, '_blank'); }
    go(7);
  }
  if ($('skipPro')) { $('skipPro').addEventListener('click', () => go(7)); }

  /* ---------- Step 6: license activation ---------- */
  const VERIFY_URL = 'https://zgubxqomnbmxgbdhvwja.supabase.co/functions/v1/verify-extension-license';
  const ANON_KEY = 'sb_publishable_RG4IVO9Qm23_xPzdQjdFPQ_QHBwbOLv';
  const SLUG = 'json-formatter-pro';
  const NET_TIMEOUT_MS = 8000;

  const actToggle = $('actToggle'), actPanel = $('actPanel'), actBtn = $('actBtn'), licKey = $('licKey'), actStatus = $('actStatus');
  if (actToggle && actPanel) {
    actToggle.addEventListener('click', () => {
      const open = actPanel.hidden;
      actPanel.hidden = !open;
      actToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open && licKey) { licKey.focus(); }
    });
  }
  function setActStatus(msg, kind) {
    if (!actStatus) { return; }
    actStatus.textContent = msg;
    actStatus.className = 'act-status ' + (kind || '');
  }
  // POST the key to the Zovo license server. Resolves {ok,data}, never throws.
  function verifyKey(key) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), NET_TIMEOUT_MS);
    return fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY, 'Authorization': 'Bearer ' + ANON_KEY },
      body: JSON.stringify({ license_key: key, extension: SLUG }),
      signal: ctrl.signal
    }).then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .catch(() => ({ ok: false, data: null }))
      .then((out) => { clearTimeout(timer); return out; });
  }
  function storeLicense(key, data) {
    if (!hasChrome) { return; }
    try {
      chrome.storage.sync.set({ licenseKey: key, isPro: true });
      chrome.storage.local.set({
        zovo_license: {
          key: key, valid: true, tier: data.tier || 'pro', email: data.email || null,
          features: Array.isArray(data.features) ? data.features : [],
          verifiedAt: Date.now(), graceUntil: Date.now() + 7 * 24 * 60 * 60 * 1000
        }
      });
    } catch (_) {}
  }
  if (actBtn) actBtn.addEventListener('click', () => {
    const k = (licKey && licKey.value ? licKey.value : '').trim();
    if (k.length < 8) { setActStatus('That key looks too short. Check it and try again.', 'err'); return; }
    if (!hasChrome) { setActStatus('Open this from the extension to activate a key.', 'err'); return; }
    setActStatus('Checking your key…', '');
    actBtn.disabled = true;
    verifyKey(k).then((out) => {
      actBtn.disabled = false;
      if (out.ok && out.data && out.data.valid === true) {
        storeLicense(k, out.data);
        setActStatus('Pro is active across every Zovo extension. Thank you.', 'ok');
      } else {
        setActStatus('That key is not active. Check it, or get Pro above.', 'err');
      }
    }).catch(() => {
      actBtn.disabled = false;
      setActStatus('Could not verify right now. Try again in a moment.', 'err');
    });
  });

  /* ---------- Step 7: finish ---------- */
  function finish() {
    if (!hasChrome) { nextLabel.textContent = 'Done'; return; }
    try {
      chrome.storage.local.set({ onboardingComplete: true, onboardingAt: Date.now() });
      window.close();
    } catch (_) {}
  }

  /* ---------- deep-link a step (preview/screenshots): ?step=4 ---------- */
  try {
    const q = +new URLSearchParams(location.search).get('step');
    if (q >= 1 && q <= TOTAL) { current = q; }
  } catch (_) {}

  loadSettings();
  render();
})();
