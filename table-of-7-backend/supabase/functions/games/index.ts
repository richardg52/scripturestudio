// Table of 7 Game Room server (his order, 2026-10-17). The only road that writes a game:
//   new     {kind, sideA:[seat ids], sideB:[seat ids]}  the caller must be on side A; 1–2 seats a side, one family
//   move    {id, mv, at}  only a player on the side whose turn it is; the move is checked by rules.js;
//                         `at` (the move count the phone saw) stops two phones moving at once
//   resign  {id}          a player gives the game to the other side
// Trivia Night (kind 'trivia'): new also takes {cat: 'mix'|'music'|'tv'|'bible', table?: true}. Teams of 1–4; table
// mode = the caller runs both teams on one phone. The right answer stays in game_secrets until the move is checked.
// Family Feud (kind 'feud'): THE FAMILY IS THE SURVEY.
//   survey_new {prompts:[1–5]}   survey_answer {id, answers}   survey_mine {id}   survey_close {id} (its starter or the host)
//   new {kind:'feud', survey, sideA, sideB}: the caller is the JUDGE (on neither team); the board is built from the
//   closed survey's real answers (feud.js) and stays in game_secrets; peek {id} gives the judge alone the board.
//   Only the judge moves: {reveal:i} | {strike:true} | {next:true}. resign by the judge = stopped.
// Alerts (they reach phones by push): a challenge, a new survey, and the result.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { GAMES, gameInit, gameApply } from "./rules.js";
import { TRIVIA, TRIVIA_CATS } from "./trivia.js";
import { feudSecret, feudInit, feudApply } from "./feud.js";

const LABEL: Record<string, string> = { ...GAMES, trivia: "Trivia Night", feud: "Family Feud" };
const TOTAL = 10;
const shuffle = <T,>(a: T[]) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
function triviaDeck(cat: string) {
  const cats = cat === "mix" ? Object.keys(TRIVIA) : [cat];
  const all = cats.flatMap(c => (TRIVIA as Record<string, string[][]>)[c].map((_, i) => [c, i] as [string, number]));
  return shuffle(all).slice(0, TOTAL);
}
function triviaAsk(card: [string, number]) {      // -> what phones see, and the secret right answer
  const [c, i] = card, row = (TRIVIA as Record<string, string[][]>)[c][i];
  const order = shuffle([0, 1, 2, 3]);
  return { q: { text: row[0], options: order.map(k => row[1 + k]), cat: (TRIVIA_CATS as Record<string, string>)[c] }, correct: order.indexOf(0), answer: row[1] };
}

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
    const { data: me } = await admin.from("members").select("id,family_id,status,name,role").eq("user_id", u.user.id).maybeSingle();
    if (!me || me.status !== "active") return reply({ ok: false, code: "not_active" }, 403);
    const first = String(me.name).split(" ")[0];
    const body = await req.json().catch(() => ({}));
    const alert = async (to: string[], text: string) => { if (to.length) await admin.from("alerts").insert(to.map(t => ({ to_member: t, text }))); };

    // ---- Family Feud survey: questions are public to the family, answers never leave the server ----
    if (String(body.action ?? "").startsWith("survey_")) {
      const clean = (x: unknown, max: number) => String(x ?? "").replace(/\s+/g, " ").trim().slice(0, max);
      if (body.action === "survey_new") {
        const prompts = (Array.isArray(body.prompts) ? body.prompts : []).map((x: unknown) => clean(x, 120)).filter(Boolean);
        if (prompts.length < 1 || prompts.length > 5) return reply({ ok: false, code: "prompts" }, 400);
        const { data: open } = await admin.from("feud_surveys").select("id").eq("family_id", me.family_id).eq("status", "open").limit(1);
        if (open?.length) return reply({ ok: false, code: "survey_open" }, 409);
        const { data: sv, error } = await admin.from("feud_surveys").insert({ family_id: me.family_id, prompts, created_by: me.id }).select().single();
        if (error) return reply({ ok: false, code: "server" }, 500);
        const { data: fam } = await admin.from("members").select("id").eq("family_id", me.family_id).eq("status", "active").neq("id", me.id);
        await alert((fam ?? []).map(m => m.id), `${first} started a Family Feud survey: ${prompts.length} quick ${prompts.length === 1 ? "question" : "questions"}. Your answers stay secret until the game.`);
        return reply({ ok: true, survey: sv });
      }
      const { data: sv } = await admin.from("feud_surveys").select("*").eq("id", String(body.id ?? "")).maybeSingle();
      if (!sv || sv.family_id !== me.family_id) return reply({ ok: false, code: "no_survey" }, 404);
      if (body.action === "survey_mine") {
        const { data: mine } = await admin.from("feud_answers").select("answers").eq("survey_id", sv.id).eq("member_id", me.id).maybeSingle();
        return reply({ ok: true, answers: mine?.answers ?? null });
      }
      if (sv.status !== "open") return reply({ ok: false, code: "survey_closed" }, 409);
      if (body.action === "survey_answer") {
        const answers = (Array.isArray(body.answers) ? body.answers : []).map((x: unknown) => clean(x, 40));
        if (answers.length !== sv.prompts.length || answers.some((a: string) => !a)) return reply({ ok: false, code: "blank" }, 400);
        const { error } = await admin.from("feud_answers").upsert({ survey_id: sv.id, member_id: me.id, answers, updated_at: new Date().toISOString() });
        if (error) return reply({ ok: false, code: "server" }, 500);
        if (!sv.answered.includes(me.id)) await admin.from("feud_surveys").update({ answered: [...sv.answered, me.id], updated_at: new Date().toISOString() }).eq("id", sv.id);
        return reply({ ok: true });
      }
      if (body.action === "survey_close") {
        if (sv.created_by !== me.id && me.role !== "host") return reply({ ok: false, code: "not_starter" }, 403);
        if (sv.answered.length < 2) return reply({ ok: false, code: "few" }, 409);
        await admin.from("feud_surveys").update({ status: "closed", updated_at: new Date().toISOString() }).eq("id", sv.id);
        return reply({ ok: true });
      }
      return reply({ ok: false, code: "action" }, 400);
    }

    if (body.action === "new") {
      const kind = String(body.kind ?? "");
      if (!(kind in LABEL)) return reply({ ok: false, code: "kind" }, 400);
      const table = kind === "trivia" && body.table === true, most = kind === "trivia" || kind === "feud" ? 4 : 2;
      const A = table ? [me.id] : [...new Set((body.sideA ?? []).map(String))], B = table ? [me.id] : [...new Set((body.sideB ?? []).map(String))];
      if (kind === "feud" ? A.includes(me.id) || B.includes(me.id) : !A.includes(me.id)) return reply({ ok: false, code: kind === "feud" ? "judge_plays" : "not_on_side" }, 403);
      if (!table && (A.length < 1 || A.length > most || B.length < 1 || B.length > most || A.some(x => B.includes(x)))) return reply({ ok: false, code: "sides" }, 400);
      const { data: seats } = await admin.from("members").select("id,status").eq("family_id", me.family_id).in("id", [...A, ...B]);
      if ((seats ?? []).length !== new Set([...A, ...B]).size || (seats ?? []).some(s => s.status !== "active")) return reply({ ok: false, code: "seats" }, 403);
      let state: unknown, secret: unknown = null;
      if (kind === "trivia") {
        const cat = String(body.cat ?? "mix"); if (cat !== "mix" && !(cat in TRIVIA)) return reply({ ok: false, code: "cat" }, 400);
        const deck = triviaDeck(cat), ask = triviaAsk(deck[0]);
        state = { cat, n: 1, total: TOTAL, q: ask.q, score: [0, 0], last: null, table, teams: table ? (body.teams ?? ["Team 1", "Team 2"]).slice(0, 2).map((t: unknown) => String(t).slice(0, 24)) : null };
        secret = { deck, correct: ask.correct, answer: ask.answer };
      } else if (kind === "feud") {
        const { data: sv } = await admin.from("feud_surveys").select("*").eq("id", String(body.survey ?? "")).maybeSingle();
        if (!sv || sv.family_id !== me.family_id) return reply({ ok: false, code: "no_survey" }, 404);
        if (sv.status !== "closed") return reply({ ok: false, code: "survey_open" }, 409);
        const { data: rows } = await admin.from("feud_answers").select("answers").eq("survey_id", sv.id);
        const sec = feudSecret(sv.prompts, rows ?? []);
        if (!sec.order.length) return reply({ ok: false, code: "no_answers" }, 409);
        state = feudInit(sec, sv.id, (rows ?? []).length); secret = sec;
      } else state = gameInit(kind);
      const { data: g, error } = await admin.from("games").insert({ family_id: me.family_id, kind, side_a: A, side_b: B, state, created_by: me.id }).select().single();
      if (error) return reply({ ok: false, code: "server" }, 500);
      if (secret) await admin.from("game_secrets").insert({ game_id: g.id, data: secret });
      if (!table) await alert([...new Set([...A, ...B])].filter(x => x !== me.id), kind === "feud" ? `${first} is judging Family Feud, built from the family's own survey. Open the Game Room to watch the board.` : `${first} started ${LABEL[kind]} with you. Open the Game Room to play.`);
      return reply({ ok: true, game: g });
    }

    const { data: g } = await admin.from("games").select("*").eq("id", String(body.id ?? "")).maybeSingle();
    if (!g || g.family_id !== me.family_id) return reply({ ok: false, code: "no_game" }, 404);
    if (g.status !== "live") return reply({ ok: false, code: "over" }, 409);
    const isTable = g.kind === "trivia" && g.state?.table === true, isFeud = g.kind === "feud", judge = isFeud && g.created_by === me.id;
    if (body.action === "peek") {
      if (!judge) return reply({ ok: false, code: "not_judge" }, 403);
      const { data: sec } = await admin.from("game_secrets").select("data").eq("game_id", g.id).maybeSingle();
      return reply({ ok: true, board: sec?.data.boards[sec.data.order[g.state.round - 1]] ?? [] });
    }
    const mySide = isFeud ? (judge ? g.turn : -1) : isTable ? (g.side_a.includes(me.id) ? g.turn : -1) : g.side_a.includes(me.id) ? 0 : g.side_b.includes(me.id) ? 1 : -1;
    if (mySide < 0) return reply({ ok: false, code: isFeud ? "not_judge" : "not_player" }, 403);
    const sideNames = async (side: number) => { const ids = side === 0 ? g.side_a : g.side_b;
      const { data } = await admin.from("members").select("id,name").in("id", ids); return (data ?? []).map(m => String(m.name).split(" ")[0]).join(" & "); };
    const finish = async (winner: number, why: string) => {
      if (isTable) return;
      const label = LABEL[g.kind];
      const text = winner === 2 ? `${label} ended in a draw (${why}).` : `${await sideNames(winner)} won ${label} (${why}).`;
      await alert([...new Set([...g.side_a, ...g.side_b, ...(isFeud && g.created_by ? [g.created_by] : [])])], text);
    };

    if (body.action === "move") {
      if (g.turn !== mySide) return reply({ ok: false, code: "not_your_turn" }, 409);
      if (Number(body.at) !== g.moves) return reply({ ok: false, code: "stale" }, 409);
      let r, nextSecret: unknown = null;
      if (g.kind === "trivia") {
        const pick = Number(body.mv?.pick);
        if (!Number.isInteger(pick) || pick < 0 || pick > 3) return reply({ ok: false, code: "illegal" }, 400);
        const { data: sec } = await admin.from("game_secrets").select("data").eq("game_id", g.id).maybeSingle();
        if (!sec) return reply({ ok: false, code: "server" }, 500);
        const st = structuredClone(g.state), right = pick === sec.data.correct;
        if (right) st.score[mySide] += 1;
        st.last = { side: mySide, pick, right, answer: sec.data.answer, q: st.q.text };
        let over = null, data = sec.data;
        if (st.n >= st.total) {
          over = { winner: st.score[0] === st.score[1] ? 2 : st.score[0] > st.score[1] ? 0 : 1, why: `${st.score[0]}–${st.score[1]}` };
          data = { ...data, correct: -1, answer: "" };
        } else {
          const ask = triviaAsk(data.deck[st.n]); st.n += 1; st.q = ask.q; data = { ...data, correct: ask.correct, answer: ask.answer };
        }
        nextSecret = data;                                  // written only after the move itself is recorded
        r = { st, turn: isTable ? 1 - g.turn : 1 - mySide, over };
      } else if (isFeud) {
        const { data: sec } = await admin.from("game_secrets").select("data").eq("game_id", g.id).maybeSingle();
        if (!sec) return reply({ ok: false, code: "server" }, 500);
        try { r = feudApply(g.state, sec.data, body.mv ?? {}); } catch { return reply({ ok: false, code: "illegal" }, 400); }
      } else {
        try { r = gameApply(g.kind, g.state, mySide, body.mv ?? {}); } catch { return reply({ ok: false, code: "illegal" }, 400); }
      }
      const patch: Record<string, unknown> = { state: r.st, turn: r.turn, moves: g.moves + 1, last: { by: me.id, mv: body.mv }, updated_at: new Date().toISOString() };
      if (r.over) Object.assign(patch, { status: "done", winner: r.over.winner, why: r.over.why });
      const { data: done } = await admin.from("games").update(patch).eq("id", g.id).eq("moves", g.moves).eq("status", "live").select("id");
      if (!done?.length) return reply({ ok: false, code: "stale" }, 409);
      if (nextSecret) await admin.from("game_secrets").update({ data: nextSecret }).eq("game_id", g.id);
      if (r.over) await finish(r.over.winner, r.over.why);
      return reply({ ok: true });
    }
    if (body.action === "resign") {
      if (isTable || isFeud) { await admin.from("games").update({ status: "done", winner: 2, why: "stopped", updated_at: new Date().toISOString() }).eq("id", g.id); return reply({ ok: true }); }
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
