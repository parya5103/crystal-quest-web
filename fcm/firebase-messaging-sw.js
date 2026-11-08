/*
 * GoGo Central — FCM background service worker for the GoGo Company portal.
 * Scope: its own fcm/ subdirectory inside the Crystal Quest app path. The
 * game's own sw.js keeps the app root scope and cq cache untouched. This
 * worker installs NO fetch handler on purpose: it cannot affect page
 * loading, caching, offline play or the game service worker. It only
 * it cannot affect page loading, caching or offline behaviour. It only
 * displays FCM background messages and focuses/opens the notification link.
 * Links are restricted to gogocompany.in; anything else falls back to the
 * portal home page (defence in depth on top of the backend deepLink
 * allowlist).
 */
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyCtfvrvfRSlZmiNBluRLeHCLNgaNkuY-_4',
  authDomain: 'gen-lang-client-0566323659.firebaseapp.com',
  projectId: 'gen-lang-client-0566323659',
  messagingSenderId: '388829027444',
  appId: '1:388829027444:web:5b6dee8967f6abdc520521'
});

var SAFE_FALLBACK_URL = 'https://gogocompany.in/';

function safeUrl(raw) {
  try {
    var parsed = new URL(String(raw || ''), SAFE_FALLBACK_URL);
    if (parsed.protocol === 'https:' &&
        (parsed.hostname === 'gogocompany.in' || parsed.hostname === 'www.gogocompany.in')) {
      return parsed.href;
    }
  } catch (err) { /* fall through */ }
  return SAFE_FALLBACK_URL;
}

var messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  var notification = (payload && payload.notification) || {};
  var data = (payload && payload.data) || {};
  var notificationId = String(
    data.notificationId || data.campaignId || ('gogo-' + new Date().getTime())
  );
  // tag collapses duplicate ecosystem-wide deliveries on one device.
  var link = safeUrl(data.deepLink || data.link || notification.click_action || SAFE_FALLBACK_URL);
  return self.registration.showNotification(String(notification.title || 'GoGo Company'), {
    body: String(notification.body || ''),
    tag: notificationId,
    renotify: false,
    icon: new URL('../icon.svg', self.registration.scope).href,
    data: { url: link, notificationId: notificationId }
  });
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var target = safeUrl(event.notification.data && event.notification.data.url);
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url && client.url.indexOf('gogocompany.in') !== -1 && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
