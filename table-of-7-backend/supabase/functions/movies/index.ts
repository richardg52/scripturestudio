// Table of 7 Movie nights (his order, 2026-10-17). The only road that writes a movie night; phones only read.
//   now {page?}                 movies in US theaters now (TMDB)
//   search {q}                  find any movie (TMDB)
//   movie {id}                  one movie: rating, age rating, runtime, story, cast, trailer, viewer reviews (TMDB)
//   new {movie_id, date, time, theater_pid, city, invited[], note?, dinner_event?}   the planner; everyone invited is told
//   rsvp {id, ans: yes|maybe|no}
//   claim {id} / unclaim {id}   "I'll buy the tickets" (one buyer, so nobody buys twice)
//   tickets {id, count, each, fees, seats, conf, room}   the buyer, after buying on Fandango or the theater's own site
//   pay {id, mode: sent|self, via?, seats?, conf?}     "I paid <buyer> back" or "Paying for myself"
//   received {id, member}       the buyer confirms the money arrived: that person's receipt is ready, and they're told
//   cancel {id}                 the planner or the host
// The app never buys a ticket and never moves money. TMDB data: "This product uses the TMDB API but is not endorsed or
// certified by TMDB." The token is the Supabase secret TMDB_TOKEN (TMDB's free "API Read Access Token").
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// TMDB gives two codes, and either works here: the long "API Read Access Token" (sent as a Bearer header) or the short
// 32-character "API Key" (sent as ?api_key=). Spaces, line breaks or a pasted "Bearer " are ignored.
const TMDB = (Deno.env.get("TMDB_TOKEN") ?? "").replace(/^\s*bearer\s+/i, "").replace(/\s+/g, "");
const TMDB_V3 = /^[a-f0-9]{32}$/i.test(TMDB);
const ALLOWED = [/^https:\/\/table-of-7\.netlify\.app$/, /^https:\/\/[a-z0-9-]+--table-of-7\.netlify\.app$/, /^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/];
const cors = (o: string | null) => ({
  "Access-Control-Allow-Origin": o && ALLOWED.some(r => r.test(o)) ? o : "https://table-of-7.netlify.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin",
});
const money = (n: number) => "$" + n.toFixed(2);
const year = (d: string) => (d || "").slice(0, 4);
const card = (m: any) => ({ id: m.id, title: m.title ?? "", poster: m.poster_path ?? null, year: year(m.release_date), rating: Math.round((m.vote_average ?? 0) * 10) / 10, votes: m.vote_count ?? 0, overview: String(m.overview ?? "").slice(0, 400) });

async function tmdb(path: string) {
  if (!TMDB) return { error: "no_key" };
  const url = "https://api.themoviedb.org/3" + path + (TMDB_V3 ? (path.includes("?") ? "&" : "?") + "api_key=" + TMDB : "");
  const r = await fetch(url, { headers: TMDB_V3 ? { accept: "application/json" } : { Authorization: "Bearer " + TMDB, accept: "application/json" } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { console.error("movies tmdb", r.status, TMDB_V3 ? "short key" : `token of ${TMDB.length} characters`, JSON.stringify(d).slice(0, 200)); return { error: r.status === 401 ? "bad_key" : r.status === 429 ? "resting" : "tmdb" }; }
  return { data: d };
}
async function movieFull(id: number) {
  const g = await tmdb(`/movie/${id}?language=en-US&append_to_response=release_dates,videos,reviews,credits`);
  if (g.error) return g;
  const m = g.data;
  const us = (m.release_dates?.results ?? []).find((x: any) => x.iso_3166_1 === "US");
  const cert = (us?.release_dates ?? []).map((x: any) => x.certification).find((c: string) => c) ?? "";
  const vids = (m.videos?.results ?? []).filter((v: any) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser"));
  const trailer = (vids.find((v: any) => v.type === "Trailer" && v.official) ?? vids.find((v: any) => v.type === "Trailer") ?? vids[0])?.key ?? null;
  return { data: { ...card(m), runtime: m.runtime ?? null, cert, genres: (m.genres ?? []).map((x: any) => x.name).slice(0, 3), tagline: m.tagline ?? "",
    overview: String(m.overview ?? ""), backdrop: m.backdrop_path ?? null, trailer,
    cast: (m.credits?.cast ?? []).slice(0, 6).map((c: any) => c.name),
    reviews: (m.reviews?.results ?? []).slice(0, 4).map((r: any) => ({ author: r.author ?? "", rating: r.author_details?.rating ?? null,
      text: String(r.content ?? "").replace(/\s+/g, " ").slice(0, 600), url: r.url ?? "" })) } };
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

    // ---- TMDB: reading movies ----
    if (body.action === "now") {
      const g = await tmdb(`/movie/now_playing?language=en-US&region=US&page=${Math.min(5, Math.max(1, Number(body.page) || 1))}`);
      if (g.error) return reply({ ok: false, code: g.error });
      return reply({ ok: true, movies: (g.data.results ?? []).map(card) });
    }
    if (body.action === "search") {
      const q = String(body.q ?? "").trim().slice(0, 80); if (q.length < 2) return reply({ ok: false, code: "short" });
      const g = await tmdb(`/search/movie?language=en-US&include_adult=false&region=US&query=${encodeURIComponent(q)}`);
      if (g.error) return reply({ ok: false, code: g.error });
      return reply({ ok: true, movies: (g.data.results ?? []).slice(0, 20).map(card) });
    }
    if (body.action === "movie") {
      const g = await movieFull(Number(body.id)); if (g.error) return reply({ ok: false, code: g.error });
      return reply({ ok: true, movie: g.data });
    }

    // ---- a new movie night ----
    if (body.action === "new") {
      const id = Number(body.movie_id), date = String(body.date ?? ""), time = String(body.time ?? "");
      if (!Number.isInteger(id) || id <= 0) return reply({ ok: false, code: "movie" }, 400);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return reply({ ok: false, code: "when" }, 400);
      const pid = body.theater_pid ? String(body.theater_pid) : null;
      if (pid && !/^[A-Za-z0-9_-]{10,}$/.test(pid)) return reply({ ok: false, code: "theater" }, 400);
      const asked = [...new Set([me.id, ...(Array.isArray(body.invited) ? body.invited : []).map(String)])];
      const { data: seats } = await admin.from("members").select("id,status").eq("family_id", me.family_id).in("id", asked);
      if ((seats ?? []).length !== asked.length || (seats ?? []).some(s => s.status !== "active")) return reply({ ok: false, code: "seats" }, 403);
      let dinner = null;
      if (body.dinner_event) { const { data: e } = await admin.from("events").select("id,family_id").eq("id", String(body.dinner_event)).maybeSingle(); if (!e || e.family_id !== me.family_id) return reply({ ok: false, code: "dinner" }, 400); dinner = e.id; }
      const g = await movieFull(id); if (g.error) return reply({ ok: false, code: g.error });
      const m = g.data, movie = { id: m.id, title: m.title, poster: m.poster, year: m.year, runtime: m.runtime, cert: m.cert, rating: m.rating };
      const { data: night, error } = await admin.from("movie_nights").insert({ family_id: me.family_id, created_by: me.id, movie, theater_pid: pid,
        city: String(body.city ?? "Memphis").slice(0, 40), date, time, note: String(body.note ?? "").slice(0, 300) || null, dinner_event: dinner, invited: asked }).select().single();
      if (error) return reply({ ok: false, code: "server" }, 500);
      await admin.from("movie_people").insert(asked.map(x => ({ night_id: night.id, member_id: x, rsvp: x === me.id ? "yes" : null })));
      const when = new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
      await alert(asked, `🎬 ${first} invited you to see ${movie.title} on ${when}. Open Movie Night to answer.`);
      return reply({ ok: true, night });
    }

    // ---- everything else acts on one movie night ----
    const { data: n } = await admin.from("movie_nights").select("*").eq("id", String(body.id ?? "")).maybeSingle();
    if (!n || n.family_id !== me.family_id || !(n.invited.includes(me.id) || me.role === "host")) return reply({ ok: false, code: "no_night" }, 404);
    if (n.status !== "open") return reply({ ok: false, code: "cancelled" }, 409);
    const { data: ppl } = await admin.from("movie_people").select("*").eq("night_id", n.id);
    const mine = (ppl ?? []).find(p => p.member_id === me.id);
    const touch = () => admin.from("movie_nights").update({ updated_at: new Date().toISOString() }).eq("id", n.id);
    const title = n.movie?.title ?? "the movie";
    if (body.action === "rsvp") {
      const ans = String(body.ans ?? ""); if (!["yes", "maybe", "no"].includes(ans) || !mine) return reply({ ok: false, code: "illegal" }, 400);
      if (ans !== "yes" && mine.pay && mine.pay !== "self" && mine.pay !== "owe") return reply({ ok: false, code: "paid" }, 409);
      const patch: Record<string, unknown> = { rsvp: ans };
      if (ans !== "yes" && mine.pay === "owe") Object.assign(patch, { pay: null, amount: null });
      // a late yes takes one of the buyer's spare tickets, if any are left, and owes its share
      let spare = false;
      if (ans === "yes" && n.tickets && !mine.pay && me.id !== n.buyer) {
        const taken = (ppl ?? []).filter(p => p.member_id !== me.id && p.member_id !== n.buyer && ["owe", "sent", "received"].includes(p.pay)).length + 1;
        if (taken < Number(n.tickets.count)) { Object.assign(patch, { pay: "owe", amount: n.tickets.share }); spare = true; }
      }
      await admin.from("movie_people").update(patch).eq("night_id", n.id).eq("member_id", me.id); await touch();
      if (n.created_by && n.created_by !== me.id) await alert([n.created_by], `🎬 ${first} ${ans === "yes" ? "is going" : ans === "maybe" ? "might come" : "can't make it"} to ${title}.`);
      if (spare && n.buyer) await alert([n.buyer], `🎟️ ${first} is taking one of your spare tickets to ${title} and owes you ${money(Number(n.tickets.share))}.`);
      return reply({ ok: true });
    }
    if (body.action === "claim") {
      if (n.buyer) return reply({ ok: false, code: "claimed" }, 409);
      if (!mine || mine.rsvp !== "yes") return reply({ ok: false, code: "going" }, 409);
      const { data: done } = await admin.from("movie_nights").update({ buyer: me.id, updated_at: new Date().toISOString() }).eq("id", n.id).is("buyer", null).select("id");
      if (!done?.length) return reply({ ok: false, code: "claimed" }, 409);
      await alert(n.invited, `🎟️ ${first} is buying the tickets for ${title}. Please don't buy twice.`);
      return reply({ ok: true });
    }
    if (body.action === "unclaim") {
      if (n.buyer !== me.id || n.tickets) return reply({ ok: false, code: "illegal" }, 409);
      await admin.from("movie_nights").update({ buyer: null, updated_at: new Date().toISOString() }).eq("id", n.id);
      return reply({ ok: true });
    }
    if (body.action === "tickets") {
      if (n.buyer !== me.id) return reply({ ok: false, code: "not_buyer" }, 403);
      const count = Number(body.count), each = Number(body.each), fees = Number(body.fees ?? 0);
      if (!Number.isInteger(count) || count < 1 || count > 20 || !(each > 0 && each < 200) || !(fees >= 0 && fees < 500)) return reply({ ok: false, code: "numbers" }, 400);
      const total = Math.round((count * each + fees) * 100) / 100, share = Math.round(total / count * 100) / 100;
      const clip = (x: unknown, k: number) => String(x ?? "").replace(/\s+/g, " ").trim().slice(0, k);
      const tickets = { count, each, fees, total, share, seats: clip(body.seats, 80), conf: clip(body.conf, 40), room: clip(body.room, 20), at: new Date().toISOString() };
      await admin.from("movie_nights").update({ tickets, updated_at: new Date().toISOString() }).eq("id", n.id);
      const owe = (ppl ?? []).filter(p => p.rsvp === "yes" && p.member_id !== me.id && p.pay !== "self" && p.pay !== "received" && p.pay !== "sent");
      for (const p of owe) await admin.from("movie_people").update({ pay: "owe", amount: share }).eq("night_id", n.id).eq("member_id", p.member_id);
      await alert(owe.map(p => p.member_id), `🎟️ ${first} bought the tickets for ${title}: ${money(share)} each. Open Movie Night to pay ${first} back, or tap Paying for myself.`);
      return reply({ ok: true });
    }
    if (body.action === "pay") {
      const mode = String(body.mode ?? "");
      if (!mine || !["sent", "self"].includes(mode) || mine.pay === "received" || me.id === n.buyer) return reply({ ok: false, code: "illegal" }, 400);
      if (mode === "sent" && (mine.pay !== "owe" || !n.tickets)) return reply({ ok: false, code: "illegal" }, 400);
      const clip = (x: unknown, k: number) => String(x ?? "").replace(/\s+/g, " ").trim().slice(0, k);
      const patch = mode === "sent" ? { pay: "sent", via: clip(body.via, 20) || "Cash", sent_at: new Date().toISOString() }
        : { pay: "self", amount: null, via: null, own: { seats: clip(body.seats, 80), conf: clip(body.conf, 40) }, rsvp: "yes" };
      await admin.from("movie_people").update(patch).eq("night_id", n.id).eq("member_id", me.id); await touch();
      if (n.buyer) await alert([n.buyer], mode === "sent" ? `💸 ${first} says they paid you ${money(Number(mine.amount ?? 0))} for ${title} by ${patch.via}. Tap Received when it arrives.` : `🎬 ${first} is paying for their own ticket to ${title}.`);
      return reply({ ok: true });
    }
    if (body.action === "received") {
      if (n.buyer !== me.id) return reply({ ok: false, code: "not_buyer" }, 403);
      const who = (ppl ?? []).find(p => p.member_id === String(body.member ?? ""));
      if (!who || !["owe", "sent"].includes(who.pay)) return reply({ ok: false, code: "illegal" }, 400);
      await admin.from("movie_people").update({ pay: "received", received_at: new Date().toISOString(), via: who.via || "Cash" }).eq("night_id", n.id).eq("member_id", who.member_id); await touch();
      await alert([who.member_id], `🧾 ${first} received your ${money(Number(who.amount ?? 0))} for ${title}. Your receipt is in Movie Night.`);
      return reply({ ok: true });
    }
    if (body.action === "cancel") {
      if (n.created_by !== me.id && me.role !== "host") return reply({ ok: false, code: "not_planner" }, 403);
      await admin.from("movie_nights").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", n.id);
      await alert(n.invited, `🎬 ${first} cancelled the movie night for ${title}.`);
      return reply({ ok: true });
    }
    return reply({ ok: false, code: "action" }, 400);
  } catch (e) {
    console.error("movies", (e as Error).message);
    return reply({ ok: false, code: "server" }, 500);
  }
});
