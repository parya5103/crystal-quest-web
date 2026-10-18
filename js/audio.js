(function(global){"use strict";var Audio={ctx:null,master:null,sfxGain:null,musicGain:null,sfxOn:!0,musicOn:!0,ready:!1,_musicTimer:null,_musicStep:0,_noiseBuf:null},MUSIC_STEPS=32,MELODY=[57,60,64,67,64,60,57,55,57,60,64,69,67,64,60,57,55,59,62,67,64,62,59,55,57,60,64,67,69,67,64,60],BASS=[33,33,29,29,31,31,28,28];function midiToFreq(m){return 440*Math.pow(2,(m-69)/12)}Audio.init=function(){
if(this.ctx)return true;
var Ctor=global.AudioContext||global.webkitAudioContext;
if(!Ctor)return false;
try{
this.ctx=new Ctor();
this.master=this.ctx.createGain();this.master.gain.value=.9;this.master.connect(this.ctx.destination);
this.sfxGain=this.ctx.createGain();this.sfxGain.gain.value=this.sfxOn?.55:0;this.sfxGain.connect(this.master);
this.musicGain=this.ctx.createGain();this.musicGain.gain.value=this.musicOn?.16:0;this.musicGain.connect(this.master);
var len=Math.max(1,Math.floor(this.ctx.sampleRate*.5)),buf=this.ctx.createBuffer(1,len,this.ctx.sampleRate),data=buf.getChannelData(0);
for(var i=0;i<len;i++)data[i]=Math.random()*2-1;
this._noiseBuf=buf;this.ready=true;return true
}catch(e){try{this.ctx&&this.ctx.close&&this.ctx.close()}catch(e2){}this.ctx=this.master=this.sfxGain=this.musicGain=this._noiseBuf=null;this.ready=false;return false}
},Audio.unlock=function(){try{if(this.init()&&this.ctx.state==="suspended"&&this.ctx.resume){var p=this.ctx.resume();p&&p.catch(function(){})}}catch(e){}},Audio.setSfx=function(on){this.sfxOn=!!on,this.sfxGain&&(this.sfxGain.gain.value=on?.55:0)},Audio.setMusic=function(on){this.musicOn=!!on,this.musicGain&&(this.musicGain.gain.value=on?.16:0),on?this.startMusic():this.stopMusic()},Audio._tone=function(opts){
if(!this.ready||!this.sfxOn)return;
try{
opts=opts||{};var ctx=this.ctx,freq=Number(opts.freq),dur=Number(opts.dur),vol=opts.vol==null?.3:Number(opts.vol),delay=Number(opts.delay)||0;
if(!ctx||ctx.state==="closed"||!isFinite(freq)||freq<=0||!isFinite(dur)||dur<=0||!isFinite(vol))return;
dur=Math.min(dur,10);delay=Math.max(0,delay);vol=Math.max(.0001,Math.min(1,vol));
var maxFreq=Math.max(20,ctx.sampleRate*.45);freq=Math.max(20,Math.min(maxFreq,freq));
var t0=ctx.currentTime+delay,osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=opts.type||"sine";osc.frequency.setValueAtTime(freq,t0);
var to=Number(opts.freqTo);if(isFinite(to)&&to>0)osc.frequency.exponentialRampToValueAtTime(Math.max(20,Math.min(maxFreq,to)),t0+dur);
gain.gain.setValueAtTime(1e-4,t0);gain.gain.exponentialRampToValueAtTime(vol,t0+Math.min(.02,dur*.3));gain.gain.exponentialRampToValueAtTime(1e-4,t0+dur);
osc.connect(gain);gain.connect(this.sfxGain);osc.start(t0);osc.stop(t0+dur+.02)
}catch(e){}
},Audio._noise=function(opts){
if(!this.ready||!this.sfxOn||!this._noiseBuf)return;
try{
opts=opts||{};var ctx=this.ctx,dur=Number(opts.dur),vol=opts.vol==null?.2:Number(opts.vol),delay=Number(opts.delay)||0;
if(!ctx||ctx.state==="closed"||!isFinite(dur)||dur<=0||!isFinite(vol))return;
dur=Math.min(dur,10);delay=Math.max(0,delay);vol=Math.max(.0001,Math.min(1,vol));
var maxFreq=Math.max(60,ctx.sampleRate*.45),freq=Number(opts.freq)||1200;
if(!isFinite(freq)||freq<=0)freq=1200;freq=Math.max(20,Math.min(maxFreq,freq));
var t0=ctx.currentTime+delay,src=ctx.createBufferSource();src.buffer=this._noiseBuf;
var filter=ctx.createBiquadFilter();filter.type=opts.filterType||"bandpass";filter.frequency.setValueAtTime(freq,t0);
var to=Number(opts.freqTo);if(isFinite(to)&&to>0)filter.frequency.exponentialRampToValueAtTime(Math.max(20,Math.min(maxFreq,to)),t0+dur);
var q=opts.q==null?1.2:Number(opts.q);filter.Q.value=isFinite(q)?Math.max(.0001,Math.min(100,q)):1.2;
var gain=ctx.createGain();gain.gain.setValueAtTime(1e-4,t0);gain.gain.exponentialRampToValueAtTime(vol,t0+.008);gain.gain.exponentialRampToValueAtTime(1e-4,t0+dur);
src.connect(filter);filter.connect(gain);gain.connect(this.sfxGain);src.start(t0);src.stop(t0+dur+.02)
}catch(e){}
},Audio.play=function(name,opt){if(!(!this.ready||!this.sfxOn)){opt=opt||{};var pitch=Number(opt.pitch);isFinite(pitch)||(pitch=0),pitch=Math.max(-48,Math.min(48,pitch));var f=function(base){return base*Math.pow(2,pitch/12)};switch(name){case"select":this._tone({type:"triangle",freq:f(880),freqTo:f(1180),dur:.09,vol:.16});break;case"swap":this._tone({type:"sine",freq:f(520),freqTo:f(760),dur:.11,vol:.2}),this._noise({freq:2400,freqTo:900,dur:.1,vol:.07});break;case"invalid":this._tone({type:"square",freq:f(200),freqTo:f(120),dur:.16,vol:.13});break;case"match":this._tone({type:"triangle",freq:f(660),freqTo:f(990),dur:.16,vol:.24}),this._tone({type:"sine",freq:f(1320),dur:.12,vol:.1,delay:.03});break;case"cascade":this._tone({type:"triangle",freq:f(880),freqTo:f(1400),dur:.2,vol:.22}),this._tone({type:"sine",freq:f(1760),dur:.16,vol:.1,delay:.05});break;case"special":this._tone({type:"sawtooth",freq:f(300),freqTo:f(1500),dur:.3,vol:.16}),this._noise({freq:600,freqTo:4e3,dur:.3,vol:.12,q:.8});break;case"blast":this._noise({filterType:"lowpass",freq:1800,freqTo:120,dur:.42,vol:.3,q:.6}),this._tone({type:"sine",freq:f(160),freqTo:f(50),dur:.4,vol:.24});break;case"stone":this._noise({filterType:"lowpass",freq:900,freqTo:200,dur:.24,vol:.22,q:.7});break;case"star":[0,4,7,12].forEach(function(s,i){Audio._tone({type:"triangle",freq:midiToFreq(72+s),dur:.3,vol:.16,delay:i*.07})},this);break;case"win":[0,4,7,12,16].forEach(function(s,i){Audio._tone({type:"triangle",freq:midiToFreq(60+s),dur:.5,vol:.2,delay:i*.11})},this);break;case"lose":[0,-3,-7,-12].forEach(function(s,i){Audio._tone({type:"sine",freq:midiToFreq(60+s),dur:.5,vol:.2,delay:i*.14})},this);break;case"click":this._tone({type:"square",freq:f(1e3),freqTo:f(1400),dur:.05,vol:.1});break;case"shuffle":this._noise({freq:400,freqTo:3e3,dur:.4,vol:.14,q:.9});break;case"hint":this._tone({type:"sine",freq:f(1200),freqTo:f(1800),dur:.18,vol:.14});break;default:break}}},Audio.startMusic=function(){if(!(!this.ready||!this.musicOn||this._musicTimer)){var self=this;this._musicStep=0;var stepMs=250;this._musicTimer=setInterval(function(){self._musicTick()},stepMs),this._musicTick()}},Audio.stopMusic=function(){this._musicTimer&&(clearInterval(this._musicTimer),this._musicTimer=null)},Audio._musicTick=function(){if(!(!this.ready||!this.musicOn)){var ctx=this.ctx,t0=ctx.currentTime+.02,step=this._musicStep%MUSIC_STEPS,note=MELODY[step],osc=ctx.createOscillator(),g=ctx.createGain();if(osc.type="triangle",osc.frequency.value=midiToFreq(note),g.gain.setValueAtTime(1e-4,t0),g.gain.exponentialRampToValueAtTime(.5,t0+.02),g.gain.exponentialRampToValueAtTime(1e-4,t0+.34),osc.connect(g),g.connect(this.musicGain),osc.start(t0),osc.stop(t0+.4),step%4===0){var pad=ctx.createOscillator(),pg=ctx.createGain();pad.type="sine",pad.frequency.value=midiToFreq(note-12),pg.gain.setValueAtTime(1e-4,t0),pg.gain.exponentialRampToValueAtTime(.35,t0+.12),pg.gain.exponentialRampToValueAtTime(1e-4,t0+1),pad.connect(pg),pg.connect(this.musicGain),pad.start(t0),pad.stop(t0+1.05)}if(step%4===0){var bi=Math.floor(step/4)%BASS.length,b=ctx.createOscillator(),bg=ctx.createGain();b.type="sine",b.frequency.value=midiToFreq(BASS[bi]),bg.gain.setValueAtTime(1e-4,t0),bg.gain.exponentialRampToValueAtTime(.6,t0+.05),bg.gain.exponentialRampToValueAtTime(1e-4,t0+.9),b.connect(bg),bg.connect(this.musicGain),b.start(t0),b.stop(t0+.95)}this._musicStep++}},global.CQAudio=Audio})(window);
