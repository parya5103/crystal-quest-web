/* Crystal Quest service worker - versioned offline cache.
   Ship an update by bumping CACHE below; old caches delete on activation. */
var CACHE = 'cq-v15';
var PRECACHE = [
  './',
  'index.html',
  'styles.css',
  'manifest.json',
  'icon.svg',
  'js/audio.js',
  'js/levels.js',
  'js/engine.js',
  'js/render.js',
  'js/ads.js',
  'js/story.js',
  'js/ui.js',
  'js/main.js',
  'images/bg_cavern.jpg',
  'images/bg_map.jpg'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (cache) { return cache.addAll(PRECACHE); }));
});

self.addEventListener('message', function (e) {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (key) { return key !== CACHE; }).map(function (key) { return caches.delete(key); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf('/dev/') === 0) return;
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (cache) { cache.put('index.html', copy); });
      return res;
    }).catch(function () { return caches.match('index.html'); }));
    return;
  }
  e.respondWith(caches.match(e.request).then(function (hit) {
    if (hit) return hit;
    return fetch(e.request).then(function (res) {
      if (res && res.status === 200 && res.type === 'basic') {
        var copy = res.clone();
        caches.open(CACHE).then(function (cache) { cache.put(e.request, copy); });
      }
      return res;
    });
  }));
});
