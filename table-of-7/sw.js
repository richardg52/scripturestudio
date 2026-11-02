/* Table of 8: shows lock-screen notifications sent by the server (functions/push), and opens the
   app when one is tapped. It does not store or serve pages offline, so the app is never stale. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "Table of 8", {
    body: d.body || "Something new at the table.",
    tag: d.tag || undefined,
    icon: "icon-192.png",
    badge: "icon-192.png",
    data: { url: d.url || "./" },
  }));
});

// A tapped notification opens what it is about (2026-11-01: it used to bring the app up on Home every time). The
// server puts the target in the address as ?go=kind:id. An open app is sent a message to go there; a closed one is
// opened at the address and goes there once it is signed in.
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "./";
  let go = ""; try { go = new URL(url, self.location.href).searchParams.get("go") || ""; } catch {}
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(wins => {
    for (const w of wins) if ("focus" in w) { if (go) w.postMessage({ t8go: go }); return w.focus(); }
    return self.clients.openWindow(url);
  }));
});
