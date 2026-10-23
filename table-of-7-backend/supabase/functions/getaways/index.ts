// Table of 8 Getaways (his order, 2026-10-23): Nashville, Atlanta, Chicago, Dallas, Houston, St. Louis and Alabama (Birmingham,
// Huntsville, Gulf Shores) — breakfast, brunch, lunch and dinner, shopping, sights, comedy, music, NFL and NBA games, for a
// couple or the family, with an estimated package (travel, hotel, food, things to do). The only road that writes a getaway.
//   events {city, from, to}      concerts, comedy, shows and NFL/NBA games on those days (Ticketmaster, his key)
//   new {city, title, start, nights, travel, tier, adults, kids, invited[], plan, estimate, note?}
//   save {id, plan, estimate, title?, start?, nights?, travel?, tier?, adults?, kids?}   the planner changes it
//   rsvp {id, ans}               my answer
//   invite {id, invited[]}       the planner changes who's invited
//   cancel {id}                  the planner or the host
// The places themselves are curated in the app (checked on Google, our own words); the estimate is worked out in the app by
// trip.js (one copy, synced) and stored as the planner saw it. Only the people invited, the planner and the host see a getaway.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { GW_GEO, tmTripUrl, tmTrip } from "./trip.js";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TMKEY = (Deno.env.get("TICKETMASTER_API_KEY") ?? "").trim();
const ALLOWED = [/^https:\/\/table-of-[78]\.netlify\.app$/, /^https:\/\/[a-z0-9-]+--table-of-[78]\.netlify\.app$/, /^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/];
const cors = (o: string | null) => ({
  "Access-Control-Allow-Origin": o && ALLOWED.some(r => r.test(o)) ? o : "https://table-of-8.netlify.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin",
});
const clip = (x: unknown, k: number) => String(x ?? "").replace(/\s+/g, " ").trim().slice(0, k);
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
const dayOf = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
const addDays = (d: string, n: number) => new Date(Date.parse(d + "T12:00:00Z") + n * 864e5).toISOString().slice(0, 10);
const small = (x: unknown, max: number) => { try { const s = JSON.stringify(x ?? {}); return s.length <= max ? JSON.parse(s) : null; } catch { return null; } };
const cache = new Map<string, { at: number; v: unknown }>();

Deno.serve(async (req) => {
  const h = { ...cors(req.headers.get("origin")), "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  const reply = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: h });
  try {
    const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } });
    const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: u } = await admin.auth.getUser(jwt);
    if (!u?.user) return reply({ ok: false, code: "signed_out" }, 401);
    const { data: me } = await admin.from("members").select("id,family_id,status,name,role").eq("user_id", u.user.id).maybeSingle();
    if (!me || me.status !== "active") return reply({ ok: false, code: "not_active" }, 403);
    const host = me.role === "host", first = String(me.name).split(" ")[0];
    const body = await req.json().catch(() => ({}));
    const alert = async (to: string[], text: string) => { const t = [...new Set(to)].filter(x => x && x !== me.id); if (t.length) await admin.from("alerts").insert(t.map(x => ({ to_member: x, text }))); };
    const seatsOk = async (ids: string[]) => {
      const { data } = await admin.from("members").select("id,status").eq("family_id", me.family_id).in("id", ids.length ? ids : ["-"]);
      return (data ?? []).length === ids.length && (data ?? []).every(s => s.status === "active");
    };
    const shape = (b: any) => {
      const city = String(b.city ?? ""); if (!GW_GEO[city as keyof typeof GW_GEO]) return { code: "city" };
      const start = String(b.start ?? ""); if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || start < today()) return { code: "date" };
      const nights = Math.round(+b.nights); if (!(nights >= 1 && nights <= 14)) return { code: "nights" };
      const adults = Math.round(+b.adults), kids = Math.round(+b.kids || 0);
      if (!(adults >= 1 && adults <= 30) || !(kids >= 0 && kids <= 30)) return { code: "people" };
      const plan = small(b.plan, 40000), estimate = small(b.estimate, 8000); if (!plan || !estimate) return { code: "too_big" };
      return { row: { city, title: clip(b.title, 120) || `${city} getaway`, start, nights, travel: b.travel === "fly" ? "fly" : "drive", tier: b.tier === "upscale" ? "upscale" : "mid",
        adults, kids, plan, estimate, note: clip(b.note, 400) || null } };
    };

    if (body.action === "events") {
      const city = String(body.city ?? ""), from = String(body.from ?? ""), to = String(body.to ?? "");
      if (!GW_GEO[city as keyof typeof GW_GEO] || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || to < from || to > addDays(from, 15)) return reply({ ok: false, code: "range" });
      if (!TMKEY) return reply({ ok: true, events: [], note: "no_key" });
      const key = `${city}|${from}|${to}`, c = cache.get(key);
      if (c && Date.now() - c.at < 3 * 3600e3) return reply({ ok: true, events: c.v });
      try {
        const r = await fetch(tmTripUrl(TMKEY, city, from, to), { headers: { accept: "application/json" }, signal: AbortSignal.timeout(15000) });
        if (!r.ok) { console.error("getaways tm", r.status); return reply({ ok: false, code: "tickets" }); }
        const events = tmTrip(await r.json(), from, to); cache.set(key, { at: Date.now(), v: events });
        return reply({ ok: true, events });
      } catch (e) { console.error("getaways tm", (e as Error).message); return reply({ ok: false, code: "tickets" }); }
    }

    if (body.action === "new") {
      const s = shape(body); if ("code" in s) return reply({ ok: false, code: s.code });
      const invited = [...new Set((Array.isArray(body.invited) ? body.invited : []).map(String))].filter(x => x !== me.id).slice(0, 30);
      if (invited.length && !(await seatsOk(invited))) return reply({ ok: false, code: "not_family" });
      const { data: g, error } = await admin.from("getaways").insert({ ...s.row, family_id: me.family_id, created_by: me.id, invited }).select("id").single();
      if (error) { console.error("getaways new", error.message); return reply({ ok: false, code: "server" }, 500); }
      await admin.from("getaway_people").insert({ getaway_id: g.id, member_id: me.id, family_id: me.family_id, rsvp: "yes" });
      await alert(invited, `🧳 ${first} invited you on a getaway: ${s.row.title} · ${dayOf(s.row.start)}, ${s.row.nights} ${s.row.nights === 1 ? "night" : "nights"}`);
      return reply({ ok: true, id: g.id });
    }

    const { data: g } = await admin.from("getaways").select("*").eq("id", String(body.id ?? "")).maybeSingle();
    if (!g || g.family_id !== me.family_id) return reply({ ok: false, code: "no_getaway" });
    const mine = g.created_by === me.id, invited = mine || (g.invited ?? []).includes(me.id);
    if (!invited && !host) return reply({ ok: false, code: "not_invited" });
    if (g.status !== "open" && body.action !== "cancel") return reply({ ok: false, code: "cancelled" });

    if (body.action === "save") {
      if (!mine) return reply({ ok: false, code: "not_yours" });
      const s = shape({ ...g, ...body, start: body.start ?? g.start }); if ("code" in s) return reply({ ok: false, code: s.code });
      await admin.from("getaways").update({ ...s.row, updated_at: new Date().toISOString() }).eq("id", g.id);
      return reply({ ok: true });
    }
    if (body.action === "rsvp") {
      if (!invited) return reply({ ok: false, code: "not_invited" });
      const ans = ["yes", "maybe", "no"].includes(body.ans) ? body.ans : null; if (!ans) return reply({ ok: false, code: "answer" });
      await admin.from("getaway_people").upsert({ getaway_id: g.id, member_id: me.id, family_id: me.family_id, rsvp: ans, updated_at: new Date().toISOString() });
      if (!mine) await alert([g.created_by], `🧳 ${first} ${ans === "yes" ? "is in ✅" : ans === "maybe" ? "might come 🤔" : "can't come ❌"} for ${g.title}`);
      return reply({ ok: true });
    }
    if (body.action === "invite") {
      if (!mine && !host) return reply({ ok: false, code: "not_yours" });
      const list = [...new Set((Array.isArray(body.invited) ? body.invited : []).map(String))].filter(y => y !== g.created_by).slice(0, 30);
      if (list.length && !(await seatsOk(list))) return reply({ ok: false, code: "not_family" });
      const added = list.filter(y => !(g.invited ?? []).includes(y));
      await admin.from("getaways").update({ invited: list, updated_at: new Date().toISOString() }).eq("id", g.id);
      await admin.from("getaway_people").delete().eq("getaway_id", g.id).not("member_id", "in", `(${[g.created_by, ...list].map(s => `"${s}"`).join(",")})`);
      await alert(added, `🧳 ${first} invited you on a getaway: ${g.title} · ${dayOf(g.start)}`);
      return reply({ ok: true });
    }
    if (body.action === "cancel") {
      if (!mine && !host) return reply({ ok: false, code: "not_yours" });
      await admin.from("getaways").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", g.id);
      await alert([...(g.invited ?? []), g.created_by], `🧳 ${g.title} was called off.`);
      return reply({ ok: true });
    }
    return reply({ ok: false, code: "action" }, 400);
  } catch (e) {
    console.error("getaways", (e as Error).message);
    return reply({ ok: false, code: "server" }, 500);
  }
});
