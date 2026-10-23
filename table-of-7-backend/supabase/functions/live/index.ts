// Table of 8 Memphis Live (his order, 2026-10-22: "Highlights the major (minor too) events happening in All of Memphis …
// with dates and times locations … ways to purchase tickets and invite the family or send them a who interested and they
// can send their dates and times"). The only road that writes Memphis Live.
//   refresh               re-read the venue calendars when the list is more than 6 hours old (one phone at a time)
//   ask {event_id, invited?, note?} "Who's in?": the people picked (everyone when none are picked) are asked about a
//                         show; the asker is a Yes for that showing. Only the people asked can see it and answer.
//   answer {ask_id, answer: yes|maybe|no, picks: [showing ids], note?}   my answer and the dates/times that work for me
//   unask {ask_id}        the asker (or the Host) takes the question down
//   status                Host only: when each source was last read, how many it gave, and whether Ticketmaster is on
// Sources (sources.js): GPAC, the Overton Park Shell and the Overton Park Conservancy (which carries the Memphis Zoo)
// are read from their own public calendars; Ticketmaster only once his own key is in TICKETMASTER_API_KEY.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { UA, gpacParse, shellParse, shellUrl, overtonParse, overtonUrl, tmParse, tmUrl } from "./sources.js";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TMKEY = Deno.env.get("TICKETMASTER_API_KEY") ?? "";
const ALLOWED = [/^https:\/\/table-of-[78]\.netlify\.app$/, /^https:\/\/[a-z0-9-]+--table-of-[78]\.netlify\.app$/, /^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/];
const cors = (o: string | null) => ({
  "Access-Control-Allow-Origin": o && ALLOWED.some(r => r.test(o)) ? o : "https://table-of-8.netlify.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin",
});
const STALE_H = 6;
const clip = (x: unknown, k: number) => String(x ?? "").replace(/\s+/g, " ").trim().slice(0, k);
const when = (t: string) => new Date(t).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Chicago" });

async function getJson(url: string) {
  const r = await fetch(url, { headers: { "User-Agent": UA, "Accept": "application/json" }, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return await r.json();
}

// read one source and store what it gave; a source that fails keeps what it had (its row says why)
async function readSource(admin: any, source: string, load: () => Promise<any[]>) {
  try {
    const rows = await load();
    const seen = new Set(rows.map(r => r.id));
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await admin.from("live_events").upsert(rows.slice(i, i + 200).map(r => ({ ...r, fetched_at: new Date().toISOString() })));
      if (error) throw new Error(error.message);
    }
    // a future showing the venue no longer lists was cancelled or moved: take it off
    const { data: had } = await admin.from("live_events").select("id").eq("source", source).gt("starts_at", new Date().toISOString());
    const gone = (had ?? []).map((x: any) => x.id).filter((id: string) => !seen.has(id));
    if (gone.length) await admin.from("live_events").delete().in("id", gone);
    await admin.from("live_sync").upsert({ source, ok: true, count: rows.length, note: "", at: new Date().toISOString() });
    return rows.length;
  } catch (e) {
    console.error("live source", source, (e as Error).message);
    await admin.from("live_sync").upsert({ source, ok: false, count: 0, note: clip((e as Error).message, 200), at: new Date().toISOString() });
    return -1;
  }
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
    const host = me.role === "host";
    const first = String(me.name).split(" ")[0];
    const body = await req.json().catch(() => ({}));

    if (body.action === "refresh") {
      // one phone at a time, at most every 6 hours: claim the turn first (two phones opening at once read once)
      await admin.from("live_sync").upsert({ source: "turn", ok: true, count: 0, note: "", at: new Date(0).toISOString() }, { onConflict: "source", ignoreDuplicates: true });
      const { data: got } = await admin.from("live_sync").update({ at: new Date().toISOString() }).eq("source", "turn")
        .lt("at", new Date(Date.now() - STALE_H * 3600e3).toISOString()).select("source");
      if (!got?.length) return reply({ ok: true, fresh: true });
      // the calendar a showing is in shows it a little before it starts; past showings older than a day are cleared
      await admin.from("live_events").delete().lt("starts_at", new Date(Date.now() - 864e5).toISOString());
      const now = new Date(), months = [0, 1, 2, 3].map(k => new Date(now.getFullYear(), now.getMonth() + k, 1));
      const counts: Record<string, number> = {};
      counts.gpac = await readSource(admin, "gpac", async () => gpacParse(await getJson("https://www.gpacweb.com/event-list?format=json")));
      counts.shell = await readSource(admin, "shell", async () => {
        const all = []; for (const m of months) all.push(...shellParse(await getJson(shellUrl(m.getMonth() + 1, m.getFullYear()))));
        return all;
      });
      counts.overton = await readSource(admin, "overton", async () => {
        const all = []; for (let p = 1; p <= 3; p++) { const j = await getJson(overtonUrl(p)); all.push(...overtonParse(j)); if (!j?.next_rest_url) break; }
        return all;
      });
      if (TMKEY) counts.ticketmaster = await readSource(admin, "ticketmaster", async () => {
        const all = []; for (let p = 0; p < 4; p++) { const j = await getJson(tmUrl(TMKEY, p)); all.push(...tmParse(j)); if ((j?.page?.totalPages ?? 0) <= p + 1) break; }
        return all;
      });
      return reply({ ok: true, fresh: false, counts });
    }

    if (body.action === "status") {
      if (!host) return reply({ ok: false, code: "not_host" }, 403);
      const { data } = await admin.from("live_sync").select("*").neq("source", "turn");
      return reply({ ok: true, sources: data ?? [], ticketmaster: !!TMKEY });
    }

    if (body.action === "ask") {
      const { data: ev } = await admin.from("live_events").select("*").eq("id", String(body.event_id ?? "")).maybeSingle();
      if (!ev) return reply({ ok: false, code: "no_event" }, 404);
      if (Date.parse(ev.starts_at) < Date.now()) return reply({ ok: false, code: "over" }, 409);
      const note = clip(body.note, 140) || null;
      // who to ask (his order, 2026-10-22: "always an option to send to individual members"): only active seats of this family
      const { data: fam } = await admin.from("members").select("id").eq("family_id", me.family_id).eq("status", "active").neq("id", me.id);
      const pick = new Set((Array.isArray(body.invited) ? body.invited : []).map(String));
      const asked = (fam ?? []).map((f: any) => f.id).filter((id: string) => !pick.size || pick.has(id));
      if (!asked.length) return reply({ ok: false, code: "nobody" }, 400);
      const text = (who: string) => `🎟️ ${who} wants to go to ${ev.title} · ${when(ev.starts_at)}${ev.venue ? ` at ${ev.venue}` : ""}. Are you in? Open Memphis Live to answer${note ? `: "${note}"` : "."}`;
      // someone already asked about this show: join that question (I'm in, and anyone I picked who wasn't asked is asked now)
      const joinIn = async (was: any) => {
        const add = [me.id, ...(pick.size ? asked : [])].filter(id => !(was.invited ?? []).includes(id));   // nobody picked: just me
        if (add.length) await admin.from("live_asks").update({ invited: [...(was.invited ?? []), ...add] }).eq("id", was.id);
        await admin.from("live_answers").upsert({ ask_id: was.id, member_id: me.id, family_id: me.family_id, answer: "yes", picks: [ev.id] });
        const told = add.filter(id => id !== me.id && id !== was.by_member);
        if (told.length) await admin.from("alerts").insert(told.map((id: string) => ({ to_member: id, text: text(first) })));
        if (was.by_member !== me.id) await admin.from("alerts").insert({ to_member: was.by_member, text: `🎟️ ${first} is in for ${ev.title} too.` });
        return reply({ ok: true, id: was.id, already: true });
      };
      const { data: was } = await admin.from("live_asks").select("id,invited,by_member").eq("family_id", me.family_id).eq("event_id", ev.id).maybeSingle();
      if (was) return await joinIn(was);
      const { data: a, error } = await admin.from("live_asks").insert({ family_id: me.family_id, event_id: ev.id, title: ev.title, venue: ev.venue,
        starts_at: ev.starts_at, ticket_url: ev.ticket_url || ev.info_url, by_member: me.id, note, invited: [me.id, ...asked] }).select("id").single();
      if (error || !a) {   // asked by someone else a moment ago
        const { data: again } = await admin.from("live_asks").select("id,invited,by_member").eq("family_id", me.family_id).eq("event_id", ev.id).maybeSingle();
        return again ? await joinIn(again) : reply({ ok: false, code: "server" }, 500);
      }
      await admin.from("live_answers").insert({ ask_id: a.id, member_id: me.id, family_id: me.family_id, answer: "yes", picks: [ev.id] });
      await admin.from("alerts").insert(asked.map((id: string) => ({ to_member: id, text: text(first) })));
      return reply({ ok: true, id: a.id });
    }

    if (body.action === "answer" || body.action === "unask") {
      const { data: a } = await admin.from("live_asks").select("*").eq("id", String(body.ask_id ?? "")).maybeSingle();
      if (!a || a.family_id !== me.family_id || !((a.invited ?? []).includes(me.id) || a.by_member === me.id || host)) return reply({ ok: false, code: "no_ask" }, 404);
      if (body.action === "unask") {
        if (a.by_member !== me.id && !host) return reply({ ok: false, code: "not_yours" }, 403);
        await admin.from("live_asks").delete().eq("id", a.id);
        return reply({ ok: true });
      }
      if (!(a.invited ?? []).includes(me.id)) return reply({ ok: false, code: "not_asked" }, 403);
      const answer = String(body.answer ?? "");
      if (!["yes", "maybe", "no"].includes(answer)) return reply({ ok: false, code: "answer" }, 400);
      // the showings I can pick are the other dates and times of the same show at the same place
      const { data: run } = await admin.from("live_events").select("id").eq("title", a.title).eq("venue", a.venue).gt("starts_at", new Date().toISOString());
      const ok = new Set((run ?? []).map((x: any) => x.id));
      const picks = answer === "no" ? [] : [...new Set((Array.isArray(body.picks) ? body.picks : []).map(String))].filter(x => ok.has(x)).slice(0, 30);
      const note = clip(body.note, 140) || null;
      const { data: had } = await admin.from("live_answers").select("answer").eq("ask_id", a.id).eq("member_id", me.id).maybeSingle();
      const { error } = await admin.from("live_answers").upsert({ ask_id: a.id, member_id: me.id, family_id: me.family_id, answer, picks, note, updated_at: new Date().toISOString() });
      if (error) return reply({ ok: false, code: "server" }, 500);
      if (a.by_member !== me.id && had?.answer !== answer) {
        const say = answer === "yes" ? "is in" : answer === "maybe" ? "is a maybe" : "can't make it";
        await admin.from("alerts").insert({ to_member: a.by_member, text: `🎟️ ${first} ${say} for ${a.title}${picks.length > 1 ? ` (${picks.length} dates work)` : ""}${note ? `: "${note}"` : "."}` });
      }
      return reply({ ok: true });
    }
    return reply({ ok: false, code: "action" }, 400);
  } catch (e) {
    console.error("live", (e as Error).message);
    return reply({ ok: false, code: "server" }, 500);
  }
});
