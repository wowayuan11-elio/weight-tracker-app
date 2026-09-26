/* 双人体重小本本 - Service Worker
 * 发布新版本时必须把 CACHE 版本号 +1，否则老资源不会更新
 * 策略（2026-09-25 改版）：HTML/JS/CSS 网络优先——用户每次打开都拿最新代码，
 * 离线才用缓存兜底；图片等资源缓存优先。根治 iOS 主屏 App 更新卡旧版问题 */
const CACHE = 'wt-static-v20';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './favicon.png'
];
const FRESH = ['index.html', 'app.js', 'styles.css', 'manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  /* 页面导航走网络优先：发新版后用户下次打开就能拿到最新页面 */
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put('./index.html', clone));
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  const path = url.pathname.split('/').pop();
  const isFresh = FRESH.indexOf(path) !== -1;

  if (isFresh) {
    /* 核心代码：网络优先，断了才用缓存——保证打开即最新 */
    e.respondWith(
      fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(h => h || caches.match('./index.html')))
    );
    return;
  }

  /* 图片等：缓存优先 */
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => {
      if (hit) return hit;
      return fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
