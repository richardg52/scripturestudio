// Table of 7: lock-screen notifications (Web Push).
// - "key":  a signed-in seat asks for the public key to subscribe its phone. The server makes the
//           key pair itself the first time; the private half never leaves the database.
// - "test": a signed-in seat sends itself a test alert (it travels the same road as every alert).
// - "send": called only by the database when an alert is written (x-t7-token must match the pass
//           kept in private.push_config). Delivers to every phone that person has turned on, and
//           forgets phones that the push service says are gone.
// Deployed with verify_jwt = false: "send" comes from the database, not a phone; each action checks.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import webpush from "npm:web-push@3.6.7";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ALLOWED = [/^https:\/\/table-of-7\.netlify\.app$/, /^https:\/\/[a-z0-9-]+--table-of-7\.netlify\.app$/, /^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/];
const cors = (o: string | null) => ({
  "Access-Control-Allow-Origin": o && ALLOWED.some(r => r.test(o)) ? o : "https://table-of-7.netlify.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin",
});

Deno.serve(async (req) => {
  const h = { ...cors(req.headers.get("origin")), "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  const reply = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: h });
  const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } });
  try {
    const body = await req.json().catch(() => ({}));
    let cfg = (await admin.rpc("push_config_get")).data as { pub: string | null; priv: string | null; token: string };
    if (!cfg.pub) {
      const k = webpush.generateVAPIDKeys();
      await admin.rpc("push_config_set_keys", { p_pub: k.publicKey, p_priv: k.privateKey });
      cfg = (await admin.rpc("push_config_get")).data;          // whoever won the race, use what is stored
    }

    if (body.action === "send") {
      if (req.headers.get("x-t7-token") !== cfg.token) return reply({ ok: false }, 403);
      const { data: a } = await admin.from("alerts").select("id,to_member,text,event_id").eq("id", String(body.alert_id ?? "")).maybeSingle();
      if (!a) return reply({ ok: true, sent: 0 });
      const { data: subs } = await admin.from("push_subscriptions").select("endpoint,keys").eq("member_id", a.to_member);
      webpush.setVapidDetails("https://table-of-7.netlify.app", cfg.pub!, cfg.priv!);
      const payload = JSON.stringify({ title: "Table of 7", body: a.text, tag: a.event_id || a.id, url: "./" });
      let sent = 0;
      for (const s of subs ?? []) {
        try { await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, payload, { TTL: 60 * 60 * 24 }); sent++; }
        catch (e) {
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) await admin.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
          else console.error("push send", code, (e as Error).message);
        }
      }
      return reply({ ok: true, sent });
    }

    // the rest is for a signed-in, active seat
    const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: u } = await admin.auth.getUser(jwt);
    if (!u?.user) return reply({ ok: false, code: "signed_out" }, 401);
    const { data: seat } = await admin.from("members").select("id,status,name").eq("user_id", u.user.id).maybeSingle();
    if (!seat || seat.status !== "active") return reply({ ok: false, code: "not_active" }, 403);

    if (body.action === "key") return reply({ ok: true, key: cfg.pub });
    if (body.action === "test") {
      const first = String(seat.name).split(" ")[0];
      await admin.from("alerts").insert({ to_member: seat.id, text: `Notifications are on, ${first}. You'll hear about votes, invitations and The Tab here.` });
      return reply({ ok: true });
    }
    return reply({ ok: false, code: "action" }, 400);
  } catch (e) {
    console.error("push", (e as Error).message);
    return reply({ ok: false, code: "server" }, 500);
  }
});
