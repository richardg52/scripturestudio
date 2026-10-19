// Table of 7 Family Outing (his order, 2026-10-18, with "University of Memphis Tigers Basketball Games"). The only road
// that writes an outing; phones only read. Built on the Topgolf Outing road (functions/golf), for any kind of outing.
//   tigers {}                   the Tigers' men's basketball games from today on, read live from their official calendar
//   new {kind, title?, game?, date, time, hours?, place_pid?, city?, invited[], note?, dinner_event?}
//                               a Tigers outing names its game by uid; the server takes the game from the official
//                               calendar itself (never from the phone)
//   rsvp {id, ans}   claim {id} / unclaim {id}   booking {id, count, each?, extras?, details?, conf?}
//   pay {id, mode: sent|self, via?, conf?}   received {id, member}   cancel {id}
// The app never books and never moves money: the booker types what they really paid, and it is split by the people
// it covers.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { tigersGames, tgCentral, TIGERS_ICS } from "./tigers.js";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ALLOWED = [/^https:\/\/table-of-7\.netlify\.app$/, /^https:\/\/[a-z0-9-]+--table-of-7\.netlify\.app$/, /^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/];
const cors = (o: string | null) => ({
  "Access-Control-Allow-Origin": o && ALLOWED.some(r => r.test(o)) ? o : "https://table-of-7.netlify.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin",
});
const KINDS: Record<string, string> = { tigers: "the Tigers game", bowling: "bowling", minigolf: "mini golf", zoo: "the zoo", escape: "an escape room",
  skating: "skating", arcade: "the arcade", museum: "the museum", other: "an outing" };
const money = (n: number) => "$" + n.toFixed(2);
const clip = (x: unknown, k: number) => String(x ?? "").replace(/\s+/g, " ").trim().slice(0, k);
let cache: { at: number; text: string } | null = null;          // the official calendar, kept for 2 hours
async function schedule() {
  if (!cache || Date.now() - cache.at > 2 * 3600e3) {
    const r = await fetch(TIGERS_ICS, { headers: { "User-Agent": "TableOf7/1.0 (family app)" } });
    if (!r.ok) { console.error("outings tigers feed", r.status); if (!cache) return null; }
    else cache = { at: Date.now(), text: await r.text() };
  }
  return tigersGames(cache.text, tgCentral(Date.now()).date);
}

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
    const first = String(me.name).split(" ")[0];
    const body = await req.json().catch(() => ({}));
    const alert = async (to: string[], text: string) => { const t = [...new Set(to)].filter(x => x && x !== me.id); if (t.length) await admin.from("alerts").insert(t.map(x => ({ to_member: x, text }))); };

    if (body.action === "tigers") {
      const games = await schedule(); if (!games) return reply({ ok: false, code: "feed" });
      return reply({ ok: true, games });
    }

    if (body.action === "new") {
      const kind = String(body.kind ?? ""); if (!(kind in KINDS)) return reply({ ok: false, code: "kind" }, 400);
      let date = String(body.date ?? ""), time = String(body.time ?? ""), game = null;
      if (kind === "tigers") {
        const games = await schedule(); if (!games) return reply({ ok: false, code: "feed" });
        const g = games.find(x => x.uid === String(body.game ?? "")); if (!g) return reply({ ok: false, code: "game" }, 400);
        game = { uid: g.uid, opponent: g.opponent, home: g.home, location: g.location }; date = g.date; time = g.time ?? "TBA";
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !(/^\d{2}:\d{2}$/.test(time) || (kind === "tigers" && time === "TBA"))) return reply({ ok: false, code: "when" }, 400);
      const hours = body.hours === undefined || body.hours === null || body.hours === "" ? null : Number(body.hours);
      if (hours !== null && !(hours >= 0.5 && hours <= 8)) return reply({ ok: false, code: "hours" }, 400);
      const pid = body.place_pid ? String(body.place_pid) : null;
      if (!pid || !/^[A-Za-z0-9_-]{10,}$/.test(pid)) return reply({ ok: false, code: "place" }, 400);
      const title = clip(body.title, 60) || null; if (kind === "other" && !title) return reply({ ok: false, code: "title" }, 400);
      const asked = [...new Set([me.id, ...(Array.isArray(body.invited) ? body.invited : []).map(String)])];
      const { data: seats } = await admin.from("members").select("id,status").eq("family_id", me.family_id).in("id", asked);
      if ((seats ?? []).length !== asked.length || (seats ?? []).some(s => s.status !== "active")) return reply({ ok: false, code: "seats" }, 403);
      let dinner = null;
      if (body.dinner_event) { const { data: e } = await admin.from("events").select("id,family_id").eq("id", String(body.dinner_event)).maybeSingle(); if (!e || e.family_id !== me.family_id) return reply({ ok: false, code: "dinner" }, 400); dinner = e.id; }
      const { data: o, error } = await admin.from("outings").insert({ family_id: me.family_id, created_by: me.id, kind, title, game, place_pid: pid,
        city: clip(body.city ?? "Memphis", 40), date, time, hours, note: clip(body.note, 300) || null, dinner_event: dinner, invited: asked }).select().single();
      if (error) return reply({ ok: false, code: "server" }, 500);
      await admin.from("outing_people").insert(asked.map(x => ({ outing_id: o.id, member_id: x, rsvp: x === me.id ? "yes" : null })));
      const when = new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
      const what = kind === "tigers" ? `the Tigers vs ${game!.opponent}` : title || KINDS[kind];
      await alert(asked, `🎉 ${first} invited you to ${what} on ${when}. Open Family Outing to answer.`);
      return reply({ ok: true, outing: o });
    }

    const { data: o } = await admin.from("outings").select("*").eq("id", String(body.id ?? "")).maybeSingle();
    if (!o || o.family_id !== me.family_id || !(o.invited.includes(me.id) || me.role === "host")) return reply({ ok: false, code: "no_outing" }, 404);
    if (o.status !== "open") return reply({ ok: false, code: "cancelled" }, 409);
    const what = o.kind === "tigers" ? `the Tigers game` : o.title || KINDS[o.kind];
    const { data: ppl } = await admin.from("outing_people").select("*").eq("outing_id", o.id);
    const mine = (ppl ?? []).find(p => p.member_id === me.id);
    const touch = () => admin.from("outings").update({ updated_at: new Date().toISOString() }).eq("id", o.id);
    if (body.action === "rsvp") {
      const ans = String(body.ans ?? ""); if (!["yes", "maybe", "no"].includes(ans) || !mine) return reply({ ok: false, code: "illegal" }, 400);
      if (ans !== "yes" && mine.pay && mine.pay !== "self" && mine.pay !== "owe") return reply({ ok: false, code: "paid" }, 409);
      const patch: Record<string, unknown> = { rsvp: ans };
      if (ans !== "yes" && mine.pay === "owe") Object.assign(patch, { pay: null, amount: null });
      let spare = false;
      if (ans === "yes" && o.booking && !mine.pay && me.id !== o.buyer) {
        const taken = (ppl ?? []).filter(p => p.member_id !== me.id && p.member_id !== o.buyer && ["owe", "sent", "received"].includes(p.pay)).length + 1;
        if (taken < Number(o.booking.count)) { Object.assign(patch, { pay: "owe", amount: o.booking.share }); spare = true; }
      }
      await admin.from("outing_people").update(patch).eq("outing_id", o.id).eq("member_id", me.id); await touch();
      if (o.created_by && o.created_by !== me.id) await alert([o.created_by], `🎉 ${first} ${ans === "yes" ? "is coming" : ans === "maybe" ? "might come" : "can't make it"} to ${what}.`);
      if (spare && o.buyer) await alert([o.buyer], `🎟️ ${first} is taking one of the places you booked for ${what} and owes you ${money(Number(o.booking.share))}.`);
      return reply({ ok: true });
    }
    if (body.action === "claim") {
      if (o.buyer) return reply({ ok: false, code: "claimed" }, 409);
      if (!mine || mine.rsvp !== "yes") return reply({ ok: false, code: "going" }, 409);
      const { data: done } = await admin.from("outings").update({ buyer: me.id, updated_at: new Date().toISOString() }).eq("id", o.id).is("buyer", null).select("id");
      if (!done?.length) return reply({ ok: false, code: "claimed" }, 409);
      await alert(o.invited, `🎟️ ${first} is booking ${what}. Please don't book twice.`);
      return reply({ ok: true });
    }
    if (body.action === "unclaim") {
      if (o.buyer !== me.id || o.booking) return reply({ ok: false, code: "illegal" }, 409);
      await admin.from("outings").update({ buyer: null, updated_at: new Date().toISOString() }).eq("id", o.id);
      return reply({ ok: true });
    }
    if (body.action === "booking") {
      if (o.buyer !== me.id) return reply({ ok: false, code: "not_buyer" }, 403);
      const count = Number(body.count), each = Number(body.each ?? 0), extras = Number(body.extras ?? 0);
      if (!Number.isInteger(count) || count < 1 || count > 30 || !(each >= 0 && each < 2000) || !(extras >= 0 && extras < 5000)) return reply({ ok: false, code: "numbers" }, 400);
      const total = Math.round((count * each + extras) * 100) / 100; if (!(total > 0)) return reply({ ok: false, code: "numbers" }, 400);
      const share = Math.round(total / count * 100) / 100;
      const booking = { count, each, extras, total, share, details: clip(body.details, 120), conf: clip(body.conf, 40), at: new Date().toISOString() };
      await admin.from("outings").update({ booking, updated_at: new Date().toISOString() }).eq("id", o.id);
      const owe = (ppl ?? []).filter(p => p.rsvp === "yes" && p.member_id !== me.id && p.pay !== "self" && p.pay !== "received" && p.pay !== "sent");
      for (const p of owe) await admin.from("outing_people").update({ pay: "owe", amount: share }).eq("outing_id", o.id).eq("member_id", p.member_id);
      await alert(owe.map(p => p.member_id), `🎟️ ${first} booked ${what}: ${money(share)} each. Open Family Outing to pay ${first} back, or tap Paying my own way.`);
      return reply({ ok: true });
    }
    if (body.action === "pay") {
      const mode = String(body.mode ?? "");
      if (!mine || !["sent", "self"].includes(mode) || mine.pay === "received" || me.id === o.buyer) return reply({ ok: false, code: "illegal" }, 400);
      if (mode === "sent" && (mine.pay !== "owe" || !o.booking)) return reply({ ok: false, code: "illegal" }, 400);
      const patch = mode === "sent" ? { pay: "sent", via: clip(body.via, 20) || "Cash", sent_at: new Date().toISOString() }
        : { pay: "self", amount: null, via: null, own: { conf: clip(body.conf, 40) }, rsvp: "yes" };
      await admin.from("outing_people").update(patch).eq("outing_id", o.id).eq("member_id", me.id); await touch();
      if (o.buyer) await alert([o.buyer], mode === "sent" ? `💸 ${first} says they paid you ${money(Number(mine.amount ?? 0))} for ${what} by ${patch.via}. Tap Received when it arrives.` : `🎉 ${first} is paying their own way for ${what}.`);
      return reply({ ok: true });
    }
    if (body.action === "received") {
      if (o.buyer !== me.id) return reply({ ok: false, code: "not_buyer" }, 403);
      const who = (ppl ?? []).find(p => p.member_id === String(body.member ?? ""));
      if (!who || !["owe", "sent"].includes(who.pay)) return reply({ ok: false, code: "illegal" }, 400);
      await admin.from("outing_people").update({ pay: "received", received_at: new Date().toISOString(), via: who.via || "Cash" }).eq("outing_id", o.id).eq("member_id", who.member_id); await touch();
      await alert([who.member_id], `🧾 ${first} received your ${money(Number(who.amount ?? 0))} for ${what}. Your receipt is in Family Outing.`);
      return reply({ ok: true });
    }
    if (body.action === "cancel") {
      if (o.created_by !== me.id && me.role !== "host") return reply({ ok: false, code: "not_planner" }, 403);
      await admin.from("outings").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", o.id);
      await alert(o.invited, `🎉 ${first} cancelled ${what}.`);
      return reply({ ok: true });
    }
    return reply({ ok: false, code: "action" }, 400);
  } catch (e) {
    console.error("outings", (e as Error).message);
    return reply({ ok: false, code: "server" }, 500);
  }
});
