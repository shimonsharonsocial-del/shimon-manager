// שומר את קובצי האפליקציה כדי שתיפתח גם בלי אינטרנט. הנתונים עצמם מסונכרנים דרך Firebase.
const CACHE = 'bayit-v5';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, {cache: 'reload'}))))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // קובצי האפליקציה: תמיד הגרסה הכי חדשה מהשרת (בלי מטמון הדפדפן), ואם אין אינטרנט אז מהעותק השמור
    e.respondWith(fetch(req, {cache: 'no-store'}).then(r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return r; })
      .catch(() => caches.match(req, {ignoreSearch: true}).then(r => r || caches.match('./index.html'))));
  } else if (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })));
  }
});

// התראות: הצגת ההתראה שמגיעה מהשרת (למשל נפנוף 👋), ופתיחת האפליקציה בלחיצה עליה
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (_) {}
  const p = d.data || d.notification || d;
  e.waitUntil(self.registration.showNotification(p.title || 'הבית שלנו', {
    body: p.body || '', icon: 'icon-192.png', badge: 'icon-192.png', tag: p.tag || 'bayit', renotify: true, dir: 'rtl', lang: 'he', data: {url: p.url || './'}
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({type: 'window', includeUncontrolled: true}).then(cs => {
    const c = cs.find(x => x.url.includes('/family/'));
    return c ? c.focus() : self.clients.openWindow((e.notification.data && e.notification.data.url) || './');
  }));
});
