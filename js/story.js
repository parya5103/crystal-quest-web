/* Crystal Quest story: regions, cast and beats. Pure data + helpers, no network. */
(function (global) {
  "use strict";
  var CHARACTERS = {
    mira: { name: "Mira", color: "#35e0d0" },
    guardian: { name: "The Guardian", color: "#ffc94d" },
    ember: { name: "Ember", color: "#f08a1d" },
    nix: { name: "Nix", color: "#d3b6ff" }
  };
  var REGIONS = [
    { from: 1, to: 10, name: "Crystal Forest", theme: { plate: "#123526", cellA: "rgba(140,240,190,0.11)", cellB: "rgba(140,240,190,0.05)" },
      beats: [
        { id: "forest-1", who: "mira", text: "The forest used to sing. Now the crystals sit silent and the stream has run dry. If I relearn the old matches, maybe the song comes back." },
        { id: "forest-2", who: "mira", text: "A vein of light! The crystals remember the melody after all. Keep matching - every clear note carries further than the last." }
      ] },
    { from: 11, to: 20, name: "Emberfall Canyon", theme: { plate: "#3d1a0e", cellA: "rgba(255,170,80,0.12)", cellB: "rgba(255,170,80,0.05)" },
      beats: [
        { id: "ember-1", who: "ember", text: "Careful, traveller. This canyon burns brighter every day, and whatever feeds the fire below the rock does not like visitors." },
        { id: "ember-2", who: "ember", text: "You match well for a forest dweller. But rhythm wins here: the Warden calls one colour at a time. Answer in time, or the canyon answers for you." }
      ] },
    { from: 21, to: 27, name: "Starlit Summit", theme: { plate: "#1a1442", cellA: "rgba(185,165,255,0.12)", cellB: "rgba(185,165,255,0.05)" },
      beats: [
        { id: "starlit-1", who: "nix", text: "So the forest child climbs the summit. Up here every vein converges into one great chord, and the old Guardian waits at the peak." },
        { id: "starlit-2", who: "guardian", text: "You returned the forest its song. Now prove you can keep it. Break my shield at the peak, keeper, and the melody is yours to carry home." }
      ] }
  ];
  var GUARDIAN_BEATS = {
    20: { id: "warden-20", who: "ember", text: "The Ember Warden rises from the canyon floor! Its shield cycles through six colours - match the colour it calls, segment after segment, before the fire runs out of moves." },
    27: { id: "guardian-27", who: "guardian", text: "Enough warmth, enough light. This is the final trial: five colours, five calls. Sing the whole sequence back to me and my long watch finally ends." }
  };
  function levelId(level) { return level && typeof level === "object" ? level.id : level; }
  function regionFor(level) {
    var id = levelId(level);
    if (typeof id !== "number" || !isFinite(id)) return null;
    for (var i = 0; i < REGIONS.length; i++) if (id >= REGIONS[i].from && id <= REGIONS[i].to) return REGIONS[i];
    return null;
  }
  function seenList(save) {
    var w = save && save.world;
    return w && Object.prototype.toString.call(w.story) === "[object Array]" ? w.story : [];
  }
  function pending(level, save) {
    var out = [], reg = regionFor(level);
    if (!reg) return out;
    var seen = seenList(save), id = levelId(level), i;
    for (i = 0; i < reg.beats.length; i++) seen.indexOf(reg.beats[i].id) < 0 && out.push(reg.beats[i]);
    var gb = GUARDIAN_BEATS[id];
    gb && seen.indexOf(gb.id) < 0 && out.push(gb);
    return out;
  }
  function themeFor(level) { var reg = regionFor(level); return reg ? reg.theme : null; }
  function portrait(who) {
    var c = CHARACTERS[who] || CHARACTERS.mira;
    return '<span class="story-portrait-dot" style="background:' + c.color + '"></span>';
  }
  global.CQStory = { REGIONS: REGIONS, CHARACTERS: CHARACTERS, pending: pending, themeFor: themeFor, portrait: portrait };
})(typeof window !== "undefined" ? window : this);
