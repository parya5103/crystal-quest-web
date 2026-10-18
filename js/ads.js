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
