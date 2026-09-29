self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Κενό fetch event: Ικανοποιεί 100% τον Chrome χωρίς να χαλάει κανένα αίτημα
self.addEventListener('fetch', () => {});