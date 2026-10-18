/* Crystal Quest local debug panel (dev only — loaded ONLY when the page URL
   contains ?debug=1; index.html adds the script tags conditionally).
   Shows seeded-bot playtest stats per level: attempts, wins, win rate,
   average moves on wins, average score on wins, shuffle count.
   100% local: no network requests, no tracking, no storage writes. */
(function (global) {
  "use strict";
  var LV = global.CQLevels;
  var DEV = global.CQDev || (global.CQDev = {});

  function enabled() {
    try { return !!(global.location && /[?&]debug=1\b/.test(global.location.search)); }
    catch (err) { return false; }
  }

  /* Run the seeded bot on one level. Pure, deterministic, headless-testable. */
  function run(levelId, plays, policy, seedBase) {
    var bot = DEV.bot;
    if (!bot || !LV) return null;
    var lv = LV.get(levelId);
    if (!lv) return null;
    plays = Math.floor(plays) || 20;
    if (plays < 1) plays = 1;
    if (plays > 1000) plays = 1000;
    return bot.runStats(lv, plays, policy || "greedy", seedBase || 0);
  }

  function resultText(s) {
    if (!s) return "";
    var mv = s.avgMoves == null ? "-" : s.avgMoves;
    var sc = s.avgScore == null ? "-" : s.avgScore;
    return "L" + s.level + " " + s.name + ": " + s.attempts + " plays | " +
      s.wins + " wins (" + s.winRate + "%) | avg moves " + mv +
      " | avg score " + sc + " | shuffles " + s.shuffles;
  }

  /* Sweep all levels, yielding to the UI between levels (browser only). */
  function runAll(plays, policy, seedBase, onRow, onDone) {
    if (!LV || !DEV.bot) { onDone && onDone([]); return; }
    var ids = LV.LEVELS.map(function (l) { return l.id; });
    var rows = [], i = 0;
    function step() {
      if (i >= ids.length) { onDone && onDone(rows); return; }
      var s = run(ids[i], plays, policy, seedBase);
      if (s) { rows.push(s); onRow && onRow(s); }
      i += 1;
      global.setTimeout(step, 0);
    }
    step();
  }

  /* ---- Panel UI (browser only; never created unless ?debug=1) ---- */
  function init() {
    if (!enabled() || !global.document || !global.document.body) return;
    var doc = global.document;
    if (doc.getElementById("cq-debug-panel")) return;

    var panel = doc.createElement("div");
    panel.id = "cq-debug-panel";
    panel.setAttribute("aria-label", "Local debug panel (dev only)");
    panel.setAttribute("style",
      "position:fixed;left:8px;bottom:8px;z-index:99999;background:rgba(11,15,42,0.95);" +
      "color:#dfe6ff;font:11px/1.5 monospace;padding:8px 10px;border-radius:8px;" +
      "max-width:92vw;max-height:48vh;overflow:auto;box-shadow:0 4px 16px rgba(0,0,0,0.4)");

    var title = doc.createElement("div");
    title.textContent = "CQ DEBUG — local bot stats (no network)";
    title.setAttribute("style", "font-weight:bold;margin-bottom:6px;color:#5ff0ff");
    panel.appendChild(title);

    var bar = doc.createElement("div");
    bar.setAttribute("style", "display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:6px");

    function styleInput(e) {
      e.setAttribute("style", "background:#1a2140;color:#dfe6ff;border:1px solid #3a4470;border-radius:4px;padding:2px 4px");
      return e;
    }
    function wrap(text, el) {
      var lab = doc.createElement("label");
      lab.textContent = text;
      lab.setAttribute("style", "display:flex;gap:3px;align-items:center");
      lab.appendChild(el);
      return lab;
    }

    var levelSel = doc.createElement("select");
    styleInput(levelSel);
    LV.LEVELS.forEach(function (l) {
      var o = doc.createElement("option");
      o.value = String(l.id);
      o.textContent = "L" + l.id;
      levelSel.appendChild(o);
    });
    bar.appendChild(wrap("Level", levelSel));

    var playsIn = doc.createElement("input");
    playsIn.type = "number"; playsIn.value = "20"; playsIn.min = "1"; playsIn.max = "1000";
    styleInput(playsIn);
    bar.appendChild(wrap("Plays", playsIn));

    var polSel = doc.createElement("select");
    styleInput(polSel);
    ["greedy", "random"].forEach(function (p) {
      var o = doc.createElement("option");
      o.value = p; o.textContent = p;
      polSel.appendChild(o);
    });
    bar.appendChild(wrap("Bot", polSel));

    var seedIn = doc.createElement("input");
    seedIn.type = "number"; seedIn.value = "0"; seedIn.min = "0";
    styleInput(seedIn);
    bar.appendChild(wrap("Seed", seedIn));

    var runBtn = doc.createElement("button");
    runBtn.type = "button"; runBtn.textContent = "Run level";
    var allBtn = doc.createElement("button");
    allBtn.type = "button"; allBtn.textContent = "Run all (10 plays)";
    var hideBtn = doc.createElement("button");
    hideBtn.type = "button"; hideBtn.textContent = "\u00d7";
    [runBtn, allBtn, hideBtn].forEach(function (b) {
      b.setAttribute("style", "background:#2b3a6e;color:#dfe6ff;border:1px solid #4a5a9e;border-radius:4px;padding:3px 8px;cursor:pointer");
    });
    bar.appendChild(runBtn); bar.appendChild(allBtn); bar.appendChild(hideBtn);
    panel.appendChild(bar);

    var out = doc.createElement("pre");
    out.setAttribute("style", "margin:0;white-space:pre-wrap");
    out.textContent = "Idle. Pick a level and press Run level.\nSeeded bot; identical inputs always give identical results.";
    panel.appendChild(out);

    function readPlays() {
      var n = parseInt(playsIn.value, 10);
      if (!isFinite(n) || n < 1) n = 20;
      return Math.min(1000, Math.floor(n));
    }
    function readSeed() {
      var n = parseInt(seedIn.value, 10);
      return isFinite(n) && n > 0 ? Math.floor(n) : 0;
    }

    runBtn.addEventListener("click", function () {
      runBtn.disabled = true;
      out.textContent = "Running " + readPlays() + " plays on L" + levelSel.value + "…";
      /* defer so the "running" message paints before the synchronous bot run */
      global.setTimeout(function () {
        var s = run(parseInt(levelSel.value, 10), readPlays(), polSel.value, readSeed());
        out.textContent = (s ? resultText(s) : "Level not found") + "\n";
        runBtn.disabled = false;
      }, 30);
    });

    allBtn.addEventListener("click", function () {
      allBtn.disabled = true; runBtn.disabled = true;
      out.textContent = "Sweeping all levels (10 plays each)…\n";
      runAll(10, polSel.value, readSeed(), function (s) {
        out.textContent += resultText(s) + "\n";
      }, function () {
        out.textContent += "Done.\n";
        allBtn.disabled = false; runBtn.disabled = false;
      });
    });

    hideBtn.addEventListener("click", function () {
      panel.parentNode && panel.parentNode.removeChild(panel);
    });

    doc.body.appendChild(panel);
  }

  DEV.debug = { run: run, runAll: runAll, resultText: resultText, init: init, enabled: enabled };
})(typeof window !== "undefined" ? window : globalThis);
