#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const context={console};
context.window=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'js/levels.js'),'utf8'),context,{filename:'js/levels.js'});
vm.runInContext(fs.readFileSync(path.join(root,'js/engine.js'),'utf8'),context,{filename:'js/engine.js'});
const levels=context.CQLevels,engine=context.CQEngine;
if(!levels||!engine||levels.count!==27||typeof engine.createBoard!=='function') throw new Error('Crystal Quest campaign API missing');
const out=path.join(root,'native/cocos/Resources/levels');
fs.mkdirSync(out,{recursive:true});
for(const level of levels.LEVELS){
 const seed=((Math.imul(level.id,2654435761)^0xC0FFEE)>>>0)||1;
 const board=engine.createBoard(level,seed);
 const score=level.objectives.find(o=>o.type==='score');
 const payload={
  id:level.id,name:level.name,moves:level.moves,layout:level.layout,
  objectives:level.objectives,stars:level.stars,hint:level.hint||'',
  guardian:level.guardian||null,
  grid:board.grid.map(row=>row.map(cell=>cell?{k:cell.k,g:cell.g??null,s:cell.s??null,b:cell.b??null,hp:cell.hp??0}:null)),
  scoreTarget:score?score.target:0
 };
 fs.writeFileSync(path.join(out,'level-'+level.id+'.json'),JSON.stringify(payload));
}
console.log('Exported '+levels.count+' deterministic Crystal Quest campaign levels');
