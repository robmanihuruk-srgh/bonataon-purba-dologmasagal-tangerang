// Naikkan versi ini setiap kali app-shell (index.html/manifest/icon) diubah,
// supaya browser tahu ada versi baru dan mengganti cache lama.
const CACHE_NAME = 'notula-x-cache-v3';

// PENTING: path di bawah ini RELATIF ("./..."), bukan absolut ("/...").
// Path absolut hanya benar kalau app di-hosting persis di root domain.
// Kalau app ada di sub-folder (mis. https://domain.com/notula/), path
// absolut akan salah alamat dan bikin instalasi cache gagal total.
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

// Event Install: Menyimpan file penting ke cache browser.
// Pakai cache.add satu-satu (bukan cache.addAll) supaya satu file yang
// gagal di-fetch tidak menggagalkan instalasi service worker secara total.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        urlsToCache.map(url =>
          cache.add(url).catch(err => {
            console.warn('Service Worker: gagal cache', url, err);
          })
        )
      );
    }).then(() => {
      console.log('Service Worker: instalasi cache selesai');
      // Langsung aktifkan versi baru tanpa menunggu semua tab lama ditutup.
      return self.skipWaiting();
    })
  );
});

// Event Fetch: cache-first untuk file app-shell sendiri (same-origin GET).
// Request lain (API Firebase, CDN, dsb.) langsung diteruskan ke jaringan
// apa adanya supaya tidak mengganggu data live / auth.
self.addEventListener('fetch', event => {
  const req = event.request;

  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) {
    return; // biarkan browser menangani request ini secara normal
  }

  event.respondWith(
    caches.match(req).then(cached => {
      return cached || fetch(req).catch(() => cached);
    })
  );
});

// Event Activate: Membersihkan cache lama jika ada pembaruan aplikasi,
// dan langsung ambil alih semua tab yang sedang terbuka.
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});
