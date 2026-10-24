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
for (const file of ['js/audio.js', 'js/levels.js', 'js/engine.js', 'js/story.js', 'js/ads.js', 'js/ui.js', 'js/main.js', 'dev/bot.js', 'dev/debug.js']) {
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

test('all 27 level layouts match blocker-objective counts and start playable', () => {
  assert.equal(LV.LEVELS.length, 27);
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
  assert.deepEqual(d.world, { forest: { seen: [] }, relics: [], daily: { date: '', streak: 0, best: 0 }, story: [] }, 'v1 save gains default world state');
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
  assert.deepEqual(d.world, { forest: { seen: [] }, relics: [], daily: { date: '', streak: 0, best: 0 }, story: [] });
  assert.ok(!storage.has('crystal-quest-save-v1'), 'corrupt main save removed');
  storage.set('crystal-quest-save-v1', JSON.stringify({ v: 2, unlocked: 5, stars: { '3': 1 }, best: {}, lastLevel: 4, settings: {}, world: 'garbage' }));
  const d2 = Save.load();
  assert.equal(d2.v, 2);
  assert.equal(d2.unlocked, 5, 'rest of the save survives a corrupt world field');
  assert.equal(d2.stars[3], 1);
  assert.deepEqual(d2.world, { forest: { seen: [] }, relics: [], daily: { date: '', streak: 0, best: 0 }, story: [] });
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

test('guardian shield: sequence advances only on the called colour and hooks into real swaps', () => {
  const glv = LV.get(27);
  assert.ok(glv.guardian && Array.isArray(glv.guardian.sequence) && glv.guardian.sequence.length === 5, 'guardian level defines a 5-colour sequence');
  const ctx = E.makeCtx(glv);
  assert.ok(ctx.guardian && ctx.guardian.idx === 0, 'makeCtx initializes the shield state');
  assert.equal(E.guardianAdvance(ctx, [{ r: 0, c: 0, g: 2, s: null }]), null, 'wrong colour ignored');
  assert.equal(ctx.guardian.idx, 0);
  let prog = E.objectiveProgress(glv, ctx).find(p => p.type === 'guardian');
  assert.ok(prog && prog.done === false && prog.current === 0 && prog.target === 5);
  assert.equal(prog.expected, glv.guardian.sequence[0], 'progress exposes the next called colour');
  const adv = E.guardianAdvance(ctx, [{ r: 0, c: 0, g: 9, s: null }, { r: 0, c: 1, g: glv.guardian.sequence[0], s: null }]);
  assert.ok(adv && adv.hit === true && adv.idx === 1 && adv.expected === glv.guardian.sequence[0] && adv.hp === 4);
  prog = E.objectiveProgress(glv, ctx).find(p => p.type === 'guardian');
  assert.equal(prog.current, 1);
  assert.equal(prog.expected, glv.guardian.sequence[1], 'next called colour updates');
  for (let i = 1; i < 5; i++) E.guardianAdvance(ctx, [{ r: 0, c: 0, g: glv.guardian.sequence[i], s: null }]);
  prog = E.objectiveProgress(glv, ctx).find(p => p.type === 'guardian');
  assert.equal(prog.done, true, 'shield broken when the sequence completes');
  assert.equal(prog.expected, null);
  assert.equal(E.guardianAdvance(ctx, [{ r: 0, c: 0, g: glv.guardian.sequence[0], s: null }]), null, 'no advance after the shield is broken');
  assert.equal(E.objectivesMet(glv, ctx), false, 'score objective still required');
  ctx.score = 99999;
  assert.equal(E.objectivesMet(glv, ctx), true);
  const seq = [4, 2];
  const gtest = { id: 90, name: 'Guardian Test', moves: 20, layout: ['........', '........', '........', '........', '........', '........', '........', '........'], objectives: [{ type: 'guardian' }], stars: [1, 2, 3], guardian: { sequence: seq } };
  function baseGrid() {
    const g = [];
    for (let r = 0; r < 8; r++) { const row = []; for (let c = 0; c < 8; c++) row.push({ k: 'g', g: (r * 3 + c) % 6, s: null }); g.push(row); }
    return g;
  }
  let grid = baseGrid();
  grid[0][0].g = 4; grid[0][1].g = 4; grid[1][2].g = 4;
  let gctx = E.makeCtx(gtest);
  gctx.rng = E.makeRng(42);
  let res = E.trySwap(grid, { r: 0, c: 2 }, { r: 1, c: 2 }, gctx.rng, gctx);
  assert.equal(res.ok, true, 'called-colour swap resolves');
  const gStep = res.steps.find(s => s.t === 'clear' && s.guardian && s.guardian.hit);
  assert.ok(gStep, 'a clear step carries the guardian advance');
  assert.equal(gStep.guardian.expected, 4, 'first segment was colour 4');
  assert.ok(gctx.guardian.idx >= 1, 'shield advanced');
  grid = baseGrid();
  grid[0][0].g = 5; grid[0][1].g = 5;
  gctx = E.makeCtx(gtest);
  gctx.rng = E.makeRng(43);
  res = E.trySwap(grid, { r: 0, c: 2 }, { r: 1, c: 2 }, gctx.rng, gctx);
  assert.equal(res.ok, true, 'wrong-colour swap resolves');
  assert.ok(!res.steps.some(s => s.t === 'clear' && s.guardian && s.guardian.hit), 'no guardian step for the wrong colour');
  assert.equal(gctx.guardian.idx, 0, 'shield untouched by the wrong colour');
});

test('guardian encounter: win and loss resolve exactly once through the game flow', () => {
  const glv = LV.get(27);
  Game.level = glv; Game.ctx = E.makeCtx(glv); Game.ctx.score = 99999;
  glv.guardian.sequence.forEach((col) => E.guardianAdvance(Game.ctx, [{ r: 0, c: 0, g: col, s: null }]));
  Game.grid = E.createBoard(glv, 777).grid; Game.movesLeft = 4;
  Game.state = 'resolving'; Game.outcomeResolved = false; Game.outcomeShown = false;
  Game.afterTurn(); Game.afterTurn();
  assert.equal(Game.state, 'won', 'duplicate afterTurn calls resolve the win once');
  Game.ctx = E.makeCtx(glv); Game.ctx.score = 99999;
  E.guardianAdvance(Game.ctx, [{ r: 0, c: 0, g: glv.guardian.sequence[0], s: null }]);
  Game.grid = E.createBoard(glv, 778).grid; Game.movesLeft = 0;
  Game.state = 'resolving'; Game.outcomeResolved = false; Game.outcomeShown = false;
  Game.afterTurn(); Game.afterTurn();
  assert.equal(Game.state, 'lost', 'guardian failure when the shield is incomplete');
});

test('guardian encounter: solvable and balanced for the seeded bot', () => {
  const bot = context.CQDev.bot;
  const glv = LV.get(27);
  const proof = bot.proveSolvable(glv, 50, 'greedy');
  assert.equal(proof.solvable, true, 'guardian proven solvable (seeded play ' + proof.plays + ')');
  const stats = bot.runStats(glv, 100, 'greedy');
  assert.ok(stats.winRate >= 70, 'greedy bot win-rate on the Guardian: ' + stats.winRate + '%');
  assert.equal(stats.attempts, 100);
});

test('relics: conditions, exact-once claiming, persistence, and win toasts', () => {
  storage.clear();
  Save.data = Save.defaults();
  Save.persist();
  const RL = context.CQRelics;
  assert.ok(RL, 'CQRelics exposed');
  assert.equal(RL.list.length, 6, 'six original relics');
  assert.deepEqual(RL.owned(), []);
  assert.deepEqual(RL.claimNew(), [], 'nothing eligible at zero progress');
  Save.record(1, 5000, 3);
  const fresh = RL.claimNew();
  assert.equal(fresh.length, 1);
  assert.equal(fresh[0].id, 'ember-seed');
  assert.deepEqual(Save.data.world.relics, ['ember-seed']);
  assert.deepEqual(RL.claimNew(), [], 'second claim grants nothing');
  assert.equal(Save.data.world.relics.length, 1, 'no duplicate entry');
  Save.record(2, 5000, 3); Save.record(3, 5000, 3); Save.record(4, 5000, 3); Save.record(5, 5000, 3);
  Save.data.stars[25] = 3; Save.data.stars[26] = 3;
  const eligible = RL.eligible(Save.data).map(r => r.id);
  assert.ok(eligible.indexOf('nova-shard') >= 0, 'five 3-star levels unlock Nova Shard');
  assert.ok(eligible.indexOf('vein-compass') >= 0, '3 stars at levels 21+ unlock Vein Compass');
  assert.ok(eligible.indexOf('guardian-tear') === -1, 'Guardian not yet beaten');
  assert.ok(eligible.indexOf('forest-heart') === -1, 'forest not fully restored');
  Game.level = LV.get(27); Game.ctx = E.makeCtx(LV.get(27)); Game.ctx.score = 99999;
  Game.state = 'won'; Game.outcomeShown = false; Game.movesLeft = 5;
  Game.renderObjectives = function () {};
  let toasted = '';
  const prevToast = context.CQUI.toast;
  context.CQUI.toast = (m) => { toasted = m; };
  Game.finishWin();
  context.CQUI.toast = prevToast;
  assert.ok((Save.data.stars[27] || 0) >= 1, 'guardian win recorded');
  assert.ok(Save.data.world.relics.indexOf('guardian-tear') >= 0, 'guardian tear claimed on first win');
  assert.ok(toasted.includes('Relic recovered'), 'relic toast fired: ' + toasted);
  Game.finishWin();
  assert.equal(Save.data.world.relics.filter(x => x === 'guardian-tear').length, 1, 'granted exactly once');
  const re = Save.load();
  assert.ok(re.world.relics.indexOf('guardian-tear') >= 0, 'relics persist across reload');
  assert.ok(RL.owned().indexOf('ember-seed') >= 0, 'owned set survives reload');
  const raw = JSON.parse(storage.get('crystal-quest-save-v1'));
  delete raw.world.relics;
  storage.set('crystal-quest-save-v1', JSON.stringify(raw));
  const re2 = Save.load();
  assert.deepEqual(re2.world.relics, [], 'missing relics field defaults safely');
  assert.ok(re2.stars[27] >= 1, 'other progress kept');
  const raw3 = JSON.parse(storage.get('crystal-quest-save-v1'));
  raw3.world.relics = 'junk';
  storage.set('crystal-quest-save-v1', JSON.stringify(raw3));
  const re3 = Save.load();
  assert.deepEqual(re3.world.relics, [], 'corrupt relics field resets to empty');
  assert.ok(re3.stars[27] >= 1, 'corrupt relics field does not lose other progress');
  Save.reset();
  assert.deepEqual(Save.data.world.relics, []);
});

test('daily challenge: date-seeded templates, exact-once streak, clock-safe, solvable, b64 padding', () => {
  storage.clear();
  Save.data = Save.defaults();
  Save.persist();
  const DY = context.CQDaily;
  assert.ok(DY, 'CQDaily exposed');
  assert.equal(DY.TEMPLATES.length, 4, 'four rotating templates');
  assert.equal(DY.level('nonsense'), null, 'malformed date rejected');
  assert.deepEqual(DY.level('2026-10-18'), DY.level('2026-10-18'), 'same date gives the same level');
  assert.equal(DY.level('2026-10-18').id, 'daily-2026-10-18');
  function shift(ds, n) { const d = new Date(ds + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  const templateNames = new Set(DY.TEMPLATES.map((t) => t.name));
  for (let i = 0; i < 40; i++) {
    const ds = shift('2026-10-18', i);
    const lv = DY.level(ds);
    assert.ok(lv && templateNames.has(lv.name) && lv.moves >= 15 && lv.objectives.length >= 2 && lv.stars.length === 3, 'daily ' + ds + ' is a valid template level');
  }
  const r1 = DY.claimWin('2026-10-18', 4200);
  assert.ok(r1 && r1.streak === 1 && r1.newBest === true, 'first claim starts a streak');
  assert.equal(DY.claimWin('2026-10-18', 9000), null, 'same date claims exactly once');
  const r2 = DY.claimWin('2026-10-19', 5100);
  assert.ok(r2 && r2.streak === 2 && r2.newBest === true, 'consecutive day extends the streak');
  assert.equal(DY.claimWin('2026-10-17', 9000), null, 'clock-backwards claim ignored');
  assert.equal(Save.data.world.daily.streak, 2, 'backwards clock does not reset the streak');
  const r3 = DY.claimWin('2026-10-23', 1000);
  assert.ok(r3 && r3.streak === 1 && r3.newBest === false, 'missed days reset the streak');
  assert.equal(Save.data.world.daily.best, 5100, 'best score kept across days');
  assert.equal(DY.claimWin('', 100), null, 'empty date rejected');
  const re = Save.load();
  assert.equal(re.world.daily.streak, 1, 'daily state persists across reload');
  assert.equal(re.world.daily.best, 5100, 'daily best persists');
  let raw = JSON.parse(storage.get('crystal-quest-save-v1'));
  raw.world.daily = 'junk';
  storage.set('crystal-quest-save-v1', JSON.stringify(raw));
  assert.deepEqual(Save.load().world.daily, { date: '', streak: 0, best: 0 }, 'corrupt daily field resets safely');
  raw = JSON.parse(storage.get('crystal-quest-save-v1'));
  raw.world.daily = { date: 42, streak: -5, best: 'x' };
  storage.set('crystal-quest-save-v1', JSON.stringify(raw));
  const rej = Save.load().world.daily;
  assert.equal(rej.date, '', 'non-string date rejected');
  assert.equal(rej.streak, 0, 'negative streak rejected');
  assert.equal(rej.best, 0, 'non-numeric best rejected');
  storage.clear();
  Save.data = Save.defaults();
  Save.persist();
  const dlv = DY.level('2026-10-18');
  Game.level = dlv; Game.ctx = E.makeCtx(dlv); Game.ctx.score = 99999;
  Game.state = 'won'; Game.outcomeShown = false; Game.movesLeft = 5;
  Game.renderObjectives = function () {};
  let dailyToasted = '';
  const prevToast = context.CQUI.toast;
  context.CQUI.toast = (m) => { dailyToasted = m; };
  Game.finishWin();
  context.CQUI.toast = prevToast;
  assert.equal(Save.data.world.daily.date, '2026-10-18', 'win claims the daily');
  assert.ok(!Save.data.stars['daily-2026-10-18'], 'daily wins do not write level stars');
  assert.ok(dailyToasted.toLowerCase().includes('daily'), 'daily toast fired: ' + dailyToasted);
  for (const pad of [0, 1, 2]) {
    Save.data = Save.defaults();
    Save.data.best[1] = 12345;
    Save.data.world.daily.date = 'x'.repeat(pad);
    const code = Save.exportCode();
    storage.clear();
    Save.load();
    assert.equal(Save.importCode(code), true, 'import round-trips (pad ' + pad + ')');
    assert.equal(Save.data.best[1], 12345, 'best survives round trip (pad ' + pad + ')');
    assert.equal(Save.data.world.daily.date, 'x'.repeat(pad), 'daily date survives round trip (pad ' + pad + ')');
  }
  const bot = context.CQDev.bot;
  for (let i = 0; i < DY.TEMPLATES.length; i++) {
    const t = DY.TEMPLATES[i];
    const probe = { id: 900 + i, name: t.name, moves: t.moves, layout: t.layout, objectives: t.objectives, stars: t.stars, hint: t.hint };
    assert.equal(bot.proveSolvable(probe, 20, 'greedy').solvable, true, t.name + ' proven solvable');
    const stats = bot.runStats(probe, 30, 'greedy');
    assert.ok(stats.winRate >= 70, t.name + ' greedy win-rate: ' + stats.winRate + '%');
  }
  for (let i = 0; i < 40; i++) {
    const ds = shift('2026-10-18', i);
    const probe = Object.assign({}, DY.level(ds), { id: 900 + i });
    assert.equal(bot.proveSolvable(probe, 50, 'greedy').solvable, true, 'daily ' + ds + ' solvable');
  }
});

test('PWA: manifest, service worker and guarded registration are structurally valid', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
  assert.equal(manifest.name, 'Crystal Quest: Gem Legends');
  assert.equal(manifest.short_name, 'Crystal Quest');
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.theme_color, '#0b0f2a');
  assert.equal(manifest.background_color, '#070a1c');
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 1, 'at least one icon entry');
  assert.ok(manifest.icons.every((i) => i.src === 'icon.svg' && i.type === 'image/svg+xml' && i.sizes === 'any'), 'icons point at the shipped SVG');
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  assert.ok(/^var CACHE = 'cq-v\d+';$/m.test(sw), 'cache name is versioned');
  assert.ok(sw.indexOf('caches.delete') >= 0, 'activate cleans old caches');
  assert.ok(sw.indexOf('clients.claim') >= 0, 'activate claims open clients');
  assert.ok(sw.indexOf("request.method !== 'GET'") >= 0, 'non-GET requests bypass the cache');
  assert.ok(sw.indexOf("e.request.mode === 'navigate'") >= 0, 'navigations fall back to the cached shell');
  assert.ok(sw.indexOf('dev/bot.js') < 0 && sw.indexOf('dev/debug.js') < 0, 'dev tooling is never precached');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.ok(html.indexOf('rel="manifest"') >= 0, 'manifest is linked');
  assert.ok(html.indexOf("'serviceWorker' in navigator") >= 0, 'registration is guarded');
  assert.ok(html.indexOf("location.protocol === 'https:'") >= 0, 'registration only on secure contexts');
  const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
  assert.ok(css.indexOf(':focus-visible') >= 0, 'focus-visible styles shipped');
});

test('accessibility: shipped text colours meet WCAG AA contrast on their backgrounds', () => {
  function lum(hex) {
    const n = hex.replace('#', '');
    const rgb = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
    const lin = rgb.map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  }
  function ratio(fg, bg) { const a = lum(fg), b = lum(bg); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); }
  const pairs = [
    ['#eaf2ff', '#070a1c', 'ink on deep background'],
    ['#a8b6d8', '#070a1c', 'ink-dim on deep background'],
    ['#a8b6d8', '#131a3d', 'ink-dim on panel background'],
    ['#ffc94d', '#070a1c', 'gold on deep background'],
    ['#ff5f6d', '#070a1c', 'danger on deep background'],
    ['#35e0d0', '#070a1c', 'teal on deep background'],
    ['#04202a', '#17a8b4', 'primary button label'],
    ['#c9d9f2', '#131a3d', 'relic text on panel background'],
    ['#93a7c9', '#131a3d', 'unrecovered relic name on panel'],
    ['#8fa3c8', '#131a3d', 'unrecovered relic hint on panel'],
  ];
  const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
  for (const [fg, bg, label] of pairs) {
    assert.ok(css.indexOf(fg) >= 0, fg + ' is shipped in styles.css');
    const r = ratio(fg, bg);
    assert.ok(r >= 4.5, label + ': contrast ' + r.toFixed(2) + ':1');
  }
});

test('ads adapter: rewarded-only, default no-op, reward only on provider confirmation', () => {
  const ads = context.CQAds;
  assert.ok(ads, 'CQAds exposed');
  ads.reset();
  assert.equal(ads.isAvailable(), false, 'no provider: ads unavailable');
  let rewarded = 0;
  assert.equal(ads.showRewarded({ onReward: () => { rewarded += 1; } }), false, 'no provider: showRewarded is a no-op');
  assert.equal(rewarded, 0, 'no reward without a provider');
  storage.clear();
  Save.data = Save.defaults();
  Save.persist();
  const lv = LV.get(1);
  Game.level = lv; Game.ctx = E.makeCtx(lv); Game.ctx.score = 120;
  Game.state = 'lost'; Game.outcomeShown = false; Game.movesLeft = 0;
  Game.renderObjectives = function () {};
  Game.finishLose();
  assert.equal(document.getElementById('btn-ad-revive').hidden, true, 'revive button hidden when ads unavailable');
  assert.equal(Game.adRevive(), false, 'revive refuses when ads unavailable');
  let toasted = '';
  const prevToast = context.CQUI.toast;
  context.CQUI.toast = (m) => { toasted = m; };
  ads.register({ isAvailable: () => true, showRewarded: (onReward) => { onReward(); } });
  assert.equal(ads.isAvailable(), true, 'registered provider available');
  Game.state = 'lost'; Game.outcomeShown = true; Game.movesLeft = 0; Game.adUsed = false;
  assert.equal(Game.adRevive(), true, 'showRewarded engaged the provider');
  assert.equal(Game.movesLeft, 5, 'confirmed reward grants +5 moves');
  assert.equal(Game.state, 'playing', 'revive returns the game to playing');
  assert.ok(toasted.toLowerCase().includes('moves'), 'reward toast fired: ' + toasted);
  assert.equal(Game.adRevive(), false, 'revive is once per attempt');
  ads.register({ isAvailable: () => true, showRewarded: (a, b, onError) => { onError(new Error('no fill')); } });
  Game.state = 'lost'; Game.outcomeShown = true; Game.movesLeft = 0; Game.adUsed = false;
  assert.equal(Game.adRevive(), true, 'provider engaged');
  assert.equal(Game.movesLeft, 0, 'error path grants no moves');
  assert.equal(Game.state, 'lost', 'error path keeps the lose state');
  ads.register({ isAvailable: () => true, showRewarded: () => {} });
  Game.state = 'lost'; Game.outcomeShown = false; Game.movesLeft = 0; Game.adUsed = false;
  Game.finishLose();
  assert.equal(document.getElementById('btn-ad-revive').hidden, false, 'revive button shown when a provider is available');
  context.CQUI.toast = prevToast;
  ads.reset();
  assert.equal(ads.isAvailable(), false, 'reset clears the provider');
});

test('install prompt: hidden until beforeinstallprompt, accept prompts once, appinstalled hides', () => {
  const inst = context.CQInstall;
  assert.ok(inst, 'CQInstall exposed');
  const btn = document.getElementById('btn-install');
  inst.hide();
  assert.equal(inst.promptable(), false, 'no captured event: not promptable');
  assert.equal(btn.hidden, true, 'button hidden with no captured event');
  assert.equal(inst.accept(), false, 'accept without an event does nothing');
  let prevented = 0, prompted = 0;
  inst.offer({ preventDefault() { prevented++; }, prompt() { prompted++; } });
  assert.equal(inst.promptable(), true, 'offer captured the event');
  assert.equal(prevented, 1, 'offer prevents the default mini-infobar');
  assert.equal(btn.hidden, false, 'Install App button revealed');
  assert.equal(inst.accept(), true, 'accept triggers the native prompt');
  assert.equal(prompted, 1, 'native prompt called exactly once');
  assert.equal(inst.promptable(), false, 'the captured event is consumed');
  assert.equal(btn.hidden, true, 'button hidden again after accept');
  assert.equal(inst.accept(), false, 'a second accept does nothing');
  inst.offer({ preventDefault() {}, prompt() {} });
  assert.equal(btn.hidden, false, 'button revealed again after a new offer');
  inst.hide();
  assert.equal(inst.promptable(), false, 'hide discards the captured event');
  assert.equal(btn.hidden, true, 'button hidden after hide');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.ok(html.indexOf('id="btn-install"') >= 0, 'home ships the Install App button');
  const ui = fs.readFileSync(path.join(root, 'js/ui.js'), 'utf8');
  assert.ok(ui.indexOf('beforeinstallprompt') >= 0, 'ui listens for beforeinstallprompt');
  assert.ok(ui.indexOf('appinstalled') >= 0, 'ui listens for appinstalled');
});

test('2D-only direction: no 3D renderer ships anywhere in the game', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const ui = fs.readFileSync(path.join(root, 'js/ui.js'), 'utf8');
  assert.ok(html.indexOf('render3d') < 0, 'index.html loads no 3D renderer');
  assert.ok(html.indexOf('set-3d') < 0, 'settings modal ships no 3D toggle');
  assert.ok(sw.indexOf('render3d') < 0, 'offline cache precaches no 3D renderer');
  assert.ok(ui.indexOf('CQRender3D') < 0, 'ui wires no 3D renderer');
  assert.ok(ui.indexOf('gfx3d') < 0, 'save settings carry no gfx3d flag');
  let r3 = null;
  try { r3 = fs.readFileSync(path.join(root, 'js/render3d.js'), 'utf8'); } catch (e) { /* absent = 2D-only */ }
  assert.ok(r3 === null, 'js/render3d.js is not shipped');
});

test('story: three contiguous regions, cast, palettes and structural markers', () => {
  const S = context.CQStory;
  assert.ok(S && Array.isArray(S.REGIONS) && S.REGIONS.length === 3, 'story module exposes three regions');
  let from = 1;
  S.REGIONS.forEach((reg) => {
    assert.equal(reg.from, from, 'region starts where the previous ended');
    assert.ok(reg.to >= reg.from, 'region end after start');
    from = reg.to + 1;
    assert.ok(reg.theme && typeof reg.theme.plate === 'string' && typeof reg.theme.cellA === 'string' && typeof reg.theme.cellB === 'string', 'region palette complete');
    assert.ok(Array.isArray(reg.beats) && reg.beats.length >= 2, 'region carries story beats');
    reg.beats.forEach((b) => assert.ok(b.id && b.who && b.text, 'beat well formed'));
  });
  assert.equal(from, 28, 'regions cover levels 1 through 27 contiguously');
  assert.ok(S.CHARACTERS.mira && S.CHARACTERS.guardian && S.CHARACTERS.ember && S.CHARACTERS.nix, 'cast defined');
  assert.ok(S.themeFor(LV.get(1)) && S.themeFor(LV.get(11)) && S.themeFor(LV.get(21)), 'region palettes resolve for real levels');
  assert.equal(S.themeFor({ id: 905 }), null, 'daily levels carry no story theme');
  const src = fs.readFileSync(path.join(root, 'js/story.js'), 'utf8');
  assert.ok(src.indexOf('http') < 0, 'story module makes no network references');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.ok(html.indexOf('js/story.js') >= 0, 'index loads the story module');
  assert.ok(html.indexOf('id="modal-story"') >= 0 && html.indexOf('btn-story-next') >= 0, 'story modal shipped');
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  assert.ok(sw.indexOf('js/story.js') >= 0, 'offline cache precaches the story module');
  const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
  assert.ok(css.indexOf('.story-portrait') >= 0 && css.indexOf('.story-text') >= 0, 'story modal styles shipped');
});

test('story flow: pending beats are exact-once and the modal cycles with persistence', () => {
  const S = context.CQStory;
  storage.clear();
  Save.data = Save.defaults();
  Save.persist();
  const lv = LV.get(1);
  const beats = S.pending(lv, Save.data);
  assert.ok(Array.isArray(beats) && beats.length >= 2, 'a fresh save has pending region beats');
  assert.equal(JSON.stringify(S.pending(lv, Save.data)), JSON.stringify(beats), 'pending is stable until marked seen');
  assert.equal(S.pending({ id: 903 }, Save.data).length, 0, 'daily levels have no story beats');
  const SU = context.CQStoryUI;
  assert.ok(SU && typeof SU.show === 'function' && typeof SU.next === 'function', 'ui exports the Story controller');
  const opened = [], closed = [];
  const om = context.CQUI.openModal, cm = context.CQUI.closeModal;
  context.CQUI.openModal = (id) => opened.push(id);
  context.CQUI.closeModal = (id) => closed.push(id);
  let done = 0;
  SU.show(beats, () => done++);
  for (let i = 1; i < beats.length; i++) SU.next();
  assert.equal(opened.length, beats.length, 'every beat opens the story modal');
  assert.equal(done, 0, 'done not fired while beats remain');
  SU.next();
  assert.equal(done, 1, 'emptying the queue fires done exactly once');
  assert.equal(closed.length, 1, 'story modal closed once at the end');
  context.CQUI.openModal = om; context.CQUI.closeModal = cm;
  assert.equal(S.pending(lv, Save.data).length, 0, 'shown beats never pend again');
  const reloaded = Save.load();
  assert.deepEqual(reloaded.world.story.slice().sort(), beats.map((b) => b.id).sort(), 'seen beats persist through reload');
  storage.set('crystal-quest-save-v1', JSON.stringify({ v: 2, unlocked: 3, stars: {}, best: {}, lastLevel: 1, settings: {}, world: { relics: ['a'], daily: { date: '', streak: 0, best: 0 }, story: [42, 'x', null, 'x'] } }));
  const junk = Save.load();
  assert.deepEqual(junk.world.story, ['x'], 'story seen list sanitized to unique strings');
  const code = Save.exportCode();
  assert.ok(Save.importCode(code), 'export/import round trip works');
  assert.deepEqual(Save.data.world.story, ['x'], 'import keeps the story seen list');
});

test('guardian two: level 20 is a valid, balanced Ember Warden encounter', () => {
  const glv = LV.get(20);
  assert.equal(glv.name, 'Ember Warden', 'level 20 redesigned as the second Guardian');
  assert.ok(glv.guardian && Array.isArray(glv.guardian.sequence) && glv.guardian.sequence.length === 5, 'level 20 defines a 5-colour warden sequence');
  const ctx = E.makeCtx(glv);
  assert.equal(ctx.guardian.idx, 0, 'makeCtx initializes the warden shield');
  const adv = E.guardianAdvance(ctx, [{ r: 0, c: 0, g: glv.guardian.sequence[0], s: null }]);
  assert.ok(adv && adv.hit === true && adv.idx === 1, 'called colour advances the warden shield');
  let wrong = 0; while (wrong === glv.guardian.sequence[1]) wrong++;
  assert.equal(E.guardianAdvance(ctx, [{ r: 0, c: 0, g: wrong, s: null }]), null, 'wrong colour ignored');
  const bot = context.CQDev.bot;
  const proof = bot.proveSolvable(glv, 50, 'greedy');
  assert.equal(proof.solvable, true, 'warden level proven solvable (seeded play ' + proof.plays + ')');
  const stats = bot.runStats(glv, 100, 'greedy');
  assert.equal(stats.attempts, 100);
  assert.ok(stats.winRate >= 70, 'greedy bot win-rate on the Warden: ' + stats.winRate + '%');
});

test('2D polish: easing, palettes and renderer API surface are shipped', () => {
  const src = fs.readFileSync(path.join(root, 'js/render.js'), 'utf8');
  assert.ok(src.indexOf('function easeOutBack(') >= 0, 'fall overshoot easing shipped');
  assert.ok(src.indexOf('Math.sin(p*Math.PI)') >= 0, 'swap arcs lift mid-flight');
  assert.ok(src.indexOf('TH.cellA') >= 0 && src.indexOf('TH.cellB') >= 0, 'themed cell colours shipped');
  assert.ok(src.indexOf('d.flash') >= 0, 'clear flash shipped');
  assert.ok(src.indexOf('Math.sin(this._time*6)') >= 0, 'selection ring pulses');
  assert.ok(src.indexOf('R.playSteps=') >= 0 && src.indexOf('R.syncFromGrid=') >= 0 && src.indexOf('R.isBusy=') >= 0 && src.indexOf('R.cellAt=') >= 0, 'renderer API surface unchanged');
  assert.ok(src.indexOf('http') < 0, 'renderer makes no network references');
  const ui = fs.readFileSync(path.join(root, 'js/ui.js'), 'utf8');
  assert.ok(ui.indexOf('R.theme=global.CQStory?CQStory.themeFor(lv):null') >= 0, 'ui applies the region palette');
});

test('PWA: update activation is controlled - installs wait for the page, controllerchange reloads', () => {
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  assert.ok(sw.indexOf("var CACHE = 'cq-v14';") >= 0, 'cache version bumped for this update');
  assert.equal(sw.split('self.skipWaiting()').length - 1, 1, 'skipWaiting lives only in the SKIP_WAITING message handler');
  assert.ok(sw.indexOf("e.data.type === 'SKIP_WAITING'") >= 0, 'a waiting worker installs only when the page asks');
  assert.ok(sw.indexOf('clients.claim') >= 0, 'activation still claims open clients');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.ok(html.indexOf('updatefound') >= 0, 'page watches for a new worker');
  assert.ok(html.indexOf("postMessage({ type: 'SKIP_WAITING' })") >= 0, 'page asks the waiting worker to install');
  assert.ok(html.indexOf('controllerchange') >= 0, 'page reloads when the new worker takes over');
  assert.ok(html.indexOf('cqReloading') >= 0, 'reload guard prevents update loops');
  assert.ok(html.indexOf('Progress is stored only in this browser') >= 0, 'privacy note shipped');
  assert.ok(html.indexOf('Ads are off by default') >= 0, 'ads stance documented for players');
});

test('UI polish: home progress, map regions, objective meters and combo feedback are shipped', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
  const ui = fs.readFileSync(path.join(root, 'js/ui.js'), 'utf8');
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  assert.ok(html.indexOf('id="home-progress"') >= 0 && html.indexOf('id="home-level"') >= 0 && html.indexOf('id="home-stars"') >= 0, 'home ships the real progress chip');
  assert.ok(html.indexOf('btn-play') >= 0 && html.indexOf('home-grid') >= 0, 'home hierarchy shipped');
  assert.ok(html.indexOf('id="win-newbest"') >= 0, 'win modal ships the new-best badge');
  assert.ok((html.match(/id="btn-pause"/g) || []).length === 1, 'pause button appears exactly once');
  assert.ok(css.indexOf('.region-head') >= 0 && css.indexOf('.home-progress') >= 0 && css.indexOf('.obj-meter') >= 0 && css.indexOf('.btn-play') >= 0, 'polish styles shipped');
  assert.ok(ui.indexOf('updateHome') >= 0 && ui.indexOf('region-head') >= 0 && ui.indexOf('comboBanner') >= 0, 'ui wires home progress, region headers and combo feedback');
  assert.ok(ui.indexOf('var nb=$("win-newbest")') >= 0, 'win flow toggles the new-best badge');
  assert.ok(sw.indexOf("var CACHE = 'cq-v14';") >= 0, 'cache bumped for the polish pass');
});

console.log(`\n${passed.length} regression groups passed.`);
