#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const assert = require('node:assert/strict');

const read = (p) => fs.readFileSync(p, 'utf8');
const privacy = read('privacy.html');
const terms = read('terms.html');
const page = read('index.html');
const sw = read('sw.js');
const manifest = JSON.parse(read('manifest.json'));
const android = read('android/README.md');

for (const phrase of [
  'crystal-quest-save-v1', 'Firebase Cloud Messaging', 'Firebase Anonymous Authentication',
  'device token', 'user agent', 'explicitly enable', 'Advertisements are currently disabled',
  'GoGo Central', 'GoGo Company', 'officialgogocompany@gmail.com'
]) assert.ok(privacy.toLowerCase().includes(phrase.toLowerCase()), 'privacy policy must disclose: ' + phrase);
assert.ok(/privacy\.html/.test(page) && /terms\.html/.test(page), 'home page must link to both legal pages');
assert.ok(/Optional push notifications send a device token/i.test(page), 'in-game privacy disclosure must mention opt-in notification data');
assert.ok(/offline/i.test(privacy) && /service worker/i.test(privacy), 'privacy policy must describe offline caching');
assert.ok(/local storage/i.test(privacy), 'privacy policy must describe local browser storage');
assert.ok(/gameplay|progress/i.test(terms), 'terms must describe the game and local progress');

for (const asset of ['guide.html', 'privacy.html', 'terms.html', 'js/gogo-notifications.js', 'icon-192.png', 'icon-512.png', 'icon-512-maskable.png']) {
  assert.ok(sw.includes("'" + asset + "'") || sw.includes('"'+asset+'"'), 'offline cache should include ' + asset);
}
assert.match(sw, /var CACHE = 'cq-v26';/, 'release shell cache must be bumped');
assert.ok(sw.includes("cache.put(e.request, copy)"), 'navigation responses must be cached under their own URL');
assert.ok(sw.includes("caches.match(e.request, { ignoreSearch: true })"), 'offline navigation must return the requested cached page before falling back to the game');
assert.ok(!sw.includes("cache.put('index.html', copy)"), 'privacy/terms navigation must not overwrite the offline game shell');
assert.equal(manifest.start_url, './');
assert.equal(manifest.scope, './');
assert.ok(manifest.icons.some(i => i.src === 'icon.svg'), 'manifest must retain the shipped vector icon');
assert.ok(manifest.icons.some(i => i.src === 'icon-192.png' && i.sizes === '192x192'), 'manifest must ship a 192px PNG icon');
assert.ok(manifest.icons.some(i => i.src === 'icon-512.png' && i.sizes === '512x512' && i.purpose === 'any'), 'manifest must ship a 512px PNG icon');
assert.ok(manifest.icons.some(i => i.src === 'icon-512-maskable.png' && i.sizes === '512x512' && i.purpose === 'maskable'), 'manifest must ship a dedicated 512px maskable PNG icon');
for (const [file, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['icon-512-maskable.png', 512]]) {
  const png = fs.readFileSync(file);
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], file + ' must be a valid PNG');
  assert.equal(png.readUInt32BE(16), size, file + ' width must match manifest');
  assert.equal(png.readUInt32BE(20), size, file + ' height must match manifest');
}
assert.ok(page.includes('apple-touch-icon') && page.includes('icon-192.png'), 'iOS install must have a raster touch icon');
assert.match(android, /Trusted Web Activity/i);
assert.match(android, /rewarded ads/i);
assert.match(android, /assetlinks\.json/i);
assert.match(android, /privacy policy/i);
assert.ok(!/API 34\+ at time of writing/i.test(android), 'Play target API guidance must not be stale');
assert.ok(!page.includes('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'), 'do not load ads before certified consent is configured');
assert.ok(page.includes('Advertisements are currently disabled'), 'current ad status must be honest');
const renderer = read('js/render.js');
const ui = read('js/ui.js');
assert.match(renderer, /this\.dpr=Math\.min\(global\.devicePixelRatio\|\|1,2\)/, 'Canvas DPR must be bounded on high-density devices');
assert.match(renderer, /this\.canvas\.width=Math\.round\(this\.cssW\*this\.dpr\)/, 'Canvas backing width must follow CSS size × DPR');
assert.match(renderer, /this\.canvas\.height=Math\.round\(this\.cssH\*this\.dpr\)/, 'Canvas backing height must follow CSS size × DPR');
assert.match(renderer, /this\.ctx\.setTransform\(this\.dpr,0,0,this\.dpr,0,0\)/, 'Canvas drawing coordinates must use the DPR transform');
assert.match(renderer, /requestAnimationFrame\(this\._loop\)/, 'Renderer must use requestAnimationFrame');
for (const event of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) {
  assert.ok(ui.includes('addEventListener("' + event + '"'), 'board input must handle ' + event);
}
console.log('Commercial launch legal and PWA readiness checks passed.');
