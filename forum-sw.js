// Service worker til forummet.
//
// Den lever udenfor selve siden og kører videre, når app'en ligger i
// baggrunden eller er helt lukket. Det er den ENESTE måde at få en besked
// frem på en iPhone, hvor Safari fryser al JavaScript i baggrunden.

self.addEventListener('install', function (e) {
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(self.clients.claim());
});

// Serveren har skubbet en besked ud
self.addEventListener('push', function (event) {
  var data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = {}; }

  var titel = data.title || 'Castillo del Alma';
  var tekst = data.body || 'Ny besked i forummet';

  event.waitUntil(
    self.registration.showNotification(titel, {
      body: tekst,
      icon: '/img/forum-icon-192.png',
      badge: '/img/forum-icon-192.png',
      tag: 'cda-forum-' + (data.channel_id || 'x'),
      renotify: true,
      data: { url: data.url || '/forum.html' }
    })
  );
});

// Gæsten trykker på notifikationen: åbn forummet — eller skift til det
// vindue, der allerede har det åbent.
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || '/forum.html';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (liste) {
      for (var i = 0; i < liste.length; i++) {
        if (liste[i].url.indexOf('/forum.html') !== -1 && 'focus' in liste[i]) {
          return liste[i].focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
