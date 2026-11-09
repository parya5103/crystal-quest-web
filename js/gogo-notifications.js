/*
 * GoGo Central Notifications — opt-in Firebase Cloud Messaging (web push)
 * for Crystal Quest (GoGo ecosystem game site).
 *
 * Design contract (gogo-central-backend docs/DEPLOYMENT.md):
 *   - FAIL-CLOSED: until API_BASE and VAPID_PUBLIC_KEY below are filled in
 *     after the backend deployment, the feature reports "not configured",
 *     never requests notification permission, loads no SDK, registers no
 *     worker and calls no API.
 *   - EXPLICIT OPT-IN ONLY: permission is requested exclusively inside the
 *     Enable button click handler.
 *   - FIRST-VISIT INTRO: a small, non-intrusive card introduces GoGo
 *     notifications once per visitor ("Not now" gets ONE unobtrusive
 *     reminder after 3 days, then never again), denied visitors get
 *     one-time browser-settings guidance, and the native permission
 *     prompt still only ever fires from an explicit button click.
 *   - The Firebase SDK (compat build) is lazy-loaded ONLY after the opt-in
 *     click; every other visitor keeps the exact same page payload.
 *   - The background worker (/firebase-messaging-sw.js, scope /) installs NO
 *     fetch handler, so existing pages, caching and offline behaviour are
 *     untouched. It shows notifications only, with a GoGo-domain-only link
 *     allowlist.
 *   - Only the public Firebase web config lives here — no secrets.
 */
(function (root) {
  'use strict';

  // ---------------------------------------------------------------------------
  // SITE CONFIGURATION (the only block that differs between GoGo sites)
  // ---------------------------------------------------------------------------
  var CONFIG = {
    // Backend product id for this site (must exist in registered_applications).
    appId: 'crystal-quest',
    // Game site without the shared GoGo Account bundle: lazily sign in
    // to Firebase Anonymous auth when the player opts in (requires the
    // Anonymous provider in the Firebase Console - see deployment docs).
    authMode: 'anonymous',
    // FAIL-CLOSED deployment switches. BOTH stay empty until the backend is
    // deployed and the Firebase Console Web Push VAPID key has been created.
    apiBase: 'https://gogo-central-backend-mg6z.onrender.com',
    vapidPublicKey: 'BPoY5jfIGXpbeW1hhL8iQ4WU5RP8S1EAvu5ywa6RST0QArzZT21ArnRgZQc-vj24ufEAaTALMDxUOOuNeu86xmE',
    // Background messaging worker in the fcm/ SUBDIRECTORY: the game's own
    // sw.js owns the app root scope and its cq-v16 cache must stay
    // untouched, so the FCM worker lives at fcm/firebase-messaging-sw.js
    // with its own scope. The explicit serviceWorkerRegistration is passed
    // to getToken(), so the sub-scope is fully supported.
    swUrl: 'fcm/firebase-messaging-sw.js',
    swScope: '',
    // Firebase JS SDK (compat), lazy-loaded only after the opt-in click.
    sdkBase: 'https://www.gstatic.com/firebasejs/11.10.0',
    // Public, client-safe Firebase web config (shared GoGo Firebase project).
    firebaseConfig: {
      apiKey: 'AIzaSyCtfvrvfRSlZmiNBluRLeHCLNgaNkuY-_4',
      authDomain: 'gen-lang-client-0566323659.firebaseapp.com',
      projectId: 'gen-lang-client-0566323659',
      messagingSenderId: '388829027444',
      appId: '1:388829027444:web:5b6dee8967f6abdc520521'
    },
    // UI mount: the module renders once into the static
    // [data-gogo-notifications] element inside the Settings modal.
    mountMode: 'container',
    mountSelector: '[data-gogo-notifications]',
    storageKey: 'gogoCentralNotifications.crystal-quest'
  };

  var state = { busy: false, sdkReady: false, messaging: null, swRegistration: null, visibilityWired: false };

  // ------------------------- pure helpers (unit-tested) ---------------------

  function validateConfig(cfg) {
    cfg = cfg || CONFIG;
    var problems = [];
    if (!cfg || !cfg.appId) problems.push('appId missing');
    if (!cfg || !cfg.apiBase) problems.push('backend API base URL not configured yet');
    if (!cfg || !cfg.vapidPublicKey) problems.push('Web Push VAPID public key not configured yet');
    return { ok: problems.length === 0, disabled: problems.length > 0, problems: problems };
  }

  function normalizeBase(base) {
    return String(base || '').replace(/\/+$/, '');
  }

  function buildRegisterPayload(cfg, fcmToken, userAgent) {
    cfg = cfg || CONFIG;
    // Read the userAgent from the module's own root object (window in a
    // real browser). Node 21+ ships a partial global navigator, so an
    // ambient-global lookup would make the out-of-browser fallback value
    // non-deterministic across runtimes; root-scoping keeps it stable.
    var ua = userAgent ||
      (root.navigator && typeof root.navigator.userAgent === 'string' && root.navigator.userAgent) ||
      'unknown-web';
    return {
      appId: cfg.appId,
      fcmToken: String(fcmToken || ''),
      platform: 'web',
      userAgent: String(ua).slice(0, 300)
    };
  }

  function buildPreferencePayload(enabled) {
    enabled = !!enabled;
    return {
      enabled: enabled,
      webPush: enabled,
      androidPush: enabled,
      marketingAlerts: enabled,
      transactionalAlerts: enabled,
      quietHoursStart: '22:00',
      quietHoursEnd: '06:00'
    };
  }

  // Only GoGo domains may ever be opened from a notification.
  function safeUrl(raw) {
    try {
      var parsed = new URL(String(raw || ''), 'https://gogocompany.in/');
      if (parsed.protocol === 'https:' &&
          (parsed.hostname === 'gogocompany.in' || parsed.hostname === 'www.gogocompany.in')) {
        return parsed.href;
      }
    } catch (err) { /* fall through */ }
    return 'https://gogocompany.in/';
  }

  // ------------------------- environment guards ------------------------------

  function now() {
    return (typeof Date !== 'undefined' && Date.now) ? Date.now() : 0;
  }

  function hasDom() {
    return typeof document !== 'undefined' && !!document.getElementById;
  }

  function hasNotificationApi() {
    return typeof Notification !== 'undefined';
  }

  function swSupported() {
    return typeof navigator !== 'undefined' && !!navigator.serviceWorker;
  }

  function storageGet(key) {
    try { if (typeof localStorage !== 'undefined') return localStorage.getItem(key); } catch (err) {}
    return null;
  }
  function storageSet(key, value) {
    try { if (typeof localStorage !== 'undefined') localStorage.setItem(key, value); } catch (err) {}
  }
  function storageRemove(key) {
    try { if (typeof localStorage !== 'undefined') localStorage.removeItem(key); } catch (err) {}
  }
  function loadStored() {
    try { return JSON.parse(storageGet(CONFIG.storageKey) || 'null'); } catch (err) { return null; }
  }
  // ------------------------- onboarding (first-visit intro) -----------------

  var ONBOARDING_REMIND_AFTER_MS = 3 * 24 * 60 * 60 * 1000; // 3-day reminder
  var ONBOARDING_RESHOW_AFTER_MS = 24 * 60 * 60 * 1000;     // show at most once a day

  function loadOnboarding() {
    try { return JSON.parse(storageGet(CONFIG.storageKey + '.onboarding') || 'null'); } catch (err) { return null; }
  }
  function saveOnboarding(record) {
    storageSet(CONFIG.storageKey + '.onboarding', JSON.stringify(record || {}));
  }

  // Pure decision function (unit-tested). env: { configOk, pushSupported,
  // permission, active }. Returns { action: 'none'|'intro'|'reminder'|'blocked' }.
  function evaluateOnboarding(record, nowMs, env) {
    if (!env || !env.configOk || !env.pushSupported) return { action: 'none' };
    if (env.active) return { action: 'none' };
    record = record || {};
    var decision = record.decision || 'none';
    if (decision === 'enabled' || decision === 'dismissed-forever') return { action: 'none' };
    if (env.permission === 'denied') {
      if (record.blockedShown) return { action: 'none' };
      if (record.shownAt && nowMs - record.shownAt < ONBOARDING_RESHOW_AFTER_MS) return { action: 'none' };
      return { action: 'blocked' };
    }
    if (record.shownAt && nowMs - record.shownAt < ONBOARDING_RESHOW_AFTER_MS) return { action: 'none' };
    if (decision === 'not-now') {
      if (record.reminderShown) return { action: 'none' };
      if (nowMs - (record.decidedAt || 0) < ONBOARDING_REMIND_AFTER_MS) return { action: 'none' };
      return { action: 'reminder' };
    }
    return { action: 'intro' };
  }

  // Backend verification helper (unit-tested): the devices list must contain
  // this token for this app in a non-revoked state before "Active" is shown.
  function findRegisteredDevice(devices, fcmToken, appId) {
    if (!Array.isArray(devices) || !fcmToken) return null;
    for (var i = 0; i < devices.length; i++) {
      var d = devices[i];
      if (d && d.fcmToken === fcmToken && (!appId || d.appId === appId) &&
          (!d.status || d.status === 'active')) {
        return d;
      }
    }
    return null;
  }


  // ------------------------- UI ------------------------------------------------

  function setStatus(message) {
    if (!hasDom()) return;
    var el = document.getElementById('gogo-notifications-status');
    if (el) el.textContent = message;
    var intro = document.getElementById('gogo-notifications-intro-status');
    if (intro) intro.textContent = message;
  }

  function buildCardHtml() {
    return ''
      + '<div class="gogo-account-card gogo-account-card-page" id="gogo-notifications-card" style="max-width:480px;margin:22px auto;text-align:left">'
      + '<h3 class="gogo-account-title" style="margin:0 0 6px">Push Notifications</h3>'
      + '<p class="gogo-account-subtitle" style="margin:0 0 10px">Official GoGo ecosystem updates on this device. Optional, per-device, off anytime.</p>'
      + '<p id="gogo-notifications-status" role="status" style="margin:0 0 12px;font-size:13px;line-height:1.55">Checking status...</p>'
      + '<div style="display:flex;gap:10px;flex-wrap:wrap">'
      + '<button type="button" id="gogo-notifications-enable" class="gogo-btn gogo-btn-sm" style="padding:8px 14px;border-radius:8px;border:1px solid rgba(255,255,255,.25);cursor:pointer">Enable notifications</button>'
      + '<button type="button" id="gogo-notifications-disable" class="gogo-btn gogo-btn-sm" style="display:none;padding:8px 14px;border-radius:8px;border:1px solid rgba(255,255,255,.25);cursor:pointer">Turn off</button>'
      + '</div>'
      + '</div>';
  }

  function refreshStatus() {
    if (!hasDom()) return;
    var statusEl = document.getElementById('gogo-notifications-status');
    var enableBtn = document.getElementById('gogo-notifications-enable');
    var disableBtn = document.getElementById('gogo-notifications-disable');
    if (!statusEl) return;

    var check = validateConfig();
    if (!check.ok) {
      statusEl.textContent = 'Central notifications are not configured yet (backend deployment pending). Nothing is requested or sent in this state.';
      if (enableBtn) enableBtn.disabled = true;
      if (disableBtn) disableBtn.style.display = 'none';
      return;
    }
    if (!hasNotificationApi() || !swSupported()) {
      statusEl.textContent = 'This browser does not support web push notifications.';
      if (enableBtn) enableBtn.disabled = true;
      if (disableBtn) disableBtn.style.display = 'none';
      return;
    }

    var stored = loadStored();
    var granted = Notification.permission === 'granted' && stored && stored.fcmToken;
    if (Notification.permission === 'denied') {
      statusEl.textContent = 'Notifications are blocked for this site in your browser settings. Allow them for gogocompany.in, then tap Enable.';
      if (enableBtn) { enableBtn.disabled = false; enableBtn.style.display = ''; }
      if (disableBtn) disableBtn.style.display = 'none';
    } else if (granted) {
      statusEl.textContent = (stored && stored.verified)
        ? 'Active: notifications are enabled on this device and verified with GoGo Central. You can turn them off anytime.'
        : 'Notifications are enabled on this device. You can turn them off anytime.';
      if (enableBtn) enableBtn.style.display = 'none';
      if (disableBtn) { disableBtn.style.display = ''; disableBtn.disabled = false; }
    } else {
      statusEl.textContent = 'Tap Enable to receive official GoGo updates on this device. Nothing is sent without your explicit opt-in.';
      if (enableBtn) { enableBtn.style.display = ''; enableBtn.disabled = false; }
      if (disableBtn) disableBtn.style.display = 'none';
    }
  }

  function wireCard() {
    var enableBtn = document.getElementById('gogo-notifications-enable');
    var disableBtn = document.getElementById('gogo-notifications-disable');
    if (enableBtn && !enableBtn.getAttribute('data-gogo-wired')) {
      enableBtn.setAttribute('data-gogo-wired', '1');
      enableBtn.addEventListener('click', function () { enable(); });
    }
    if (disableBtn && !disableBtn.getAttribute('data-gogo-wired')) {
      disableBtn.setAttribute('data-gogo-wired', '1');
      disableBtn.addEventListener('click', function () { disable(); });
    }
    refreshStatus();
  }

  function injectCard() {
    if (!hasDom()) return;
    if (document.getElementById('gogo-notifications-card')) { wireCard(); return; }
    var host = document.querySelector(CONFIG.mountSelector);
    if (!host) return;
    var wrap = document.createElement('div');
    wrap.innerHTML = buildCardHtml();
    host.appendChild(wrap.firstElementChild);
    wireCard();
  }

  function mount() {
    injectCard();
    maybeShowIntro();
    if (CONFIG.mountMode === 'account-page' && typeof MutationObserver !== 'undefined') {
      var host = document.querySelector(CONFIG.mountSelector);
      if (host) {
        // GoGoAccount.renderAllUI() replaces page-root innerHTML wholesale on
        // every render; re-append our card after each wipe.
        new MutationObserver(function () { injectCard(); }).observe(host, { childList: true });
      }
    }
    // Recheck the permission whenever the visitor returns to this tab, so a
    // change made in browser settings is reflected without a page reload.
    if (!state.visibilityWired && hasDom() && document.addEventListener) {
      state.visibilityWired = true;
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') {
          refreshStatus();
          maybeShowIntro();
        }
      });
    }
  }


  // ------------------------- first-visit intro popup --------------------------

  function introElement() {
    return hasDom() ? document.getElementById('gogo-notifications-intro') : null;
  }

  function removeIntro() {
    var el = introElement();
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function buildIntroHtml(kind) {
    var statusText;
    if (kind === 'blocked') {
      statusText = 'Notifications are blocked for this site in your browser. '
        + 'Tap the padlock icon in the address bar, open Site settings, set Notifications to Allow, then reload the page.';
    } else if (kind === 'reminder') {
      statusText = 'Quick reminder: you can still turn on free GoGo alerts on this device. Off anytime.';
    } else {
      statusText = 'Get free, optional alerts from the GoGo ecosystem on this device:';
    }
    var items = [
      'GoGo Company announcements',
      'Sarkari Sarthi job alerts',
      'Pika News breaking news',
      'Crystal Quest updates',
      'Arrow Out updates',
      'Future GoGo product announcements'
    ];
    var listHtml = '';
    if (kind !== 'blocked') {
      listHtml = '<ul style="margin:0 0 12px;padding:0 0 0 18px;font-size:13px;line-height:1.7;color:#dfe4ff">'
        + items.map(function (t) { return '<li>' + t + '</li>'; }).join('')
        + '</ul>';
    }
    var enableHtml = kind === 'blocked' ? '' :
      '<button type="button" id="gogo-notifications-intro-enable" style="flex:1 1 auto;min-height:42px;border:0;border-radius:9px;background:linear-gradient(135deg,#4f6df5,#8a5cf6);color:#fff;font-size:14px;font-weight:600;cursor:pointer">Enable notifications</button>';
    var dismissLabel = kind === 'blocked' ? 'Got it' : 'Not now';
    return ''
      + '<div id="gogo-notifications-intro" role="dialog" aria-label="GoGo notifications introduction" style="position:fixed;z-index:2147483000;right:16px;bottom:16px;max-width:340px;width:calc(100% - 32px);background:#141b33;border:1px solid rgba(120,140,255,.35);border-radius:14px;padding:16px;box-shadow:0 12px 40px rgba(0,0,0,.45);font-family:system-ui,-apple-system,\'Segoe UI\',Roboto,sans-serif;color:#eef1ff;box-sizing:border-box;text-align:left">'
      + '<div style="display:flex;align-items:center;gap:10px;margin:0 0 8px">'
      + '<span style="width:34px;height:34px;flex:0 0 34px;border-radius:10px;background:linear-gradient(135deg,#4f6df5,#8a5cf6);display:inline-flex;align-items:center;justify-content:center">'
      + '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>'
      + '</span>'
      + '<strong style="font-size:15px">Stay in the loop with GoGo</strong>'
      + '<button type="button" id="gogo-notifications-intro-close" aria-label="Close" style="margin-left:auto;background:none;border:0;color:#9aa5d1;cursor:pointer;font-size:20px;line-height:1;padding:4px 8px">&times;</button>'
      + '</div>'
      + '<p id="gogo-notifications-intro-status" role="status" style="margin:0 0 10px;font-size:13px;line-height:1.55;color:#c6cdf2">' + statusText + '</p>'
      + listHtml
      + '<div style="display:flex;gap:10px;flex-wrap:wrap">'
      + enableHtml
      + '<button type="button" id="gogo-notifications-intro-dismiss" style="flex:0 1 auto;min-height:42px;padding:0 14px;border-radius:9px;border:1px solid rgba(154,165,209,.5);background:none;color:#c6cdf2;font-size:14px;cursor:pointer">' + dismissLabel + '</button>'
      + '</div>'
      + '</div>';
  }

  function onIntroDismiss(kind) {
    var record = loadOnboarding() || {};
    // The 3-day reminder is a ONE-time nudge: dismissing it means never again.
    record.decision = (kind === 'reminder') ? 'dismissed-forever' : 'not-now';
    record.decidedAt = now();
    saveOnboarding(record);
    removeIntro();
    refreshStatus();
  }

  function onIntroEnable() {
    if (state.busy) return;
    // The native permission prompt fires ONLY inside this explicit click
    // handler (via enable()); never on page load and never on a timer.
    enable().then(function (ok) {
      if (!ok) return; // the popup status line already shows the exact error
      var record = loadOnboarding() || {};
      record.decision = 'enabled';
      record.decidedAt = now();
      saveOnboarding(record);
      removeIntro();
    });
  }

  function showIntro(kind) {
    if (!hasDom() || introElement()) return;
    var record = loadOnboarding() || {};
    record.shownAt = now();
    if (kind === 'reminder') record.reminderShown = true;
    if (kind === 'blocked') record.blockedShown = true;
    saveOnboarding(record);
    var wrap = document.createElement('div');
    wrap.innerHTML = buildIntroHtml(kind);
    var card = wrap.firstElementChild;
    if (document.body) document.body.appendChild(card);
    var enableBtn = document.getElementById('gogo-notifications-intro-enable');
    var dismissBtn = document.getElementById('gogo-notifications-intro-dismiss');
    var closeBtn = document.getElementById('gogo-notifications-intro-close');
    if (enableBtn) enableBtn.addEventListener('click', function () { onIntroEnable(); });
    if (dismissBtn) dismissBtn.addEventListener('click', function () { onIntroDismiss(kind); });
    if (closeBtn) closeBtn.addEventListener('click', function () { onIntroDismiss(kind); });
  }

  function maybeShowIntro() {
    if (!hasDom() || introElement()) return;
    var check = validateConfig();
    var stored = loadStored();
    var env = {
      configOk: check.ok,
      pushSupported: hasNotificationApi() && swSupported(),
      permission: hasNotificationApi() ? Notification.permission : 'unsupported',
      active: !!(stored && stored.fcmToken && hasNotificationApi() && Notification.permission === 'granted')
    };
    var plan = evaluateOnboarding(loadOnboarding(), now(), env);
    if (plan.action === 'none') return;
    // Non-intrusive: the card appears a few seconds after the page settles,
    // never blocks input, and never steals focus.
    var delay = plan.action === 'intro' ? 4000 : 1500;
    setTimeout(function () { showIntro(plan.action); }, delay);
  }

  // ------------------------- SDK + auth ----------------------------------------

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('SDK_LOAD_FAILED: ' + src)); };
      document.head.appendChild(s);
    });
  }

  function ensureSdk() {
    if (state.sdkReady) return Promise.resolve();
    return loadScript(CONFIG.sdkBase + '/firebase-app-compat.js')
      .then(function () {
        return CONFIG.authMode === 'anonymous'
          ? loadScript(CONFIG.sdkBase + '/firebase-auth-compat.js')
          : null;
      })
      .then(function () {
        return loadScript(CONFIG.sdkBase + '/firebase-messaging-compat.js');
      })
      .then(function () {
        var fb = root.firebase;
        if (!fb || !fb.messaging) throw new Error('SDK_INIT_FAILED');
        if (!fb.apps.length) fb.initializeApp(CONFIG.firebaseConfig);
        state.messaging = fb.messaging();
        try {
          state.messaging.onTokenRefresh(function () { reRegisterSilently(); });
        } catch (err) { /* older SDKs */ }
        state.sdkReady = true;
      });
  }

  function getCurrentUser() {
    if (CONFIG.authMode === 'gogo-account') {
      var account = root.GoGoAccount;
      return (account && account.instance && account.instance.currentUser) ? account.instance.currentUser : null;
    }
    var fb = root.firebase;
    return (fb && fb.auth && fb.auth().currentUser) ? fb.auth().currentUser : null;
  }

  function ensureIdToken() {
    var user = getCurrentUser();
    if (user && typeof user.getIdToken === 'function') {
      return user.getIdToken(true);
    }
    if (CONFIG.authMode === 'anonymous' && root.firebase && root.firebase.auth) {
      return root.firebase.auth().signInAnonymously().then(function (cred) {
        return cred.user.getIdToken(true);
      });
    }
    return Promise.reject(new Error('SIGN_IN_REQUIRED'));
  }

  function apiFetch(path, options) {
    options = options || {};
    return ensureIdToken().then(function (token) {
      var headers = { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' };
      if (options.headers) {
        Object.keys(options.headers).forEach(function (k) { headers[k] = options.headers[k]; });
      }
      return fetch(normalizeBase(CONFIG.apiBase) + path, {
        method: options.method || 'GET',
        headers: headers,
        body: options.body || undefined
      });
    });
  }

  // ------------------------- enable / disable -----------------------------------

  function registerDevice(fcmToken) {
    return apiFetch('/api/v1/devices/register', {
      method: 'POST',
      body: JSON.stringify(buildRegisterPayload(CONFIG, fcmToken))
    }).then(function (res) {
      if (res.status === 401) throw new Error('SESSION_EXPIRED');
      if (res.status !== 200 && res.status !== 201) throw new Error('REGISTER_FAILED_' + res.status);
      return res.json().catch(function () { return null; });
    }).then(function (data) {
      var deviceId = (data && (data.deviceId || (data.device && data.device.deviceId))) || null;
      storageSet(CONFIG.storageKey, JSON.stringify({
        appId: CONFIG.appId,
        deviceId: deviceId,
        fcmToken: fcmToken,
        savedAt: now()
      }));
    });
  }

  function setPreferences(enabled) {
    return apiFetch('/api/v1/preferences/' + encodeURIComponent(CONFIG.appId), {
      method: 'PUT',
      body: JSON.stringify(buildPreferencePayload(enabled))
    }).then(function (res) {
      if (res.status === 401) throw new Error('SESSION_EXPIRED');
      if (res.status !== 200 && res.status !== 201) throw new Error('PREFERENCE_FAILED_' + res.status);
    });
  }
  // Backend registration verification: "Active" is only displayed after GoGo
  // Central confirms this device token exists for this app. Reuses the
  // existing GET /api/v1/devices endpoint - no new APIs, no new tables.
  function verifyRegistration(fcmToken) {
    return apiFetch('/api/v1/devices', { method: 'GET' })
      .then(function (res) {
        if (res.status === 401) throw new Error('SESSION_EXPIRED');
        if (res.status !== 200) throw new Error('VERIFY_FAILED_' + res.status);
        return res.json().catch(function () { return { devices: [] }; });
      })
      .then(function (data) {
        var found = findRegisteredDevice(data && data.devices, fcmToken, CONFIG.appId);
        if (!found) throw new Error('VERIFY_FAILED_NOT_FOUND');
        var stored = loadStored();
        if (stored && stored.fcmToken === fcmToken) {
          storageSet(CONFIG.storageKey, JSON.stringify({
            appId: CONFIG.appId,
            deviceId: stored.deviceId || found.deviceId || null,
            fcmToken: fcmToken,
            verified: true,
            verifiedAt: now(),
            savedAt: stored.savedAt || now()
          }));
        }
        return found;
      });
  }


  function enableErrorMessage(error) {
    var code = String((error && error.message) || error || '');
    if (code === 'PERMISSION_DENIED') {
      return 'Permission denied. Allow notifications for gogocompany.in in your browser site settings, then tap Enable again.';
    }
    if (code === 'SIGN_IN_REQUIRED') {
      return 'Please sign in to your GoGo Account first, then tap Enable again.';
    }
    if (code === 'SESSION_EXPIRED') {
      return 'Your session expired. Sign in again, then tap Enable again.';
    }
    if (code === 'NO_FCM_TOKEN') {
      return 'Could not obtain a push token from this browser. Please try again later.';
    }
    if (code.indexOf('SDK_LOAD_FAILED') === 0 || code.indexOf('SDK_INIT_FAILED') === 0) {
      return 'Could not load the messaging SDK. Check your connection and try again.';
    }
    if (code.indexOf('REGISTER_FAILED') === 0 || code.indexOf('PREFERENCE_FAILED') === 0) {
      return 'The GoGo Central backend rejected this device registration (' + code + '). Please try again later.';
    }
    if (code.indexOf('VERIFY_FAILED') === 0) {
      return 'GoGo Central could not confirm this device registration yet. Please try again in a moment.';
    }
    return 'Something went wrong while enabling notifications. Please try again later.';
  }

  function enable() {
    if (state.busy) return Promise.resolve(false);
    var check = validateConfig();
    if (!check.ok) { refreshStatus(); return Promise.resolve(false); }
    if (!hasNotificationApi() || !swSupported()) { refreshStatus(); return Promise.resolve(false); }
    if (CONFIG.authMode === 'gogo-account' && !getCurrentUser()) {
      setStatus('Please sign in to your GoGo Account first, then tap Enable again.');
      return Promise.resolve(false);
    }
    state.busy = true;
    setStatus('Asking for permission...');
    return Notification.requestPermission()
      .then(function (permission) {
        if (permission !== 'granted') throw new Error('PERMISSION_DENIED');
        setStatus('Loading the messaging SDK...');
        return ensureSdk();
      })
      .then(function () {
        setStatus('Registering the background worker...');
        return navigator.serviceWorker.register(
          CONFIG.swUrl,
          CONFIG.swScope ? { scope: CONFIG.swScope } : undefined
        );
      })
      .then(function (registration) {
        state.swRegistration = registration;
        setStatus('Getting this device push token...');
        return state.messaging.getToken({
          vapidKey: CONFIG.vapidPublicKey,
          serviceWorkerRegistration: registration
        });
      })
      .then(function (fcmToken) {
        if (!fcmToken) throw new Error('NO_FCM_TOKEN');
        setStatus('Registering this device with GoGo Central...');
        return registerDevice(fcmToken).then(function () { return fcmToken; });
      })
      .then(function (fcmToken) {
        setStatus('Saving your notification preferences...');
        return setPreferences(true).then(function () { return fcmToken; });
      })
      .then(function (fcmToken) {
        setStatus('Verifying your registration with GoGo Central...');
        return verifyRegistration(fcmToken).then(function () { return true; });
      })
      .then(function () {
        state.busy = false;
        refreshStatus();
        return true;
      })
      .catch(function (error) {
        state.busy = false;
        setStatus(enableErrorMessage(error));
        return false;
      });
  }

  function disable() {
    if (state.busy) return Promise.resolve(false);
    var stored = loadStored();
    state.busy = true;
    setStatus('Turning off notifications...');
    var operations = [];

    operations.push(setPreferences(false).catch(function (error) {
      if (String((error && error.message) || '').indexOf('SIGN_IN_REQUIRED') !== -1) return null;
      throw error;
    }));
    if (stored && stored.deviceId) {
      operations.push(apiFetch('/api/v1/devices/' + encodeURIComponent(stored.deviceId), { method: 'DELETE' })
        .then(function (res) {
          if (res.status !== 200 && res.status !== 204) throw new Error('DELETE_FAILED_' + res.status);
        })
        .catch(function (error) {
          if (String((error && error.message) || '').indexOf('SIGN_IN_REQUIRED') !== -1) return null;
          throw error;
        }));
    }
    if (state.sdkReady && state.messaging && stored && stored.fcmToken) {
      operations.push(state.messaging.deleteToken(stored.fcmToken).catch(function () { return null; }));
    }

    return Promise.all(operations)
      .then(function () {
        storageRemove(CONFIG.storageKey);
        state.busy = false;
        setStatus('Notifications are off for this device.');
        refreshStatus();
        return true;
      })
      .catch(function (error) {
        state.busy = false;
        setStatus('Could not fully turn off notifications (' + String((error && error.message) || 'network error') + '). Please try again.');
        return false;
      });
  }

  function reRegisterSilently() {
    // FCM rotated the push token: re-register with the backend without
    // prompting. If the visitor is signed out, skip — the backend will mark
    // the stale token expired on the next send.
    var stored = loadStored();
    if (!stored || !state.sdkReady || !state.messaging) return;
    if (CONFIG.authMode === 'gogo-account' && !getCurrentUser()) return;
    state.messaging.getToken({
      vapidKey: CONFIG.vapidPublicKey,
      serviceWorkerRegistration: state.swRegistration || undefined
    }).then(function (fcmToken) {
      if (!fcmToken || fcmToken === stored.fcmToken) return null;
      return registerDevice(fcmToken).then(function () {
        return setPreferences(true);
      });
    }).catch(function () { /* silent by design */ });
  }

  // ------------------------- public API -------------------------------------------

  var api = {
    config: CONFIG,
    state: state,
    enable: enable,
    disable: disable,
    mount: mount,
    refreshStatus: refreshStatus,
    internals: {
      validateConfig: validateConfig,
      normalizeBase: normalizeBase,
      buildRegisterPayload: buildRegisterPayload,
      buildPreferencePayload: buildPreferencePayload,
      safeUrl: safeUrl,
      evaluateOnboarding: evaluateOnboarding,
      findRegisteredDevice: findRegisteredDevice,
      onboardingDelaysMs: {
        remindAfterMs: ONBOARDING_REMIND_AFTER_MS,
        reshowAfterMs: ONBOARDING_RESHOW_AFTER_MS
      }
    }
  };
  root.GoGoNotifications = api;

  if (hasDom()) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mount);
    } else {
      mount();
    }
  }
}(typeof window !== 'undefined' ? window : globalThis));

