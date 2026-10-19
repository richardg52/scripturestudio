// Table of 7 Game Night Tournament (his order, 2026-10-18). The only road that writes a tournament.
//   new {name, date, players[], games:[{kind, label}]}   2–12 players, 2–10 games; the players are told
//   result {id, i, first[], second[]}   anyone playing (or the host): who came 1st and 2nd in game i
//   clear {id, i}                       anyone playing (or the host): take a result back
//   finish {id}                         the organizer or host: crown the champion(s) (score.js); everyone is told
//   cancel {id}                         the organizer or host
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { tnChampions } from "./score.js";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ALLOWED = [/^https:\/\/table-of-[78]\.netlify\.app$/, /^https:\/\/[a-z0-9-]+--table-of-[78]\.netlify\.app$/, /^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/];
const cors = (o: string | null) => ({
  "Access-Control-Allow-Origin": o && ALLOWED.some(r => r.test(o)) ? o : "https://table-of-8.netlify.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin",
});
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
    const nameOf = async (ids: string[]) => { const { data } = await admin.from("members").select("id,name").in("id", ids); return (data ?? []).map(m => String(m.name).split(" ")[0]).join(" & "); };

    if (body.action === "new") {
      const name = clip(body.name, 60) || "Game Night", date = String(body.date ?? "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return reply({ ok: false, code: "when" }, 400);
      const players = [...new Set((Array.isArray(body.players) ? body.players : []).map(String))];
      if (!players.includes(me.id)) players.unshift(me.id);
      if (players.length < 2 || players.length > 12) return reply({ ok: false, code: "players" }, 400);
      const { data: seats } = await admin.from("members").select("id,status").eq("family_id", me.family_id).in("id", players);
      if ((seats ?? []).length !== players.length || (seats ?? []).some(s => s.status !== "active")) return reply({ ok: false, code: "seats" }, 403);
      const games = (Array.isArray(body.games) ? body.games : []).map((g: any) => ({ kind: clip(g?.kind, 20) || "other", label: clip(g?.label, 40) })).filter((g: any) => g.label);
      if (games.length < 2 || games.length > 10) return reply({ ok: false, code: "games" }, 400);
      const { data: t, error } = await admin.from("tournaments").insert({ family_id: me.family_id, created_by: me.id, name, date, players, games, results: games.map(() => null) }).select().single();
      if (error) return reply({ ok: false, code: "server" }, 500);
      await alert(players, `🏆 ${first} started ${name}: ${games.length} games tonight. May the best player win!`);
      return reply({ ok: true, tournament: t });
    }

    const { data: t } = await admin.from("tournaments").select("*").eq("id", String(body.id ?? "")).maybeSingle();
    if (!t || t.family_id !== me.family_id) return reply({ ok: false, code: "no_tourney" }, 404);
    if (t.status !== "open") return reply({ ok: false, code: "over" }, 409);
    const boss = t.created_by === me.id || me.role === "host", plays = t.players.includes(me.id) || me.role === "host";
    const save = (patch: Record<string, unknown>) => admin.from("tournaments").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", t.id);

    if (body.action === "result" || body.action === "clear") {
      if (!plays) return reply({ ok: false, code: "not_player" }, 403);
      const i = Number(body.i); if (!Number.isInteger(i) || i < 0 || i >= t.games.length) return reply({ ok: false, code: "game" }, 400);
      const results = [...t.results];
      if (body.action === "clear") results[i] = null;
      else {
        const f = [...new Set((Array.isArray(body.first) ? body.first : []).map(String))], s2 = [...new Set((Array.isArray(body.second) ? body.second : []).map(String))];
        if (!f.length || [...f, ...s2].some(p => !t.players.includes(p)) || f.some(p => s2.includes(p))) return reply({ ok: false, code: "placing" }, 400);
        results[i] = { first: f, second: s2, by: me.id };
      }
      await save({ results });
      return reply({ ok: true });
    }
    if (body.action === "finish") {
      if (!boss) return reply({ ok: false, code: "not_boss" }, 403);
      const champions = tnChampions(t.players, t.results);
      if (!champions.length) return reply({ ok: false, code: "no_results" }, 409);
      await save({ status: "done", champions });
      await alert(t.players, `🏆 ${await nameOf(champions)} ${champions.length > 1 ? "are" : "is"} the ${t.name} champion${champions.length > 1 ? "s" : ""}!`);
      return reply({ ok: true, champions });
    }
    if (body.action === "cancel") {
      if (!boss) return reply({ ok: false, code: "not_boss" }, 403);
      await save({ status: "cancelled" });
      return reply({ ok: true });
    }
    return reply({ ok: false, code: "action" }, 400);
  } catch (e) {
    console.error("tourney", (e as Error).message);
    return reply({ ok: false, code: "server" }, 500);
  }
});
