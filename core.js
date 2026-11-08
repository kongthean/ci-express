/* CI Express – shared helpers for every page */
(function () {
  var CFG = window.CI_CONFIG || {}, TX = window.CI_TEXT || {};
  var CI = window.CI = { cfg: CFG };

  /* ---------- language ---------- */
  var LANG = 'en';
  try { LANG = localStorage.getItem('ciLang') || ''; } catch (e) {}
  if (!TX[LANG]) { var nl = (navigator.language || 'en').slice(0, 2); LANG = nl === 'km' ? 'km' : nl === 'zh' ? 'zh' : 'en'; }
  CI.lang = function () { return LANG; };
  CI.t = function (k, v) {
    var s = (TX[LANG] && TX[LANG][k]) || (TX.en && TX.en[k]) || k;
    if (v) Object.keys(v).forEach(function (x) { s = s.split('{' + x + '}').join(v[x] == null ? '' : v[x]); });
    return s;
  };
  var langCbs = [];
  CI.onLang = function (f) { langCbs.push(f); };
  CI.setLang = function (l) {
    if (!TX[l]) return; LANG = l; try { localStorage.setItem('ciLang', l); } catch (e) {}
    CI.applyI18n(document); langCbs.forEach(function (f) { try { f(); } catch (e) { console.error(e); } });
  };
  CI.applyI18n = function (root) {
    document.documentElement.lang = LANG;
    root.querySelectorAll('[data-t]').forEach(function (el) { el.textContent = CI.t(el.getAttribute('data-t')); });
    root.querySelectorAll('[data-ph]').forEach(function (el) { el.placeholder = CI.t(el.getAttribute('data-ph')); });
    root.querySelectorAll('[data-al]').forEach(function (el) { el.setAttribute('aria-label', CI.t(el.getAttribute('data-al'))); });
    root.querySelectorAll('select.langsel').forEach(function (s) { s.value = LANG; });
  };
  CI.langSelect = function (cls) {
    return '<select class="' + (cls || 'langsel') + '" aria-label="Language" onchange="CI.setLang(this.value)"><option value="en">EN</option><option value="km">ខ្មែរ</option><option value="zh">中文</option></select>';
  };

  /* ---------- text helpers ---------- */
  CI.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var TZ = 'Asia/Phnom_Penh';
  function df(o) { try { return new Intl.DateTimeFormat('en-GB', Object.assign({ timeZone: TZ }, o)); } catch (e) { return null; } }
  var F1 = df({ day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }), F2 = df({ hour: '2-digit', minute: '2-digit', hour12: false }), F3 = df({ day: '2-digit', month: 'short', year: 'numeric' });
  CI.fmt = function (ts) { return ts && F1 ? F1.format(new Date(ts)) : ''; };
  CI.fmtT = function (ts) { return ts && F2 ? F2.format(new Date(ts)) : ''; };
  CI.fmtD = function (ts) { return ts && F3 ? F3.format(new Date(ts)) : ''; };
  CI.dayKey = function (ts) { var d = new Date((ts || Date.now()) + 7 * 3600e3); return String(d.getUTCFullYear()).slice(2) + ('0' + (d.getUTCMonth() + 1)).slice(-2) + ('0' + d.getUTCDate()).slice(-2); };
  CI.dayStart = function (ts) { var d = new Date((ts || Date.now()) + 7 * 3600e3); d.setUTCHours(0, 0, 0, 0); return d.getTime() - 7 * 3600e3; };
  CI.normPhone = function (p) {
    var d = String(p || '').replace(/[^0-9]/g, '');
    if (d.indexOf('00855') === 0) d = d.slice(5); else if (d.indexOf('855') === 0 && d.length >= 11) d = d.slice(3);
    if (!d) return ''; if (d.charAt(0) !== '0') d = '0' + d;
    return /^0[0-9]{7,10}$/.test(d) ? d : '';
  };
  CI.showPhone = function (p) { p = String(p || ''); return p.length === 9 ? p.slice(0, 3) + ' ' + p.slice(3, 6) + ' ' + p.slice(6) : p.length === 10 ? p.slice(0, 3) + ' ' + p.slice(3, 6) + ' ' + p.slice(6) : p; };
  CI.money = function (v, cur) {
    var x = parseFloat(String(v == null ? '' : v).replace(/,/g, '')); if (isNaN(x)) return '';
    return cur === 'KHR' ? Math.round(x).toLocaleString('en-US') + ' ៛' : '$' + x.toFixed(2);
  };
  CI.NO_RE = /^[A-Z0-9]{2,5}-\d{6}-\d{4,}$/;
  CI.parseNo = function (s) {
    s = String(s || '').trim(); var m = s.match(/[?&]no=([A-Za-z0-9-]+)/); if (m) s = m[1];
    s = s.toUpperCase(); return CI.NO_RE.test(s) ? s : '';
  };
  CI.trackUrl = function (no) { return (CFG.site || location.origin) + '/customer?no=' + encodeURIComponent(no); };

  /* ---------- statuses ---------- */
  CI.STATUSES = ['posted', 'shipping', 'transit', 'arrived', 'delivered', 'returned', 'problem'];
  CI.stChip = { posted: 'blue', shipping: 'blue', transit: 'blue', arrived: 'ok', delivered: '', returned: 'warn', problem: 'bad' };
  CI.stStep = { posted: 1, shipping: 2, transit: 2, arrived: 3, delivered: 4, returned: 4, problem: 2 };
  CI.chip = function (st) { return '<span class="chip ' + (CI.stChip[st] || '') + '">' + CI.esc(CI.t('s_' + st)) + '</span>'; };
  CI.evText = function (h) {
    if (h.ev) return CI.t('ev_' + h.ev, { p: h.place || '' });
    return CI.t('e_' + h.s, { p: h.place || '' });
  };
  CI.histList = function (hist) {
    return hist ? Object.keys(hist).map(function (k) { return hist[k]; }).sort(function (a, b) { return b.at - a.at; }) : [];
  };
  CI.timeline = function (hist, showBy) {
    var h = CI.histList(hist);
    if (!h.length) return '<div class="muted small">' + CI.esc(CI.t('none')) + '</div>';
    return '<div class="tl">' + h.map(function (x, i) {
      return '<div class="ev' + (i === 0 ? ' first' : '') + '"><div class="dot"></div><div><b>' + CI.esc(CI.evText(x)) + '</b><span>' + CI.esc(CI.fmt(x.at)) + (showBy && x.byName ? ' · ' + CI.esc(x.byName) : '') + '</span>' + (x.note ? '<span style="display:block">' + CI.esc(x.note) + '</span>' : '') + '</div></div>';
    }).join('') + '</div>';
  };
  CI.bar4 = function (st) { var n = CI.stStep[st] || 1; return '<div class="bar4">' + [1, 2, 3, 4].map(function (i) { return '<i class="' + (i <= n ? 'on' : '') + '"></i>'; }).join('') + '</div>'; };

  /* ---------- icons (inline, stroke) ---------- */
  var P = {
    box: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
    pin: '<path d="M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
    tag: '<path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="8" cy="8" r="1.5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 2.9-6 6.5-6s6.5 2.5 6.5 6"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2.2.6 3.5 2.8 3.5 6"/>',
    scan: '<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M7 12h10"/>',
    plus: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>',
    more: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    building: '<path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/><path d="M16 9h2a2 2 0 0 1 2 2v10M2 21h20M8 7h4M8 11h4M8 15h4"/>',
    out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>',
    x: '<path d="M18 6L6 18M6 6l12 12"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    print: '<path d="M6 9V2h12v7"/><rect x="2" y="9" width="20" height="9" rx="2"/><path d="M6 14h12v8H6z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    nav: '<path d="M3 11l19-9-9 19-2-8-8-2z"/>',
    alert: '<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    arrow: '<path d="M5 12h14M13 5l7 7-7 7"/>',
    share: '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M16 6l-4-4-4 4M12 2v14"/>',
    cam: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>'
  };
  CI.icon = function (n, extra) { return '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"' + (extra || '') + '>' + (P[n] || '') + '</svg>'; };

  /* ---------- toast, sheet, confirm ---------- */
  var tt = null;
  CI.toast = function (msg, kind) {
    var el = document.getElementById('toast'); if (el) el.remove(); clearTimeout(tt);
    el = document.createElement('div'); el.id = 'toast'; el.className = kind || ''; el.setAttribute('role', 'status'); el.textContent = msg;
    document.body.appendChild(el); tt = setTimeout(function () { el.remove(); }, kind === 'bad' ? 4200 : 2600);
  };
  CI.sheet = function (o) {
    var ov = document.createElement('div'); ov.className = 'ov';
    ov.innerHTML = '<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>' + (o.title ? '<h2 style="margin-bottom:12px">' + CI.esc(o.title) + '</h2>' : '') + '<div class="sb">' + (o.body || '') + '</div><div class="acts"></div></div>';
    var acts = ov.querySelector('.acts'), api = { el: ov.querySelector('.sheet'), close: close };
    (o.actions || [{ label: CI.t('close'), kind: 'soft' }]).forEach(function (a) {
      var b = document.createElement('button'); b.className = 'btn ' + (a.kind || ''); b.type = 'button'; b.textContent = a.label;
      b.onclick = function () { var r = a.onClick ? a.onClick(api, b) : undefined; if (r !== false && !(r && r.then)) close(); if (r && r.then) r.then(function (v) { if (v !== false) close(); }); };
      acts.appendChild(b);
    });
    if (!acts.children.length) acts.remove();
    function close() { ov.remove(); if (o.onClose) o.onClose(); }
    ov.addEventListener('click', function (e) { if (e.target === ov && !o.sticky) close(); });
    document.body.appendChild(ov);
    var f = ov.querySelector('input,select,textarea'); if (f && window.innerWidth > 700) setTimeout(function () { f.focus(); }, 50);
    return api;
  };
  CI.confirm = function (msg, okLabel, kind) {
    return new Promise(function (res) {
      CI.sheet({ body: '<p style="font-size:16px;margin:0">' + CI.esc(msg) + '</p>', onClose: function () { res(false); }, actions: [
        { label: okLabel || CI.t('ok'), kind: kind || '', onClick: function () { res(true); } },
        { label: CI.t('cancel'), kind: 'soft', onClick: function () { res(false); } }
      ] });
    });
  };
  CI.busy = function (btn, on, label) {
    if (!btn) return; if (on) { btn.dataset.l = btn.textContent; btn.disabled = true; btn.textContent = label || CI.t('working'); }
    else { btn.disabled = false; if (btn.dataset.l) btn.textContent = btn.dataset.l; }
  };
  CI.beep = function (ok) {
    try {
      var A = window.AudioContext || window.webkitAudioContext; if (!A) return; CI._ac = CI._ac || new A();
      var o = CI._ac.createOscillator(), g = CI._ac.createGain(); o.connect(g); g.connect(CI._ac.destination);
      o.frequency.value = ok ? 1250 : 330; g.gain.value = 0.12; o.start(); o.stop(CI._ac.currentTime + (ok ? 0.12 : 0.35));
    } catch (e) {}
    try { if (navigator.vibrate) navigator.vibrate(ok ? 40 : [80, 60, 80]); } catch (e) {}
  };

  /* ---------- firebase ---------- */
  CI.ready = false;
  try {
    if (window.firebase && CFG.firebase && CFG.firebase.apiKey && CFG.firebase.apiKey.indexOf('PASTE') !== 0) {
      firebase.initializeApp(CFG.firebase); CI.db = firebase.database(); CI.auth = firebase.auth(); CI.ready = true;
    }
  } catch (e) { console.error(e); }
  CI.staffEmail = function (u) { return String(u || '').trim().toLowerCase() + '@staff.' + CFG.loginDomain; };
  CI.custEmail = function (p) { return 'c' + p + '@cust.' + CFG.loginDomain; };
  CI.fnUrl = function (name) { return 'https://' + (CFG.functionsRegion || 'asia-southeast1') + '-' + CFG.firebase.projectId + '.cloudfunctions.net/' + name; };
  CI.callFn = function (name, data) {
    if (!CI.auth || !CI.auth.currentUser) return Promise.reject(new Error('auth'));
    return CI.auth.currentUser.getIdToken().then(function (tok) {
      return fetch(CI.fnUrl(name), { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok }, body: JSON.stringify({ data: data || {} }) });
    }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || j.error) throw new Error((j.error && j.error.message) || ('HTTP ' + r.status)); return j.result; }); });
  };
  CI.branches = {}; CI.branchList = [];
  CI.loadBranches = function () {
    if (!CI.db) return Promise.resolve([]);
    return CI.db.ref('branches').once('value').then(function (s) {
      CI.branches = s.val() || {};
      CI.branchList = Object.keys(CI.branches).map(function (k) { var b = CI.branches[k]; b.code = k; return b; }).sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
      return CI.branchList;
    });
  };
  CI.bName = function (c) { return (CI.branches[c] && CI.branches[c].name) || c || ''; };

  /* ---------- QR scanner (html5-qrcode) ---------- */
  CI.Scanner = function (elId) {
    var q = null, last = '', lastAt = 0, api = {};
    api.running = function () { return !!q; };
    api.start = function (onCode, onErr) {
      if (q) return Promise.resolve();
      if (!window.Html5Qrcode) { onErr && onErr(); return Promise.reject(); }
      try { q = new Html5Qrcode(elId, { verbose: false }); } catch (e) { q = null; onErr && onErr(); return Promise.reject(e); }
      return q.start({ facingMode: 'environment' }, { fps: 12, qrbox: function (w, h) { var s = Math.floor(Math.min(w, h) * 0.75); return { width: s, height: s }; }, aspectRatio: 1.333 },
        function (txt) { var now = Date.now(); if (txt === last && now - lastAt < 2500) return; last = txt; lastAt = now; onCode(txt); }, function () {})
        .catch(function (e) { q = null; onErr && onErr(e); });
    };
    api.stop = function () { if (!q) return Promise.resolve(); var x = q; q = null; return x.stop().then(function () { try { x.clear(); } catch (e) {} }).catch(function () {}); };
    return api;
  };

  /* ---------- print labels (2 copies with QR) ---------- */
  CI.qrSvg = function (text) {
    if (!window.qrcode) return '';
    var q = window.qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  };
  CI.printLabels = function (s) {
    var el = document.getElementById('print'); if (!el) { el = document.createElement('div'); el.id = 'print'; document.body.appendChild(el); }
    var qr = CI.qrSvg(CI.trackUrl(s.no)), E = CI.esc, c = CFG.company || {};
    function one(copy) {
      return '<div class="lbl"><div class="h"><b>' + E(c.name || 'CI Express') + '</b><span class="cp">' + E(copy) + '</span></div>' +
        '<div class="no">' + E(s.no) + '</div><div class="qr">' + qr + '</div>' +
        '<div class="rt">' + E(s.fromName) + ' → ' + E(s.toName) + '</div><table>' +
        '<tr><td>' + E(CI.t('sender')) + '</td><td>' + E((s.sender || {}).n || '') + ' ' + E(CI.showPhone((s.sender || {}).p)) + '</td></tr>' +
        '<tr><td>' + E(CI.t('receiver')) + '</td><td><b>' + E((s.rcv || {}).n || '') + ' ' + E(CI.showPhone((s.rcv || {}).p)) + '</b></td></tr>' +
        '<tr><td>' + E(CI.t('goodsL')) + '</td><td>' + E(CI.t('g_' + (s.goods || 'parcel'))) + (s.desc ? ' – ' + E(s.desc) : '') + ' · ' + E(s.qty || 1) + (s.kg ? ' · ' + E(s.kg) + 'kg' : '') + '</td></tr>' +
        (s.price ? '<tr><td>' + E(CI.t('fee')) + '</td><td>' + E(CI.money(s.price, s.cur)) + ' (' + E(CI.t(s.paid ? 'paid' : 'unpaid')) + ')</td></tr>' : '') +
        (s.cod ? '<tr><td>COD</td><td><b>' + E(CI.money(s.cod, s.cur)) + '</b></td></tr>' : '') +
        '<tr><td>' + E(CI.t('date')) + '</td><td>' + E(CI.fmt(s.created)) + '</td></tr></table>' +
        '<div class="ft">' + E(CI.t('lblTrack')) + ': ' + E((CFG.site || '').replace(/^https?:\/\//, '')) + '/customer' + (c.hotline ? ' · ' + E(c.hotline) : '') + '</div></div>';
    }
    el.innerHTML = one(CI.t('lblParcel')) + one(CI.t('lblCustomer'));
    setTimeout(function () { window.print(); }, 150);
  };

  /* ---------- CSV export ---------- */
  CI.csv = function (name, rows) {
    var txt = '﻿' + rows.map(function (r) { return r.map(function (v) { v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(','); }).join('\r\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv;charset=utf-8' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { a.remove(); }, 500);
  };

  /* ---------- PWA ---------- */
  CI.isStandalone = function () { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; };
  CI.isIos = function () { return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); };
  CI.installEvt = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); CI.installEvt = e; document.querySelectorAll('[data-install]').forEach(function (x) { x.classList.remove('hide'); }); });
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', function () { navigator.serviceWorker.register('/sw.js').catch(function () {}); });
  }
})();
