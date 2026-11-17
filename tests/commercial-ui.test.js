#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const assert = require('node:assert/strict');

const css = fs.readFileSync('styles.css', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const design = fs.readFileSync('DESIGN.md', 'utf8');

const required = [
  '--cq-glass', '--cq-glass-edge', '--cq-glow',
  '.board-wrap::before', '.hud-moves.is-low',
  '.obj-chip.is-done', '.level-card.is-current',
  '@media (max-width: 420px)',
  '@media (max-height: 640px) and (orientation: landscape)',
  '@media (prefers-reduced-motion: reduce)'
];
for (const marker of required) assert.ok(css.includes(marker), 'Missing premium UI rule: ' + marker);
assert.match(css, /\.screen\.is-active \.bg-layer\s*\{[^}]*animation:/s, 'Active screens should have subtle backdrop motion');
assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.screen\.is-active \.bg-layer\s*\{\s*animation:\s*none/s, 'Backdrop motion must respect reduced-motion');
assert.match(sw, /var CACHE = 'cq-v\\d+';/, 'Premium UI release must use a versioned app shell cache');
assert.match(html, /styles\.css/, 'The existing stylesheet must remain connected');
assert.doesNotMatch(css, /@import\s+url\(/i, 'Do not add remote font or CSS dependencies');
console.log('Commercial UI polish checks passed.');
