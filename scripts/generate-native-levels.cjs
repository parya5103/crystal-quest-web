#!/usr/bin/env node
"use strict";
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(root,"js","levels.js"),"utf8");
const sandbox={window:{}};
vm.runInNewContext(source+"\n;globalThis.__CQLevels=window.CQLevels;",sandbox,{filename:"js/levels.js",timeout:30000});
const api=sandbox.__CQLevels;
if(!api||!Array.isArray(api.LEVELS)||api.LEVELS.length!==27)throw new Error("Expected all 27 canonical Crystal Quest levels");
const ids=new Set();
for(const level of api.LEVELS){
 if(!Number.isInteger(level.id)||level.id<1||level.id>27||ids.has(level.id))throw new Error("Invalid or duplicate Crystal Quest level id");
 if(!Number.isInteger(level.moves)||level.moves<1||!Array.isArray(level.layout)||level.layout.length!==8||!Array.isArray(level.objectives)||!Array.isArray(level.stars)||level.stars.length!==3)throw new Error("Incomplete level definition: "+level.id);
 ids.add(level.id);
}
const out=path.join(root,"android-native","app","src","main","assets","crystal-levels.v1.json");
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify({version:1,levels:api.LEVELS}));
process.stdout.write("Generated canonical metadata for "+api.LEVELS.length+" Crystal Quest levels\n");
