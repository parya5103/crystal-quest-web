#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const storage = new Map();
const scheduled = [];
const render = {
  canvas: { focus() {} }, selected: null, hint: null, particles: [], popups: [], flashes: [],
  syncFromGrid() {}, resize() {}, isBusy() { return false; }, playSteps(_steps, hooks) { hooks && hooks.done && hooks.done(); },
};
const audio = { play() {}, stopMusic() {}, unlock() {}, startMusic() {}, setSfx() {}, setMusic() {} };
const document = {
  readyState: 'loading', hidden: false, body: { classList: { toggle() {} } },
  addEventListener() {}, getElementById() { return render.canvas; },
  querySelectorAll() { return []; }, querySelector() { return null; },
};
const context = {
  console, Math, Date, JSON, Number, isFinite, document, CQRender: render, CQAudio: audio,
  localStorage: {
    getItem(k) { return storage.has(k) ? storage.get(k) : null; },
    setItem(k, v) { storage.set(k, String(v)); },
    removeItem(k) { storage.delete(k); },
  },
  setTimeout(fn, ms) { scheduled.push({ fn, ms }); return scheduled.length; },
  clearTimeout() {}, requestAnimationFrame() { return 1; }, cancelAnimationFrame() {},
  addEventListener() {}, removeEventListener() {},
};
context.window = context;
vm.createContext(context);
for (const file of ['js/audio.js', 'js/levels.js', 'js/engine.js', 'js/ui.js', 'js/main.js', 'dev/bot.js', 'dev/debug.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
}

const E = context.CQEngine;
const LV = context.CQLevels;
const Game = context.CQGame;
const Save = context.CQSave;
const passed = [];
function test(name, fn) {
  try { fn(); passed.push(name); console.log(`PASS ${name}`); }
  catch (err) { console.error(`FAIL ${name}\n${err.stack}`); process.exitCode = 1; }
}
function copyGrid(grid) { return JSON.parse(JSON.stringify(grid)); }
function adjacentPairs() {
  const pairs = [];
  for (let r = 0; r < E.ROWS; r++) for (let c = 0; c < E.COLS; c++) {
    if (c + 1 < E.COLS) pairs.push([{ r, c }, { r, c: c + 1 }]);
    if (r + 1 < E.ROWS) pairs.push([{ r, c }, { r: r + 1, c }]);
  }
  return pairs;
}
function deadBoard() {
  const grid = Array.from({ length: E.ROWS }, () => Array(E.COLS).fill(null));
  grid[3][2] = { k: 'g', g: 0, s: null };
  grid[3][3] = { k: 'g', g: 1, s: null };
  grid[3][4] = { k: 'g', g: 2, s: null };
  grid[2][3] = { k: 'g', g: 3, s: null };
  assert.equal(E.findMatches(grid).length, 0);
  assert.equal(E.hasValidMove(grid), false);
  return grid;
}

Save.load();

test('audio remains harmless when Web Audio is unavailable or initialization fails', () => {
  const A = context.CQAudio;
  assert.equal(A.init(), false, 'Node test environment has no AudioContext');
  assert.doesNotThrow(() => { A.unlock(); A.play('click'); });
  context.AudioContext = function () {
    this.state = 'running'; this.sampleRate = 48000; this.destination = {};
    this.createGain = () => { throw new Error('simulated unsupported audio node'); };
    this.close = () => {};
  };
  assert.equal(A.init(), false, 'partially supported AudioContext fails closed');
  assert.equal(A.ctx, null);
  A.ready = true; A.sfxOn = true;
  A.ctx = { state: 'running', sampleRate: 48000, currentTime: 0, createOscillator() { throw new Error('invalid tone should not escape'); } };
  assert.doesNotThrow(() => A._tone({ freq: NaN, dur: -1, vol: Infinity }));
  assert.doesNotThrow(() => A.play('click', { pitch: Infinity }));
  A.ready = false; A.ctx = null; delete context.AudioContext;
});

test('existing built-in engine/save regression tests', () => {
  const result = context.CQTest.run();
  assert.equal(result.pass, true, JSON.stringify(result.results.filter(x => !x.pass)));
});

test('all 26 level layouts match blocker-objective counts and start playable', () => {
  assert.equal(LV.LEVELS.length, 26);
  LV.LEVELS.forEach((level) => {
    const chars = level.layout.join('');
    for (const obj of level.objectives.filter(x => x.type === 'clear')) {
      const tiles = [...chars].filter(ch => ch === (obj.blocker === 'ice' ? 'I' : 'S')).length;
      assert.equal(obj.count, tiles, `level ${level.id} ${obj.blocker}: target ${obj.count}, tiles ${tiles}`);
    }
    for (const seed of [101, 202, 303]) {
      const board = E.createBoard(level, seed + level.id * 1000);
      assert.equal(E.findMatches(board.grid).length, 0, `level ${level.id} initial match`);
      assert.equal(E.hasValidMove(board.grid), true, `level ${level.id} initial move`);
      const hint = E.findHint(board.grid);
      assert.ok(hint && E.canSwap(board.grid, hint.a, hint.b), `level ${level.id} legal hint`);
      const check = E.trySwap(copyGrid(board.grid), hint.a, hint.b, E.makeRng(seed), E.makeCtx(level));
      assert.equal(check.ok, true, `level ${level.id} hint swap accepted`);
    }
  });
});

test('canSwap, trySwap, hasValidMove and findHint agree, including special gems', () => {
  const grid = deadBoard();
  grid[3][3].s = 'line-h';
  const linePair = [{ r: 3, c: 3 }, { r: 3, c: 2 }];
  assert.equal(E.canSwap(grid, ...linePair), false, 'nonmatching line+normal is not a legal swap');
  assert.equal(E.trySwap(copyGrid(grid), ...linePair, E.makeRng(1), E.makeCtx(LV.get(1))).ok, false);
  assert.equal(E.findHint(grid), null, 'no hint is shown for a rejected special swap');
  grid[3][3].s = 'prism';
  assert.equal(E.canSwap(grid, ...linePair), true, 'prism+normal is a supported activation');
  assert.equal(E.trySwap(copyGrid(grid), ...linePair, E.makeRng(2), E.makeCtx(LV.get(1))).ok, true);
  for (const [a, b] of adjacentPairs()) {
    const legal = E.canSwap(grid, a, b);
    const result = E.trySwap(copyGrid(grid), a, b, E.makeRng(3), E.makeCtx(LV.get(1)));
    assert.equal(result.ok, legal, `swap result differs at ${a.r},${a.c} -> ${b.r},${b.c}`);
  }
  if (E.hasValidMove(grid)) {
    const hint = E.findHint(grid);
    assert.ok(hint);
    assert.equal(E.trySwap(copyGrid(grid), hint.a, hint.b, E.makeRng(4), E.makeCtx(LV.get(1))).ok, true);
  }
});

test('dead-board shuffle restores a legal move without moving blockers or losing specials', () => {
  const grid = deadBoard();
  const layout = LV.get(19).layout;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    if (layout[r][c] === 'S') grid[r][c] = { k: 'b', b: 'stone', hp: 1 };
    if (layout[r][c] === 'I') grid[r][c] = { k: 'b', b: 'ice', hp: 2 };
  }
  grid[3][2].s = 'bomb';
  const blockersBefore = grid.map(row => row.map(cell => cell && cell.k === 'b' ? JSON.stringify(cell) : null));
  assert.equal(E.hasValidMove(grid), false);
  assert.equal(E.shuffleBoard(grid, E.makeRng(456)), true);
  assert.equal(E.findMatches(grid).length, 0);
  assert.equal(E.hasValidMove(grid), true);
  assert.equal(grid[3][2].s, 'bomb');
  assert.deepEqual(JSON.parse(JSON.stringify(grid.map(row => row.map(cell => cell && cell.k === 'b' ? JSON.stringify(cell) : null)))), blockersBefore);
});

test('prism clears damage adjacent ice and special combinations damage blockers', () => {
  const grid = Array.from({ length: 8 }, (_, r) => Array.from({ length: 8 }, (_, c) => ({ k: 'g', g: (r + c) % 6, s: null })));
  grid[0][0] = { k: 'g', g: 0, s: 'prism' };
  grid[0][1] = { k: 'g', g: 1, s: null };
  grid[1][1] = { k: 'b', b: 'ice', hp: 1 };
  const ctx = E.makeCtx(LV.get(5));
  const prism = E.trySwap(grid, { r: 0, c: 0 }, { r: 0, c: 1 }, E.makeRng(7), ctx);
  assert.equal(prism.ok, true);
  assert.equal(ctx.blockersCleared.ice, 1);

  const comboGrid = Array.from({ length: 8 }, (_, r) => Array.from({ length: 8 }, (_, c) => ({ k: 'g', g: (r + c) % 6, s: null })));
  comboGrid[2][2] = { k: 'g', g: 0, s: 'line-h' };
  comboGrid[2][3] = { k: 'g', g: 1, s: 'bomb' };
  comboGrid[1][4] = { k: 'b', b: 'stone', hp: 1 };
  const comboCtx = E.makeCtx(LV.get(4));
  const combo = E.trySwap(comboGrid, { r: 2, c: 2 }, { r: 2, c: 3 }, E.makeRng(8), comboCtx);
  assert.equal(combo.ok, true);
  assert.equal(comboCtx.blockersCleared.stone, 1);
});

test('pause requested during resolution opens only after the turn settles and resumes', () => {
  const board = E.createBoard(LV.get(1), 8181);
  Game.level = LV.get(1); Game.grid = board.grid; Game.ctx = E.makeCtx(Game.level);
  Game.rng = board.rng; Game.movesLeft = 10; Game.state = 'resolving';
  Game.pauseRequested = false; Game.outcomeResolved = false;
  Game.animateScore = function () {}; Game.renderObjectives = function () {};
  let modalOpen = false;
  context.CQUI.openModal = () => { modalOpen = true; };
  context.CQUI.closeModal = () => { modalOpen = false; };
  Game.pause();
  assert.equal(Game.state, 'resolving');
  assert.equal(Game.pauseRequested, true);
  assert.equal(modalOpen, false);
  Game.afterTurn();
  assert.equal(Game.state, 'paused');
  assert.equal(modalOpen, true);
  Game.resume();
  assert.equal(Game.state, 'playing');
  assert.equal(modalOpen, false);
});

test('edge/out-of-bounds drags and input during resolution leave the board unchanged', () => {
  const board = E.createBoard(LV.get(1), 9191);
  Game.grid = board.grid; Game.rng = board.rng; Game.ctx = E.makeCtx(LV.get(1));
  const before = JSON.stringify(Game.grid);
  Game.state = 'playing';
  Game.attemptSwap({ r: 0, c: 0 }, { r: -1, c: 0 });
  assert.equal(JSON.stringify(Game.grid), before);
  Game.state = 'resolving';
  Game.attemptSwap({ r: 0, c: 0 }, { r: 0, c: 1 });
  assert.equal(JSON.stringify(Game.grid), before);
});

test('duplicate outcome callbacks do not schedule duplicate dialogs', () => {
  scheduled.length = 0;
  Game.level = LV.get(1); Game.ctx = E.makeCtx(Game.level); Game.ctx.score = 99999;
  Game.grid = E.createBoard(Game.level, 1212).grid; Game.movesLeft = 4;
  Game.state = 'resolving'; Game.outcomeResolved = false; Game.outcomeShown = false;
  Game.afterTurn(); Game.afterTurn();
  assert.equal(Game.state, 'won');
  assert.equal(scheduled.length, 1);
});

test('save/load works and storage exceptions do not escape into gameplay', () => {
  Save.data = Save.defaults();
  Save.record(2, 5600, 3);
  assert.equal(Save.load().stars[2], 3);
  context.localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
  assert.equal(Save.load().unlocked, 1);
  assert.equal(Save.persist(), false);
});

test('idle auto-hint: arms after 6s idle, shows a hint, re-arms, and is cleared on pause and win', () => {
  const board = E.createBoard(LV.get(1), 4242);
  Game.level = LV.get(1); Game.grid = board.grid; Game.ctx = E.makeCtx(Game.level);
  Game.rng = board.rng; Game.movesLeft = 20; Game.state = 'playing';
  Game.selected = null; Game.drag = null; Game.hintTimer = null; Game.idleTimer = null;
  Game.IDLE_HINT_MS = 6000;
  const prevAnyModal = context.CQUI.anyModalOpen;
  context.CQUI.anyModalOpen = () => false;
  render.hint = null;
  scheduled.length = 0;
  Game.armIdle();
  assert.equal(scheduled.length, 1, 'idle timer armed');
  assert.equal(scheduled[0].ms, 6000, '6 second idle delay');
  scheduled.pop().fn();
  assert.ok(render.hint, 'hint highlight shown after idle');
  assert.equal(Game.idleTimer, null, 'idle timer consumed when it fired');
  assert.equal(scheduled.length, 1, 'hint auto-hide scheduled');
  scheduled.pop().fn();
  assert.equal(render.hint, null, 'hint hidden after its display window');
  assert.ok(Game.idleTimer, 'idle timer re-armed after hint expiry');
  scheduled.length = 0;
  Game.pause();
  assert.equal(Game.state, 'paused');
  assert.equal(Game.idleTimer, null, 'pause clears the idle timer');
  Game.resume();
  assert.equal(Game.state, 'playing');
  assert.equal(scheduled.length, 1, 'resume re-arms the idle timer');
  Game.state = 'resolving'; Game.outcomeResolved = false;
  Game.ctx.score = 999999;
  Game.afterTurn();
  assert.equal(Game.state, 'won');
  assert.equal(Game.idleTimer, null, 'win path clears the idle timer');
  context.CQUI.anyModalOpen = prevAnyModal;
});

test('debug runner is deterministic and reports attempts/wins/averages per level', () => {
  const D = context.CQDev.debug;
  assert.ok(D, 'CQDev.debug present');
  const a = D.run(1, 10, 'greedy', 0);
  const b = D.run(1, 10, 'greedy', 0);
  assert.deepEqual(a, b, 'identical inputs give identical stats');
  assert.equal(a.attempts, 10);
  assert.ok(a.wins >= 0 && a.wins <= 10);
  assert.equal(typeof a.winRate, 'number');
  assert.equal(D.run(999, 5, 'greedy', 0), null, 'unknown level returns null');
  const row = D.resultText(a);
  assert.ok(row.includes('L1') && row.includes('10 plays') && row.includes(String(a.wins) + ' wins'), 'text row shows level, attempts and wins');
  const res = D.run(21, 3, 'greedy', 0);
  assert.equal(res.attempts, 3);
  assert.ok(res.wins >= 1, 'resonance tutorial level stays winnable');
  assert.equal(D.enabled && typeof D.enabled, 'function', 'flag check is a callable');
});

test('save v2: migrates v1 saves with a backup copy and keeps all progress', () => {
  context.localStorage = { getItem(k){ return storage.has(k) ? storage.get(k) : null; }, setItem(k, v){ storage.set(k, String(v)); }, removeItem(k){ storage.delete(k); } };
  storage.clear();
  const v1 = { v: 1, unlocked: 3, stars: { '1': 2, '2': 3 }, best: { '1': 4200 }, lastLevel: 3, settings: { sfx: false, music: true, motion: false, symbols: false } };
  storage.set('crystal-quest-save-v1', JSON.stringify(v1));
  const d = Save.load();
  assert.equal(d.v, 2, 'migrated to schema v2');
  assert.equal(d.unlocked, 3);
  assert.equal(d.stars[2], 3);
  assert.equal(d.best[1], 4200);
  assert.equal(d.lastLevel, 3);
  assert.equal(d.settings.sfx, false);
  assert.deepEqual(d.world, { forest: { seen: [] } }, 'v1 save gains default world state');
  assert.equal(storage.get('crystal-quest-save-backup'), JSON.stringify(v1), 'backup holds the original v1 raw save');
  assert.equal(JSON.parse(storage.get('crystal-quest-save-v1')).v, 2, 'main key rewritten as v2');
  const again = Save.load();
  assert.equal(again.v, 2, 'second load does not re-migrate');
  assert.equal(again.stars[2], 3);
  assert.equal(storage.get('crystal-quest-save-backup'), JSON.stringify(v1), 'backup untouched on stable loads');
});

test('save v2: corrupted storage falls back safely, corrupt world resets without losing progress', () => {
  storage.clear();
  storage.set('crystal-quest-save-v1', '{not json at all');
  const d = Save.load();
  assert.equal(d.v, 2);
  assert.equal(d.unlocked, 1);
  assert.deepEqual(d.world, { forest: { seen: [] } });
  assert.ok(!storage.has('crystal-quest-save-v1'), 'corrupt main save removed');
  storage.set('crystal-quest-save-v1', JSON.stringify({ v: 2, unlocked: 5, stars: { '3': 1 }, best: {}, lastLevel: 4, settings: {}, world: 'garbage' }));
  const d2 = Save.load();
  assert.equal(d2.v, 2);
  assert.equal(d2.unlocked, 5, 'rest of the save survives a corrupt world field');
  assert.equal(d2.stars[3], 1);
  assert.deepEqual(d2.world, { forest: { seen: [] } });
  storage.set('crystal-quest-save-v1', JSON.stringify({ v: 2, unlocked: 2, world: { forest: { seen: [42, 'spark', null, 'spark'] } } }));
  const d3 = Save.load();
  assert.deepEqual(d3.world.forest.seen, ['spark'], 'seen list sanitized to unique strings');
});

test('save v2: export/import round trip and rejection of invalid codes', () => {
  storage.clear();
  Save.data = Save.defaults();
  Save.data.unlocked = 4;
  Save.data.stars[1] = 2;
  Save.data.stars[2] = 1;
  Save.data.best[1] = 5300;
  Save.data.world.forest.seen = ['spark'];
  const code = Save.exportCode();
  assert.ok(code.startsWith('CQSAVE2-'), 'export code carries the versioned prefix');
  storage.clear();
  Save.load();
  assert.equal(Save.data.unlocked, 1, 'storage wiped -> defaults');
  assert.equal(Save.importCode(code), true, 'import accepts a valid code');
  assert.equal(Save.data.unlocked, 4);
  assert.equal(Save.data.stars[1], 2);
  assert.equal(Save.data.best[1], 5300);
  assert.deepEqual(Save.data.world.forest.seen, ['spark']);
  assert.equal(JSON.parse(storage.get('crystal-quest-save-v1')).unlocked, 4, 'import persists to storage');
  assert.equal(Save.importCode(''), false);
  assert.equal(Save.importCode('CQSAVE2-'), false);
  assert.equal(Save.importCode('CQSAVE2-!!!'), false);
  assert.equal(Save.importCode('CQSAVE2-' + 'A'.repeat(120)), false, 'garbage payload rejected');
  const keep = Save.data;
  Save.data = { v: 1, unlocked: 2 };
  const v1code = Save.exportCode();
  Save.data = keep;
  assert.equal(Save.importCode(v1code), false, 'v1 export code rejected by v2 import');
  assert.equal(Save.data.unlocked, 4, 'rejected import leaves current save untouched');
  const re = Save.load();
  assert.equal(re.unlocked, 4, 'imported progress survives reload');
  assert.deepEqual(re.world.forest.seen, ['spark']);
});

test('world restoration: forest milestones unlock from stars, persist, and are seen exactly once', () => {
  storage.clear();
  Save.data = Save.defaults();
  const W = context.CQWorld;
  assert.ok(W, 'CQWorld exposed');
  assert.equal(W.forestStars(Save.data), 0);
  assert.equal(W.reached(0).length, 0);
  assert.equal(W.maxStars(), 30);
  Save.record(3, 5000, 3);
  const stars = W.forestStars(Save.data);
  assert.equal(stars, 3, 'level 3 (forest range 1-10) counts toward restoration');
  const reached = W.reached(stars);
  assert.equal(reached.length, 1);
  assert.equal(reached[0].id, 'spark');
  assert.equal(Save.data.world.forest.seen.indexOf('spark'), -1, 'new milestone not seen yet');
  assert.equal(Save.markForestSeen(), true, 'viewing marks it seen and persists');
  assert.deepEqual(Save.data.world.forest.seen, ['spark']);
  assert.equal(Save.markForestSeen(), true, 'idempotent: no duplicate entry');
  assert.equal(Save.data.world.forest.seen.length, 1);
  const re = Save.load();
  assert.equal(re.stars[3], 3, 'stars persist');
  assert.deepEqual(re.world.forest.seen, ['spark'], 'seen fragments persist across reload');
  assert.deepEqual(W.newlyReached(0, 8).map(m => m.id), ['spark', 'saplings']);
  assert.deepEqual(W.newlyReached(3, 8).map(m => m.id), ['saplings']);
  assert.deepEqual(W.newlyReached(8, 8), []);
  // a forest win that crosses a milestone announces restoration
  Save.data = Save.defaults();
  storage.clear();
  Save.persist();
  Game.level = LV.get(1); Game.ctx = E.makeCtx(LV.get(1)); Game.ctx.score = 60000;
  Game.state = 'won'; Game.outcomeShown = false; Game.movesLeft = 5;
  Game.renderObjectives = function () {};
  let toasted = '';
  const prevToast = context.CQUI.toast;
  context.CQUI.toast = (m) => { toasted = m; };
  Game.finishWin();
  context.CQUI.toast = prevToast;
  assert.ok(Save.data.stars[1] >= 3, 'high score win recorded 3 stars');
  assert.equal(W.forestStars(Save.data), Save.data.stars[1]);
  assert.ok(toasted.includes('Crystal Forest milestone'), 'milestone toast fired on first win: ' + toasted);
  Game.finishWin();
  assert.ok(Save.data.world.forest.seen.indexOf('spark') === -1, 'seen still pending until the world screen is opened');
});

console.log(`\n${passed.length} regression groups passed.`);
