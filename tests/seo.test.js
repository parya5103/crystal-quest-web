#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const title = page.match(/<title>([^<]*)<\/title>/i);
const description = page.match(/<meta name="description" content="([^"]*)"/i);
const ogDescription = page.match(/<meta property="og:description" content="([^"]*)"/i);

assert.ok(title && title[1].length <= 60, 'page title should stay within 60 characters');
assert.ok(description && description[1].length <= 155, 'meta description should stay within 155 characters');
assert.ok(ogDescription && ogDescription[1].length <= 160, 'Open Graph description should stay concise');

for (const href of ['../', '../arrowout/', '../pikanews/', '../sarkari-sarthi/']) {
  assert.ok(page.includes('href="' + href + '"'), 'noscript should link to ' + href);
}

console.log('Crystal Quest SEO metadata and crawlable product links: PASS');

assert.equal([...page.matchAll(/<h1\b/gi)].length, 1, 'only the visible game title should be H1');
const schemas = [...page.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
const game = schemas.find(schema => schema['@type'] === 'VideoGame');
assert.ok(game && game.publisher && game.publisher.logo === 'https://gogocompany.in/favicon.svg',
  'VideoGame publisher should include the GoGo Company logo');
assert.match(page, /twitter:title/);

const guide = fs.readFileSync(path.join(root, 'guide.html'), 'utf8');
assert.match(guide, /<title>Crystal Quest Guide: Match-3 Tips, Gems &amp; Levels<\\/title>/);
assert.match(guide, /<link rel="canonical" href="https:\\/\\/gogocompany\\.in\\/crystalquest\\/guide\\.html"/);
assert.equal([...guide.matchAll(/<h1\\b/gi)].length, 1);
assert.match(guide, /Crystal Resonance/);
assert.match(guide, /The Guardian/);
assert.match(page, /href="guide.html"/);
