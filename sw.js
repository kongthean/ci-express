/* CI Express service worker: makes the apps installable and open fast.
   Pages and code: network first (always newest), saved copy when offline. */
var CACHE = 'ci-v2';
var CORE = ['/', '/agent', '/customer', '/app.css?v=2', '/config.js?v=2', '/i18n.js?v=2', '/core.js?v=2', '/staff.js?v=2', '/admin.js?v=2', '/customer.js?v=2', '/icon-192.png'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE).catch(function () {}); })); self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (k) { return Promise.all(k.filter(function (x) { return x !== CACHE; }).map(function (x) { return caches.delete(x); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener('fetch', function (e) {
  var u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; // never touch Firebase / maps / other sites
  e.respondWith(fetch(e.request).then(function (r) { if (r && r.ok) { var cp = r.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, cp); }); } return r; })
    .catch(function () { return caches.match(e.request).then(function (m) { return m || caches.match(u.pathname.indexOf('/agent') === 0 ? '/agent' : u.pathname.indexOf('/customer') === 0 ? '/customer' : '/'); }); }));
});
