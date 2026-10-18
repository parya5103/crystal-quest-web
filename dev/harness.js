/* Crystal Quest headless test harness (dev only, not loaded by the game).
   Runs engine/levels/save logic + CQTest in a shimmed browser environment.
   Usage: load this file's `runSuite` from a host runner that provides file contents. */
(function (global) {
  "use strict";
  function makeEnv() {
    var store = {};
    var localStorage = {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem: function (k, v) { store[k] = String(v); },
      removeItem: function (k) { delete store[k]; }
    };
    var noop = function () {};
    var document = {
      readyState: "loading",
      _listeners: {},
      addEventListener: function (ev, fn) { (this._listeners[ev] = this._listeners[ev] || []).push(fn); },
      removeEventListener: noop,
      getElementById: function () { return null; },
      querySelector: function () { return null; },
      querySelectorAll: function () { return []; },
      hidden: false
    };
    var window = {
      document: document,
      localStorage: localStorage,
      devicePixelRatio: 1,
      addEventListener: noop,
      removeEventListener: noop,
      requestAnimationFrame: function (fn) { setTimeout(function () { fn(performance.now()); }, 0); },
      cancelAnimationFrame: function (id) { clearTimeout(id); },
      navigator: { vibrate: function () { return true; } }
    };
    window.window = window;
    return { window: window, document: document, localStorage: localStorage, store: store };
  }
  function loadSource(env, src, label) {
    // Wrap the IIFE's `global` argument and `window` reference with our shim.
    var fn = new Function("window", "document", "localStorage", "navigator", "performance",
      src + "\n//# sourceURL=" + label);
    fn(env.window, env.document, env.localStorage, env.window.navigator, performance);
  }
  function parseOnly(src) { new Function(src); return true; }
  global.CQDev = { makeEnv: makeEnv, loadSource: loadSource, parseOnly: parseOnly };
})(typeof window !== "undefined" ? window : globalThis);
