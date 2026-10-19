// Table of 7 Rides (his order, 2026-10-18: "I can drive 3" / "I need a ride", matched up, on any dinner or outing).
// The only road that writes a ride. A plan is {kind: dinner|outing|movie|golf, ref: its id}; only people who can see
// the plan (not excluded, or invited) can drive or ride, and only until its day has passed.
//   offer {kind, ref, seats, leaving?, note?}            I can drive N (change it any time; never below who's in)
//   unoffer {kind, ref}                                   I can't drive after all: my riders are matched again
//   ask {kind, ref, party, address, details?, note?}      I need a ride (party = me and whoever comes with me)
//   unask {kind, ref}                                     I have a ride now / I'm not going
//   take {id}       a driver picks up a waiting rider     release {id}   a driver lets a rider go (never matched back)
//   pickup {id}     the pickup address: ONLY the rider and their own driver ever get it
//   last            my own most recent pickup address (to fill the box in)
// Matching: match.js (one copy, also in the app). The database refuses to overfill a car, even on two taps at once.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { rdMatch } from "./match.js";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ALLOWED = [/^https:\/\/table-of-7\.netlify\.app$/, /^https:\/\/[a-z0-9-]+--table-of-7\.netlify\.app$/, /^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/];
const cors = (o: string | null) => ({
  "Access-Control-Allow-Origin": o && ALLOWED.some(r => r.test(o)) ? o : "https://table-of-7.netlify.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin",
});
const TABLE: Record<string, string> = { dinner: "events", outing: "outings", movie: "movie_nights", golf: "golf_outings" };
const OUTING: Record<string, string> = { tigers: "the Tigers game", bowling: "bowling", minigolf: "mini golf", zoo: "the zoo", escape: "the escape room", skating: "skating", arcade: "the arcade", museum: "the museum" };
const clip = (x: unknown, k: number) => String(x ?? "").replace(/\s+/g, " ").trim().slice(0, k);
const dayOf = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

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
    const host = me.role === "host";
    const body = await req.json().catch(() => ({}));
    const firstOf = async (id: string) => { const { data } = await admin.from("members").select("name").eq("id", id).maybeSingle(); return String(data?.name ?? "Someone").split(" ")[0]; };
    const alert = async (to: string, text: string) => { if (to && to !== me.id) await admin.from("alerts").insert({ to_member: to, text }); };

    // the plan this ride belongs to, if I may ride or drive to it
    const planOf = async (kind: string, ref: string): Promise<{ p?: any; what?: string; code?: string }> => {
      if (!TABLE[kind] || !ref) return { code: "plan" };
      const { data: p } = await admin.from(TABLE[kind]).select("*").eq("id", ref).maybeSingle();
      if (!p || p.family_id !== me.family_id) return { code: "plan" };
      const mine = kind === "dinner" ? !(p.excluded ?? []).includes(me.id) : (p.invited ?? []).includes(me.id) || p.created_by === me.id;
      if (!mine && !host) return { code: "not_invited" };
      const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
      if (["done", "cancelled"].includes(p.status) || String(p.date) < today) return { code: "over" };
      const what = kind === "dinner" ? clip(p.title, 60) || "the family dinner" : kind === "outing" ? clip(p.title, 60) || OUTING[p.kind] || "the outing"
        : kind === "movie" ? clip(p.movie?.title, 60) || "the movie" : "Topgolf";
      return { p, what: `${what} on ${dayOf(String(p.date))}` };
    };
    // match every waiting rider who fits a car; both sides are told (the one who tapped sees it on screen instead)
    const matchAll = async (kind: string, ref: string, what: string) => {
      const landed: { ask: string; driver: string }[] = [];
      const [{ data: offers }, { data: asks }] = await Promise.all([
        admin.from("ride_offers").select("driver,seats,created_at").eq("kind", kind).eq("ref_id", ref),
        admin.from("ride_asks").select("id,rider,party,driver,created_at,declined").eq("kind", kind).eq("ref_id", ref)]);
      const plan = rdMatch((offers ?? []).map(o => ({ driver: o.driver, seats: o.seats, t: Date.parse(o.created_at) })),
        (asks ?? []).map(a => ({ id: a.id, rider: a.rider, party: a.party, driver: a.driver, declined: a.declined, t: Date.parse(a.created_at) })));
      for (const m of plan) {
        const { data: done, error } = await admin.from("ride_asks").update({ driver: m.driver, matched_at: new Date().toISOString() }).eq("id", m.ask).is("driver", null).select("rider,party");
        if (error || !done?.length) continue;   // filled or matched a moment ago: the seat guard said no
        await told(m.driver, done[0].rider, done[0].party, what); landed.push(m);
      }
      return landed;
    };
    const told = async (driver: string, rider: string, party: number, what: string) => {
      const [dn, rn] = await Promise.all([firstOf(driver), firstOf(rider)]);
      await alert(rider, `🚗 ${dn} is driving you to ${what}. Open the plan to see when they leave.`);
      await alert(driver, `🚗 You're driving ${rn}${party > 1 ? ` and ${party - 1} more` : ""} to ${what}. Their pickup address is in the app.`);
    };
    const kind = String(body.kind ?? ""), ref = String(body.ref ?? "");

    if (["offer", "unoffer", "ask", "unask"].includes(body.action)) {
      const pl = await planOf(kind, ref); if (!pl.p) return reply({ ok: false, code: pl.code }, pl.code === "over" ? 409 : 403);
      const { data: myOffer } = await admin.from("ride_offers").select("*").eq("kind", kind).eq("ref_id", ref).eq("driver", me.id).maybeSingle();
      const { data: myAsk } = await admin.from("ride_asks").select("*").eq("kind", kind).eq("ref_id", ref).eq("rider", me.id).maybeSingle();

      if (body.action === "offer") {
        if (myAsk) return reply({ ok: false, code: "both" }, 409);
        const seats = Number(body.seats); if (!Number.isInteger(seats) || seats < 1 || seats > 7) return reply({ ok: false, code: "seats" }, 400);
        const row = { seats, leaving: clip(body.leaving, 40) || null, note: clip(body.note, 200) || null, updated_at: new Date().toISOString() };
        const { error } = myOffer ? await admin.from("ride_offers").update(row).eq("id", myOffer.id)
          : await admin.from("ride_offers").insert({ ...row, family_id: me.family_id, kind, ref_id: ref, driver: me.id });
        if (error) return reply({ ok: false, code: /ride_full/.test(error.message) ? "seats_taken" : "server" }, /ride_full/.test(error.message) ? 409 : 500);
        const landed = await matchAll(kind, ref, pl.what!);
        return reply({ ok: true, matched: landed.length });
      }
      if (body.action === "unoffer") {
        if (!myOffer) return reply({ ok: true });
        const { data: riders } = await admin.from("ride_asks").update({ driver: null, matched_at: null }).eq("kind", kind).eq("ref_id", ref).eq("driver", me.id).select("rider");
        await admin.from("ride_offers").delete().eq("id", myOffer.id);
        for (const r of riders ?? []) await alert(r.rider, `🚗 ${String(me.name).split(" ")[0]} can't drive to ${pl.what} after all. You're back on the list, and you'll be told when another driver has room.`);
        await matchAll(kind, ref, pl.what!);
        return reply({ ok: true });
      }
      if (body.action === "ask") {
        if (myOffer) return reply({ ok: false, code: "both" }, 409);
        const party = Number(body.party ?? 1); if (!Number.isInteger(party) || party < 1 || party > 7) return reply({ ok: false, code: "party" }, 400);
        const address = clip(body.address, 200); if (address.length < 3) return reply({ ok: false, code: "address" }, 400);
        let id = myAsk?.id;
        if (myAsk) {
          const patch: Record<string, unknown> = { party, note: clip(body.note, 200) || null };
          if (myAsk.driver && party !== myAsk.party) Object.assign(patch, { driver: null, matched_at: null });   // a new party size is matched again
          const { error } = await admin.from("ride_asks").update(patch).eq("id", myAsk.id);
          if (error) return reply({ ok: false, code: "server" }, 500);
          if (patch.driver === null) await alert(myAsk.driver, `🚗 ${String(me.name).split(" ")[0]} changed how many are coming to ${pl.what}, so the ride is being matched again.`);
        } else {
          const { data: a, error } = await admin.from("ride_asks").insert({ family_id: me.family_id, kind, ref_id: ref, rider: me.id, party, note: clip(body.note, 200) || null }).select("id").single();
          if (error) return reply({ ok: false, code: "server" }, 500);
          id = a.id;
        }
        await admin.from("ride_pickups").upsert({ ask_id: id, address, details: clip(body.details, 200) || null });
        const landed = await matchAll(kind, ref, pl.what!);
        return reply({ ok: true, id, driver: landed.find(m => m.ask === id)?.driver ?? null });
      }
      if (body.action === "unask") {
        if (!myAsk) return reply({ ok: true });
        await admin.from("ride_asks").delete().eq("id", myAsk.id);
        if (myAsk.driver) await alert(myAsk.driver, `🚗 ${String(me.name).split(" ")[0]} doesn't need the ride to ${pl.what} any more.`);
        return reply({ ok: true });
      }
    }

    if (["take", "release", "pickup"].includes(body.action)) {
      const { data: a } = await admin.from("ride_asks").select("*").eq("id", String(body.id ?? "")).maybeSingle();
      if (!a || a.family_id !== me.family_id) return reply({ ok: false, code: "no_ride" }, 404);
      if (body.action === "pickup") {
        if (a.rider !== me.id && a.driver !== me.id) return reply({ ok: false, code: "not_yours" }, 403);
        const { data: pk } = await admin.from("ride_pickups").select("address,details").eq("ask_id", a.id).maybeSingle();
        return reply({ ok: true, address: pk?.address ?? "", details: pk?.details ?? "" });
      }
      const pl = await planOf(a.kind, a.ref_id); if (!pl.p) return reply({ ok: false, code: pl.code }, pl.code === "over" ? 409 : 403);
      if (body.action === "take") {
        const { data: o } = await admin.from("ride_offers").select("id").eq("kind", a.kind).eq("ref_id", a.ref_id).eq("driver", me.id).maybeSingle();
        if (!o) return reply({ ok: false, code: "no_offer" }, 409);
        if (a.rider === me.id) return reply({ ok: false, code: "both" }, 409);
        if (a.driver) return reply({ ok: false, code: "taken" }, 409);
        const { data: done, error } = await admin.from("ride_asks").update({ driver: me.id, matched_at: new Date().toISOString(), declined: a.declined.filter((x: string) => x !== me.id) }).eq("id", a.id).is("driver", null).select("id");
        if (error) return reply({ ok: false, code: /ride_full/.test(error.message) ? "full" : "server" }, /ride_full/.test(error.message) ? 409 : 500);
        if (!done?.length) return reply({ ok: false, code: "taken" }, 409);
        await told(me.id, a.rider, a.party, pl.what!);
        return reply({ ok: true });
      }
      if (body.action === "release") {
        if (a.driver !== me.id) return reply({ ok: false, code: "not_yours" }, 403);
        await admin.from("ride_asks").update({ driver: null, matched_at: null, declined: [...new Set([...a.declined, me.id])] }).eq("id", a.id);
        await alert(a.rider, `🚗 ${String(me.name).split(" ")[0]} can't take you to ${pl.what} after all. You're back on the list, and you'll be told when another driver has room.`);
        await matchAll(a.kind, a.ref_id, pl.what!);
        return reply({ ok: true });
      }
    }
    if (body.action === "last") {   // my own most recent pickup address, so I needn't type it again
      const { data: mine } = await admin.from("ride_asks").select("id").eq("rider", me.id).order("created_at", { ascending: false }).limit(10);
      const ids = (mine ?? []).map(x => x.id);
      const { data: pk } = ids.length ? await admin.from("ride_pickups").select("ask_id,address").in("ask_id", ids) : { data: [] };
      const hit = ids.map(i => (pk ?? []).find(x => x.ask_id === i)).find(Boolean);
      return reply({ ok: true, address: hit?.address ?? "" });
    }
    return reply({ ok: false, code: "action" }, 400);
  } catch (e) {
    console.error("rides", (e as Error).message);
    return reply({ ok: false, code: "server" }, 500);
  }
});
