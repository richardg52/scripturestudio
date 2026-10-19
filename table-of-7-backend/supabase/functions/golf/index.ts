// Table of 7 Topgolf outings (his order, 2026-10-18: "like we do for the movies"). The only road that writes one;
// phones only read. Built on the Movie Night road (functions/movies), with a bay booking where the movie has tickets.
//   new {date, time, hours, venue_pid, city, invited[], note?, dinner_event?}   the planner; everyone invited is told
//   rsvp {id, ans: yes|maybe|no}
//   claim {id} / unclaim {id}   "I'll book the bay" (one booker, so nobody books twice)
//   booking {id, players, bays, bay_cost, extras, bay_no, conf}   the booker, after booking on Topgolf's own site
//   pay {id, mode: sent|self, via?, conf?}     "I paid <booker> back" or "Paying for myself"
//   received {id, member}       the booker confirms the money arrived: that person's receipt is ready, and they're told
//   cancel {id}                 the planner or the host
// Topgolf prices each bay by the hour, by venue, day and time, and up to 6 play in a bay: the app never states a price.
// The app never books a bay and never moves money.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ALLOWED = [/^https:\/\/table-of-[78]\.netlify\.app$/, /^https:\/\/[a-z0-9-]+--table-of-[78]\.netlify\.app$/, /^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/];
const cors = (o: string | null) => ({
  "Access-Control-Allow-Origin": o && ALLOWED.some(r => r.test(o)) ? o : "https://table-of-8.netlify.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin",
});
const money = (n: number) => "$" + n.toFixed(2);
const clip = (x: unknown, k: number) => String(x ?? "").replace(/\s+/g, " ").trim().slice(0, k);

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

    // ---- a new outing ----
    if (body.action === "new") {
      const date = String(body.date ?? ""), time = String(body.time ?? ""), hours = Number(body.hours ?? 2);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return reply({ ok: false, code: "when" }, 400);
      if (![1, 1.5, 2, 2.5, 3, 4].includes(hours)) return reply({ ok: false, code: "hours" }, 400);
      const pid = body.venue_pid ? String(body.venue_pid) : null;
      if (!pid || !/^[A-Za-z0-9_-]{10,}$/.test(pid)) return reply({ ok: false, code: "venue" }, 400);
      const asked = [...new Set([me.id, ...(Array.isArray(body.invited) ? body.invited : []).map(String)])];
      const { data: seats } = await admin.from("members").select("id,status").eq("family_id", me.family_id).in("id", asked);
      if ((seats ?? []).length !== asked.length || (seats ?? []).some(s => s.status !== "active")) return reply({ ok: false, code: "seats" }, 403);
      let dinner = null;
      if (body.dinner_event) { const { data: e } = await admin.from("events").select("id,family_id").eq("id", String(body.dinner_event)).maybeSingle(); if (!e || e.family_id !== me.family_id) return reply({ ok: false, code: "dinner" }, 400); dinner = e.id; }
      const { data: o, error } = await admin.from("golf_outings").insert({ family_id: me.family_id, created_by: me.id, venue_pid: pid,
        city: clip(body.city ?? "Memphis", 40), date, time, hours, note: clip(body.note, 300) || null, dinner_event: dinner, invited: asked }).select().single();
      if (error) return reply({ ok: false, code: "server" }, 500);
      await admin.from("golf_people").insert(asked.map(x => ({ outing_id: o.id, member_id: x, rsvp: x === me.id ? "yes" : null })));
      const when = new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
      await alert(asked, `⛳ ${first} invited you to Topgolf on ${when}. Open Topgolf Outing to answer.`);
      return reply({ ok: true, outing: o });
    }

    // ---- everything else acts on one outing ----
    const { data: o } = await admin.from("golf_outings").select("*").eq("id", String(body.id ?? "")).maybeSingle();
    if (!o || o.family_id !== me.family_id || !(o.invited.includes(me.id) || me.role === "host")) return reply({ ok: false, code: "no_outing" }, 404);
    if (o.status !== "open") return reply({ ok: false, code: "cancelled" }, 409);
    const { data: ppl } = await admin.from("golf_people").select("*").eq("outing_id", o.id);
    const mine = (ppl ?? []).find(p => p.member_id === me.id);
    const touch = () => admin.from("golf_outings").update({ updated_at: new Date().toISOString() }).eq("id", o.id);
    if (body.action === "rsvp") {
      const ans = String(body.ans ?? ""); if (!["yes", "maybe", "no"].includes(ans) || !mine) return reply({ ok: false, code: "illegal" }, 400);
      if (ans !== "yes" && mine.pay && mine.pay !== "self" && mine.pay !== "owe") return reply({ ok: false, code: "paid" }, 409);
      const patch: Record<string, unknown> = { rsvp: ans };
      if (ans !== "yes" && mine.pay === "owe") Object.assign(patch, { pay: null, amount: null });
      // a late yes takes one of the booked places, if any are left, and owes its share
      let spare = false;
      if (ans === "yes" && o.booking && !mine.pay && me.id !== o.buyer) {
        const taken = (ppl ?? []).filter(p => p.member_id !== me.id && p.member_id !== o.buyer && ["owe", "sent", "received"].includes(p.pay)).length + 1;
        if (taken < Number(o.booking.players)) { Object.assign(patch, { pay: "owe", amount: o.booking.share }); spare = true; }
      }
      await admin.from("golf_people").update(patch).eq("outing_id", o.id).eq("member_id", me.id); await touch();
      if (o.created_by && o.created_by !== me.id) await alert([o.created_by], `⛳ ${first} ${ans === "yes" ? "is coming" : ans === "maybe" ? "might come" : "can't make it"} to Topgolf.`);
      if (spare && o.buyer) await alert([o.buyer], `⛳ ${first} is taking one of the booked places at Topgolf and owes you ${money(Number(o.booking.share))}.`);
      return reply({ ok: true });
    }
    if (body.action === "claim") {
      if (o.buyer) return reply({ ok: false, code: "claimed" }, 409);
      if (!mine || mine.rsvp !== "yes") return reply({ ok: false, code: "going" }, 409);
      const { data: done } = await admin.from("golf_outings").update({ buyer: me.id, updated_at: new Date().toISOString() }).eq("id", o.id).is("buyer", null).select("id");
      if (!done?.length) return reply({ ok: false, code: "claimed" }, 409);
      await alert(o.invited, `⛳ ${first} is booking the Topgolf bay. Please don't book twice.`);
      return reply({ ok: true });
    }
    if (body.action === "unclaim") {
      if (o.buyer !== me.id || o.booking) return reply({ ok: false, code: "illegal" }, 409);
      await admin.from("golf_outings").update({ buyer: null, updated_at: new Date().toISOString() }).eq("id", o.id);
      return reply({ ok: true });
    }
    if (body.action === "booking") {
      if (o.buyer !== me.id) return reply({ ok: false, code: "not_buyer" }, 403);
      const players = Number(body.players), bays = Number(body.bays), cost = Number(body.bay_cost), extras = Number(body.extras ?? 0);
      if (!Number.isInteger(players) || players < 1 || players > 24 || !Number.isInteger(bays) || bays < 1 || bays > 4 || players > bays * 6
        || !(cost > 0 && cost < 2000) || !(extras >= 0 && extras < 2000)) return reply({ ok: false, code: "numbers" }, 400);
      const total = Math.round((cost + extras) * 100) / 100, share = Math.round(total / players * 100) / 100;
      const booking = { players, bays, bay_cost: cost, extras, total, share, bay_no: clip(body.bay_no, 20), conf: clip(body.conf, 40), at: new Date().toISOString() };
      await admin.from("golf_outings").update({ booking, updated_at: new Date().toISOString() }).eq("id", o.id);
      const owe = (ppl ?? []).filter(p => p.rsvp === "yes" && p.member_id !== me.id && p.pay !== "self" && p.pay !== "received" && p.pay !== "sent");
      for (const p of owe) await admin.from("golf_people").update({ pay: "owe", amount: share }).eq("outing_id", o.id).eq("member_id", p.member_id);
      await alert(owe.map(p => p.member_id), `⛳ ${first} booked the Topgolf bay: ${money(share)} each. Open Topgolf Outing to pay ${first} back, or tap Paying for myself.`);
      return reply({ ok: true });
    }
    if (body.action === "pay") {
      const mode = String(body.mode ?? "");
      if (!mine || !["sent", "self"].includes(mode) || mine.pay === "received" || me.id === o.buyer) return reply({ ok: false, code: "illegal" }, 400);
      if (mode === "sent" && (mine.pay !== "owe" || !o.booking)) return reply({ ok: false, code: "illegal" }, 400);
      const patch = mode === "sent" ? { pay: "sent", via: clip(body.via, 20) || "Cash", sent_at: new Date().toISOString() }
        : { pay: "self", amount: null, via: null, own: { conf: clip(body.conf, 40) }, rsvp: "yes" };
      await admin.from("golf_people").update(patch).eq("outing_id", o.id).eq("member_id", me.id); await touch();
      if (o.buyer) await alert([o.buyer], mode === "sent" ? `💸 ${first} says they paid you ${money(Number(mine.amount ?? 0))} for Topgolf by ${patch.via}. Tap Received when it arrives.` : `⛳ ${first} is paying their own way at Topgolf.`);
      return reply({ ok: true });
    }
    if (body.action === "received") {
      if (o.buyer !== me.id) return reply({ ok: false, code: "not_buyer" }, 403);
      const who = (ppl ?? []).find(p => p.member_id === String(body.member ?? ""));
      if (!who || !["owe", "sent"].includes(who.pay)) return reply({ ok: false, code: "illegal" }, 400);
      await admin.from("golf_people").update({ pay: "received", received_at: new Date().toISOString(), via: who.via || "Cash" }).eq("outing_id", o.id).eq("member_id", who.member_id); await touch();
      await alert([who.member_id], `🧾 ${first} received your ${money(Number(who.amount ?? 0))} for Topgolf. Your receipt is in Topgolf Outing.`);
      return reply({ ok: true });
    }
    if (body.action === "cancel") {
      if (o.created_by !== me.id && me.role !== "host") return reply({ ok: false, code: "not_planner" }, 403);
      await admin.from("golf_outings").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", o.id);
      await alert(o.invited, `⛳ ${first} cancelled the Topgolf outing.`);
      return reply({ ok: true });
    }
    return reply({ ok: false, code: "action" }, 400);
  } catch (e) {
    console.error("golf", (e as Error).message);
    return reply({ ok: false, code: "server" }, 500);
  }
});
