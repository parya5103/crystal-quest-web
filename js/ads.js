/* Crystal Quest ads adapter (Phase 7) - rewarded-only, provider-optional.
   No ad network is wired: default state = no provider, ads unavailable,
   and the game is fully playable. A real provider registers itself with
   CQAds.register({ isAvailable: function(){}, showRewarded: function(onReward,onClose,onError){} }).
   Gameplay rewards are granted ONLY inside the provider's onReward callback. */
(function(global){"use strict";
var provider=null,busy=false;
var Ads={
register:function(p){provider=p&&typeof p=="object"&&typeof p.showRewarded=="function"?p:null;return provider!=null},
reset:function(){provider=null,busy=!1},
isAvailable:function(){try{return provider!=null&&(typeof provider.isAvailable!="function"||!!provider.isAvailable())}catch(e){return!1}},
showRewarded:function(hooks){hooks=hooks||{};
if(busy||!this.isAvailable()||provider==null)return!1;
busy=!0;
try{return provider.showRewarded(function(){busy=!1,hooks.onReward&&hooks.onReward()},function(){busy=!1,hooks.onClose&&hooks.onClose()},function(err){busy=!1,hooks.onError&&hooks.onError(err)}),!0}
catch(e){return busy=!1,hooks.onError&&hooks.onError(e),!1}}};
global.CQAds=Ads})(typeof window!="undefined"?window:globalThis);
/* === Google AdSense display ad wiring (main menu only) ===
   The loader tag lives in index.html. This block activates the single
   labelled home-screen slot; the CQAds rewarded adapter above is unchanged.
   Fail-closed consent gate: no ad is activated until a Google-certified
   consent-management platform is wired in (cmpReady below) and confirms
   consent. Until that integration exists the slot stays hidden for
   every visitor, in every region. */
(function () {
  'use strict';

  var PUBLISHER = 'ca-pub-2895136878543415';
  var SLOTS = { 'cq-home': '7200569170' };
  var cmpReady = false; // set true only after a certified CMP integration

  // Fail-closed: ads may activate ONLY after a certified CMP confirms
  // consent. No ad is ever served on a missing or broken CMP signal.
  function adsAllowed() {
    if (!PUBLISHER) return false;
    if (cmpReady === false) return false;
    return true;
  }

  function loaderPresent() {
    if (typeof document === 'undefined' || !document.querySelector) return false;
    return !!document.querySelector('script[src*="adsbygoogle.js?client="]');
  }

  function activateSlots() {
    if (!loaderPresent()) return;
    if (!adsAllowed()) return;
    if (typeof document === 'undefined' || !document.querySelectorAll) return;
    var hosts = document.querySelectorAll('.ad-slot[data-ad-slot]');
    for (var i = 0; i < hosts.length; i++) {
      var host = hosts[i];
      var unit = SLOTS[host.getAttribute('data-ad-slot')];
      var ins = host.querySelector ? host.querySelector('ins.adsbygoogle') : null;
      if (!unit || !ins || host.getAttribute('data-ad-active') === '1') continue;
      host.setAttribute('data-ad-active', '1');
      ins.setAttribute('data-ad-client', PUBLISHER);
      ins.setAttribute('data-ad-slot', unit);
      ins.setAttribute('data-ad-format', 'auto');
      ins.setAttribute('data-full-width-responsive', 'true');
      host.removeAttribute('hidden');
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (er) { /* ad library not ready: the labelled slot stays empty */ }
    }
  }

  function boot() {
    if (typeof document === 'undefined') return;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', activateSlots);
    } else {
      activateSlots();
    }
  }

  boot();
})();
