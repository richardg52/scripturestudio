// Table of 8 Netflix & Chill and Big Game Night (his order, 2026-10-22: "Netflix and Chill and Big Game Night of the week —
// NFL Thursday, Sunday evening and Monday night games only — who's house, what we will bring. Use logos where you can").
// The only road that writes a watch party.
//   logos                   the networks' and streaming services' logos (TMDB) for the game cards; the games themselves
//                           are read on each phone from ESPN (nfl.js, synced into the app)
//   netflix {kind: movie|tv, genre?, page?}   what's on Netflix in the US (TMDB, with its posters and the Netflix logo)
//   new {kind: netflix|game, ref, title, info, date, time, at_member, invited[], needs[], note?}   host a night in
//   rsvp {id, ans: yes|maybe|no}         my answer
//   bring {id, item, on: true|false}     "I'll bring it" (an item on the list, or something of my own)
//   invite {id, invited[]}               the planner changes who's invited (people added are told)
//   cancel {id}                          the planner or the host
// Only the people invited (and the planner, and the host) can see a party. TMDB: "This product uses the TMDB API but is
// not endorsed or certified by TMDB." The token is the Supabase secret TMDB_TOKEN, the same one Movie Night uses.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TMDB = (Deno.env.get("TMDB_TOKEN") ?? "").replace(/^\s*bearer\s+/i, "").replace(/\s+/g, "");
const TMDB_V3 = /^[a-f0-9]{32}$/i.test(TMDB);
const ALLOWED = [/^https:\/\/table-of-[78]\.netlify\.app$/, /^https:\/\/[a-z0-9-]+--table-of-[78]\.netlify\.app$/, /^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/];
const cors = (o: string | null) => ({
  "Access-Control-Allow-Origin": o && ALLOWED.some(r => r.test(o)) ? o : "https://table-of-8.netlify.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin",
});
const UA = "TableOf8/1.0 (family watch nights; +https://table-of-8.netlify.app)";
const clip = (x: unknown, k: number) => String(x ?? "").replace(/\s+/g, " ").trim().slice(0, k);
const https = (u: unknown) => /^https:\/\/[^\s"'<>]+$/.test(String(u ?? "")) ? String(u) : "";
const dayOf = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
const IMG = "https://image.tmdb.org/t/p/";
const NETFLIX = 8;
// genre chips → TMDB genre ids (movies and shows number them differently)
const GENRES: Record<string, { movie?: number; tv?: number }> = {
  comedy: { movie: 35, tv: 35 }, action: { movie: 28, tv: 10759 }, family: { movie: 10751, tv: 10751 }, drama: { movie: 18, tv: 18 },
  romance: { movie: 10749 }, thriller: { movie: 53, tv: 80 }, animation: { movie: 16, tv: 16 }, documentary: { movie: 99, tv: 99 }, reality: { tv: 10764 },
};
const cache = new Map<string, { at: number; v: unknown }>();
async function cached<T>(key: string, ms: number, load: () => Promise<T>): Promise<T> {
  const c = cache.get(key); if (c && Date.now() - c.at < ms) return c.v as T;
  const v = await load(); cache.set(key, { at: Date.now(), v }); return v;
}
async function getJson(url: string, headers: Record<string, string> = {}) {
  const r = await fetch(url, { headers: { "User-Agent": UA, accept: "application/json", ...headers }, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return await r.json();
}
const tmdb = (path: string) => getJson("https://api.themoviedb.org/3" + path + (TMDB_V3 ? (path.includes("?") ? "&" : "?") + "api_key=" + TMDB : ""),
  TMDB_V3 ? {} : { Authorization: "Bearer " + TMDB });
// the streaming services' own logos, as TMDB lists them (Netflix, Prime Video, Peacock, ESPN, Paramount+…)
const providerLogos = () => cached("providers", 864e5, async () => {
  const out: Record<string, string> = {};
  for (const kind of ["movie", "tv"]) {
    const j = await tmdb(`/watch/providers/${kind}?watch_region=US&language=en-US`);
    for (const p of j?.results ?? []) if (p?.logo_path && !out[p.provider_name]) out[p.provider_name] = IMG + "w154" + p.logo_path;
  }
  return out;
});

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
    const firstOf = async (id: string) => { const { data } = await admin.from("members").select("name").eq("id", id).maybeSingle(); return String(data?.name ?? "Someone").split(" ")[0]; };
    const room = (k: string) => k === "game" ? "Big Game Night" : "Netflix & Chill";
    const icon = (k: string) => k === "game" ? "🏈" : "🍿";

    // Big Game Night's games are read on each phone from ESPN (nfl.js, synced into the app): ESPN refuses data-centre
    // servers. This road gives the networks' and streaming services' logos for those game cards.
    if (body.action === "logos") {
      try { return reply({ ok: true, logos: TMDB ? await providerLogos() : {} }); }
      catch (e) { console.error("watch logos", (e as Error).message); return reply({ ok: true, logos: {} }); }
    }

    if (body.action === "netflix") {
      if (!TMDB) return reply({ ok: false, code: "no_key" }, 500);
      const kind = body.kind === "tv" ? "tv" : "movie", g = GENRES[String(body.genre ?? "")]?.[kind as "movie" | "tv"];
      const page = Math.min(Math.max(parseInt(body.page) || 1, 1), 10);
      try {
        const j = await cached(`nf:${kind}:${g ?? ""}:${page}`, 3 * 3600e3, () => tmdb(`/discover/${kind}?with_watch_providers=${NETFLIX}&watch_region=US&with_watch_monetization_types=flatrate&sort_by=popularity.desc&include_adult=false&language=en-US&page=${page}${g ? `&with_genres=${g}` : ""}`));
        const items = (j?.results ?? []).filter((x: any) => x?.poster_path).map((x: any) => ({ id: String(x.id), kind, title: clip(x.title ?? x.name, 120),
          year: clip(x.release_date ?? x.first_air_date, 4), poster: IMG + "w342" + x.poster_path, backdrop: x.backdrop_path ? IMG + "w780" + x.backdrop_path : "",
          overview: clip(x.overview, 400), rating: Math.round((x.vote_average ?? 0) * 10) / 10 }));
        let logos: Record<string, string> = {}; try { logos = await providerLogos(); } catch { /* logos are a nicety */ }
        return reply({ ok: true, items, netflix: logos["Netflix"] ?? "", more: (j?.total_pages ?? 1) > page, attribution: "This product uses the TMDB API but is not endorsed or certified by TMDB." });
      } catch (e) { console.error("watch netflix", (e as Error).message); return reply({ ok: false, code: "tmdb" }, 502); }
    }

    if (body.action === "new") {
      const kind = body.kind === "game" ? "game" : body.kind === "netflix" ? "netflix" : "";
      if (!kind) return reply({ ok: false, code: "kind" }, 400);
      const date = String(body.date ?? "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < today()) return reply({ ok: false, code: "date" }, 400);
      const title = clip(body.title, 120); if (!title) return reply({ ok: false, code: "title" }, 400);
      const { data: fam } = await admin.from("members").select("id,status").eq("family_id", me.family_id);
      const active = new Set((fam ?? []).filter((f: any) => f.status === "active").map((f: any) => f.id));
      const at = String(body.at_member ?? me.id); if (!active.has(at)) return reply({ ok: false, code: "house" }, 400);
      const invited = [...new Set((Array.isArray(body.invited) ? body.invited : []).map(String))].filter(id => active.has(id) && id !== me.id);
      if (!invited.length) return reply({ ok: false, code: "nobody" }, 400);
      const needs = (Array.isArray(body.needs) ? body.needs : []).map((x: unknown) => clip(x, 40)).filter((x: string, i: number, a: string[]) => x && a.findIndex(y => y.toLowerCase() === x.toLowerCase()) === i).slice(0, 12);
      const i = body.info ?? {};
      const info = kind === "game"
        ? { slot: clip(i.slot, 40), kickoff: clip(i.kickoff, 30), networks: (Array.isArray(i.networks) ? i.networks : []).map((n: unknown) => clip(n, 30)).slice(0, 4),
            home: { short: clip(i.home?.short, 30), abbr: clip(i.home?.abbr, 6), logo: https(i.home?.logo) }, away: { short: clip(i.away?.short, 30), abbr: clip(i.away?.abbr, 6), logo: https(i.away?.logo) } }
        : { poster: https(i.poster), year: clip(i.year, 4), kind: i.kind === "tv" ? "tv" : "movie", overview: clip(i.overview, 400) };
      const all = [...new Set([me.id, at, ...invited])];
      const { data: p, error } = await admin.from("watch_parties").insert({ family_id: me.family_id, kind, ref: clip(body.ref, 40), title, info, date, time: clip(body.time, 12),
        at_member: at, created_by: me.id, invited: all, needs, note: clip(body.note, 300) || null }).select("*").single();
      if (error || !p) return reply({ ok: false, code: "server" }, 500);
      await admin.from("watch_people").insert({ party_id: p.id, member_id: me.id, family_id: me.family_id, rsvp: "yes" });
      const atName = at === me.id ? `${first}'s` : `${await firstOf(at)}'s`;
      await alert(all, `${icon(kind)} ${first} invited you to watch ${title} at ${atName} house · ${dayOf(date)}${body.time ? ` at ${clip(body.time, 12)}` : ""}. Open ${room(kind)} to answer${needs.length ? " and pick what you'll bring" : ""}.`);
      return reply({ ok: true, party: p });
    }

    const { data: p } = await admin.from("watch_parties").select("*").eq("id", String(body.id ?? "")).maybeSingle();
    if (!p || p.family_id !== me.family_id || !(p.invited.includes(me.id) || p.created_by === me.id || host)) return reply({ ok: false, code: "no_party" }, 404);
    if (p.status === "cancelled") return reply({ ok: false, code: "cancelled" }, 409);
    const boss = p.created_by === me.id || host;
    const mine = async () => (await admin.from("watch_people").select("*").eq("party_id", p.id).eq("member_id", me.id).maybeSingle()).data;

    if (body.action === "rsvp") {
      if (!p.invited.includes(me.id)) return reply({ ok: false, code: "not_invited" }, 403);
      const ans = String(body.ans ?? ""); if (!["yes", "maybe", "no"].includes(ans)) return reply({ ok: false, code: "ans" }, 400);
      const had = await mine();
      await admin.from("watch_people").upsert({ party_id: p.id, member_id: me.id, family_id: me.family_id, rsvp: ans, bring: ans === "no" ? [] : (had?.bring ?? []), updated_at: new Date().toISOString() });
      if (had?.rsvp !== ans) await alert([p.created_by], `${icon(p.kind)} ${first} ${ans === "yes" ? "is coming" : ans === "maybe" ? "is a maybe" : "can't make it"} to ${p.title} on ${dayOf(p.date)}.`);
      return reply({ ok: true });
    }
    if (body.action === "bring") {
      if (!p.invited.includes(me.id)) return reply({ ok: false, code: "not_invited" }, 403);
      const item = clip(body.item, 40); if (!item) return reply({ ok: false, code: "item" }, 400);
      const had = await mine(); if (had?.rsvp === "no") return reply({ ok: false, code: "not_coming" }, 409);
      if (body.on !== false) {   // one person per item on the list: someone already bringing it keeps it
        const { data: ppl } = await admin.from("watch_people").select("member_id,bring").eq("party_id", p.id);
        if ((ppl ?? []).some((x: any) => x.member_id !== me.id && (x.bring ?? []).some((b: string) => b.toLowerCase() === item.toLowerCase()))) return reply({ ok: false, code: "taken" }, 409);
      }
      const bring = body.on === false ? (had?.bring ?? []).filter((b: string) => b.toLowerCase() !== item.toLowerCase()) : [...new Set([...(had?.bring ?? []), item])].slice(0, 8);
      await admin.from("watch_people").upsert({ party_id: p.id, member_id: me.id, family_id: me.family_id, rsvp: had?.rsvp ?? "yes", bring, updated_at: new Date().toISOString() });
      if (body.on !== false && p.created_by !== me.id) await alert([p.created_by], `${icon(p.kind)} ${first} is bringing ${item} to ${p.title}.`);
      return reply({ ok: true });
    }
    if (body.action === "invite") {
      if (!boss) return reply({ ok: false, code: "not_yours" }, 403);
      const { data: fam } = await admin.from("members").select("id,status").eq("family_id", me.family_id);
      const active = new Set((fam ?? []).filter((f: any) => f.status === "active").map((f: any) => f.id));
      const want = [...new Set((Array.isArray(body.invited) ? body.invited : []).map(String))].filter(id => active.has(id));
      const keep = [...new Set([p.created_by, p.at_member, ...want])];
      const added = keep.filter(id => !p.invited.includes(id));
      await admin.from("watch_parties").update({ invited: keep, updated_at: new Date().toISOString() }).eq("id", p.id);
      await admin.from("watch_people").delete().eq("party_id", p.id).not("member_id", "in", `(${keep.map(x => `"${x}"`).join(",")})`);
      await alert(added, `${icon(p.kind)} ${first} invited you to watch ${p.title} · ${dayOf(p.date)}${p.time ? ` at ${p.time}` : ""}. Open ${room(p.kind)} to answer.`);
      return reply({ ok: true });
    }
    if (body.action === "cancel") {
      if (!boss) return reply({ ok: false, code: "not_yours" }, 403);
      await admin.from("watch_parties").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", p.id);
      await alert(p.invited, `${icon(p.kind)} ${first} called off ${p.title} on ${dayOf(p.date)}.`);
      return reply({ ok: true });
    }
    return reply({ ok: false, code: "action" }, 400);
  } catch (e) {
    console.error("watch", (e as Error).message);
    return reply({ ok: false, code: "server" }, 500);
  }
});
