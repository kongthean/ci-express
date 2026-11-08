/* CI Express service worker: makes the apps installable and open fast.
   Pages and code: network first (always newest), saved copy when offline. */
var CACHE = 'ci-v1';
var CORE = ['/', '/agent/', '/customer/', '/assets/app.css?v=1', '/assets/config.js?v=1', '/assets/i18n.js?v=1', '/assets/core.js?v=1', '/assets/staff.js?v=1', '/assets/admin.js?v=1', '/assets/customer.js?v=1', '/icons/icon-192.png'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE).catch(function () {}); })); self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (k) { return Promise.all(k.filter(function (x) { return x !== CACHE; }).map(function (x) { return caches.delete(x); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; // never touch Firebase / maps / other sites
  e.respondWith(fetch(e.request).then(function (r) { if (r && r.ok) { var cp = r.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, cp); }); } return r; })
    .catch(function () { return caches.match(e.request).then(function (m) { return m || caches.match(u.pathname.indexOf('/agent') === 0 ? '/agent/' : u.pathname.indexOf('/customer') === 0 ? '/customer/' : '/'); }); }));
});
