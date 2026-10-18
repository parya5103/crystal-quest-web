/* Crystal Quest playtest bot (dev only, not loaded by index.html).
   Deterministic seeded bot used to measure level win-rates and prove solvability.
   Policy: "greedy" — cheap deterministic 1-ply heuristic over every legal swap
   (estimated clear value + objective-progress improvement + forged-special bonus),
   with 20% seeded exploration; "random" — uniform legal move.
   All randomness comes from seeded CQEngine.makeRng — no Math.random.
   Mirrors Game semantics: a win is checked before the move counter runs out;
   free deterministic auto-shuffle when no moves remain (never consumes a move). */
(function (global) {
  "use strict";
  var E = global.CQEngine;
  if (!E) throw new Error("CQDev.bot requires CQEngine");
  var ROWS = E.ROWS, COLS = E.COLS;

  /* All adjacent gem pairs in scan order (deterministic). */
  function enumerate(grid) {
    var pairs = [], r, c;
    for (r = 0; r < ROWS; r++) for (c = 0; c < COLS - 1; c++)
      pairs.push({ a: { r: r, c: c }, b: { r: r, c: c + 1 } });
    for (c = 0; c < COLS; c++) for (r = 0; r < ROWS - 1; r++)
      pairs.push({ a: { r: r, c: c }, b: { r: r + 1, c: c } });
    return pairs;
  }

  /* Normalized remaining objective gap (0 = all met). */
  function objectiveGap(level, ctx) {
    var g = 0, p = E.objectiveProgress(level, ctx), i;
    for (i = 0; i < p.length; i++)
      g += Math.max(0, (p[i].target - p[i].current) / Math.max(1, p[i].target));
    return g;
  }

  /* Estimated normalized objective-progress improvement for a 1-ply clear,
     computed without cloning the ctx. */
  function estimateProgress(level, ctx, cleared, blockerHits, gain) {
    var delta = 0, objs = level.objectives, o, i, j, cur, inc, hitCount;
    for (i = 0; i < objs.length; i++) {
      o = objs[i];
      if (o.type === "score") {
        cur = Math.min(ctx.score, o.target);
        delta += (Math.min(ctx.score + gain, o.target) - cur) / o.target;
      } else if (o.type === "collect") {
        cur = Math.min(ctx.collected[o.gem] || 0, o.count);
        inc = 0;
        for (j = 0; j < cleared.length; j++) if (cleared[j].g === o.gem) inc++;
        delta += (Math.min(cur + inc, o.count) - cur) / o.count;
      } else if (o.type === "clear") {
        cur = Math.min(ctx.blockersCleared[o.blocker] || 0, o.count);
        hitCount = 0;
        for (j = 0; j < blockerHits.length; j++) hitCount++;
        delta += (Math.min(cur + hitCount, o.count) - cur) / o.count;
      } else if (o.type === "guardian") {
        if (ctx.guardian && ctx.guardian.idx < ctx.guardian.sequence.length) {
          var want = ctx.guardian.sequence[ctx.guardian.idx], gHit = 0;
          for (j = 0; j < cleared.length; j++) if (cleared[j].g === want) gHit++;
          delta += gHit ? 1 / ctx.guardian.sequence.length : 0;
        }
      }
    }
    return delta;
  }

  /* One pass: enumerate pairs, apply swap on the live grid, measure, revert.
     findMatches/expandClears do not mutate, so this is safe.
     Returns {a,b} of the chosen legal move, or null if none. */
  function chooseMove(level, grid, ctx, botRng, policy) {
    var pairs = enumerate(grid), legal = [], bestVal = -Infinity, best = null;
    var i, k, pair, ca, cb, bothSpecial, prismPlain, t, groups, value, seeds, exp, forged, vein;
    for (i = 0; i < pairs.length; i++) {
      pair = pairs[i];
      ca = grid[pair.a.r][pair.a.c];
      cb = grid[pair.b.r][pair.b.c];
      if (!E.isGem(ca) || !E.isGem(cb)) continue;
      bothSpecial = !!(ca.s && cb.s);
      prismPlain = (ca.s === "prism" && !cb.s) || (cb.s === "prism" && !ca.s);
      t = grid[pair.a.r][pair.a.c];
      grid[pair.a.r][pair.a.c] = grid[pair.b.r][pair.b.c];
      grid[pair.b.r][pair.b.c] = t;
      groups = E.findMatches(grid);
      if (groups.length) {
        legal.push(pair);
        seeds = [];
        for (k = 0; k < groups.length; k++)
          for (var p = 0; p < groups[k].cells.length; p++) seeds.push(groups[k].cells[p]);
        exp = E.expandClears(grid, seeds, ctx.prismColor);
        forged = 0;
        for (k = 0; k < groups.length; k++)
          forged += groups[k].len >= 5 ? 500 : groups[k].len === 4 ? 200 : 0;
        vein = 0;
        if (ctx.tiles) {
          for (k = 0; k < seeds.length; k++)
            if (ctx.tiles[seeds[k].r] && ctx.tiles[seeds[k].r][seeds[k].c] === "v") { vein = 150; break; }
        }
        value = exp.cleared.length * 60 + exp.blockers.length * 100 + forged + vein
          + 3000 * estimateProgress(level, ctx, exp.cleared, exp.blockers, exp.cleared.length * 60);
        if (value > bestVal) { bestVal = value; best = pair; }
      } else if (bothSpecial || prismPlain) {
        legal.push(pair);
        if (1500 > bestVal) { bestVal = 1500; best = pair; }
      }
      t = grid[pair.a.r][pair.a.c];
      grid[pair.a.r][pair.a.c] = grid[pair.b.r][pair.b.c];
      grid[pair.b.r][pair.b.c] = t;
    }
    if (!legal.length) return null;
    if (policy === "random") return legal[Math.floor(botRng() * legal.length)];
    if (botRng() < 0.2) return legal[Math.floor(botRng() * legal.length)];
    return best;
  }

  function playLevel(level, seed, policy) {
    var board = E.createBoard(level, (seed >>> 0) || 1);
    var grid = board.grid, rng = board.rng, ctx = E.makeCtx(level);
    ctx.rng = rng;
    var botRng = E.makeRng(((seed ^ 0x51ed270b) >>> 0) || 1);
    var movesLeft = level.moves, movesUsed = 0, shuffles = 0, pick, res;
    policy = policy || "greedy";
    while (movesLeft > 0) {
      if (E.objectivesMet(level, ctx)) return { won: true, movesUsed: movesUsed, score: ctx.score, shuffles: shuffles };
      pick = chooseMove(level, grid, ctx, botRng, policy);
      if (!pick) {
        if (!E.shuffleBoard(grid, rng)) return { won: false, movesUsed: movesUsed, score: ctx.score, shuffles: shuffles, reason: "dead-board" };
        shuffles++;
        pick = chooseMove(level, grid, ctx, botRng, policy);
        if (!pick) return { won: false, movesUsed: movesUsed, score: ctx.score, shuffles: shuffles, reason: "dead-board" };
      }
      res = E.trySwap(grid, pick.a, pick.b, rng, ctx);
      if (!res.ok) return { won: false, movesUsed: movesUsed, score: ctx.score, shuffles: shuffles, reason: "illegal-move" };
      movesLeft--; movesUsed++;
      if (movesLeft > 0 && !E.hasValidMove(grid)) {
        if (!E.shuffleBoard(grid, rng)) return { won: false, movesUsed: movesUsed, score: ctx.score, shuffles: shuffles, reason: "dead-board" };
        shuffles++;
      }
    }
    return { won: E.objectivesMet(level, ctx), movesUsed: movesUsed, score: ctx.score, shuffles: shuffles };
  }

  function levelSeed(levelId, playIndex) { return ((levelId * 100003 + playIndex * 7) >>> 0) || 1; }

  function runStats(level, plays, policy, seedBase) {
    plays = plays || 200;
    var wins = 0, movesSum = 0, scoreSum = 0, shuffles = 0, fails = {}, i, r;
    for (i = 0; i < plays; i++) {
      r = playLevel(level, (seedBase || 0) + levelSeed(level.id, i), policy);
      if (r.won) { wins++; movesSum += r.movesUsed; scoreSum += r.score; }
      else { fails[r.reason || "out-of-moves"] = (fails[r.reason || "out-of-moves"] || 0) + 1; }
      shuffles += r.shuffles || 0;
    }
    return {
      level: level.id, name: level.name, attempts: plays, wins: wins,
      winRate: Math.round(wins * 1000 / plays) / 10,
      avgMoves: wins ? Math.round(movesSum * 10 / wins) / 10 : null,
      avgScore: wins ? Math.round(scoreSum * 10 / wins) / 10 : null,
      shuffles: shuffles, fails: fails
    };
  }

  function proveSolvable(level, maxPlays, policy) {
    maxPlays = maxPlays || 200;
    for (var i = 0; i < maxPlays; i++) {
      if (playLevel(level, levelSeed(level.id, i), policy).won) return { solvable: true, plays: i + 1 };
    }
    return { solvable: false, plays: maxPlays };
  }

  global.CQDev = global.CQDev || {};
  global.CQDev.bot = {
    playLevel: playLevel,
    runStats: runStats,
    proveSolvable: proveSolvable,
    levelSeed: levelSeed,
    enumerate: enumerate,
    chooseMove: chooseMove,
    objectiveGap: objectiveGap
  };
})(typeof window !== "undefined" ? window : globalThis);
