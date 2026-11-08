/* CI Express – staff app (used by Headquarters at / and Agents at /agent) */
(function () {
  var t = CI.t, E = CI.esc, I = CI.icon;
  var S = window.Staff = { me: null, views: {}, nav: [], cur: null, cleanup: null, aiOn: null, prices: {} };
  var APP = document.body.getAttribute('data-app'); // 'admin' or 'agent'
  var root = document.getElementById('app');

  /* ================= login ================= */
  function loginScreen(msg) {
    root.innerHTML = '<div class="login"><div class="hero' + (APP === 'admin' ? ' dark' : '') + '"><div class="m">CI</div><h1>CI Express</h1><div style="opacity:.85;margin-top:4px">' + E(t(APP === 'admin' ? 'roleAdmin' : 'roleAgent')) + '</div></div>' +
      '<form class="box" id="lf" autocomplete="on"><div class="row sp" style="margin-bottom:14px"><h2>' + E(t('loginStaff')) + '</h2>' + CI.langSelect('langsel lang-dark') + '</div>' +
      '<div class="fld"><label class="f" for="lu">' + E(t('userOrEmail')) + '</label><input id="lu" name="username" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" required></div>' +
      '<div class="fld"><label class="f" for="lp">' + E(t('password')) + '</label><input id="lp" name="password" type="password" autocomplete="current-password" required></div>' +
      '<div class="err" id="le">' + E(msg || (CI.ready ? '' : t('notReady'))) + '</div><button class="btn block" id="lb" type="submit">' + E(t('login')) + '</button><button class="btn block" type="button" id="lfg" style="background:none;color:#C8102E;margin-top:6px">' + E(t('forgot')) + '</button></form></div>';
    var ls = root.querySelector('.lang-dark'); ls.style.cssText = 'background-color:#fff;color:#16161D;border-color:#E4E4EA'; ls.value = CI.lang();
    document.getElementById('lfg').onclick = function () {
      var u = document.getElementById('lu').value.trim().toLowerCase(), le = document.getElementById('le');
      if (u.indexOf('@') < 1) { le.textContent = t('forgotHint'); return; }
      CI.auth.sendPasswordResetEmail(u).then(function () { le.textContent = ''; CI.toast(t('forgotSent'), 'ok'); }).catch(function () { le.textContent = t('failed'); });
    };
    document.getElementById('lf').onsubmit = function (e) {
      e.preventDefault(); if (!CI.ready) return;
      var u = document.getElementById('lu').value.trim().toLowerCase(), p = document.getElementById('lp').value, b = document.getElementById('lb'), isMail = u.indexOf('@') > 0;
      if ((!isMail && !/^[a-z0-9_]{3,20}$/.test(u)) || p.length < 6) { document.getElementById('le').textContent = t('errLogin'); return; }
      CI.busy(b, true, t('loggingIn'));
      CI.auth.signInWithEmailAndPassword(isMail ? u : CI.staffEmail(u), p).catch(function (er) {
        CI.busy(b, false); document.getElementById('le').textContent = er && er.code === 'auth/network-request-failed' ? t('netErr') : t('errLogin');
      });
    };
  }

  function boot() {
    if (!CI.ready) { loginScreen(); return; }
    CI.auth.onAuthStateChanged(function (u) {
      if (!u) { S.me = null; stopCur(); loginScreen(); return; }
      if (/@cust\./.test(u.email || '')) { CI.auth.signOut(); return; }
      CI.db.ref('staff/' + u.uid).once('value').then(function (s) {
        var st = s.val();
        if (!st) { CI.auth.signOut(); loginScreen(t('errNoStaff')); return; }
        if (st.active !== true) { CI.auth.signOut(); loginScreen(t('errOff')); return; }
        if (APP === 'admin' && st.role !== 'admin') { CI.auth.signOut(); loginScreen(t('errNoAccess')); return; }
        S.me = Object.assign({ uid: u.uid }, st);
        return Promise.all([CI.loadBranches(), loadSettings(), loadPrices()]).then(shell);
      }).catch(function () { loginScreen(t('netErr')); });
    });
  }
  function loadSettings() { return CI.db.ref('settings/aiCall/on').once('value').then(function (s) { S.aiOn = s.val() === true; }).catch(function () { S.aiOn = false; }); }
  function loadPrices() { return CI.db.ref('prices').once('value').then(function (s) { S.prices = s.val() || {}; }).catch(function () {}); }

  /* ================= shell ================= */
  S.define = function (items) { S.nav = items; };
  function shell() {
    var me = S.me, items = S.nav.filter(function (n) { return !n.admin || me.role === 'admin'; });
    var bn = CI.bName(me.branch);
    root.innerHTML = '<div class="shell"><aside class="side"><div class="logo"><div class="m">CI</div><div><b>CI Express</b><span>' + E(t(me.role === 'admin' ? 'roleAdmin' : 'roleAgent')) + '</span></div></div>' +
      items.map(function (n) { return '<button class="nav" data-v="' + n.id + '">' + I(n.icon) + '<span>' + E(t(n.t)) + '</span></button>'; }).join('') +
      '<div class="foot"><div style="color:#fff;font-weight:700">' + E(me.name) + '</div><div>' + E(bn) + '</div>' + CI.langSelect() + '</div></aside>' +
      '<div class="main"><header class="top' + (APP === 'admin' ? ' dark' : '') + '"><div class="logo"><div class="m">CI</div><div><b id="topT">CI Express</b><span>' + E(bn) + ' · ' + E(me.name) + '</span></div></div><div class="sp-x"></div>' + CI.langSelect() + '</header>' +
      '<div class="view" id="view"></div></div></div><nav class="tabs" id="tabs"></nav>';
    var tabs = items.filter(function (n) { return n.tab; }), rest = items.filter(function (n) { return !n.tab; });
    var tb = document.getElementById('tabs');
    tb.innerHTML = tabs.map(function (n) { return '<button data-v="' + n.id + '">' + I(n.icon) + '<span>' + E(t(n.t)) + '</span></button>'; }).join('') +
      (rest.length ? '<button data-more="1">' + I('more') + '<span>' + E(t('navMore')) + '</span></button>' : '');
    root.querySelectorAll('[data-v]').forEach(function (b) { b.onclick = function () { S.go(b.getAttribute('data-v')); }; });
    var mb = tb.querySelector('[data-more]');
    if (mb) mb.onclick = function () {
      var sh = CI.sheet({ title: t('navMore'), body: '<div class="list">' + rest.map(function (n) { return '<button class="li" data-mv="' + n.id + '">' + I(n.icon, ' style="width:22px;height:22px;color:#5B5E6B"') + '<span class="t grow">' + E(t(n.t)) + '</span>' + I('arrow', ' style="width:18px;height:18px;color:#9A9CA8"') + '</button>'; }).join('') + '</div>' });
      sh.el.querySelectorAll('[data-mv]').forEach(function (b) { b.onclick = function () { sh.close(); S.go(b.getAttribute('data-mv')); }; });
    };
    CI.applyI18n(root);
    var start = (location.hash || '').slice(1);
    S.go(items.some(function (n) { return n.id === start; }) ? start : items[0].id);
  }
  CI.onLang(function () { if (S.me) { var c = S.cur; shell(); if (c) S.go(c); } else loginScreen(); });
  function stopCur() { if (S.cleanup) { try { S.cleanup(); } catch (e) {} S.cleanup = null; } }
  S.go = function (id, arg) {
    stopCur(); S.cur = id;
    var n = S.nav.filter(function (x) { return x.id === id; })[0]; if (!n) return;
    root.querySelectorAll('[data-v]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-v') === id); });
    var mb = root.querySelector('[data-more]'); if (mb) mb.classList.toggle('on', !n.tab);
    var tt = document.getElementById('topT'); if (tt) tt.textContent = t(n.t);
    try { history.replaceState(null, '', '#' + id); } catch (e) {}
    var v = document.getElementById('view'); v.innerHTML = ''; window.scrollTo(0, 0);
    var r = S.views[id](v, arg); if (typeof r === 'function') S.cleanup = r;
  };
  S.isAdmin = function () { return S.me && S.me.role === 'admin'; };

  /* ================= data helpers ================= */
  function phonesOf(s) { var a = CI.normPhone((s.sender || {}).p), b = CI.normPhone((s.rcv || {}).p); return { s: a, r: b }; }
  S.get = function (no) { return CI.db.ref('shipments/' + no).once('value').then(function (x) { var v = x.val(); if (v) v.no = no; return v; }); };
  S.applyStatus = function (s, status, o) {
    o = o || {}; var me = S.me, now = Date.now(), no = s.no, hk = CI.db.ref().push().key, place = o.place || CI.bName(me.branch), up = {};
    var h = { s: status, at: now, place: place, br: me.branch || '', by: me.uid, byName: me.name || '' }, th = { s: status, at: now, place: place };
    if (o.note) { h.note = o.note; th.note = o.note; } if (o.ev) { h.ev = o.ev; th.ev = o.ev; }
    if (!o.ev) { up['shipments/' + no + '/status'] = status; up['track/' + no + '/status'] = status; }
    up['shipments/' + no + '/updated'] = now; up['shipments/' + no + '/hist/' + hk] = h;
    up['track/' + no + '/updated'] = now; up['track/' + no + '/hist/' + hk] = th;
    var ph = phonesOf(s);
    [ph.s, ph.r].forEach(function (p) { if (p) { up['custIdx/' + p + '/' + no + '/st'] = status; up['custIdx/' + p + '/' + no + '/u'] = now; } });
    if (!o.ev && status === 'arrived' && ph.r) up['custNote/' + ph.r + '/' + no + '-arrived'] = { k: 'arrived', no: no, from: s.fromName || '', to: s.toName || '', at: now, seen: false };
    if (!o.ev && status === 'delivered' && ph.s && ph.s !== ph.r) up['custNote/' + ph.s + '/' + no + '-received'] = { k: 'received', no: no, from: s.fromName || '', to: s.toName || '', at: now, seen: false };
    return CI.db.ref().update(up).then(function () { if (!o.ev) s.status = status; return s; });
  };
  // Decide the next status for a scan. Returns {st} or {err}
  S.decide = function (s, mode) {
    var mine = S.me.branch, adm = S.isAdmin(), st = s.status, done = st === 'delivered' || st === 'returned';
    if (mode === 'auto') {
      if (done) return { err: t('already', { s: t('s_' + st) }) };
      if (mine === s.to) return st === 'arrived' ? { err: t('already', { s: t('s_arrived') }) } : { st: 'arrived' };
      if (mine === s.from) return st === 'posted' ? { st: 'shipping' } : { err: t('already', { s: t('s_' + st) }) };
      var last = CI.histList(s.hist)[0]; if (st === 'transit' && last && last.br === mine) return { err: t('already', { s: t('s_transit') }) };
      return { st: 'transit' };
    }
    if (mode === 'ship') { if (!adm && mine !== s.from) return { err: t('wrongBr') }; if (st !== 'posted') return { err: t('already', { s: t('s_' + st) }) }; return { st: 'shipping' }; }
    if (mode === 'transit') { if (done) return { err: t('already', { s: t('s_' + st) }) }; return { st: 'transit' }; }
    if (mode === 'arrive') { if (!adm && mine !== s.to) return { err: t('notAtDest') }; if (st === 'arrived' || done) return { err: t('already', { s: t('s_' + st) }) }; return { st: 'arrived' }; }
    if (mode === 'deliver') { if (!adm && mine !== s.to) return { err: t('notAtDest') }; if (done) return { err: t('already', { s: t('s_' + st) }) }; return { st: 'delivered' }; }
    if (mode === 'return') { if (done) return { err: t('already', { s: t('s_' + st) }) }; return { st: 'returned' }; }
    return { err: t('failed') };
  };
  S.requestCall = function (s) {
    return CI.db.ref('callReq/' + s.no).set({ at: Date.now(), by: S.me.uid }).then(function () { CI.toast(t('callReq'), 'ok'); }).catch(function () { CI.toast(t('denied'), 'bad'); });
  };
  S.manualCallResult = function (s, ok) { return S.applyStatus(s, s.status, { ev: ok ? 'call_ok' : 'call_no' }).then(function () { CI.toast(t('saved'), 'ok'); }); };

  /* call status box (live) */
  S.callBox = function (el, s) {
    var ref = CI.db.ref('shipments/' + s.no + '/call');
    function draw(c) {
      var rp = CI.showPhone((s.rcv || {}).p), html = '';
      if (!c && !S.aiOn) html = '<div class="note warn">' + I('phone') + '<div class="grow small">' + E(t('callOff')) + '</div></div>';
      else if (!c || c.state === 'calling' || c.state === 'queued') html = '<div class="note">' + I('phone') + '<div class="grow"><b class="small">' + E(t('aiCall')) + '</b><div class="small">' + E(t('calling')) + '</div></div></div>';
      else if (c.state === 'ok') html = '<div class="note ok">' + I('check') + '<div class="grow"><b class="small">' + E(t('aiCall')) + ': ' + E(t('st_ok')) + '</b><div class="small">' + E(t('calledOk', { p: rp, t: CI.fmtT(c.at) })) + '</div></div></div>';
      else html = '<div class="note warn">' + I('alert') + '<div class="grow"><b class="small">' + E(t('aiCall')) + ': ' + E(t('st_' + (c.state === 'busy' || c.state === 'failed' ? c.state : 'no'))) + '</b><div class="small">' + E(t('calledNo', { p: rp, t: CI.fmtT(c.at) })) + (c.next ? ' ' + E(t('callNext', { t: CI.fmtT(c.next) })) : '') + '</div></div></div>';
      var tel = String((s.rcv || {}).p || '').replace(/[^0-9+]/g, '');
      html += '<div class="row" style="margin-top:8px"><a class="btn soft grow" href="tel:' + E(tel) + '">' + I('phone') + E(t('callManual')) + '</a>' + (S.aiOn ? '<button class="btn soft grow" data-ai>' + E(t('callAgain')) + '</button>' : '') + '</div>';
      if (!S.aiOn) html += '<div class="small muted" style="margin-top:10px">' + E(t('cDidAnswer')) + '</div><div class="row" style="margin-top:6px"><button class="btn ok sm grow" data-m="1">' + E(t('cYes')) + '</button><button class="btn line sm grow" data-m="0">' + E(t('cNo')) + '</button></div>';
      el.innerHTML = html;
      var ai = el.querySelector('[data-ai]'); if (ai) ai.onclick = function () { S.requestCall(s); };
      el.querySelectorAll('[data-m]').forEach(function (b) { b.onclick = function () { S.manualCallResult(s, b.getAttribute('data-m') === '1'); el.querySelectorAll('[data-m]').forEach(function (x) { x.disabled = true; }); }; });
    }
    ref.on('value', function (x) { draw(x.val()); }, function () { draw(null); });
    return function () { ref.off(); };
  };

  /* ================= parcel detail sheet ================= */
  S.openParcel = function (no) {
    S.get(no).then(function (s) {
      if (!s) { CI.toast(t('notFound'), 'bad'); return; }
      var stop = null, me = S.me, adm = S.isAdmin();
      var body = '<div class="row sp"><b style="font-size:18px">' + E(s.no) + '</b>' + CI.chip(s.status) + '</div>' +
        '<div style="font-size:16px;font-weight:700;margin:8px 0">' + E(s.fromName) + ' → ' + E(s.toName) + '</div>' + CI.bar4(s.status) +
        '<div class="grid2" style="margin-top:14px;gap:10px 12px"><div><div class="tiny muted">' + E(t('sender')) + '</div><b>' + E((s.sender || {}).n || '-') + '</b><div class="small"><a href="tel:' + E((s.sender || {}).p) + '">' + E(CI.showPhone((s.sender || {}).p)) + '</a></div></div>' +
        '<div><div class="tiny muted">' + E(t('receiver')) + '</div><b>' + E((s.rcv || {}).n || '-') + '</b><div class="small"><a href="tel:' + E((s.rcv || {}).p) + '">' + E(CI.showPhone((s.rcv || {}).p)) + '</a></div></div>' +
        '<div><div class="tiny muted">' + E(t('goodsL')) + '</div><div class="small">' + E(t('g_' + (s.goods || 'parcel'))) + (s.desc ? ' – ' + E(s.desc) : '') + ' · ' + E(s.qty || 1) + (s.kg ? ' · ' + E(s.kg) + ' kg' : '') + '</div></div>' +
        '<div><div class="tiny muted">' + E(t('fee')) + '</div><div class="small">' + E(CI.money(s.price, s.cur) || '-') + (s.price ? ' · ' + E(t(s.paid ? 'paid' : 'unpaid')) : '') + (s.cod ? '<br>COD ' + E(CI.money(s.cod, s.cur)) : '') + '</div></div></div>' +
        (s.note ? '<div class="small" style="margin-top:10px"><b>' + E(t('note')) + ':</b> ' + E(s.note) + '</div>' : '') +
        (s.status === 'arrived' ? '<div id="pcCall" style="margin-top:14px"></div>' : '') +
        '<h3 style="margin:18px 0 8px">' + E(t('history')) + '</h3>' + CI.timeline(s.hist, true) +
        '<div class="small muted">' + E(t('createdBy')) + ': ' + E(s.byName || '') + ' · ' + E(CI.fmt(s.created)) + '</div>' +
        '<h3 style="margin:18px 0 8px">' + E(t('setStatus')) + '</h3><div class="row"><label class="sr" for="pcSt">' + E(t('setStatus')) + '</label><select id="pcSt" class="grow">' + CI.STATUSES.map(function (k) { return '<option value="' + k + '"' + (k === s.status ? ' selected' : '') + '>' + E(t('s_' + k)) + '</option>'; }).join('') + '</select><button class="btn dark" id="pcSet">' + E(t('save')) + '</button></div>' +
        ((adm || me.branch === s.from) && s.status !== 'delivered' ? '<h3 style="margin:18px 0 8px">' + E(t('changeDest')) + '</h3><div class="row"><label class="sr" for="pcDest">' + E(t('changeDest')) + '</label><select id="pcDest" class="grow">' + CI.branchList.filter(function (b) { return b.active !== false; }).map(function (b) { return '<option value="' + E(b.code) + '"' + (b.code === s.to ? ' selected' : '') + '>' + E(b.name) + '</option>'; }).join('') + '</select><button class="btn dark" id="pcDs">' + E(t('save')) + '</button></div>' : '');
      var sh = CI.sheet({ title: t('details'), body: body, onClose: function () { if (stop) stop(); }, actions: [
        { label: t('printLabel'), kind: 'dark', onClick: function () { CI.printLabels(s); return false; } },
        { label: t('close'), kind: 'soft' }
      ] });
      var cb = sh.el.querySelector('#pcCall'); if (cb) stop = S.callBox(cb, s);
      sh.el.querySelector('#pcSet').onclick = function () {
        var v = sh.el.querySelector('#pcSt').value; if (v === s.status) return;
        CI.confirm(t('areYou') + ' ' + s.no + ' → ' + t('s_' + v)).then(function (ok) { if (!ok) return; S.applyStatus(s, v).then(function () { CI.toast(t('okStatus', { no: s.no, s: t('s_' + v) }), 'ok'); sh.close(); }).catch(function () { CI.toast(t('denied'), 'bad'); }); });
      };
      var ds = sh.el.querySelector('#pcDs');
      if (ds) ds.onclick = function () {
        var c = sh.el.querySelector('#pcDest').value; if (c === s.to) return;
        var nm = CI.bName(c), up = {}, now = Date.now();
        up['shipments/' + s.no + '/to'] = c; up['shipments/' + s.no + '/toName'] = nm; up['track/' + s.no + '/to'] = nm; up['track/' + s.no + '/tc'] = c;
        var ph = phonesOf(s); [ph.s, ph.r].forEach(function (p) { if (p) up['custIdx/' + p + '/' + s.no + '/to'] = nm; });
        CI.db.ref().update(up).then(function () { s.to = c; s.toName = nm; return S.applyStatus(s, s.status, { ev: 'dest', place: nm }); })
          .then(function () { CI.toast(t('destSaved'), 'ok'); sh.close(); }).catch(function () { CI.toast(t('denied'), 'bad'); });
      };
    }).catch(function () { CI.toast(t('netErr'), 'bad'); });
  };

  /* ================= list rendering ================= */
  S.parcelRows = function (arr, limit) {
    if (!arr.length) return '<div class="empty">' + E(t('none')) + '</div>';
    return '<div class="list">' + arr.slice(0, limit || 100).map(function (s) {
      return '<button class="li" data-no="' + E(s.no) + '"><div class="grow"><div class="row sp"><span class="t">' + E(s.no) + '</span>' + CI.chip(s.status) + '</div>' +
        '<div class="s">' + E(s.fromName) + ' → ' + E(s.toName) + ' · ' + E((s.rcv || {}).n || '') + ' ' + E(CI.showPhone((s.rcv || {}).p)) + '</div><div class="s">' + E(CI.fmt(s.updated || s.created)) + '</div></div></button>';
    }).join('') + '</div>';
  };
  S.bindRows = function (el) { el.querySelectorAll('[data-no]').forEach(function (b) { b.onclick = function () { S.openParcel(b.getAttribute('data-no')); }; }); };
  S.match = function (s, q) {
    if (!q) return true; q = q.toLowerCase();
    return [s.no, (s.sender || {}).n, (s.sender || {}).p, (s.rcv || {}).n, (s.rcv || {}).p, s.fromName, s.toName].join(' ').toLowerCase().indexOf(q) >= 0 || (CI.normPhone(q) && [(s.sender || {}).p, (s.rcv || {}).p].indexOf(CI.normPhone(q)) >= 0);
  };
  function toArr(o) { return Object.keys(o || {}).map(function (k) { var v = o[k]; v.no = k; return v; }); }
  S.toArr = toArr;
  // Live list of shipments for my branch (incoming + outgoing). cb({in:[], out:[]})
  S.watchBranch = function (cb) {
    var b = S.me.branch, data = { in: {}, out: {} }, r1 = CI.db.ref('shipments').orderByChild('to').equalTo(b).limitToLast(300), r2 = CI.db.ref('shipments').orderByChild('from').equalTo(b).limitToLast(300);
    function emit() { var sort = function (a, c) { return (c.updated || c.created) - (a.updated || a.created); }; cb({ in: toArr(data.in).sort(sort), out: toArr(data.out).sort(sort) }); }
    r1.on('value', function (s) { data.in = s.val() || {}; emit(); }, function () { CI.toast(t('denied'), 'bad'); });
    r2.on('value', function (s) { data.out = s.val() || {}; emit(); }, function () {});
    return function () { r1.off(); r2.off(); };
  };

  /* ================= HOME (agent) ================= */
  S.views.home = function (v) {
    var me = S.me;
    v.innerHTML = '<div class="vh"><div><h1>' + E(t('hello', { n: me.name })) + '</h1><div class="muted">' + E(CI.bName(me.branch)) + ' · ' + E(CI.fmtD(Date.now())) + '</div></div></div>' +
      '<div class="kpis" id="hk"></div>' +
      '<div class="card"><h3 style="margin-bottom:12px">' + E(t('quick')) + '</h3><div class="grid3" style="gap:10px">' +
      '<button class="btn" data-g="scan">' + I('scan') + E(t('navScan')) + '</button><button class="btn dark" data-g="new">' + I('plus') + E(t('navNew')) + '</button><button class="btn soft" data-g="parcels">' + I('list') + E(t('navParcels')) + '</button></div></div>' +
      '<div class="card"><h3>' + E(t('kWaiting')) + '</h3><div id="hw"></div></div><div class="card"><h3>' + E(t('recent')) + '</h3><div id="hr"></div></div>';
    v.querySelectorAll('[data-g]').forEach(function (b) { b.onclick = function () { S.go(b.getAttribute('data-g')); }; });
    return S.watchBranch(function (d) {
      var t0 = CI.dayStart(), inc = d.in.filter(function (s) { return ['posted', 'shipping', 'transit'].indexOf(s.status) >= 0; }),
        wait = d.in.filter(function (s) { return s.status === 'arrived'; }), sent = d.out.filter(function (s) { return s.created >= t0; }),
        recv = d.in.filter(function (s) { return s.status === 'delivered' && (s.updated || 0) >= t0; });
      document.getElementById('hk').innerHTML = [[t('kIncoming'), inc.length], [t('kWaiting'), wait.length], [t('kSentToday'), sent.length], [t('kRecvToday'), recv.length]].map(function (k) { return '<div class="kpi"><div class="l">' + E(k[0]) + '</div><div class="v">' + k[1] + '</div></div>'; }).join('');
      var hw = document.getElementById('hw'); hw.innerHTML = S.parcelRows(wait, 20); S.bindRows(hw);
      var all = d.in.concat(d.out).sort(function (a, b) { return (b.updated || b.created) - (a.updated || a.created); }), seen = {};
      all = all.filter(function (s) { if (seen[s.no]) return false; seen[s.no] = 1; return true; });
      var hr = document.getElementById('hr'); hr.innerHTML = S.parcelRows(all, 15); S.bindRows(hr);
    });
  };

  /* ================= SCAN ================= */
  var MODES = ['auto', 'ship', 'transit', 'arrive', 'deliver', 'return'];
  S.views.scan = function (v) {
    var mode = 'auto', count = 0, cam = null, stopCall = null, busy = false;
    try { mode = sessionStorage.getItem('ciMode') || 'auto'; count = +(sessionStorage.getItem('ciCnt' + CI.dayKey()) || 0); } catch (e) {}
    v.innerHTML = '<div class="vh"><h1>' + E(t('navScan')) + '</h1><span class="chip" id="scC">' + E(t('scanned', { n: count })) + '</span></div>' +
      '<div style="display:grid;gap:16px" class="scan-grid"><div><div class="small muted" style="font-weight:700;margin-bottom:8px">' + E(t('scanPick')) + '</div>' +
      '<div class="modes">' + MODES.map(function (m) { return '<button data-m="' + m + '">' + E(t('m_' + m)) + '</button>'; }).join('') + '</div><div class="small muted" id="mh" style="margin:-4px 0 12px"></div>' +
      '<div class="cam"><div id="reader"></div><div class="idle" id="idle">' + I('cam', ' style="width:40px;height:40px"') + '<button class="btn" id="cs">' + E(t('camStart')) + '</button></div></div>' +
      '<div class="row" style="margin-top:10px"><button class="btn soft hide grow" id="cx">' + E(t('camStop')) + '</button></div>' +
      '<form class="row" id="mf" style="margin-top:10px"><label class="sr" for="mn">' + E(t('typeNo')) + '</label><input id="mn" class="grow" placeholder="' + E(t('typeNo')) + '" autocapitalize="characters" autocomplete="off" style="text-transform:uppercase"><button class="btn dark" type="submit">' + E(t('ok')) + '</button></form></div>' +
      '<div><div id="sr"></div><div class="card" id="slw"><h3>' + E(t('recent')) + '</h3><div class="list" id="sl"><div class="empty">' + E(t('none')) + '</div></div></div></div></div>';
    if (window.innerWidth >= 1000) v.querySelector('.scan-grid').style.gridTemplateColumns = 'minmax(0,1fr) minmax(0,1fr)';
    function setMode(m) { mode = m; try { sessionStorage.setItem('ciMode', m); } catch (e) {} v.querySelectorAll('.modes button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-m') === m); }); document.getElementById('mh').textContent = m === 'auto' ? t('autoHelp') : ''; }
    v.querySelectorAll('.modes button').forEach(function (b) { b.onclick = function () { setMode(b.getAttribute('data-m')); }; });
    setMode(mode);
    cam = CI.Scanner('reader');
    document.getElementById('cs').onclick = function () {
      document.getElementById('idle').classList.add('hide'); document.getElementById('cx').classList.remove('hide');
      cam.start(handle, function () { document.getElementById('idle').classList.remove('hide'); document.getElementById('cx').classList.add('hide'); CI.toast(t('noCam'), 'bad'); });
    };
    document.getElementById('cx').onclick = function () { cam.stop(); document.getElementById('idle').classList.remove('hide'); document.getElementById('cx').classList.add('hide'); };
    document.getElementById('mf').onsubmit = function (e) { e.preventDefault(); var i = document.getElementById('mn'); handle(i.value); i.value = ''; };
    function log(no, txt, ok) {
      var sl = document.getElementById('sl'); if (sl.querySelector('.empty')) sl.innerHTML = '';
      var d = document.createElement('button'); d.className = 'li'; d.innerHTML = '<div class="grow"><span class="t">' + E(no) + '</span><div class="s">' + E(txt) + ' · ' + E(CI.fmtT(Date.now())) + '</div></div><span class="chip ' + (ok ? 'ok' : 'bad') + '">' + (ok ? '✓' : '!') + '</span>';
      d.onclick = function () { S.openParcel(no); }; sl.insertBefore(d, sl.firstChild); while (sl.children.length > 30) sl.lastChild.remove();
    }
    function result(cls, html) { var r = document.getElementById('sr'); r.innerHTML = '<div class="res ' + cls + (cls === 'ok' ? ' flash' : '') + '">' + html + '</div>'; return r.firstChild; }
    function handle(txt) {
      var no = CI.parseNo(txt); if (busy) return;
      if (!no) { CI.beep(false); result('bad', '<b>' + E(t('scanBad')) + '</b>'); return; }
      busy = true; if (stopCall) { stopCall(); stopCall = null; }
      S.get(no).then(function (s) {
        if (!s) { CI.beep(false); result('bad', '<b>' + E(no) + '</b><div>' + E(t('notFound')) + '</div>'); log(no, t('notFound'), false); return; }
        var d = S.decide(s, mode);
        if (d.err) { CI.beep(false); result('bad', '<div class="row sp"><b>' + E(no) + '</b>' + CI.chip(s.status) + '</div><div style="margin-top:6px">' + E(d.err) + '</div>'); log(no, d.err, false); return; }
        return S.applyStatus(s, d.st).then(function () {
          CI.beep(true); count++; try { sessionStorage.setItem('ciCnt' + CI.dayKey(), count); } catch (e) {} document.getElementById('scC').textContent = t('scanned', { n: count });
          var el = result('ok', '<div class="row sp"><b style="font-size:17px">' + E(no) + '</b>' + CI.chip(d.st) + '</div><div class="small muted" style="margin:6px 0">' + E(s.fromName) + ' → ' + E(s.toName) + '</div><div class="small">' + E(t('receiver')) + ': <b>' + E((s.rcv || {}).n || '') + '</b> · ' + E(CI.showPhone((s.rcv || {}).p)) + '</div>' + (d.st === 'arrived' ? '<div id="scCall" style="margin-top:12px"></div>' : ''));
          log(no, t('s_' + d.st), true);
          var cb = el.querySelector('#scCall'); if (cb) stopCall = S.callBox(cb, s);
        });
      }).catch(function () { CI.beep(false); result('bad', '<b>' + E(t('netErr')) + '</b>'); }).then(function () { setTimeout(function () { busy = false; }, 600); });
    }
    return function () { if (cam) cam.stop(); if (stopCall) stopCall(); };
  };

  /* ================= NEW PARCEL ================= */
  S.views['new'] = function (v) {
    var me = S.me, adm = S.isAdmin(), brs = CI.branchList.filter(function (b) { return b.active !== false; }), cur = (CI.cfg.company || {}).currency || 'USD';
    var opt = function (sel) { return brs.map(function (b) { return '<option value="' + E(b.code) + '"' + (b.code === sel ? ' selected' : '') + '>' + E(b.name) + '</option>'; }).join(''); };
    var pr = Object.keys(S.prices).map(function (k) { var p = S.prices[k]; p.id = k; return p; });
    if (!brs.length) { v.innerHTML = '<div class="card"><h2>' + E(t('firstSetup')) + '</h2><p class="muted">' + E(t('firstSetupHint')) + '</p></div>'; return; }
    v.innerHTML = '<div class="vh"><h1>' + E(t('newTitle')) + '</h1></div><form id="nf" class="col" style="gap:0;max-width:860px">' +
      '<div class="card"><div class="grid2"><div class="fld"><label class="f" for="nFrom">' + E(t('fromBranch')) + '</label><select id="nFrom"' + (adm ? '' : ' disabled') + '>' + opt(me.branch) + '</select></div>' +
      '<div class="fld"><label class="f" for="nTo">' + E(t('toBranch')) + ' *</label><select id="nTo" required><option value="">–</option>' + opt('') + '</select></div></div></div>' +
      '<div class="card"><div class="grid2"><div class="fld"><label class="f" for="nRp">' + E(t('rcvPhone')) + ' *</label><input id="nRp" type="tel" inputmode="tel" required></div><div class="fld"><label class="f" for="nRn">' + E(t('rcvName')) + '</label><input id="nRn"></div>' +
      '<div class="fld"><label class="f" for="nSp">' + E(t('senderPhone')) + ' *</label><input id="nSp" type="tel" inputmode="tel" required></div><div class="fld"><label class="f" for="nSn">' + E(t('senderName')) + '</label><input id="nSn"></div></div></div>' +
      '<div class="card"><div class="grid3"><div class="fld"><label class="f" for="nG">' + E(t('goods')) + '</label><select id="nG">' + ['parcel', 'doc', 'fragile', 'food', 'other'].map(function (g) { return '<option value="' + g + '">' + E(t('g_' + g)) + '</option>'; }).join('') + '</select></div>' +
      '<div class="fld"><label class="f" for="nQ">' + E(t('qty')) + '</label><input id="nQ" type="number" inputmode="numeric" min="1" value="1"></div><div class="fld"><label class="f" for="nKg">' + E(t('kg')) + '</label><input id="nKg" type="number" inputmode="decimal" min="0" step="0.1"></div></div>' +
      '<div class="fld"><label class="f" for="nD">' + E(t('desc')) + ' <span class="muted">(' + E(t('optional')) + ')</span></label><input id="nD"></div></div>' +
      '<div class="card">' + (pr.length ? '<div class="fld"><label class="f" for="nPi">' + E(t('prItem')) + '</label><select id="nPi"><option value="">–</option>' + pr.map(function (p) { return '<option value="' + E(p.id) + '">' + E(p.name) + ' · ' + E(CI.money(p.price, p.cur)) + ' ' + E(t('perUnit', { u: t('u_' + p.unit) })) + '</option>'; }).join('') + '</select></div>' : '') +
      '<div class="grid3"><div class="fld"><label class="f" for="nP">' + E(t('price')) + '</label><input id="nP" type="number" inputmode="decimal" min="0" step="0.01"></div><div class="fld"><label class="f" for="nC">' + E(t('currency')) + '</label><select id="nC"><option value="USD"' + (cur === 'USD' ? ' selected' : '') + '>USD $</option><option value="KHR"' + (cur === 'KHR' ? ' selected' : '') + '>KHR ៛</option></select></div>' +
      '<div class="fld"><label class="f" for="nPay">' + E(t('payment')) + '</label><select id="nPay"><option value="1">' + E(t('paid')) + '</option><option value="0">' + E(t('unpaid')) + '</option></select></div></div>' +
      '<div class="grid2"><div class="fld"><label class="f" for="nCod">' + E(t('cod')) + ' <span class="muted">(' + E(t('optional')) + ')</span></label><input id="nCod" type="number" inputmode="decimal" min="0" step="0.01"></div><div class="fld"><label class="f" for="nN">' + E(t('note')) + ' <span class="muted">(' + E(t('optional')) + ')</span></label><input id="nN"></div></div></div>' +
      '<div class="err" id="nE"></div><button class="btn block" id="nB" type="submit" style="min-height:54px;font-size:16px">' + I('print') + E(t('create')) + '</button></form>';
    var $ = function (id) { return document.getElementById(id); };
    function calc() { var pi = $('nPi'); if (!pi || !pi.value) return; var p = S.prices[pi.value]; if (!p) return; var n = p.unit === 'kg' ? parseFloat($('nKg').value || 0) : parseFloat($('nQ').value || 1); $('nP').value = (Math.round(n * parseFloat(p.price) * 100) / 100) || ''; $('nC').value = p.cur || 'USD'; }
    if ($('nPi')) { $('nPi').onchange = calc; $('nKg').oninput = calc; $('nQ').oninput = calc; }
    $('nf').onsubmit = function (e) {
      e.preventDefault(); var err = $('nE'); err.textContent = '';
      var from = adm ? $('nFrom').value : me.branch, to = $('nTo').value, rp = CI.normPhone($('nRp').value), sp = CI.normPhone($('nSp').value);
      if (!to) { err.textContent = t('needBranch'); return; } if (from === to) { err.textContent = t('sameBranch'); return; }
      if (!rp || !sp) { err.textContent = t('badPhone'); return; }
      var fb = CI.branches[from] || {}, prefix = (fb.prefix || from).toUpperCase(), day = CI.dayKey(), b = $('nB');
      CI.busy(b, true, t('creating'));
      CI.db.ref('counters/' + prefix + '/' + day).transaction(function (n) { return (n || 0) + 1; }).then(function (r) {
        if (!r.committed) throw new Error('counter');
        var no = prefix + '-' + day + '-' + ('000' + r.snapshot.val()).slice(-4), now = Date.now(), hk = CI.db.ref().push().key;
        var s = { from: from, to: to, fromName: CI.bName(from), toName: CI.bName(to), sender: { n: $('nSn').value.trim(), p: sp }, rcv: { n: $('nRn').value.trim(), p: rp },
          goods: $('nG').value, desc: $('nD').value.trim(), qty: parseInt($('nQ').value, 10) || 1, kg: parseFloat($('nKg').value) || 0, price: parseFloat($('nP').value) || 0, cur: $('nC').value, paid: $('nPay').value === '1', cod: parseFloat($('nCod').value) || 0, note: $('nN').value.trim(),
          status: 'posted', created: now, updated: now, by: me.uid, byName: me.name || '' };
        var h = { s: 'posted', at: now, place: s.fromName, br: from, by: me.uid, byName: me.name || '' };
        var up = {}; s.hist = {}; s.hist[hk] = h; up['shipments/' + no] = s;
        var th = {}; th[hk] = { s: 'posted', at: now, place: s.fromName };
        up['track/' + no] = { status: 'posted', from: s.fromName, to: s.toName, tc: to, created: now, updated: now, hist: th };
        var base = { no: no, from: s.fromName, to: s.toName, st: 'posted', c: now, u: now };
        if (sp === rp) up['custIdx/' + sp + '/' + no] = Object.assign({ role: 'sr' }, base);
        else { up['custIdx/' + sp + '/' + no] = Object.assign({ role: 's' }, base); up['custIdx/' + rp + '/' + no] = Object.assign({ role: 'r' }, base); }
        up['custNote/' + sp + '/' + no + '-posted'] = { k: 'posted', no: no, from: s.fromName, to: s.toName, at: now, seen: false };
        if (rp !== sp) up['custNote/' + rp + '/' + no + '-new'] = { k: 'new', no: no, from: s.fromName, to: s.toName, at: now, seen: false };
        return CI.db.ref().update(up).then(function () { s.no = no; return s; });
      }).then(function (s) {
        CI.busy(b, false); CI.beep(true);
        CI.sheet({ title: t('created', { no: s.no }), body: '<div style="display:flex;justify-content:center;margin:6px 0 10px"><div style="width:180px;height:180px">' + CI.qrSvg(CI.trackUrl(s.no)) + '</div></div><div style="text-align:center;font-weight:800;font-size:20px">' + E(s.no) + '</div><div class="muted" style="text-align:center">' + E(s.fromName) + ' → ' + E(s.toName) + '</div>',
          actions: [{ label: t('printLabel'), onClick: function () { CI.printLabels(s); return false; } }, { label: t('newAnother'), kind: 'soft', onClick: function () { S.go('new'); } }] });
        CI.printLabels(s);
      }).catch(function (er) { console.error(er); CI.busy(b, false); err.textContent = (er && /permission/i.test(er.message || er.code || '')) ? t('denied') : t('failed'); });
    };
  };

  /* ================= PARCELS (branch) ================= */
  S.views.parcels = function (v) {
    var tab = 'in', q = '', data = { in: [], out: [] };
    v.innerHTML = '<div class="vh"><h1>' + E(t('parcelsTitle')) + '</h1></div><div class="card"><div class="seg" style="margin-bottom:12px"><button data-tb="in" class="on">' + E(t('tIn')) + '</button><button data-tb="out">' + E(t('tOut')) + '</button></div>' +
      '<div class="row" style="margin-bottom:6px"><label class="sr" for="pq">' + E(t('search')) + '</label><input id="pq" class="grow" placeholder="' + E(t('searchShip')) + '" autocomplete="off"><select id="pf" style="width:auto;max-width:44%" aria-label="Status"><option value="">' + E(t('all')) + '</option>' + CI.STATUSES.map(function (k) { return '<option value="' + k + '">' + E(t('s_' + k)) + '</option>'; }).join('') + '</select></div><div id="pl"></div></div>';
    function draw() {
      var f = document.getElementById('pf').value, arr = data[tab].filter(function (s) { return (!f || s.status === f) && S.match(s, q); });
      var pl = document.getElementById('pl'); pl.innerHTML = S.parcelRows(arr, 200); S.bindRows(pl);
    }
    v.querySelectorAll('[data-tb]').forEach(function (b) { b.onclick = function () { tab = b.getAttribute('data-tb'); v.querySelectorAll('[data-tb]').forEach(function (x) { x.classList.toggle('on', x === b); }); draw(); }; });
    document.getElementById('pq').oninput = function () { q = this.value.trim(); draw(); };
    document.getElementById('pf').onchange = draw;
    return S.watchBranch(function (d) { data = d; draw(); });
  };

  /* ================= ACCOUNT ================= */
  S.views.account = function (v) {
    var me = S.me;
    v.innerHTML = '<div class="vh"><h1>' + E(t('acct')) + '</h1></div><div style="max-width:560px"><div class="card"><div class="row"><div class="logo"><div class="m" style="background:#C8102E;color:#fff">' + E(String(me.name || '?').slice(0, 2).toUpperCase()) + '</div></div><div class="grow"><b style="font-size:17px">' + E(me.name) + '</b><div class="small muted">@' + E(me.username) + ' · ' + E(t(me.role === 'admin' ? 'roleAdmin' : 'roleAgent')) + '</div><div class="small muted">' + E(CI.bName(me.branch)) + '</div></div></div></div>' +
      '<div class="card"><div class="fld"><label class="f">' + E(t('lang')) + '</label>' + CI.langSelect('acl') + '</div></div>' +
      '<form class="card" id="cp"><h3 style="margin-bottom:12px">' + E(t('changePw')) + '</h3><div class="fld"><label class="f" for="op">' + E(t('oldPw')) + '</label><input id="op" type="password" autocomplete="current-password"></div><div class="fld"><label class="f" for="np">' + E(t('newPw')) + '</label><input id="np" type="password" autocomplete="new-password"></div><div class="err" id="ce"></div><button class="btn dark" type="submit">' + E(t('save')) + '</button></form>' +
      (!CI.isStandalone() ? '<div class="card"><h3>' + E(t('install')) + '</h3><p class="small muted" style="margin:6px 0 0">' + E(CI.isIos() ? t('installIos') : t('installIos')) + '</p><button class="btn soft hide" data-install style="margin-top:10px">' + E(t('installBtn')) + '</button></div>' : '') +
      '<button class="btn line block" id="lo">' + I('out') + E(t('logout')) + '</button></div>';
    var sel = v.querySelector('.acl'); sel.value = CI.lang();
    var ib = v.querySelector('[data-install]'); if (ib) { if (CI.installEvt) ib.classList.remove('hide'); ib.onclick = function () { if (CI.installEvt) { CI.installEvt.prompt(); CI.installEvt = null; ib.classList.add('hide'); } }; }
    document.getElementById('lo').onclick = function () { CI.auth.signOut(); };
    document.getElementById('cp').onsubmit = function (e) {
      e.preventDefault(); var o = document.getElementById('op').value, n = document.getElementById('np').value, ce = document.getElementById('ce'); ce.textContent = '';
      if (n.length < 6) { ce.textContent = t('pwShort'); return; }
      var u = CI.auth.currentUser, cred = firebase.auth.EmailAuthProvider.credential(u.email, o);
      u.reauthenticateWithCredential(cred).then(function () { return u.updatePassword(n); }).then(function () { CI.toast(t('pwDone'), 'ok'); document.getElementById('cp').reset(); })
        .catch(function (er) { ce.textContent = er && /wrong-password|invalid-credential|invalid-login/.test(er.code || '') ? t('pwWrong') : t('failed'); });
    };
  };

  S.boot = boot;
})();
