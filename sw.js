/* 플레이어 — 오프라인 담당.
   한 번 열어 두면 인터넷이 끊겨도, 비행기 모드에서도 열린다.
   음악·영상 파일은 사용자가 기기에서 직접 고르는 것이라 여기 담기지 않는다. */

const CACHE  = 'player-v4';
const APP    = './';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './favicon.ico',
  './icons/cat2-32.png',
  './icons/cat2-192.png',
  './icons/cat2-512.png',
  './icons/cat2-maskable-512.png',
  './icons/cat2-apple-180.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      /* 하나가 없어도 설치가 통째로 실패하지 않게 개별로 담는다 */
      .then(c => Promise.all(ASSETS.map(u => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  let sameOrigin = false, path = '';
  try {
    const u = new URL(req.url);
    sameOrigin = u.origin === self.location.origin;
    path = u.pathname;
  } catch (err) {}
  if (!sameOrigin) return;                    // 남의 출처는 건드리지 않는다

  const isDoc = req.mode === 'navigate' ||
                req.destination === 'document' ||
                /\.(html|js|json)$/i.test(path);

  const save = res => {
    if (res && res.ok && res.type === 'basic') {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
    }
    return res;
  };

  if (isDoc) {
    /* 본체·설정 파일은 네트워크 우선.
       캐시 우선으로 두면 한 번 설치한 뒤 앱이 영영 갱신되지 않는다. */
    e.respondWith(
      fetch(req).then(save).catch(() =>
        caches.match(req, { ignoreSearch: true })
          .then(hit => hit || caches.match(APP))
      )
    );
  } else {
    /* 아이콘처럼 변하지 않는 것은 캐시 우선 */
    e.respondWith(
      caches.match(req, { ignoreSearch: true })
        .then(hit => hit || fetch(req).then(save).catch(() => Response.error()))
    );
  }
});

self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
