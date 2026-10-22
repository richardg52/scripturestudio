// Table of 8 Date Night and Adventure Club (his order, 2026-10-22: "a couples section (Date Night), kids section let's
// plan a date … romantic, fun places for the kids"). The only road that writes a date. A date is between two people
// and only they can see it (the Host included: a couple's evening is theirs).
//   plan {kind: couple|kids, partner, title, date, time?, stops: [{time, place, rid?, note?}] (1–3), idea?}
//   reply {id, answer: yes|other, note?}    the person invited says yes, or asks for another time (with a note)
//   move {id, date, time?}                  the planner picks a new day: it is asked again
//   done {id}                               on or after the day: it happened (a kids' date earns its badge)
//   cancel {id}                             either of the two calls it off
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ALLOWED = [/^https:\/\/table-of-[78]\.netlify\.app$/, /^https:\/\/[a-z0-9-]+--table-of-[78]\.netlify\.app$/, /^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/];
const cors = (o: string | null) => ({
  "Access-Control-Allow-Origin": o && ALLOWED.some(r => r.test(o)) ? o : "https://table-of-8.netlify.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin",
});
const clip = (x: unknown, k: number) => String(x ?? "").replace(/\s+/g, " ").trim().slice(0, k);
const dayOf = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
const isDay = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d + "T12:00:00Z"));
const HEART: Record<string, string> = { couple: "💕", kids: "🧭" };
const ROOM: Record<string, string> = { couple: "Date Night", kids: "Adventure Club" };

Deno.serve(async (req) => {
  const h = { ...cors(req.headers.get("origin")), "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  const reply = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: h });
  try {
    const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } });
    const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: u } = await admin.auth.getUser(jwt);
    if (!u?.user) return reply({ ok: false, code: "signed_out" }, 401);
    const { data: me } = await admin.from("members").select("id,family_id,status,name").eq("user_id", u.user.id).maybeSingle();
    if (!me || me.status !== "active") return reply({ ok: false, code: "not_active" }, 403);
    const first = String(me.name).split(" ")[0];
    const body = await req.json().catch(() => ({}));
    const tell = async (to: string, text: string) => { if (to && to !== me.id) await admin.from("alerts").insert({ to_member: to, text }); };

    if (body.action === "plan") {
      const kind = String(body.kind ?? "");
      if (!HEART[kind]) return reply({ ok: false, code: "kind" }, 400);
      const { data: p } = await admin.from("members").select("id,family_id,status").eq("id", String(body.partner ?? "")).maybeSingle();
      if (!p || p.family_id !== me.family_id || p.status !== "active" || p.id === me.id) return reply({ ok: false, code: "partner" }, 400);
      const date = String(body.date ?? "");
      if (!isDay(date) || date < today()) return reply({ ok: false, code: "date" }, 400);
      const title = clip(body.title, 80);
      if (!title) return reply({ ok: false, code: "title" }, 400);
      const stops = (Array.isArray(body.stops) ? body.stops : []).slice(0, 3).map((s: any) => ({
        time: clip(s?.time, 12), place: clip(s?.place, 80), note: clip(s?.note, 120),
        ...(/^[a-z0-9-]{2,40}$/.test(String(s?.rid ?? "")) ? { rid: String(s.rid) } : {}) })).filter((s: any) => s.place);
      if (!stops.length) return reply({ ok: false, code: "stops" }, 400);
      const { data: d, error } = await admin.from("dates").insert({ family_id: me.family_id, kind, created_by: me.id, partner: p.id, title, date,
        time: clip(body.time, 12), stops, idea: clip(body.idea, 40) }).select("id").single();
      if (error || !d) return reply({ ok: false, code: "server" }, 500);
      await tell(p.id, kind === "couple"
        ? `${HEART.couple} ${first} planned a Date Night for the two of you: ${title} · ${dayOf(date)}${body.time ? ` at ${clip(body.time, 12)}` : ""}. Open Date Night to say yes.`
        : `${HEART.kids} ${first} wants a date with you: ${title} · ${dayOf(date)}${body.time ? ` at ${clip(body.time, 12)}` : ""}. Open Adventure Club to answer.`);
      return reply({ ok: true, id: d.id });
    }

    const { data: d } = await admin.from("dates").select("*").eq("id", String(body.id ?? "")).maybeSingle();
    if (!d || d.family_id !== me.family_id || ![d.created_by, d.partner].includes(me.id)) return reply({ ok: false, code: "no_date" }, 404);
    const other = d.created_by === me.id ? d.partner : d.created_by;
    const set = async (patch: Record<string, unknown>) => (await admin.from("dates").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", d.id)).error;

    if (body.action === "reply") {
      if (me.id !== d.partner) return reply({ ok: false, code: "not_invited" }, 403);
      if (!["asked", "other", "yes"].includes(d.status)) return reply({ ok: false, code: "closed" }, 409);
      const answer = String(body.answer ?? "");
      if (!["yes", "other"].includes(answer)) return reply({ ok: false, code: "answer" }, 400);
      const note = clip(body.note, 140) || null;
      if (await set({ status: answer, reply: note })) return reply({ ok: false, code: "server" }, 500);
      await tell(other, answer === "yes" ? `${HEART[d.kind]} ${first} said yes to ${d.title} on ${dayOf(d.date)}!`
        : `${HEART[d.kind]} ${first} would like another time for ${d.title}${note ? `: "${note}"` : "."} Open ${ROOM[d.kind]} to pick a new day.`);
      return reply({ ok: true });
    }
    if (body.action === "move") {
      if (me.id !== d.created_by) return reply({ ok: false, code: "not_yours" }, 403);
      if (["done", "cancelled"].includes(d.status)) return reply({ ok: false, code: "closed" }, 409);
      const date = String(body.date ?? "");
      if (!isDay(date) || date < today()) return reply({ ok: false, code: "date" }, 400);
      if (await set({ date, time: clip(body.time, 12), status: "asked", reply: null })) return reply({ ok: false, code: "server" }, 500);
      await tell(other, `${HEART[d.kind]} ${first} moved ${d.title} to ${dayOf(date)}${body.time ? ` at ${clip(body.time, 12)}` : ""}. Open ${ROOM[d.kind]} to say yes.`);
      return reply({ ok: true });
    }
    if (body.action === "done") {
      if (d.status !== "yes") return reply({ ok: false, code: "not_yes" }, 409);
      if (d.date > today()) return reply({ ok: false, code: "early" }, 409);
      if (await set({ status: "done" })) return reply({ ok: false, code: "server" }, 500);
      return reply({ ok: true });
    }
    if (body.action === "cancel") {
      if (["done", "cancelled"].includes(d.status)) return reply({ ok: false, code: "closed" }, 409);
      if (await set({ status: "cancelled" })) return reply({ ok: false, code: "server" }, 500);
      await tell(other, `${HEART[d.kind]} ${first} called off ${d.title} on ${dayOf(d.date)}.`);
      return reply({ ok: true });
    }
    return reply({ ok: false, code: "action" }, 400);
  } catch (e) {
    console.error("dates", (e as Error).message);
    return reply({ ok: false, code: "server" }, 500);
  }
});
