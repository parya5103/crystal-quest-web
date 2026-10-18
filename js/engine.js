(function(global){"use strict";var ROWS=8,COLS=8,GEM_COUNT=6;function key(r,c){return r*COLS+c}function inB(r,c){return r>=0&&r<ROWS&&c>=0&&c<COLS}function cloneCell(cell){if(cell==null)return null;var o={k:cell.k};return cell.g!==void 0&&(o.g=cell.g),cell.s&&(o.s=cell.s),cell.b&&(o.b=cell.b),cell.hp!==void 0&&(o.hp=cell.hp),o}function cloneGrid(g){for(var out=[],r=0;r<ROWS;r++){for(var row=[],c=0;c<COLS;c++)row.push(cloneCell(g[r][c]));out.push(row)}return out}function isGem(cell){return!!cell&&cell.k==="g"}function isBlocker(cell){return!!cell&&cell.k==="b"}function makeRng(seed){var a=seed>>>0||1;return function(){a|=0,a=a+1831565813|0;var t=Math.imul(a^a>>>15,1|a);return t=t+Math.imul(t^t>>>7,61|t)^t,((t^t>>>14)>>>0)/4294967296}}function parseLayout(layout){for(var grid=[],r=0;r<ROWS;r++){for(var row=[],line=layout&&layout[r]||"........",c=0;c<COLS;c++){var ch=line.charAt(c)||".";ch==="#"?row.push(null):ch==="S"?row.push({k:"b",b:"stone",hp:1}):ch==="I"?row.push({k:"b",b:"ice",hp:2}):row.push({k:"e"})}grid.push(row)}return grid}function fillNoMatch(grid,rng){for(var r=0;r<ROWS;r++)for(var c=0;c<COLS;c++){var cell=grid[r][c];if(!(!cell||cell.k!=="e")){var banned={};c>=2&&isGem(grid[r][c-1])&&isGem(grid[r][c-2])&&grid[r][c-1].g===grid[r][c-2].g&&(banned[grid[r][c-1].g]=1),r>=2&&isGem(grid[r-1][c])&&isGem(grid[r-2][c])&&grid[r-1][c].g===grid[r-2][c].g&&(banned[grid[r-1][c].g]=1);for(var pick=-1,tries=0;tries++<40;){var cand=Math.floor(rng()*GEM_COUNT);if(!banned[cand]){pick=cand;break}}if(pick<0){for(var g=0;g<GEM_COUNT;g++)if(!banned[g]){pick=g;break}}pick<0&&(pick=0),grid[r][c]={k:"g",g:pick,s:null}}}}function createBoard(level,seed){var rng=makeRng(seed||Date.now()&2147483647),grid,guard=0;do grid=parseLayout(level.layout),fillNoMatch(grid,rng),guard++;while(!hasValidMove(grid)&&guard<30);return hasValidMove(grid)||shuffleBoard(grid,rng),{grid,rng}}function findMatches(grid){var groups=[],r,c,run,g;for(r=0;r<ROWS;r++)for(run=1,c=1;c<=COLS;c++){var cur=c<COLS?grid[r][c]:null,prev=grid[r][c-1],same=c<COLS&&isGem(cur)&&isGem(prev)&&cur.g===prev.g;if(same)run++;else{if(run>=3&&isGem(prev)){for(var cells=[],k=c-run;k<c;k++)cells.push({r,c:k});groups.push({cells,dir:"h",len:run,gem:prev.g})}run=1}}for(c=0;c<COLS;c++)for(run=1,r=1;r<=ROWS;r++){var cur2=r<ROWS?grid[r][c]:null,prev2=grid[r-1][c],same2=r<ROWS&&isGem(cur2)&&isGem(prev2)&&cur2.g===prev2.g;if(same2)run++;else{if(run>=3&&isGem(prev2)){for(var cells2=[],k2=r-run;k2<r;k2++)cells2.push({r:k2,c});groups.push({cells:cells2,dir:"v",len:run,gem:prev2.g})}run=1}}return groups}function planSpecials(groups,preferred){var byCell={};groups.forEach(function(grp){grp.cells.forEach(function(p){var k=key(p.r,p.c);byCell[k]||(byCell[k]={r:p.r,c:p.c,h:null,v:null}),grp.dir==="h"?byCell[k].h=grp:byCell[k].v=grp})});var plans=[],used={};return Object.keys(byCell).forEach(function(k){var e=byCell[k];e.h&&e.v&&e.h.len>=3&&e.v.len>=3&&!used[k]&&(used[k]=1,plans.push({r:e.r,c:e.c,special:"bomb",gem:e.h.gem,priority:3}))}),groups.forEach(function(grp){if(!(grp.len<5)){var target=pickTarget(grp,preferred,used);target&&(used[key(target.r,target.c)]=1,plans.push({r:target.r,c:target.c,special:"prism",gem:grp.gem,priority:4}))}}),groups.forEach(function(grp){if(grp.len===4){var target=pickTarget(grp,preferred,used);target&&(used[key(target.r,target.c)]=1,plans.push({r:target.r,c:target.c,special:grp.dir==="h"?"line-h":"line-v",gem:grp.gem,priority:2}))}}),plans}function pickTarget(grp,preferred,used){if(preferred)for(var i=0;i<grp.cells.length;i++){var p=grp.cells[i];if(p.r===preferred.r&&p.c===preferred.c&&!used[key(p.r,p.c)])return p}var mid=grp.cells[Math.floor(grp.cells.length/2)];if(!used[key(mid.r,mid.c)])return mid;for(var j=0;j<grp.cells.length;j++)if(!used[key(grp.cells[j].r,grp.cells[j].c)])return grp.cells[j];return null}function specialTargets(grid,r,c,special,prismColor){var out=[],i;if(special==="line-h")for(i=0;i<COLS;i++)out.push({r,c:i});else if(special==="line-v")for(i=0;i<ROWS;i++)out.push({r:i,c});else if(special==="bomb")for(var dr=-1;dr<=1;dr++)for(var dc=-1;dc<=1;dc++)inB(r+dr,c+dc)&&out.push({r:r+dr,c:c+dc});else if(special==="prism"){var color=prismColor;color==null&&(color=mostCommonGem(grid));for(var rr=0;rr<ROWS;rr++)for(var cc=0;cc<COLS;cc++){var cell=grid[rr][cc];isGem(cell)&&cell.g===color&&out.push({r:rr,c:cc})}}return out}function mostCommonGem(grid){for(var counts=[0,0,0,0,0,0],r=0;r<ROWS;r++)for(var c=0;c<COLS;c++){var cell=grid[r][c];isGem(cell)&&counts[cell.g]++}for(var best=0,i=1;i<GEM_COUNT;i++)counts[i]>counts[best]&&(best=i);return best}function expandClears(grid,seeds,prismColor){for(var seen={},cleared=[],blockers=[],activated=[],queue=seeds.slice();queue.length;){var p=queue.shift();if(inB(p.r,p.c)){var k=key(p.r,p.c);if(!seen[k]){seen[k]=1;var cell=grid[p.r][p.c];if(cell){if(cell.k==="b"){blockers.push({r:p.r,c:p.c});continue}if(cell.k==="g"&&(cleared.push({r:p.r,c:p.c,g:cell.g,s:cell.s||null}),cell.s)){activated.push({r:p.r,c:p.c,s:cell.s});for(var extra=specialTargets(grid,p.r,p.c,cell.s,prismColor),i=0;i<extra.length;i++)queue.push(extra[i])}}}}}return{cleared,blockers,activated}}function applyGravity(grid,rng){for(var moves=[],spawns=[],c=0;c<COLS;c++)for(var r=ROWS-1;r>=0;){var cell=grid[r][c];if(cell===null||isBlocker(cell)){r--;continue}for(var end=r,start=r;start-1>=0;){var up=grid[start-1][c];if(up===null||isBlocker(up))break;start--}compactSegment(grid,c,start,end,moves,spawns,rng),r=start-1}return{moves,spawns}}function compactSegment(grid,c,start,end,moves,spawns,rng){for(var gems=[],r=start;r<=end;r++){var cell=grid[r][c];isGem(cell)&&gems.push({cell,from:r})}for(var write=end,i=gems.length-1;i>=0;i--){var gm=gems[i];gm.from!==write&&moves.push({c,from:gm.from,to:write,cell:gm.cell}),grid[write][c]=gm.cell,write--}for(var r2=write;r2>=start;r2--){var ng={k:"g",g:Math.floor(rng()*GEM_COUNT),s:null};grid[r2][c]=ng,spawns.push({r:r2,c,cell:ng})}}function swapCells(grid,a,b){var t=grid[a.r][a.c];grid[a.r][a.c]=grid[b.r][b.c],grid[b.r][b.c]=t}function areAdjacent(a,b){return Math.abs(a.r-b.r)+Math.abs(a.c-b.c)===1}function supportedSpecial(s) {
  return s === "prism" || s === "bomb" || s === "line-h" || s === "line-v";
}
function canSwap(grid, a, b) {
  if (!inB(a.r, a.c) || !inB(b.r, b.c) || !areAdjacent(a, b)) return false;
  var ca = grid[a.r][a.c], cb = grid[b.r][b.c];
  if (!isGem(ca) || !isGem(cb)) return false;
  if ((ca.s === "prism" && !cb.s) || (cb.s === "prism" && !ca.s)) return true;
  if (ca.s && cb.s && supportedSpecial(ca.s) && supportedSpecial(cb.s)) return true;
  swapCells(grid, a, b);
  var ok = findMatches(grid).length > 0;
  swapCells(grid, a, b);
  return ok;
}function findHint(grid,rng){for(var dirs=[{dr:0,dc:1},{dr:1,dc:0}],found=[],r=0;r<ROWS;r++)for(var c=0;c<COLS;c++)for(var d=0;d<dirs.length;d++){var b={r:r+dirs[d].dr,c:c+dirs[d].dc};inB(b.r,b.c)&&canSwap(grid,{r,c},b)&&found.push({a:{r,c},b})}return found.length?(rng?found[Math.floor(rng()*found.length)]:found[0]):null}function hasValidMove(grid){for(var r=0;r<ROWS;r++)for(var c=0;c<COLS;c++)if(c+1<COLS&&canSwap(grid,{r,c},{r,c:c+1})||r+1<ROWS&&canSwap(grid,{r,c},{r:r+1,c}))return!0;return!1}function plantMove(grid, rng) {
  for (var r = 0; r < ROWS; r++) {
    for (var c = 0; c < COLS - 2; c++) {
      for (var side = 0; side < 2; side++) {
        var nr = r + (side === 0 ? -1 : 1);
        if (nr < 0 || nr >= ROWS) continue;
        var a = grid[r][c], b = grid[r][c + 1], d = grid[r][c + 2], n = grid[nr][c + 1];
        if (!isGem(a) || !isGem(b) || !isGem(d) || !isGem(n)) continue;
        var old = [a.g, b.g, d.g, n.g];
        for (var color = 0; color < GEM_COUNT; color++) {
          for (var other = 0; other < GEM_COUNT; other++) {
            if (other === color) continue;
            a.g = color; b.g = other; d.g = color; n.g = color;
            if (findMatches(grid).length === 0 && hasValidMove(grid)) return true;
          }
        }
        a.g = old[0]; b.g = old[1]; d.g = old[2]; n.g = old[3];
      }
    }
  }
  return false;
}function shuffleBoard(grid, rng) {
  rng = rng || Math.random;
  var positions = [], specials = [];
  for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
    var cell = grid[r][c];
    if (isGem(cell)) {
      positions.push({ r: r, c: c });
      if (cell.s) specials.push({ r: r, c: c, s: cell.s });
    }
  }
  if (positions.length < 2) return false;
  for (var attempt = 0; attempt < 200; attempt++) {
    var vals = positions.map(function (p) { return grid[p.r][p.c].g; });
    for (var i = vals.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1)), t = vals[i];
      vals[i] = vals[j]; vals[j] = t;
    }
    for (var k = 0; k < positions.length; k++) grid[positions[k].r][positions[k].c].g = vals[k];
    if (findMatches(grid).length === 0 && hasValidMove(grid)) return true;
  }
  for (var attempt2 = 0; attempt2 < 300; attempt2++) {
    for (var m = 0; m < positions.length; m++) grid[positions[m].r][positions[m].c] = { k: "e" };
    fillNoMatch(grid, rng);
    specials.forEach(function (sp) { grid[sp.r][sp.c].s = sp.s; });
    if (findMatches(grid).length === 0 && hasValidMove(grid)) return true;
  }
  return plantMove(grid, rng);
}
var RESONANCE_MAX_DEPTH=8;function parseTiles(layout){for(var tiles=[],r=0;r<ROWS;r++){for(var row=[],line=layout&&layout[r]||"........",c=0;c<COLS;c++){var ch=line.charAt(c)||".";row.push(ch==="#"?"h":ch==="R"?"v":"n")}tiles.push(row)}return tiles}function hasVeins(tiles){if(!tiles)return!1;for(var r=0;r<ROWS;r++)for(var c=0;c<COLS;c++)if(tiles[r][c]==="v")return!0;return!1}function veinClusters(tiles){for(var seen={},clusters=[],r=0;r<ROWS;r++)for(var c=0;c<COLS;c++){if(!tiles||tiles[r][c]!=="v"||seen[key(r,c)])continue;for(var nodes=[],queue=[{r:r,c:c}],head=0;head<queue.length;){var n=queue[head++];nodes.push(n),seen[key(n.r,n.c)]=1;var dirs=[{r:n.r-1,c:n.c},{r:n.r+1,c:n.c},{r:n.r,c:n.c-1},{r:n.r,c:n.c+1}];for(var i=0;i<dirs.length;i++){var d=dirs[i];inB(d.r,d.c)&&tiles[d.r][d.c]==="v"&&!seen[key(d.r,d.c)]&&(seen[key(d.r,d.c)]=1,queue.push(d))}}clusters.push({nodes:nodes})}return clusters}function applyResonance(grid,tiles,cleared,ctx){if(!tiles)return null;var i,sources=[],clearedSet={};for(i=0;i<(cleared||[]).length;i++){var p=cleared[i];inB(p.r,p.c)&&(clearedSet[key(p.r,p.c)]=1,tiles[p.r][p.c]==="v"&&sources.push({r:p.r,c:p.c}))}if(!sources.length)return null;var visited={},order=[],gems=[],blockerHits=[],queue=[],head=0;for(i=0;i<sources.length;i++)visited[key(sources[i].r,sources[i].c)]=1,queue.push({r:sources[i].r,c:sources[i].c,depth:0});while(head<queue.length){var n=queue[head++];order.push({r:n.r,c:n.c,depth:n.depth});var cell=grid[n.r][n.c];if(n.depth>0&&cell&&cell.k==="b"){blockerHits.push({r:n.r,c:n.c});continue}if(n.depth>0&&cell&&cell.k==="g"&&!clearedSet[key(n.r,n.c)])gems.push({r:n.r,c:n.c,g:cell.g,s:cell.s||null});if(n.depth>=RESONANCE_MAX_DEPTH-1)continue;var dirs=[{r:n.r-1,c:n.c},{r:n.r+1,c:n.c},{r:n.r,c:n.c-1},{r:n.r,c:n.c+1}];for(var j=0;j<dirs.length;j++){var d=dirs[j];inB(d.r,d.c)&&tiles[d.r][d.c]==="v"&&!visited[key(d.r,d.c)]&&(visited[key(d.r,d.c)]=1,queue.push({r:d.r,c:d.c,depth:n.depth+1}))}}for(var k2=0;k2<gems.length;k2++){var q2=gems[k2];grid[q2.r][q2.c]={k:"e"},ctx.collected[q2.g]=(ctx.collected[q2.g]||0)+1}var destroyedBlockers=[];if(blockerHits.length){var dmg=damageBlockers(grid,gems,blockerHits,ctx);destroyedBlockers=dmg.destroyed}var score=gems.length*30+(gems.length>1?(gems.length-1)*50:0);return ctx.score+=score,ctx.resonanceCleared=(ctx.resonanceCleared||0)+gems.length,{chain:gems.length,cleared:gems,damaged:blockerHits,destroyedBlockers:destroyedBlockers,order:order,score:score}}function validateBoard(grid,level){for(var layout=level&&level.layout,r=0;r<ROWS;r++)for(var c=0;c<COLS;c++){var cell=grid[r][c];if(layout&&layout[r]&&(layout[r].charAt(c)==="#")){if(cell!==null)return{ok:!1,reason:"expected hole at "+r+","+c};continue}if(cell===null)return{ok:!1,reason:"unexpected hole at "+r+","+c};if(cell.k==="g"){if(typeof cell.g!=="number"||cell.g<0||cell.g>=GEM_COUNT)return{ok:!1,reason:"bad gem at "+r+","+c}}else if(cell.k==="b"){if(cell.b!=="stone"&&cell.b!=="ice")return{ok:!1,reason:"bad blocker at "+r+","+c};if(!(cell.hp>=1))return{ok:!1,reason:"bad hp at "+r+","+c}}else if(cell.k!=="e")return{ok:!1,reason:"bad kind at "+r+","+c}}return{ok:!0}}
function damageBlockers(grid, cleared, directHits, ctx) {
  var hits = {};
  (cleared || []).forEach(function (p) {
    [{ r: p.r - 1, c: p.c }, { r: p.r + 1, c: p.c }, { r: p.r, c: p.c - 1 }, { r: p.r, c: p.c + 1 }].forEach(function (q) {
      if (inB(q.r, q.c) && isBlocker(grid[q.r][q.c])) hits[key(q.r, q.c)] = q;
    });
  });
  (directHits || []).forEach(function (q) { if (inB(q.r, q.c)) hits[key(q.r, q.c)] = q; });
  var destroyed = [];
  Object.keys(hits).forEach(function (k) {
    var q = hits[k], cell = grid[q.r][q.c];
    if (!isBlocker(cell)) return;
    cell.hp = Math.max(0, (cell.hp || 1) - 1);
    if (cell.hp <= 0) {
      grid[q.r][q.c] = { k: "e" };
      destroyed.push({ r: q.r, c: q.c, b: cell.b });
      ctx.blockersCleared[cell.b] = (ctx.blockersCleared[cell.b] || 0) + 1;
    }
  });
  return { destroyed: destroyed, score: destroyed.length * 100 };
}
function resolveBoard(grid, rng, ctx) {
  var steps = [], cascade = 0, guard = 0;
  while (guard++ < 60) {
    var groups = findMatches(grid);
    if (!groups.length) break;
    cascade++;
    var plans = planSpecials(groups, ctx.preferred);
    ctx.preferred = null;
    var seeds = [];
    groups.forEach(function (grp) { grp.cells.forEach(function (p) { seeds.push({ r: p.r, c: p.c }); }); });
    var expanded = expandClears(grid, seeds, ctx.prismColor);
    ctx.prismColor = null;
    var keep = {};
    plans.forEach(function (pl) { keep[key(pl.r, pl.c)] = pl; });
    var cleared = expanded.cleared.filter(function (p) { return !keep[key(p.r, p.c)]; });
    var mult = Math.min(1 + (cascade - 1) * 0.5, 5), gained = 0;
    cleared.forEach(function (p) { gained += 60; ctx.collected[p.g] = (ctx.collected[p.g] || 0) + 1; });
    gained = Math.round(gained * mult) + plans.length * 200;
    ctx.score += gained;
    cleared.forEach(function (p) { grid[p.r][p.c] = { k: "e" }; });
    var damage = damageBlockers(grid, cleared, expanded.blockers, ctx);
    gained += damage.score;
    ctx.score += damage.score;
    var reso = ctx.tiles ? applyResonance(grid, ctx.tiles, cleared, ctx) : null;
    var forged = [];
    plans.forEach(function (pl) {
      var cell = grid[pl.r][pl.c];
      if (!cell || cell.k === "e" || isGem(cell)) {
        grid[pl.r][pl.c] = { k: "g", g: pl.gem, s: pl.special };
        forged.push({ r: pl.r, c: pl.c, s: pl.special, g: pl.gem });
      }
    });
    steps.push({ t: "clear", cleared: cleared, blockers: damage.destroyed.concat(reso ? reso.destroyedBlockers : []), forged: forged, activated: expanded.activated, score: gained + (reso ? reso.score : 0), combo: cascade, mult: mult, resonance: reso });
    var grav = applyGravity(grid, rng);
    steps.push({ t: "fall", moves: grav.moves, spawns: grav.spawns });
  }
  return { steps: steps, cascades: cascade };
}function trySwap(grid, a, b, rng, ctx) {
  if (!inB(a.r, a.c) || !inB(b.r, b.c)) return { ok: false, reason: "out-of-bounds" };
  if (!areAdjacent(a, b)) return { ok: false, reason: "not-adjacent" };
  var ca = grid[a.r][a.c], cb = grid[b.r][b.c];
  if (!isGem(ca) || !isGem(cb)) return { ok: false, reason: "not-swappable" };
  var steps = [];
  swapCells(grid, a, b);
  steps.push({ t: "swap", a: a, b: b });
  if (ca.s && cb.s) {
    var combo = resolveSpecialCombo(grid, a, b, ca, cb, ctx, rng);
    if (combo) {
      steps = steps.concat(combo);
      var after = resolveBoard(grid, rng, ctx);
      return { ok: true, steps: steps.concat(after.steps), cascades: after.cascades };
    }
  }
  if ((ca.s === "prism" && !cb.s) || (cb.s === "prism" && !ca.s)) {
    var otherCell = ca.s === "prism" ? cb : ca;
    var prismPos = ca.s === "prism" ? b : a;
    var otherPos = ca.s === "prism" ? a : b;
    var exp = expandClears(grid, [{ r: prismPos.r, c: prismPos.c }, { r: otherPos.r, c: otherPos.c }], otherCell.g);
    var gained = 0;
    exp.cleared.forEach(function (p) { gained += 60; ctx.collected[p.g] = (ctx.collected[p.g] || 0) + 1; });
    exp.cleared.forEach(function (p) { grid[p.r][p.c] = { k: "e" }; });
    var damage = damageBlockers(grid, exp.cleared, exp.blockers, ctx);
    gained += damage.score;
    ctx.score += gained;
    var resoP = ctx.tiles ? applyResonance(grid, ctx.tiles, exp.cleared, ctx) : null;
    steps.push({ t: "clear", cleared: exp.cleared, blockers: damage.destroyed.concat(resoP ? resoP.destroyedBlockers : []), forged: [], activated: exp.activated, score: gained + (resoP ? resoP.score : 0), combo: 1, mult: 1, resonance: resoP });
    var g1 = applyGravity(grid, rng);
    steps.push({ t: "fall", moves: g1.moves, spawns: g1.spawns });
    var rest = resolveBoard(grid, rng, ctx);
    return { ok: true, steps: steps.concat(rest.steps), cascades: rest.cascades };
  }
  var groups = findMatches(grid);
  if (!groups.length) {
    swapCells(grid, a, b);
    steps.push({ t: "revert", a: a, b: b });
    return { ok: false, reason: "no-match", steps: steps };
  }
  ctx.preferred = b;
  var res = resolveBoard(grid, rng, ctx);
  return { ok: true, steps: steps.concat(res.steps), cascades: res.cascades };
}function resolveSpecialCombo(grid, a, b, ca, cb, ctx, rng) {
  var sa = ca.s, sb = cb.s, seeds = [{ r: a.r, c: a.c }, { r: b.r, c: b.c }], label = null;
  function addRow(r) { for (var i = 0; i < COLS; i++) seeds.push({ r: r, c: i }); }
  function addCol(c) { for (var i = 0; i < ROWS; i++) seeds.push({ r: i, c: c }); }
  function addBox(r, c, rad) { for (var dr = -rad; dr <= rad; dr++) for (var dc = -rad; dc <= rad; dc++) if (inB(r + dr, c + dc)) seeds.push({ r: r + dr, c: c + dc }); }
  function isLine(s) { return s === "line-h" || s === "line-v"; }
  if (sa === "prism" && sb === "prism") {
    for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) seeds.push({ r: r, c: c });
    label = "TOTAL ECLIPSE";
  } else if (sa === "prism" || sb === "prism") {
    var other = sa === "prism" ? sb : sa, color = mostCommonGem(grid);
    for (var rr = 0; rr < ROWS; rr++) for (var cc = 0; cc < COLS; cc++) {
      var cell = grid[rr][cc];
      if (isGem(cell) && cell.g === color) {
        seeds.push({ r: rr, c: cc });
        if (isLine(other)) { addRow(rr); addCol(cc); }
        else if (other === "bomb") addBox(rr, cc, 1);
      }
    }
    label = "PRISM SURGE";
  } else if (isLine(sa) && isLine(sb)) {
    addRow(a.r); addCol(a.c); addRow(b.r); addCol(b.c); label = "CROSS BEAM";
  } else if (sa === "bomb" && sb === "bomb") {
    addBox(a.r, a.c, 2); addBox(b.r, b.c, 2); label = "NOVA BLAST";
  } else if ((isLine(sa) && sb === "bomb") || (sa === "bomb" && isLine(sb))) {
    var lr = isLine(sa) ? a.r : b.r, lc = isLine(sa) ? a.c : b.c;
    for (var d = -1; d <= 1; d++) { addRow(lr + d); addCol(lc + d); }
    label = "QUAKE";
  } else return null;
  var exp = expandClears(grid, seeds, null), gained = 0;
  exp.cleared.forEach(function (p) { gained += 60; ctx.collected[p.g] = (ctx.collected[p.g] || 0) + 1; });
  gained = Math.round(gained * 1.5);
  exp.cleared.forEach(function (p) { grid[p.r][p.c] = { k: "e" }; });
  var damage = damageBlockers(grid, exp.cleared, exp.blockers, ctx);
  gained += damage.score;
  ctx.score += gained;
  var resoC = ctx.tiles ? applyResonance(grid, ctx.tiles, exp.cleared, ctx) : null;
  var steps = [{ t: "clear", cleared: exp.cleared, blockers: damage.destroyed.concat(resoC ? resoC.destroyedBlockers : []), forged: [], activated: exp.activated, score: gained + (resoC ? resoC.score : 0), combo: 1, mult: 1.5, label: label, resonance: resoC }];
  var grav = applyGravity(grid, rng || ctx.rng || makeRng(1));
  steps.push({ t: "fall", moves: grav.moves, spawns: grav.spawns });
  return steps;
}function makeCtx(level){return{score:0,collected:[0,0,0,0,0,0],blockersCleared:{stone:0,ice:0},preferred:null,prismColor:null,rng:null,level,resonanceCleared:0,tiles:level&&level.layout&&level.layout.join("").indexOf("R")>=0?parseTiles(level.layout):null}}function objectiveProgress(level,ctx){return level.objectives.map(function(o){if(o.type==="score")return{type:"score",done:ctx.score>=o.target,current:Math.min(ctx.score,o.target),target:o.target};if(o.type==="collect"){var cur=ctx.collected[o.gem]||0;return{type:"collect",gem:o.gem,done:cur>=o.count,current:Math.min(cur,o.count),target:o.count}}if(o.type==="clear"){var c2=ctx.blockersCleared[o.blocker]||0;return{type:"clear",blocker:o.blocker,done:c2>=o.count,current:Math.min(c2,o.count),target:o.count}}if(o.type==="resonance"){var rc=ctx.resonanceCleared||0;return{type:"resonance",done:rc>=o.count,current:Math.min(rc,o.count),target:o.count}}return{type:"unknown",done:!0,current:0,target:0}})}function objectivesMet(level,ctx){return objectiveProgress(level,ctx).every(function(p){return p.done})}function starsFor(level,ctx){var s=level.stars;return ctx.score>=s[2]?3:ctx.score>=s[1]?2:ctx.score>=s[0]?1:0}global.CQEngine={ROWS,COLS,GEM_COUNT,makeRng,createBoard,cloneGrid,findMatches,planSpecials,expandClears,applyGravity,canSwap,areAdjacent,findHint,hasValidMove,shuffleBoard,resolveBoard,trySwap,makeCtx,objectiveProgress,objectivesMet,starsFor,mostCommonGem,isGem,isBlocker,parseTiles,hasVeins,veinClusters,applyResonance,validateBoard,RESONANCE_MAX_DEPTH}})(window);
