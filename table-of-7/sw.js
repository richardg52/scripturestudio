/* Table of 7: shows lock-screen notifications sent by the server (functions/push), and opens the
   app when one is tapped. It does not store or serve pages offline, so the app is never stale. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "Table of 7", {
    body: d.body || "Something new at the table.",
    tag: d.tag || undefined,
    icon: "icon-192.png",
    badge: "icon-192.png",
    data: { url: d.url || "./" },
  }));
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(wins => {
    for (const w of wins) if ("focus" in w) return w.focus();
    return self.clients.openWindow(e.notification.data && e.notification.data.url || "./");
  }));
});
