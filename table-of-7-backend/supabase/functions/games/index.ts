// Table of 7 Game Room server (his order, 2026-10-17). The only road that writes a game:
//   new     {kind, sideA:[seat ids], sideB:[seat ids]}  the caller must be on side A; 1–2 seats a side, one family
//   move    {id, mv, at}  only a player on the side whose turn it is; the move is checked by rules.js;
//                         `at` (the move count the phone saw) stops two phones moving at once
//   resign  {id}          a player gives the game to the other side
// Alerts (they reach phones by push): a challenge, and the result.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { GAMES, gameInit, gameApply } from "./rules.js";

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
  try {
    const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } });
    const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: u } = await admin.auth.getUser(jwt);
    if (!u?.user) return reply({ ok: false, code: "signed_out" }, 401);
    const { data: me } = await admin.from("members").select("id,family_id,status,name").eq("user_id", u.user.id).maybeSingle();
    if (!me || me.status !== "active") return reply({ ok: false, code: "not_active" }, 403);
    const first = String(me.name).split(" ")[0];
    const body = await req.json().catch(() => ({}));
    const alert = async (to: string[], text: string) => { if (to.length) await admin.from("alerts").insert(to.map(t => ({ to_member: t, text }))); };

    if (body.action === "new") {
      const kind = String(body.kind ?? "");
      if (!(kind in GAMES)) return reply({ ok: false, code: "kind" }, 400);
      const A = [...new Set((body.sideA ?? []).map(String))], B = [...new Set((body.sideB ?? []).map(String))];
      if (!A.includes(me.id)) return reply({ ok: false, code: "not_on_side" }, 403);
      if (A.length < 1 || A.length > 2 || B.length < 1 || B.length > 2 || A.some(x => B.includes(x))) return reply({ ok: false, code: "sides" }, 400);
      const { data: seats } = await admin.from("members").select("id,status").eq("family_id", me.family_id).in("id", [...A, ...B]);
      if ((seats ?? []).length !== A.length + B.length || (seats ?? []).some(s => s.status !== "active")) return reply({ ok: false, code: "seats" }, 403);
      const { data: g, error } = await admin.from("games").insert({ family_id: me.family_id, kind, side_a: A, side_b: B, state: gameInit(kind), created_by: me.id }).select().single();
      if (error) return reply({ ok: false, code: "server" }, 500);
      await alert([...A, ...B].filter(x => x !== me.id), `${first} started ${GAMES[kind as keyof typeof GAMES]} with you. Open the Game Room to play.`);
      return reply({ ok: true, game: g });
    }

    const { data: g } = await admin.from("games").select("*").eq("id", String(body.id ?? "")).maybeSingle();
    if (!g || g.family_id !== me.family_id) return reply({ ok: false, code: "no_game" }, 404);
    if (g.status !== "live") return reply({ ok: false, code: "over" }, 409);
    const mySide = g.side_a.includes(me.id) ? 0 : g.side_b.includes(me.id) ? 1 : -1;
    if (mySide < 0) return reply({ ok: false, code: "not_player" }, 403);
    const sideNames = async (side: number) => { const ids = side === 0 ? g.side_a : g.side_b;
      const { data } = await admin.from("members").select("id,name").in("id", ids); return (data ?? []).map(m => String(m.name).split(" ")[0]).join(" & "); };
    const finish = async (winner: number, why: string) => {
      const label = GAMES[g.kind as keyof typeof GAMES];
      const text = winner === 2 ? `${label} ended in a draw (${why}).` : `${await sideNames(winner)} won ${label} (${why}).`;
      await alert([...g.side_a, ...g.side_b], text);
    };

    if (body.action === "move") {
      if (g.turn !== mySide) return reply({ ok: false, code: "not_your_turn" }, 409);
      if (Number(body.at) !== g.moves) return reply({ ok: false, code: "stale" }, 409);
      let r;
      try { r = gameApply(g.kind, g.state, mySide, body.mv ?? {}); } catch { return reply({ ok: false, code: "illegal" }, 400); }
      const patch: Record<string, unknown> = { state: r.st, turn: r.turn, moves: g.moves + 1, last: { by: me.id, mv: body.mv }, updated_at: new Date().toISOString() };
      if (r.over) Object.assign(patch, { status: "done", winner: r.over.winner, why: r.over.why });
      const { data: done } = await admin.from("games").update(patch).eq("id", g.id).eq("moves", g.moves).eq("status", "live").select("id");
      if (!done?.length) return reply({ ok: false, code: "stale" }, 409);
      if (r.over) await finish(r.over.winner, r.over.why);
      return reply({ ok: true });
    }
    if (body.action === "resign") {
      const { data: done } = await admin.from("games").update({ status: "done", winner: 1 - mySide, why: `${first} resigned`, updated_at: new Date().toISOString() })
        .eq("id", g.id).eq("status", "live").select("id");
      if (!done?.length) return reply({ ok: false, code: "stale" }, 409);
      await finish(1 - mySide, `${first} resigned`);
      return reply({ ok: true });
    }
    return reply({ ok: false, code: "action" }, 400);
  } catch (e) {
    console.error("games", (e as Error).message);
    return reply({ ok: false, code: "server" }, 500);
  }
});
