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
  'GoGo Central', 'GoGo Company'
]) assert.ok(privacy.toLowerCase().includes(phrase.toLowerCase()), 'privacy policy must disclose: ' + phrase);
assert.ok(/privacy\.html/.test(page) && /terms\.html/.test(page), 'home page must link to both legal pages');
assert.ok(/offline/i.test(privacy) && /service worker/i.test(privacy), 'privacy policy must describe offline caching');
assert.ok(/local storage/i.test(privacy), 'privacy policy must describe local browser storage');
assert.ok(/gameplay|progress/i.test(terms), 'terms must describe the game and local progress');

for (const asset of ['guide.html', 'privacy.html', 'terms.html', 'js/gogo-notifications.js']) {
  assert.ok(sw.includes("'" + asset + "'") || sw.includes('"'+asset+'"'), 'offline cache should include ' + asset);
}
assert.match(sw, /var CACHE = 'cq-v23';/, 'release shell cache must be bumped');
assert.equal(manifest.start_url, './');
assert.equal(manifest.scope, './');
assert.ok(manifest.icons.some(i => i.src === 'icon.svg'), 'manifest must retain the shipped icon');
assert.match(android, /Trusted Web Activity/i);
assert.match(android, /rewarded ads/i);
assert.match(android, /assetlinks\.json/i);
assert.match(android, /privacy policy/i);
assert.ok(!/API 34\+ at time of writing/i.test(android), 'Play target API guidance must not be stale');
assert.ok(!page.includes('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'), 'do not load ads before certified consent is configured');
assert.ok(page.includes('Advertisements are currently disabled'), 'current ad status must be honest');
console.log('Commercial launch legal and PWA readiness checks passed.');
