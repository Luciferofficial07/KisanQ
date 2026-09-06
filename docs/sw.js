self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  const { title, body } = event.data || {};
  if (!title) return;
  self.registration.showNotification(title, {
    body: body || "",
    icon: "./css/style.css",
    vibrate: [120, 80, 120]
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow("./"));
});
