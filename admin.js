/* CI Express – Headquarters (admin) pages */
(function () {
  var t = CI.t, E = CI.esc, I = CI.icon, S = window.Staff;
  CI.DEFAULT_TPL = {
    km: 'សួស្តី។ នេះជាការហៅពី CI Express។ កញ្ចប់របស់អ្នកពី {from} បានមកដល់ {to} ហើយ។ សូមអញ្ជើញមកយកកញ្ចប់របស់អ្នក។ សូមអរគុណ។',
    en: 'Hello, this is CI Express. Your parcel from {from} has arrived at {to}. Please come to pick it up. Thank you.',
    zh: '您好，这里是 CI Express。您从{from}寄来的包裹已到达{to}，请前来取件。谢谢。'
  };
  function kpi(l, v, cls) { return '<div class="kpi"><div class="l">' + E(l) + '</div><div class="v"' + (cls ? ' style="color:' + cls + '"' : '') + '>' + E(v) + '</div></div>'; }
  function wide() { return window.innerWidth >= 760; }
  function table(arr, limit) {
    if (!arr.length) return '<div class="empty">' + E(t('none')) + '</div>';
    if (!wide()) return S.parcelRows(arr, limit);
    return '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>' + E(t('trackNo')) + '</th><th>' + E(t('from')) + ' → ' + E(t('to')) + '</th><th>' + E(t('receiver')) + '</th><th>' + E(t('status')) + '</th><th>' + E(t('aiCall')) + '</th><th>' + E(t('fee')) + '</th><th>' + E(t('lastUpd')) + '</th></tr></thead><tbody>' +
      arr.slice(0, limit || 200).map(function (s) {
        var c = s.call, cs = c ? '<span class="chip ' + (c.state === 'ok' ? 'ok' : c.state === 'calling' || c.state === 'queued' ? 'blue' : 'warn') + '">' + E(t('st_' + c.state)) + '</span>' : '<span class="muted">–</span>';
        return '<tr class="click" data-no="' + E(s.no) + '"><td><b>' + E(s.no) + '</b></td><td>' + E(s.fromName) + ' → ' + E(s.toName) + '</td><td>' + E((s.rcv || {}).n || '') + ' <span class="muted">' + E(CI.showPhone((s.rcv || {}).p)) + '</span></td><td>' + CI.chip(s.status) + '</td><td>' + cs + '</td><td>' + E(CI.money(s.price, s.cur)) + '</td><td class="muted">' + E(CI.fmt(s.updated || s.created)) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  /* ---------- DASHBOARD ---------- */
  S.views.dash = function (v) {
    var rate = 0.1, logs = [];
    v.innerHTML = '<div class="vh"><div><h1>' + E(t('today')) + '</h1><div class="muted">' + E(CI.fmtD(Date.now())) + ' · ' + E(t('kAllBranches')) + '</div></div><div class="row wrap"><button class="btn" id="dNew">' + I('plus') + E(t('navNew')) + '</button></div></div>' +
      (CI.branchList.length ? '' : '<div class="card"><h2>' + E(t('firstSetup')) + '</h2><p class="muted">' + E(t('firstSetupHint')) + '</p><button class="btn" id="dSet">' + E(t('addBranch')) + '</button></div>') +
      '<div class="kpis" id="dk"></div><div class="card"><div class="row sp" style="margin-bottom:8px"><h3>' + E(t('recent')) + '</h3><button class="btn soft sm" id="dAll">' + E(t('navShip')) + '</button></div><div id="dt"></div></div>' +
      '<div class="card"><h3 style="margin-bottom:6px">' + E(t('waitLong')) + '</h3><div id="dw"></div></div>';
    document.getElementById('dNew').onclick = function () { S.go('new'); };
    document.getElementById('dAll').onclick = function () { S.go('ship'); };
    var ds = document.getElementById('dSet'); if (ds) ds.onclick = function () { S.go('branches'); };
    var t0 = CI.dayStart(), ships = [];
    function draw() {
      var posted = ships.filter(function (s) { return s.created >= t0; }).length, wait = ships.filter(function (s) { return s.status === 'arrived'; });
      var tl = logs.filter(function (l) { return l.at >= t0; }), ok = tl.filter(function (l) { return l.state === 'ok'; }).length, mins = tl.reduce(function (a, l) { return a + Math.max(1, Math.ceil((l.dur || 0) / 60)); }, 0);
      document.getElementById('dk').innerHTML = kpi(t('kPostedToday'), posted) + kpi(t('kWaiting'), wait.length) + kpi(t('kCallsOk'), ok + ' / ' + tl.length, '#146C38') + kpi(t('kCallCost'), '$' + (mins * rate).toFixed(2));
      var dt = document.getElementById('dt'); dt.innerHTML = table(ships, 25); S.bindRows(dt);
      var old = wait.filter(function (s) { return Date.now() - (s.updated || s.created) > 3 * 864e5; }), dw = document.getElementById('dw'); dw.innerHTML = S.parcelRows(old, 30); S.bindRows(dw);
    }
    CI.db.ref('settings/aiCall/rate').once('value').then(function (s) { if (s.val()) rate = +s.val(); });
    var r1 = CI.db.ref('shipments').orderByChild('created').limitToLast(500), r2 = CI.db.ref('callLog').orderByChild('at').startAt(t0);
    r1.on('value', function (s) { ships = S.toArr(s.val()).sort(function (a, b) { return (b.updated || b.created) - (a.updated || a.created); }); draw(); }, function () { CI.toast(t('denied'), 'bad'); });
    r2.on('value', function (s) { logs = S.toArr(s.val()); draw(); }, function () {});
    return function () { r1.off(); r2.off(); };
  };

  /* ---------- ALL SHIPMENTS ---------- */
  S.views.ship = function (v) {
    var all = [], q = '';
    v.innerHTML = '<div class="vh"><h1>' + E(t('navShip')) + '</h1><div class="row wrap"><button class="btn line sm" id="sx">' + E(t('export')) + '</button><button class="btn sm" id="sn">' + I('plus') + E(t('navNew')) + '</button></div></div>' +
      '<div class="card"><div class="row wrap" style="margin-bottom:10px"><label class="sr" for="sq">' + E(t('search')) + '</label><input id="sq" class="grow" style="min-width:200px" placeholder="' + E(t('searchShip')) + '" autocomplete="off">' +
      '<select id="sb" style="width:auto" aria-label="' + E(t('branch')) + '"><option value="">' + E(t('kAllBranches')) + '</option>' + CI.branchList.map(function (b) { return '<option value="' + E(b.code) + '">' + E(b.name) + '</option>'; }).join('') + '</select>' +
      '<select id="ss" style="width:auto" aria-label="Status"><option value="">' + E(t('all')) + '</option>' + CI.STATUSES.map(function (k) { return '<option value="' + k + '">' + E(t('s_' + k)) + '</option>'; }).join('') + '</select></div><div id="st"></div></div>';
    function list() { var b = document.getElementById('sb').value, f = document.getElementById('ss').value; return all.filter(function (s) { return (!b || s.from === b || s.to === b) && (!f || s.status === f) && S.match(s, q); }); }
    function draw() { var st = document.getElementById('st'); st.innerHTML = table(list(), 300); S.bindRows(st); }
    document.getElementById('sq').oninput = function () { q = this.value.trim(); draw(); };
    document.getElementById('sb').onchange = draw; document.getElementById('ss').onchange = draw;
    document.getElementById('sn').onclick = function () { S.go('new'); };
    document.getElementById('sx').onclick = function () { exportCsv('shipments-' + CI.dayKey() + '.csv', list()); };
    var r = CI.db.ref('shipments').orderByChild('created').limitToLast(2000);
    r.on('value', function (s) { all = S.toArr(s.val()).sort(function (a, b) { return (b.updated || b.created) - (a.updated || a.created); }); draw(); }, function () { CI.toast(t('denied'), 'bad'); });
    return function () { r.off(); };
  };
  function exportCsv(name, arr) {
    var rows = [['Number', 'Status', 'From', 'To', 'Sender', 'Sender phone', 'Receiver', 'Receiver phone', 'Goods', 'Pieces', 'Kg', 'Price', 'Currency', 'Paid', 'COD', 'Created', 'Updated', 'AI call', 'Created by']];
    arr.forEach(function (s) { rows.push([s.no, s.status, s.fromName, s.toName, (s.sender || {}).n, (s.sender || {}).p, (s.rcv || {}).n, (s.rcv || {}).p, s.goods, s.qty, s.kg, s.price, s.cur, s.paid ? 'yes' : 'no', s.cod, CI.fmt(s.created), CI.fmt(s.updated), (s.call || {}).state || '', s.byName]); });
    CI.csv(name, rows);
  }

  /* ---------- AI CALLS ---------- */
  S.views.calls = function (v) {
    v.innerHTML = '<div class="vh"><h1>' + E(t('calls')) + '</h1></div><div style="display:grid;gap:12px" id="cg"><form class="card" id="cf"><h3 style="margin-bottom:12px">' + E(t('callSettings')) + '</h3>' +
      '<label class="row" style="gap:12px;margin-bottom:16px;font-weight:700"><input type="checkbox" id="cOn"> <span>' + E(t('callOn')) + '</span></label>' +
      '<div class="fld"><label class="f" for="cL">' + E(t('callLang')) + '</label><select id="cL"><option value="km">ខ្មែរ (Khmer)</option><option value="en">English</option><option value="zh">中文</option><option value="km+en">ខ្មែរ + English</option></select></div>' +
      ['km', 'en', 'zh'].map(function (l) { return '<div class="fld"><label class="f" for="cT' + l + '">' + E(t('callTpl', { l: { km: 'ខ្មែរ', en: 'English', zh: '中文' }[l] })) + '</label><textarea id="cT' + l + '" rows="3"></textarea></div>'; }).join('') +
      '<div class="small muted" style="margin:-6px 0 14px">' + E(t('callTplHint')) + '</div>' +
      '<div class="grid2"><div class="fld"><label class="f" for="cR">' + E(t('retryMin')) + '</label><input id="cR" type="number" min="5" inputmode="numeric"></div><div class="fld"><label class="f" for="cM">' + E(t('maxTries')) + '</label><input id="cM" type="number" min="1" max="5" inputmode="numeric"></div>' +
      '<div class="fld"><label class="f" for="cH1">' + E(t('callHours')) + '</label><div class="row"><input id="cH1" type="number" min="0" max="23" inputmode="numeric"><span>–</span><input id="cH2" type="number" min="1" max="24" inputmode="numeric"></div></div><div class="fld"><label class="f" for="cRt">' + E(t('rate')) + '</label><input id="cRt" type="number" step="0.01" min="0" inputmode="decimal"></div></div>' +
      '<div class="row wrap"><button class="btn" type="submit">' + E(t('save')) + '</button><button class="btn line" type="button" id="cTest">' + I('phone') + E(t('testCall')) + '</button></div></form>' +
      '<div class="card"><h3 style="margin-bottom:8px">' + E(t('callLog')) + '</h3><div id="cl"></div></div></div>';
    if (window.innerWidth >= 1100) document.getElementById('cg').style.gridTemplateColumns = 'minmax(0,1fr) minmax(0,1fr)';
    var $ = function (id) { return document.getElementById(id); };
    CI.db.ref('settings/aiCall').once('value').then(function (s) {
      var c = s.val() || {}, tp = c.tpl || {};
      $('cOn').checked = c.on === true; $('cL').value = c.lang || 'km';
      ['km', 'en', 'zh'].forEach(function (l) { $('cT' + l).value = tp[l] || CI.DEFAULT_TPL[l]; });
      $('cR').value = c.retryMin || 60; $('cM').value = c.maxTries || 2; $('cH1').value = c.h1 == null ? 7 : c.h1; $('cH2').value = c.h2 == null ? 20 : c.h2; $('cRt').value = c.rate == null ? 0.1 : c.rate;
    });
    $('cf').onsubmit = function (e) {
      e.preventDefault();
      var d = { on: $('cOn').checked, lang: $('cL').value, tpl: { km: $('cTkm').value.trim(), en: $('cTen').value.trim(), zh: $('cTzh').value.trim() }, retryMin: Math.max(5, +$('cR').value || 60), maxTries: Math.min(5, Math.max(1, +$('cM').value || 2)), h1: +$('cH1').value || 0, h2: +$('cH2').value || 24, rate: +$('cRt').value || 0 };
      CI.db.ref('settings/aiCall').set(d).then(function () { S.aiOn = d.on; CI.toast(t('saved'), 'ok'); }).catch(function () { CI.toast(t('denied'), 'bad'); });
    };
    $('cTest').onclick = function () {
      var sh = CI.sheet({ title: t('testCall'), body: '<div class="fld"><label class="f" for="tp">' + E(t('testPhone')) + '</label><input id="tp" type="tel" inputmode="tel"></div><div class="err" id="te"></div>', actions: [
        { label: t('testCall'), onClick: function (api, b) {
          var p = CI.normPhone(api.el.querySelector('#tp').value); if (!p) { api.el.querySelector('#te').textContent = t('badPhone'); return false; }
          CI.busy(b, true);
          return CI.callFn('testCall', { phone: p, lang: CI.lang() }).then(function () { CI.toast(t('calling'), 'ok'); return true; }).catch(function (er) { CI.busy(b, false); api.el.querySelector('#te').textContent = t('needFn') + ' (' + er.message + ')'; return false; });
        } }, { label: t('close'), kind: 'soft' }] });
    };
    var r = CI.db.ref('callLog').orderByChild('at').limitToLast(150);
    r.on('value', function (s) {
      var arr = S.toArr(s.val()).sort(function (a, b) { return b.at - a.at; }), cl = $('cl');
      cl.innerHTML = !arr.length ? '<div class="empty">' + E(t('none')) + '</div>' : '<div class="list">' + arr.map(function (l) {
        return '<button class="li" ' + (l.ship ? 'data-no="' + E(l.ship) + '"' : '') + '><div class="grow"><div class="row sp"><span class="t">' + E(l.ship || t('testCall')) + '</span><span class="chip ' + (l.state === 'ok' ? 'ok' : l.state === 'calling' ? 'blue' : 'warn') + '">' + E(t('st_' + l.state)) + '</span></div><div class="s">' + E(CI.showPhone(l.phone)) + ' · ' + E(CI.fmt(l.at)) + (l.dur ? ' · ' + E(l.dur) + 's' : '') + (l.tries ? ' · #' + E(l.tries) : '') + '</div></div></button>';
      }).join('') + '</div>';
      S.bindRows(cl);
    });
    return function () { r.off(); };
  };

  /* ---------- BRANCHES ---------- */
  var PROV = ['Phnom Penh', 'Banteay Meanchey', 'Battambang', 'Kampong Cham', 'Kampong Chhnang', 'Kampong Speu', 'Kampong Thom', 'Kampot', 'Kandal', 'Kep', 'Koh Kong', 'Kratie', 'Mondulkiri', 'Oddar Meanchey', 'Pailin', 'Preah Sihanouk', 'Preah Vihear', 'Prey Veng', 'Pursat', 'Ratanakiri', 'Siem Reap', 'Stung Treng', 'Svay Rieng', 'Takeo', 'Tboung Khmum'];
  CI.PROV = PROV;
  S.views.branches = function (v) {
    function draw() {
      v.innerHTML = '<div class="vh"><h1>' + E(t('branches')) + '</h1><button class="btn" id="ba">' + I('plus') + E(t('addBranch')) + '</button></div><div class="card"><div class="list">' +
        (CI.branchList.length ? CI.branchList.map(function (b) {
          return '<button class="li" data-c="' + E(b.code) + '"><div class="grow"><div class="row sp"><span class="t">' + E(b.name) + '</span><span class="chip ' + (b.active === false ? 'bad' : 'ok') + '">' + E(b.active === false ? t('off') : t('active')) + '</span></div><div class="s">' + E(b.code) + ' · ' + E(t('prefix')) + ' ' + E(b.prefix) + ' · ' + E(b.province || '') + (b.lat ? ' · ' + I('pin', ' style="width:12px;height:12px;vertical-align:-1px"') : '') + '</div><div class="s">' + E((b.phones || []).join(', ')) + '</div></div></button>';
        }).join('') : '<div class="empty">' + E(t('none')) + '</div>') + '</div></div>';
      document.getElementById('ba').onclick = function () { edit(null); };
      v.querySelectorAll('[data-c]').forEach(function (x) { x.onclick = function () { edit(CI.branches[x.getAttribute('data-c')]); }; });
    }
    function edit(b) {
      var n = !b; b = b || { active: true, phones: [] };
      var body = '<div class="grid2"><div class="fld"><label class="f" for="bc">' + E(t('code')) + '</label><input id="bc" value="' + E(b.code || '') + '"' + (n ? '' : ' disabled') + ' autocapitalize="characters" style="text-transform:uppercase"><div class="tiny muted" style="margin-top:4px">' + E(t('codeHint')) + '</div></div>' +
        '<div class="fld"><label class="f" for="bp">' + E(t('prefix')) + '</label><input id="bp" value="' + E(b.prefix || '') + '" autocapitalize="characters" style="text-transform:uppercase"><div class="tiny muted" style="margin-top:4px">' + E(t('prefixHint')) + '</div></div></div>' +
        '<div class="fld"><label class="f" for="bn">' + E(t('name')) + '</label><input id="bn" value="' + E(b.name || '') + '"></div>' +
        '<div class="fld"><label class="f" for="bv">' + E(t('province')) + '</label><select id="bv">' + PROV.map(function (p) { return '<option' + (p === b.province ? ' selected' : '') + '>' + E(p) + '</option>'; }).join('') + '</select></div>' +
        '<div class="fld"><label class="f" for="bd">' + E(t('address')) + '</label><input id="bd" value="' + E(b.address || '') + '"></div>' +
        '<div class="fld"><label class="f" for="bph">' + E(t('phones')) + '</label><input id="bph" type="tel" value="' + E((b.phones || []).join(', ')) + '"><div class="tiny muted" style="margin-top:4px">' + E(t('phonesHint')) + '</div></div>' +
        '<div class="fld"><label class="f" for="bh">' + E(t('hours')) + '</label><input id="bh" value="' + E(b.hours || '') + '" placeholder="7:30 – 19:00"></div>' +
        '<div class="grid2"><div class="fld"><label class="f" for="bla">' + E(t('lat')) + '</label><input id="bla" inputmode="decimal" value="' + E(b.lat || '') + '"></div><div class="fld"><label class="f" for="blo">' + E(t('lng')) + '</label><input id="blo" inputmode="decimal" value="' + E(b.lng || '') + '"></div></div>' +
        '<button class="btn soft sm" type="button" id="bl">' + I('pin') + E(t('useLoc')) + '</button>' +
        '<label class="row" style="gap:12px;margin-top:16px;font-weight:700"><input type="checkbox" id="bac"' + (b.active !== false ? ' checked' : '') + '> <span>' + E(t('active')) + '</span></label><div class="err" id="be"></div>';
      var sh = CI.sheet({ title: n ? t('addBranch') : t('editBranch'), body: body, actions: [{ label: t('save'), onClick: function (api, btn) {
        var $ = function (id) { return api.el.querySelector('#' + id); }, er = $('be');
        var code = ($('bc').value || '').trim().toUpperCase(), pre = ($('bp').value || code).trim().toUpperCase(), name = $('bn').value.trim();
        if (!/^[A-Z0-9]{2,5}$/.test(code) || !/^[A-Z0-9]{2,5}$/.test(pre)) { er.textContent = t('badCode'); return false; }
        if (!name) { er.textContent = t('required'); return false; }
        if (n && CI.branches[code]) { er.textContent = t('codeUsed'); return false; }
        if (CI.branchList.some(function (x) { return x.code !== code && (x.prefix || x.code) === pre; })) { er.textContent = t('codeUsed'); return false; }
        var lat = parseFloat($('bla').value), lng = parseFloat($('blo').value);
        var d = { code: code, prefix: pre, name: name, province: $('bv').value, address: $('bd').value.trim(), hours: $('bh').value.trim(), phones: $('bph').value.split(/[,;\n]+/).map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 6), active: $('bac').checked };
        if (!isNaN(lat) && !isNaN(lng)) { d.lat = lat; d.lng = lng; }
        CI.busy(btn, true);
        return CI.db.ref('branches/' + code).set(d).then(CI.loadBranches).then(function () { CI.toast(t('saved'), 'ok'); draw(); return true; }).catch(function () { CI.busy(btn, false); er.textContent = t('denied'); return false; });
      } }, { label: t('cancel'), kind: 'soft' }] });
      sh.el.querySelector('#bl').onclick = function () {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(function (p) { sh.el.querySelector('#bla').value = p.coords.latitude.toFixed(6); sh.el.querySelector('#blo').value = p.coords.longitude.toFixed(6); }, function () { CI.toast(t('locFail'), 'bad'); }, { enableHighAccuracy: true, timeout: 15000 });
      };
      sh.el.querySelector('#bn').oninput = function () { var c = sh.el.querySelector('#bc'); if (n && !c.dataset.touched) { var g = this.value.replace(/[^A-Za-z0-9 ]/g, '').split(/\s+/).filter(Boolean).map(function (w) { return w[0]; }).join('').toUpperCase().slice(0, 4); c.value = g.length >= 2 ? g : this.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 3); sh.el.querySelector('#bp').value = c.value; } };
      sh.el.querySelector('#bc').oninput = function () { this.dataset.touched = 1; };
    }
    draw();
  };

  /* ---------- PRICES ---------- */
  S.views.prices = function (v) {
    function draw() {
      var arr = Object.keys(S.prices).map(function (k) { var p = S.prices[k]; p.id = k; return p; });
      v.innerHTML = '<div class="vh"><h1>' + E(t('prices')) + '</h1><button class="btn" id="pa">' + I('plus') + E(t('addPrice')) + '</button></div><div class="card"><div class="list">' +
        (arr.length ? arr.map(function (p) { return '<button class="li" data-p="' + E(p.id) + '"><div class="grow"><span class="t">' + E(p.name) + '</span><div class="s">' + E(CI.money(p.price, p.cur)) + ' ' + E(t('perUnit', { u: t('u_' + p.unit) })) + '</div></div>' + I('arrow', ' style="width:18px;height:18px;color:#9A9CA8"') + '</button>'; }).join('') : '<div class="empty">' + E(t('none')) + '</div>') + '</div></div>';
      document.getElementById('pa').onclick = function () { edit(null); };
      v.querySelectorAll('[data-p]').forEach(function (x) { x.onclick = function () { edit(S.prices[x.getAttribute('data-p')]); }; });
    }
    function edit(p) {
      var n = !p; p = p || { unit: 'kg', cur: (CI.cfg.company || {}).currency || 'USD' };
      var acts = [{ label: t('save'), onClick: function (api) {
        var $ = function (id) { return api.el.querySelector('#' + id); }, name = $('pn').value.trim(), price = parseFloat($('pv').value);
        if (!name || isNaN(price)) { $('pe').textContent = t('required'); return false; }
        var d = { name: name, unit: $('pu').value, price: price, cur: $('pc').value }, ref = n ? CI.db.ref('prices').push() : CI.db.ref('prices/' + p.id);
        return ref.set(d).then(function () { S.prices[ref.key] = d; CI.toast(t('saved'), 'ok'); draw(); return true; }).catch(function () { $('pe').textContent = t('denied'); return false; });
      } }];
      if (!n) acts.push({ label: t('delete'), kind: 'line', onClick: function () { return CI.confirm(t('areYou'), t('delete'), 'bad').then(function (ok) { if (!ok) return false; return CI.db.ref('prices/' + p.id).remove().then(function () { delete S.prices[p.id]; draw(); return true; }); }); } });
      acts.push({ label: t('cancel'), kind: 'soft' });
      CI.sheet({ title: n ? t('addPrice') : t('edit'), body: '<div class="fld"><label class="f" for="pn">' + E(t('name')) + '</label><input id="pn" value="' + E(p.name || '') + '"></div>' +
        '<div class="grid3"><div class="fld"><label class="f" for="pv">' + E(t('price')) + '</label><input id="pv" type="number" step="0.01" min="0" inputmode="decimal" value="' + E(p.price == null ? '' : p.price) + '"></div>' +
        '<div class="fld"><label class="f" for="pc">' + E(t('currency')) + '</label><select id="pc"><option value="USD"' + (p.cur === 'USD' ? ' selected' : '') + '>USD</option><option value="KHR"' + (p.cur === 'KHR' ? ' selected' : '') + '>KHR</option></select></div>' +
        '<div class="fld"><label class="f" for="pu">' + E(t('unit')) + '</label><select id="pu">' + ['kg', 'piece', 'parcel', 'doc'].map(function (u) { return '<option value="' + u + '"' + (p.unit === u ? ' selected' : '') + '>' + E(t('u_' + u)) + '</option>'; }).join('') + '</select></div></div><div class="err" id="pe"></div>', actions: acts });
    }
    draw();
  };

  /* ---------- STAFF ---------- */
  var sec = null;
  function secAuth() { if (!sec) { try { sec = firebase.app('sec'); } catch (e) { sec = firebase.initializeApp(CI.cfg.firebase, 'sec'); } } return sec.auth(); }
  S.views.staff = function (v) {
    var all = {};
    function draw() {
      var arr = Object.keys(all).map(function (k) { var s = all[k]; s.uid = k; return s; }).sort(function (a, b) { return String(a.branch + a.name).localeCompare(String(b.branch + b.name)); });
      v.innerHTML = '<div class="vh"><h1>' + E(t('staff')) + '</h1><button class="btn" id="sa">' + I('plus') + E(t('addStaff')) + '</button></div><div class="card"><div class="list">' +
        (arr.length ? arr.map(function (s) { return '<button class="li" data-u="' + E(s.uid) + '"><div class="grow"><div class="row sp"><span class="t">' + E(s.name) + '</span><span class="chip ' + (s.active ? (s.role === 'admin' ? 'red' : 'ok') : 'bad') + '">' + E(s.active ? t(s.role === 'admin' ? 'roleAdmin' : 'roleAgent') : t('off')) + '</span></div><div class="s">@' + E(s.username) + ' · ' + E(CI.bName(s.branch)) + '</div></div></button>'; }).join('') : '<div class="empty">' + E(t('none')) + '</div>') + '</div></div>';
      document.getElementById('sa').onclick = function () { edit(null); };
      v.querySelectorAll('[data-u]').forEach(function (x) { x.onclick = function () { edit(all[x.getAttribute('data-u')]); }; });
    }
    function edit(s) {
      var n = !s; s = s || { role: 'agent', active: true, branch: (CI.branchList[0] || {}).code };
      var body = '<div class="fld"><label class="f" for="sn">' + E(t('name')) + '</label><input id="sn" value="' + E(s.name || '') + '"></div>' +
        '<div class="fld"><label class="f" for="su">' + E(t('username')) + '</label><input id="su" value="' + E(s.username || '') + '" autocapitalize="none" autocorrect="off"' + (n ? '' : ' disabled') + '><div class="tiny muted" style="margin-top:4px">' + E(t('userHint')) + '</div></div>' +
        (n ? '<div class="fld"><label class="f" for="sp">' + E(t('password')) + '</label><input id="sp" type="text" autocomplete="new-password"><div class="tiny muted" style="margin-top:4px">' + E(t('pwHint')) + '</div></div>' : '') +
        '<div class="grid2"><div class="fld"><label class="f" for="sr">' + E(t('role')) + '</label><select id="sr"><option value="agent"' + (s.role === 'agent' ? ' selected' : '') + '>' + E(t('roleAgent')) + '</option><option value="admin"' + (s.role === 'admin' ? ' selected' : '') + '>' + E(t('roleAdmin')) + '</option></select></div>' +
        '<div class="fld"><label class="f" for="sb">' + E(t('branch')) + '</label><select id="sb">' + CI.branchList.map(function (b) { return '<option value="' + E(b.code) + '"' + (b.code === s.branch ? ' selected' : '') + '>' + E(b.name) + '</option>'; }).join('') + '</select></div></div>' +
        (n ? '' : '<label class="row" style="gap:12px;margin:4px 0 8px;font-weight:700"><input type="checkbox" id="sac"' + (s.active ? ' checked' : '') + '> <span>' + E(t('active')) + '</span></label><button class="btn soft sm" type="button" id="spw">' + E(t('resetPw')) + '</button>') + '<div class="err" id="se"></div>';
      CI.sheet({ title: n ? t('addStaff') : s.name, body: body, actions: [{ label: t('save'), onClick: function (api, btn) {
        var $ = function (id) { return api.el.querySelector('#' + id); }, er = $('se');
        var d = { name: $('sn').value.trim(), username: n ? $('su').value.trim().toLowerCase() : s.username, role: $('sr').value, branch: $('sb').value, active: n ? true : $('sac').checked };
        if (!d.name || !d.branch) { er.textContent = t('required'); return false; }
        if (!n && s.uid === S.me.uid && (!d.active || d.role !== 'admin')) { er.textContent = t('cantSelf'); return false; }
        if (n) {
          var pw = $('sp').value;
          if (!/^[a-z0-9_]{3,20}$/.test(d.username)) { er.textContent = t('userHint'); return false; }
          if (pw.length < 6) { er.textContent = t('pwShort'); return false; }
          CI.busy(btn, true); var a = secAuth();
          return a.createUserWithEmailAndPassword(CI.staffEmail(d.username), pw).then(function (cr) {
            var uid = cr.user.uid; return CI.db.ref('staff/' + uid).set(d).then(function () { a.signOut(); all[uid] = d; CI.toast(t('staffAdded'), 'ok'); draw(); return true; });
          }).catch(function (e) { CI.busy(btn, false); er.textContent = e && e.code === 'auth/email-already-in-use' ? t('userUsed') : t('failed'); return false; });
        }
        CI.busy(btn, true);
        return CI.db.ref('staff/' + s.uid).set(d).then(function () { all[s.uid] = d; CI.toast(t('saved'), 'ok'); draw(); return true; }).catch(function () { CI.busy(btn, false); er.textContent = t('denied'); return false; });
      } }, { label: t('cancel'), kind: 'soft' }] });
      var pb = document.getElementById('spw');
      if (pb) pb.onclick = function () {
        CI.sheet({ title: t('resetPw'), body: '<div class="fld"><label class="f" for="rp">' + E(t('newPw')) + '</label><input id="rp" type="text" autocomplete="new-password"></div><div class="err" id="re"></div>', actions: [{ label: t('save'), onClick: function (api, b) {
          var pw = api.el.querySelector('#rp').value; if (pw.length < 6) { api.el.querySelector('#re').textContent = t('pwShort'); return false; }
          CI.busy(b, true);
          return CI.callFn('adminSetPassword', { uid: s.uid, password: pw }).then(function () { CI.toast(t('pwSet'), 'ok'); return true; }).catch(function (e) { CI.busy(b, false); api.el.querySelector('#re').textContent = t('needFn') + ' (' + e.message + ')'; return false; });
        } }, { label: t('cancel'), kind: 'soft' }] });
      };
    }
    CI.db.ref('staff').once('value').then(function (x) { all = x.val() || {}; draw(); }).catch(function () { CI.toast(t('denied'), 'bad'); });
    v.innerHTML = '<div class="empty">' + E(t('working')) + '</div>';
  };

  /* ---------- REPORTS ---------- */
  S.views.reports = function (v) {
    var d0 = new Date(CI.dayStart() + 7 * 3600e3), iso = function (d) { return d.toISOString().slice(0, 10); };
    var from = new Date(d0.getTime() - 6 * 864e5);
    v.innerHTML = '<div class="vh"><h1>' + E(t('reports')) + '</h1></div><div class="card"><div class="row wrap" style="align-items:flex-end"><div class="fld grow" style="margin:0;min-width:150px"><label class="f" for="rf">' + E(t('rFrom')) + '</label><input type="date" id="rf" value="' + iso(from) + '"></div><div class="fld grow" style="margin:0;min-width:150px"><label class="f" for="rt">' + E(t('rTo')) + '</label><input type="date" id="rt" value="' + iso(d0) + '"></div><button class="btn" id="rr">' + E(t('rRun')) + '</button><button class="btn line" id="rx">' + E(t('export')) + '</button></div></div><div id="ro"></div>';
    var rows = [];
    function run() {
      var a = Date.parse(document.getElementById('rf').value + 'T00:00:00+07:00'), b = Date.parse(document.getElementById('rt').value + 'T23:59:59+07:00');
      if (isNaN(a) || isNaN(b)) return;
      document.getElementById('ro').innerHTML = '<div class="empty">' + E(t('working')) + '</div>';
      CI.db.ref('shipments').orderByChild('created').startAt(a).endAt(b).once('value').then(function (s) {
        rows = S.toArr(s.val()); var bb = {}, bs = {};
        rows.forEach(function (x) {
          var f = bb[x.from] = bb[x.from] || { sent: 0, recv: 0, usd: 0, khr: 0 }, to = bb[x.to] = bb[x.to] || { sent: 0, recv: 0, usd: 0, khr: 0 };
          f.sent++; to.recv++; if (x.cur === 'KHR') f.khr += +x.price || 0; else f.usd += +x.price || 0; bs[x.status] = (bs[x.status] || 0) + 1;
        });
        var keys = Object.keys(bb).sort(function (x, y) { return CI.bName(x).localeCompare(CI.bName(y)); });
        document.getElementById('ro').innerHTML = '<div class="kpis">' + kpi(t('count'), rows.length) + kpi(t('s_delivered'), bs.delivered || 0) + kpi(t('s_arrived'), bs.arrived || 0) + kpi(t('revenue') + ' USD', '$' + rows.filter(function (x) { return x.cur !== 'KHR'; }).reduce(function (s2, x) { return s2 + (+x.price || 0); }, 0).toFixed(2)) + '</div>' +
          '<div class="card"><h3 style="margin-bottom:8px">' + E(t('byBranch')) + '</h3><div class="tbl-wrap"><table class="tbl" style="min-width:520px"><thead><tr><th>' + E(t('branch')) + '</th><th>' + E(t('tOut')) + '</th><th>' + E(t('tIn')) + '</th><th>USD</th><th>KHR</th></tr></thead><tbody>' +
          keys.map(function (k) { var r = bb[k]; return '<tr><td><b>' + E(CI.bName(k)) + '</b></td><td>' + r.sent + '</td><td>' + r.recv + '</td><td>' + E(CI.money(r.usd, 'USD')) + '</td><td>' + E(CI.money(r.khr, 'KHR')) + '</td></tr>'; }).join('') + '</tbody></table></div></div>' +
          '<div class="card"><h3 style="margin-bottom:8px">' + E(t('byStatus')) + '</h3><div class="row wrap">' + CI.STATUSES.map(function (k) { return '<span class="chip ' + (CI.stChip[k] || '') + '" style="font-size:14px;padding:8px 12px">' + E(t('s_' + k)) + ': ' + (bs[k] || 0) + '</span>'; }).join('') + '</div></div>';
      }).catch(function () { document.getElementById('ro').innerHTML = '<div class="card err">' + E(t('denied')) + '</div>'; });
    }
    document.getElementById('rr').onclick = run;
    document.getElementById('rx').onclick = function () { exportCsv('report-' + document.getElementById('rf').value + '_' + document.getElementById('rt').value + '.csv', rows); };
    run();
  };
})();
