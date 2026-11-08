/* CI Express – customer website /customer */
(function () {
  var t = CI.t, E = CI.esc, I = CI.icon, $ = function (id) { return document.getElementById(id); };
  var VIEWS = [{ id: 'track', icon: 'box', t: 'navTrack' }, { id: 'branches', icon: 'pin', t: 'navBranches' }, { id: 'prices', icon: 'tag', t: 'navPrices' }, { id: 'account', icon: 'user', t: 'navAccount' }];
  var cur = 'track', lastNo = '', lastRec = null, brLoaded = null, cam = null;
  var ME = null, NOTES = {}, IDX = {}, refs = [], meMode = 'login';

  function shell() {
    document.body.innerHTML = '<div class="c-hero"><div class="bar"><div class="in"><a class="logo" href="/customer"><div class="m">CI</div><div><b>CI Express</b></div></a><nav class="c-nav">' +
      VIEWS.map(function (v) { return '<button data-v="' + v.id + '">' + E(t(v.t)) + '</button>'; }).join('') + '</nav>' + CI.langSelect() + '</div></div>' +
      '<div class="in mob"><div class="row"><a class="logo" href="/customer"><div class="m">CI</div><div><b>CI Express</b><span>' + E((CI.cfg.site || '').replace(/^https?:\/\//, '')) + '</span></div></a><div class="grow"></div>' + CI.langSelect() + '</div></div>' +
      '<div class="in txt"><h1 id="hT"></h1><p id="hS"></p></div></div><main class="c-wrap" id="cv"></main>' +
      '<nav class="tabs">' + VIEWS.map(function (v) { return '<button data-v="' + v.id + '">' + I(v.icon) + '<span>' + E(t(v.t)) + '</span>' + (v.id === 'account' ? '<span class="bd hide" id="nb">0</span>' : '') + '</button>'; }).join('') + '</nav>' +
      '<div id="scanOv" class="ov hide" style="align-items:center;flex-direction:column;gap:14px;padding:16px;background:rgba(15,15,20,.94)"><div style="color:#fff;font-weight:700;text-align:center">' + E(t('scanTitle')) + '</div><div class="cam" style="width:100%;max-width:420px"><div id="reader"></div></div><div id="scanMsg" style="color:#FECACA;font-weight:700;text-align:center;min-height:20px"></div><button class="btn line" id="scanX">' + E(t('close')) + '</button></div>';
    document.querySelectorAll('[data-v]').forEach(function (b) { b.onclick = function () { go(b.getAttribute('data-v')); }; });
    $('scanX').onclick = scanClose;
    CI.applyI18n(document); badge();
  }
  function go(id, keepScroll) {
    if (cam) scanClose(); cur = id;
    document.querySelectorAll('[data-v]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-v') === id); });
    var desk = window.innerWidth >= 900;
    var ht = { track: desk ? 'cHeroDesk' : 'cTitle', branches: 'brTitle', prices: 'prTitle', account: 'acTitle' }[id], hs = { track: 'cSub', branches: 'brSub', prices: 'prSub', account: 'acSub' }[id];
    $('hT').textContent = t(ht); $('hS').textContent = t(hs);
    if (!keepScroll) window.scrollTo(0, 0);
    try { history.replaceState(null, '', '/customer' + (id === 'track' ? (lastNo ? '?no=' + lastNo : '') : '#' + id)); } catch (e) {}
    ({ track: vTrack, branches: vBranches, prices: vPrices, account: vAccount })[id]($('cv'));
  }
  CI.onLang(function () { shell(); go(cur, true); });

  /* ---------- TRACK ---------- */
  function vTrack(v) {
    var inst = '';
    if (!CI.isStandalone()) inst = '<div class="install"><div class="m">CI</div><div class="grow"><b>' + E(t('install')) + '</b><div class="small muted">' + E(t('installIos')) + '</div></div><button class="btn sm hide" data-install>' + E(t('installBtn')) + '</button></div>';
    v.innerHTML = '<div class="c-grid"><div><form class="card raise pad-lg" id="tf"><label class="f" for="no">' + E(t('trackNo')) + '</label><div class="trk"><input id="no" class="grow" placeholder="PP-261108-0001" autocapitalize="characters" autocomplete="off" spellcheck="false" value="' + E(lastNo) + '"><button class="btn" type="submit">' + E(t('track')) + '</button></div>' +
      '<button class="btn line block" type="button" id="sq" style="margin-top:10px">' + I('scan') + E(t('scanQr')) + '</button></form>' + inst + '</div><div id="res"></div></div>' +
      '<div class="grid3" style="gap:12px;margin-top:8px" id="feat"></div>';
    $('tf').onsubmit = function (e) { e.preventDefault(); lookup($('no').value); };
    $('sq').onclick = scanOpen;
    var ib = v.querySelector('[data-install]'); if (ib) { if (CI.installEvt) ib.classList.remove('hide'); ib.onclick = function () { if (CI.installEvt) { CI.installEvt.prompt(); CI.installEvt = null; ib.classList.add('hide'); } }; }
    if (window.innerWidth >= 900) $('feat').innerHTML = [['fHelp1', 'fHelp1s', 'branches'], ['fHelp2', 'fHelp2s', 'prices'], ['fHelp3', 'fHelp3s', 'account']].map(function (f) { return '<button class="card" data-g="' + f[2] + '" style="border:0;text-align:left;cursor:pointer;margin:0"><b style="font-size:16px">' + E(t(f[0])) + '</b><div class="small muted" style="margin-top:6px">' + E(t(f[1])) + '</div></button>'; }).join('');
    $('feat').querySelectorAll('[data-g]').forEach(function (b) { b.onclick = function () { go(b.getAttribute('data-g')); }; });
    if (lastRec) show(lastNo, lastRec);
  }
  function msg(k) { lastRec = null; var r = $('res'); if (r) r.innerHTML = '<div class="card raise"><div class="err" style="margin:0">' + E(t(k)) + '</div></div>'; }
  function lookup(no) {
    no = CI.parseNo(no) || String(no || '').trim().toUpperCase(); if (!no) return;
    if (!CI.ready) { msg('notReady'); return; }
    if (!CI.NO_RE.test(no)) { msg('notFound'); return; }
    lastNo = no; if ($('no')) $('no').value = no;
    try { history.replaceState(null, '', '/customer?no=' + no); } catch (e) {}
    $('res').innerHTML = '<div class="card raise"><div class="muted">' + E(t('working')) + '</div></div>';
    Promise.all([CI.db.ref('track/' + no).once('value'), loadBr()]).then(function (a) { var r = a[0].val(); if (!r) msg('notFound'); else { lastRec = r; show(no, r); } }).catch(function () { msg('netErr'); });
  }
  function show(no, r) {
    var st = r.status, h = CI.histList(r.hist), b = r.tc ? CI.branches[r.tc] : CI.branchList.filter(function (x) { return x.name === r.to; })[0];
    var chip = st === 'arrived' ? '<span class="chip ok">' + E(t('readyPickup')) + '</span>' : CI.chip(st), c = r.call;
    var html = '<div class="card raise pad-lg"><div class="row sp" style="margin-bottom:10px"><span class="small muted" style="font-weight:700">' + E(no) + '</span>' + chip + '</div>' +
      '<div class="row" style="gap:10px;margin-bottom:12px"><div class="grow"><div class="tiny muted">' + E(t('from')) + '</div><b style="font-size:18px">' + E(r.from) + '</b></div>' + I('arrow', ' style="width:28px;height:28px;color:#C8102E;flex:0 0 28px"') + '<div class="grow" style="text-align:right"><div class="tiny muted">' + E(t('to')) + '</div><b style="font-size:18px">' + E(r.to) + '</b></div></div>' + CI.bar4(st) +
      '<div class="small muted" style="margin-top:10px">' + E(t('lastUpd')) + ': ' + E(CI.fmt(r.updated || r.created)) + '</div>' +
      (c && c.at ? '<div class="note ' + (c.state === 'ok' ? 'ok' : 'warn') + '" style="margin-top:12px">' + I('phone') + '<div class="small">' + E(t(c.state === 'ok' ? 'cCallOk' : 'cCallNo', { t: CI.fmtT(c.at) })) + '</div></div>' : '') + '</div>';
    if (b && st !== 'delivered' && st !== 'returned') {
      var q = b.lat + ',' + b.lng, tel = (b.phones || [])[0];
      html += '<div class="card"><div class="tiny muted" style="font-weight:700;text-transform:uppercase;letter-spacing:.5px">' + E(t('pickupAt')) + '</div><b style="font-size:16px;display:block;margin:4px 0">' + E(b.name) + '</b>' + (b.address ? '<div class="small muted">' + E(b.address) + '</div>' : '') + (b.hours ? '<div class="small muted">' + E(t('hours')) + ': ' + E(b.hours) + '</div>' : '') +
        '<div class="row" style="margin-top:12px">' + (b.lat ? '<a class="btn dark grow" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=' + E(q) + '">' + I('nav') + E(t('directions')) + '</a>' : '') + (tel ? '<a class="btn soft grow" href="tel:' + E(String(tel).replace(/[^0-9+]/g, '')) + '">' + I('phone') + E(t('callBranch')) + '</a>' : '') + '</div></div>';
    }
    html += '<div class="card"><h3>' + E(t('journey')) + '</h3>' + CI.timeline(r.hist) + '</div>';
    $('res').innerHTML = html;
    if (window.innerWidth < 900) setTimeout(function () { var el = $('res'); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 12, behavior: 'smooth' }); }, 60);
  }
  function scanOpen() {
    $('scanOv').classList.remove('hide'); $('scanMsg').textContent = '';
    cam = CI.Scanner('reader');
    cam.start(function (txt) { var no = CI.parseNo(txt); if (!no) { $('scanMsg').textContent = t('scanBad'); return; } scanClose(); if (cur !== 'track') go('track'); lookup(no); }, function () { $('scanMsg').textContent = t('noCam'); });
  }
  function scanClose() { var o = $('scanOv'); if (o) o.classList.add('hide'); if (cam) { cam.stop(); cam = null; } }

  /* ---------- BRANCHES ---------- */
  function loadBr() { if (!brLoaded) brLoaded = CI.loadBranches().then(function (l) { return l.filter(function (b) { return b.active !== false; }); }).catch(function () { brLoaded = null; return []; }); return brLoaded; }
  var MAP = null, MK = {}, LY = null;
  function vBranches(v) {
    v.innerHTML = '<div class="card raise"><div class="row" style="margin-bottom:10px"><label class="sr" for="bq">' + E(t('search')) + '</label><input id="bq" class="grow" placeholder="' + E(t('brSearch')) + '" autocomplete="off"><button class="icon-btn" id="ml" aria-label="' + E(t('myLoc')) + '">' + I('nav') + '</button></div><div id="map"></div><div class="small muted" id="mm" style="margin-top:8px"></div></div><div class="card" id="bl"><div class="muted">' + E(t('working')) + '</div></div>';
    MAP = null; MK = {};
    loadBr().then(function (list) {
      if (!list.length) { $('map').classList.add('hide'); $('bl').innerHTML = '<div class="empty">' + E(t('noBranches')) + '</div>'; return; }
      var pts = list.filter(function (b) { return b.lat && b.lng; });
      if (window.L && pts.length) {
        MAP = L.map('map', { zoomControl: true, scrollWheelZoom: false }).setView([12.56, 104.99], 7);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(MAP);
        LY = L.layerGroup().addTo(MAP);
        pts.forEach(function (b) { var m = L.marker([b.lat, b.lng], { icon: L.divIcon({ className: '', html: '<div class="pin"></div>', iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -28] }) }); m.bindPopup(function () { return pop(b); }, { maxWidth: 270 }); MK[b.code] = m; m.addTo(LY); });
        fit(pts); setTimeout(function () { if (MAP) MAP.invalidateSize(); }, 200);
      } else { $('map').classList.add('hide'); if (!window.L) $('mm').textContent = t('mapFail'); }
      drawList(list);
      $('bq').oninput = function () { drawList(list); };
    });
    $('ml').onclick = function () {
      if (!navigator.geolocation || !MAP) return;
      navigator.geolocation.getCurrentPosition(function (p) { L.marker([p.coords.latitude, p.coords.longitude], { icon: L.divIcon({ className: '', html: '<div class="me-dot"></div>', iconSize: [16, 16] }) }).addTo(MAP); MAP.setView([p.coords.latitude, p.coords.longitude], 13); }, function () { $('mm').textContent = t('locFail'); }, { enableHighAccuracy: true, timeout: 15000 });
    };
  }
  function fit(pts) { if (!MAP || !pts.length) return; if (pts.length === 1) MAP.setView([pts[0].lat, pts[0].lng], 14); else MAP.fitBounds(L.latLngBounds(pts.map(function (b) { return [b.lat, b.lng]; })).pad(0.2)); }
  function pop(b) {
    var q = b.lat + ',' + b.lng;
    return '<div style="font-family:var(--font)"><b style="font-size:15px">' + E(b.name) + '</b><div style="color:#5B5E6B;font-size:12px">' + E(b.province || '') + '</div>' + (b.address ? '<div style="font-size:13px;margin:4px 0">' + E(b.address) + '</div>' : '') + (b.hours ? '<div style="font-size:12px;color:#5B5E6B">' + E(b.hours) + '</div>' : '') +
      '<div style="display:flex;flex-wrap:wrap;gap:4px;margin:6px 0">' + (b.phones || []).map(function (p) { return '<a href="tel:' + E(String(p).replace(/[^0-9+]/g, '')) + '" style="background:#FFF4F5;color:#C8102E;padding:4px 10px;border-radius:12px;font-weight:700;font-size:13px;text-decoration:none">' + E(p) + '</a>'; }).join('') + '</div>' +
      '<div style="display:flex;gap:4px"><a target="_blank" rel="noopener" style="flex:1;text-align:center;background:#16161D;color:#fff;padding:7px 4px;border-radius:8px;font-size:12px;font-weight:700;text-decoration:none" href="https://www.google.com/maps/search/?api=1&query=' + q + '">' + E(t('gmaps')) + '</a><a target="_blank" rel="noopener" style="flex:1;text-align:center;background:#0E7FB8;color:#fff;padding:7px 4px;border-radius:8px;font-size:12px;font-weight:700;text-decoration:none" href="https://waze.com/ul?ll=' + q + '&navigate=yes">' + E(t('waze')) + '</a><a target="_blank" rel="noopener" style="flex:1;text-align:center;background:#475569;color:#fff;padding:7px 4px;border-radius:8px;font-size:12px;font-weight:700;text-decoration:none" href="https://maps.apple.com/?daddr=' + q + '">' + E(t('apple')) + '</a></div></div>';
  }
  function drawList(list) {
    var q = ($('bq').value || '').toLowerCase().trim(), g = {};
    var shown = list.filter(function (b) { return !q || [b.name, b.address, b.province, (b.phones || []).join(' ')].join(' ').toLowerCase().indexOf(q) >= 0; });
    if (MAP && LY) list.forEach(function (b) { var m = MK[b.code]; if (!m) return; if (shown.indexOf(b) >= 0) LY.addLayer(m); else LY.removeLayer(m); });
    if (MAP && q) fit(shown.filter(function (b) { return b.lat; }));
    shown.forEach(function (b) { (g[b.province || ''] = g[b.province || ''] || []).push(b); });
    var keys = Object.keys(g).sort(function (a, b) { if (!a) return 1; if (!b) return -1; return a === 'Phnom Penh' ? -1 : b === 'Phnom Penh' ? 1 : a.localeCompare(b); });
    $('bl').innerHTML = !shown.length ? '<div class="empty">' + E(t('noMatch')) + '</div>' : keys.map(function (k) {
      return '<div class="tiny" style="font-weight:800;color:#3A3C47;text-transform:uppercase;letter-spacing:.5px;margin-top:10px">' + E(k || t('otherProv')) + '</div><div class="list">' + g[k].map(function (b) {
        return '<button class="li" data-c="' + E(b.code) + '"><span style="width:36px;height:36px;border-radius:50%;background:#FFF4F5;color:#C8102E;display:flex;align-items:center;justify-content:center;flex:0 0 36px">' + I('pin', ' style="width:18px;height:18px"') + '</span><div class="grow"><span class="t">' + E(b.name) + '</span><div class="s">' + E([b.address, (b.phones || [])[0]].filter(Boolean).join(' · ')) + '</div></div></button>';
      }).join('') + '</div>';
    }).join('');
    $('bl').querySelectorAll('[data-c]').forEach(function (x) { x.onclick = function () { var c = x.getAttribute('data-c'), b = CI.branches[c], m = MK[c]; if (MAP && b && b.lat) { window.scrollTo({ top: 0, behavior: 'smooth' }); MAP.setView([b.lat, b.lng], 15); if (m) m.openPopup(); } else if (b) CI.sheet({ body: pop(b) }); }; });
  }

  /* ---------- PRICES ---------- */
  function vPrices(v) {
    v.innerHTML = '<div class="card raise pad-lg" id="pc"><div class="muted">' + E(t('working')) + '</div></div>';
    if (!CI.ready) { $('pc').innerHTML = '<div class="err">' + E(t('notReady')) + '</div>'; return; }
    CI.db.ref('prices').once('value').then(function (s) {
      var o = s.val() || {}, arr = Object.keys(o).map(function (k) { var p = o[k]; p.id = k; return p; });
      if (!arr.length) { $('pc').innerHTML = '<div class="empty">' + E(t('noPrices')) + '</div>'; return; }
      $('pc').innerHTML = '<div class="grid2"><div class="fld"><label class="f" for="pi">' + E(t('prItem')) + '</label><select id="pi">' + arr.map(function (p) { return '<option value="' + E(p.id) + '">' + E(p.name) + '</option>'; }).join('') + '</select></div><div class="fld"><label class="f" for="pq">' + E(t('prQty')) + ' (<span id="pu"></span>)</label><input id="pq" type="number" min="0" step="0.1" inputmode="decimal" value="1"></div></div>' +
        '<div style="background:#FFF4F5;border-radius:14px;padding:16px;margin-top:4px"><div class="small" style="color:#C8102E;font-weight:700">' + E(t('prTotal')) + '</div><div id="pt" style="font-size:32px;font-weight:800;letter-spacing:-.5px"></div><div class="tiny muted">' + E(t('prNote')) + '</div></div>' +
        '<h3 style="margin:20px 0 6px">' + E(t('prices')) + '</h3><div class="list">' + arr.map(function (p) { return '<div class="li"><span class="t grow">' + E(p.name) + '</span><b>' + E(CI.money(p.price, p.cur)) + '</b><span class="s">' + E(t('perUnit', { u: t('u_' + p.unit) })) + '</span></div>'; }).join('') + '</div>';
      function calc() { var p = o[$('pi').value], n = parseFloat($('pq').value) || 0; $('pu').textContent = t('u_' + p.unit); $('pt').textContent = CI.money(n * parseFloat(p.price), p.cur); }
      $('pi').onchange = calc; $('pq').oninput = calc; calc();
    }).catch(function () { $('pc').innerHTML = '<div class="err">' + E(t('netErr')) + '</div>'; });
  }

  /* ---------- ACCOUNT ---------- */
  function detach() { refs.forEach(function (r) { r.off(); }); refs = []; NOTES = {}; IDX = {}; }
  function attach() {
    detach(); if (!ME) return;
    var rn = CI.db.ref('custNote/' + ME.phone), ri = CI.db.ref('custIdx/' + ME.phone); refs = [rn, ri];
    rn.on('value', function (s) { NOTES = s.val() || {}; badge(); if (cur === 'account') vAccount($('cv')); }, function () {});
    ri.on('value', function (s) { IDX = s.val() || {}; if (cur === 'account') vAccount($('cv')); }, function () {});
  }
  function unread() { return Object.keys(NOTES).filter(function (k) { return !NOTES[k].seen; }).length; }
  function badge() { var b = $('nb'); if (!b) return; var n = unread(); b.textContent = n; b.classList.toggle('hide', !n); }
  function vAccount(v) {
    if (!CI.ready) { v.innerHTML = '<div class="card raise"><div class="err">' + E(t('notReady')) + '</div></div>'; return; }
    if (!ME) {
      var reg = meMode === 'register';
      v.innerHTML = '<form class="card raise pad-lg" id="af" style="max-width:460px;margin-left:auto;margin-right:auto"><h2 style="margin-bottom:14px">' + E(t(reg ? 'register' : 'login')) + '</h2>' +
        '<div class="fld"><label class="f" for="aph">' + E(t('phone')) + '</label><input id="aph" type="tel" inputmode="tel" autocomplete="tel" placeholder="012 345 678"></div>' +
        '<div class="fld"><label class="f" for="apw">' + E(t('password')) + '</label><input id="apw" type="password" autocomplete="' + (reg ? 'new-password' : 'current-password') + '"></div>' +
        (reg ? '<div class="fld"><label class="f" for="apw2">' + E(t('password2')) + '</label><input id="apw2" type="password" autocomplete="new-password"></div>' : '') +
        '<div class="err" id="ae"></div><button class="btn block" id="ab" type="submit">' + E(t(reg ? 'register' : 'login')) + '</button><button class="btn block" type="button" id="am" style="background:none;color:#C8102E;margin-top:6px">' + E(t(reg ? 'toLog' : 'toReg')) + '</button></form>';
      $('am').onclick = function () { meMode = reg ? 'login' : 'register'; vAccount(v); };
      $('af').onsubmit = function (e) {
        e.preventDefault(); var ph = CI.normPhone($('aph').value), pw = $('apw').value, er = $('ae'), b = $('ab');
        if (!ph) { er.textContent = t('badPhone'); return; } if (pw.length < 6) { er.textContent = t('pwShort'); return; }
        if (reg && pw !== $('apw2').value) { er.textContent = t('pwDiff'); return; }
        CI.busy(b, true); busyAuth = true;
        var p = reg ? CI.auth.createUserWithEmailAndPassword(CI.custEmail(ph), pw).then(function (cr) { return CI.db.ref('customers/' + cr.user.uid).set({ phone: ph, at: Date.now() }).then(function () { return cr.user; }); })
          : CI.auth.signInWithEmailAndPassword(CI.custEmail(ph), pw).then(function (cr) { return cr.user; });
        p.then(function (u) { busyAuth = false; ME = { uid: u.uid, phone: ph }; meMode = 'login'; attach(); vAccount(v); })
          .catch(function (x) { busyAuth = false; CI.busy(b, false); var c = (x && x.code) || ''; er.textContent = c === 'auth/email-already-in-use' ? t('hasAcct') : c === 'auth/network-request-failed' ? t('netErr') : reg ? t('failed') : t('wrongLogin'); });
      };
      return;
    }
    var nk = Object.keys(NOTES).sort(function (a, b) { return NOTES[b].at - NOTES[a].at; }), pk = Object.keys(IDX).sort(function (a, b) { return (IDX[b].u || 0) - (IDX[a].u || 0); });
    var NK = { posted: 'nPosted', 'new': 'nNew', arrived: 'nArrived', received: 'nReceived' };
    v.innerHTML = '<div class="c-grid"><div><div class="card raise pad-lg"><div class="row sp"><div><div class="tiny muted">' + E(t('phone')) + '</div><b style="font-size:18px">' + E(CI.showPhone(ME.phone)) + '</b></div><button class="btn line sm" id="lo">' + E(t('logout')) + '</button></div></div>' +
      '<div class="card"><div class="row sp" style="margin-bottom:6px"><h3>' + E(t('news')) + '</h3>' + (unread() ? '<button class="btn soft sm" id="ma">' + E(t('markAll')) + '</button>' : '') + '</div>' +
      (nk.length ? '<div class="list">' + nk.slice(0, 30).map(function (k) { var n = NOTES[k]; return '<button class="li" data-n="' + E(k) + '"' + (n.seen ? '' : ' style="background:#FFF4F5;border-radius:10px;padding-left:10px;padding-right:10px"') + '><div class="grow"><span class="t" style="font-size:14px">' + E(t(NK[n.k] || 'nPosted', { no: n.no, to: n.to || '' })) + '</span><div class="s">' + E((n.from || '') + ' → ' + (n.to || '')) + ' · ' + E(CI.fmt(n.at)) + '</div></div></button>'; }).join('') + '</div>' : '<div class="empty">' + E(t('noNews')) + '</div>') + '</div></div>' +
      '<div class="card"><h3 style="margin-bottom:6px">' + E(t('myParcels')) + '</h3>' + (pk.length ? '<div class="list">' + pk.slice(0, 80).map(function (k) { var x = IDX[k]; return '<button class="li" data-no="' + E(x.no || k) + '"><div class="grow"><div class="row sp"><span class="t">' + E(x.no || k) + '</span>' + CI.chip(x.st) + '</div><div class="s">' + E((x.from || '') + ' → ' + (x.to || '')) + ' · ' + E(t(x.role === 'sr' ? 'roleSR' : x.role === 'r' ? 'roleR' : 'roleS')) + ' · ' + E(CI.fmtD(x.u)) + '</div></div></button>'; }).join('') + '</div>' : '<div class="empty">' + E(t('noParcels')) + '</div>') + '</div></div>';
    $('lo').onclick = function () { detach(); ME = null; badge(); CI.auth.signOut(); vAccount(v); };
    var ma = $('ma'); if (ma) ma.onclick = function () { Object.keys(NOTES).forEach(function (k) { if (!NOTES[k].seen) CI.db.ref('custNote/' + ME.phone + '/' + k + '/seen').set(true).catch(function () {}); }); };
    v.querySelectorAll('[data-n]').forEach(function (b) { b.onclick = function () { var k = b.getAttribute('data-n'), n = NOTES[k]; if (!n.seen) CI.db.ref('custNote/' + ME.phone + '/' + k + '/seen').set(true).catch(function () {}); openNo(n.no); }; });
    v.querySelectorAll('[data-no]').forEach(function (b) { b.onclick = function () { openNo(b.getAttribute('data-no')); }; });
  }
  function openNo(no) { lastRec = null; lastNo = no; go('track'); lookup(no); }
  var busyAuth = false;
  if (CI.auth) CI.auth.onAuthStateChanged(function (u) {
    if (busyAuth) return;
    if (!u || !/@cust\./.test(u.email || '')) { if (ME) { detach(); ME = null; badge(); if (cur === 'account') vAccount($('cv')); } return; }
    CI.db.ref('customers/' + u.uid).once('value').then(function (s) { var c = s.val(); if (c && c.phone) { ME = { uid: u.uid, phone: c.phone }; attach(); } if (cur === 'account') vAccount($('cv')); }).catch(function () {});
  });

  /* ---------- start ---------- */
  shell();
  var m = location.search.match(/[?&]no=([A-Za-z0-9-]+)/), h = (location.hash || '').slice(1);
  if (m) { lastNo = m[1].toUpperCase(); go('track'); lookup(lastNo); }
  else go(VIEWS.some(function (v) { return v.id === h; }) ? h : 'track');
})();
