'use strict';

const CACHE_NAME = 'ngozistes-v4';
const OFFLINE_URL = '/offline.html';
const PRE_CACHE = ['/', '/index.html', '/offline.html', '/supabase-config.js', '/components.js', '/notifications.js'];

// ── Installation ────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRE_CACHE))
      .then(() => self.skipWaiting())
  );
});

// ── Activation ──────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ── Fetch avec cache ────────────────────────────────────
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('supabase.co')) return;
  if (event.request.url.includes('mixkit.co')) return;
  if (event.request.url.includes('emailjs.com')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request).then(cached => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') return caches.match(OFFLINE_URL);
        })
      )
  );
});

// ── PUSH NOTIFICATIONS (arrière-plan + veille) ──────────
self.addEventListener('push', event => {
  let data = { title: 'Ngozistes du Royaume', body: 'Nouvelle notification', type: 'info', url: '/' };

  if (event.data) {
    try { data = { ...data, ...event.data.json() }; }
    catch (_) { data.body = event.data.text(); }
  }

  const icons = { message: '💬', event: '📅', announcement: '📢', bureau: '👥', info: '🔔' };
  const icon = icons[data.type] || icons.info;

  const options = {
    body: data.body,
    icon: '/images/logo/logo.png',
    badge: '/images/logo/logo.png',
    tag: 'ngozistes-' + (data.type || 'info'),
    renotify: true,
    requireInteraction: data.type === 'urgent',
    data: { url: data.url || '/', type: data.type },
    actions: [
      { action: 'open', title: 'Ouvrir' },
      { action: 'close', title: 'Fermer' }
    ],
    vibrate: data.type === 'urgent' ? [200, 100, 200, 100, 200] : [200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification(icon + ' ' + data.title, options)
  );
});

// ── Clic sur notification ────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'close') return;

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.postMessage({ type: 'NOTIF_CLICK', url: urlToOpen });
            return client.focus();
          }
        }
        return clients.openWindow(urlToOpen);
      })
  );
});

// ── Sync en arrière-plan (Background Sync) ──────────────
self.addEventListener('sync', event => {
  if (event.tag === 'check-notifications') {
    event.waitUntil(checkPendingNotifications());
  }
});

async function checkPendingNotifications() {
  // Broadcast aux clients ouverts pour qu'ils vérifient leurs notifs
  const allClients = await clients.matchAll({ includeUncontrolled: true });
  allClients.forEach(client => client.postMessage({ type: 'CHECK_NOTIFS' }));
}

// ── Message depuis la page ────────────────────────────────
self.addEventListener('message', event => {
  if (event.data?.type === 'SHOW_NOTIF') {
    const { title, body, tag, url } = event.data;
    self.registration.showNotification(title, {
      body,
      icon: '/images/logo/logo.png',
      tag: tag || 'ngozistes',
      data: { url: url || '/' },
      vibrate: [200, 100, 200]
    });
  }
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});