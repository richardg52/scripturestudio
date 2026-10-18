// Table of 7 Game Room server (his order, 2026-10-17). The only road that writes a game:
//   new     {kind, sideA:[seat ids], sideB:[seat ids]}  the caller must be on side A; 1–2 seats a side, one family
//   move    {id, mv, at}  only a player on the side whose turn it is; the move is checked by rules.js;
//                         `at` (the move count the phone saw) stops two phones moving at once
//   resign  {id}          a player gives the game to the other side
// Trivia Night (kind 'trivia'): new also takes {cat: 'mix'|'music'|'tv'|'bible', table?: true}. Teams of 1–4; table
// mode = the caller runs both teams on one phone. The right answer stays in game_secrets until the move is checked.
// The countdown (his order, 2026-10-17): new takes {secs: 10|15|20|30}. A question's clock starts at the row's
// updated_at. When it runs out, any player in the game sends move {timeout:true}; the server checks the time itself.
// Time's up → the SAME question passes to the other team for a steal (its answer still hidden); if the steal runs out
// too, the answer shows and the game moves on. An answer that arrives more than 3 s late counts as time's up.
// Family Feud (kind 'feud'): THE FAMILY IS THE SURVEY.
//   survey_new {prompts:[1–5]}   survey_answer {id, answers}   survey_mine {id}   survey_close {id} (its starter or the host)
//   new {kind:'feud', survey, sideA, sideB}: the caller is the JUDGE (on neither team); the board is built from the
//   closed survey's real answers (feud.js) and stays in game_secrets; peek {id} gives the judge alone the board.
//   Only the judge moves: {reveal:i} | {strike:true} | {next:true}. resign by the judge = stopped.
// Spades for couples (kind 'spades', HIS RULES: JOKERS & DEUCES, spades.js): new {sideA:[me, partner], sideB:[two],
//   target: 300|500}; seats go team 1, team 2, team 1, team 2. The four hands live in game_secrets; hand {id} gives each
//   player their own cards only. A move is {bid} or {card}, from the seat whose turn it is.
// Computer seats (his order, 2026-10-17): in Spades a seat may be "bot:1".."bot:3"; the server plays those seats itself
//   (spades.js spBotBid / spBotPlay) right after each human move, so the turn always comes back to a person.
// Trivia alone: new {kind:'trivia', solo:true, secs}: one player, ten questions, no steal (time's up just shows the answer).
// Blackjack (kind 'blackjack', blackjack.js): new {sideA:[1–4 players, the caller first]}; chips are points, never money.
//   move {bet:n} | {act} | {next:true}; the dealer's face-down card and the shoe stay in game_secrets.
//   resign by any player ends the table: the biggest stack is listed first.
// Hidden state is stamped with the move count it belongs to (`at`), so a move can never be checked against an older
// hand or question than the board it was made on.
// Alerts (they reach phones by push): a challenge, a new survey, and the result.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { GAMES, gameInit, gameApply } from "./rules.js";
import { TRIVIA, TRIVIA_CATS } from "./trivia.js";
import { feudSecret, feudInit, feudApply } from "./feud.js";
import { spDeal, spInit, spApply, spBotBid, spBotPlay } from "./spades.js";
import { bjInit, bjSecret, bjApply } from "./blackjack.js";

const LABEL: Record<string, string> = { ...GAMES, trivia: "Trivia Night", feud: "Family Feud", spades: "Spades", blackjack: "Blackjack" };
const isBot = (x: unknown) => /^bot:[1-3]$/.test(String(x));
const rand = () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
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

// plays every computer seat whose turn it is, until a person's turn comes round or the game ends
function spBots(st0: any, hands0: string[][]) {
  let st = st0, hands = hands0, over = null, n = 0;
  while (!over && isBot(st.seats[st.seat]) && n++ < 400) {
    const k = st.seat, mv = st.phase === "bid" ? { bid: spBotBid(hands[k]) } : { card: spBotPlay(st, hands[k], k) };
    const x = spApply(st, hands, k, mv, () => spDeal(rand)); st = x.st; hands = x.hands; over = x.over;
  }
  return { st, hands, over };
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
      const solo = kind === "trivia" && body.solo === true, table = kind === "trivia" && (body.table === true || solo), most = kind === "trivia" || kind === "feud" || kind === "blackjack" ? 4 : 2;
      const A = table ? [me.id] : [...new Set((body.sideA ?? []).map(String))];
      const B = table ? [me.id] : kind === "blackjack" ? A : (body.sideB ?? []).map(String).filter((x: string, i: number, a: string[]) => isBot(x) || a.indexOf(x) === i);
      if ([...A, ...B].some(isBot) && kind !== "spades") return reply({ ok: false, code: "sides" }, 400);
      if (kind === "blackjack" && A[0] !== me.id) return reply({ ok: false, code: "not_on_side" }, 403);
      if (kind === "feud" ? A.includes(me.id) || B.includes(me.id) : !A.includes(me.id)) return reply({ ok: false, code: kind === "feud" ? "judge_plays" : "not_on_side" }, 403);
      if (kind === "spades" && (A.length !== 2 || B.length !== 2)) return reply({ ok: false, code: "four" }, 400);
      if (!table && (A.length < 1 || A.length > most || B.length < 1 || B.length > most || (kind !== "blackjack" && A.some(x => !isBot(x) && B.includes(x))))) return reply({ ok: false, code: "sides" }, 400);
      if (kind === "spades" && new Set([...A, ...B].filter(isBot)).size !== [...A, ...B].filter(isBot).length) return reply({ ok: false, code: "sides" }, 400);
      const people = [...new Set([...A, ...B].filter(x => !isBot(x)))];
      const { data: seats } = await admin.from("members").select("id,status").eq("family_id", me.family_id).in("id", people);
      if ((seats ?? []).length !== people.length || (seats ?? []).some(s => s.status !== "active")) return reply({ ok: false, code: "seats" }, 403);
      let state: unknown, secret: unknown = null;
      if (kind === "trivia") {
        const cat = String(body.cat ?? "mix"); if (cat !== "mix" && !(cat in TRIVIA)) return reply({ ok: false, code: "cat" }, 400);
        const deck = triviaDeck(cat), ask = triviaAsk(deck[0]);
        const secs = [10, 15, 20, 30].includes(Number(body.secs)) ? Number(body.secs) : 0;
        state = { cat, n: 1, total: TOTAL, q: ask.q, score: [0, 0], last: null, secs: solo ? (secs || 20) : secs, steal: false, table, solo,
          teams: solo ? [first, first] : table ? (body.teams ?? ["Team 1", "Team 2"]).slice(0, 2).map((t: unknown) => String(t).slice(0, 24)) : null };
        secret = { deck, correct: ask.correct, answer: ask.answer, at: 0 };
      } else if (kind === "feud") {
        const { data: sv } = await admin.from("feud_surveys").select("*").eq("id", String(body.survey ?? "")).maybeSingle();
        if (!sv || sv.family_id !== me.family_id) return reply({ ok: false, code: "no_survey" }, 404);
        if (sv.status !== "closed") return reply({ ok: false, code: "survey_open" }, 409);
        const { data: rows } = await admin.from("feud_answers").select("answers").eq("survey_id", sv.id);
        const sec = feudSecret(sv.prompts, rows ?? []);
        if (!sec.order.length) return reply({ ok: false, code: "no_answers" }, 409);
        state = feudInit(sec, sv.id, (rows ?? []).length); secret = sec;
      } else if (kind === "spades") {
        state = spInit([A[0], B[0], A[1], B[1]], Number(body.target)); secret = { hands: spDeal(rand), at: 0 };
        const x = spBots(state, (secret as { hands: string[][] }).hands); state = x.st; secret = { hands: x.hands, at: 0 };
      } else if (kind === "blackjack") {
        state = bjInit(A); secret = { ...bjSecret(rand), at: 0 };
      } else state = gameInit(kind);
      const { data: g, error } = await admin.from("games").insert({ family_id: me.family_id, kind, side_a: A, side_b: B, state, created_by: me.id }).select().single();
      if (error) return reply({ ok: false, code: "server" }, 500);
      if (secret) await admin.from("game_secrets").insert({ game_id: g.id, data: secret });
      if (!table) await alert(people.filter(x => x !== me.id), kind === "feud" ? `${first} is judging Family Feud, built from the family's own survey. Open the Game Room to watch the board.` : `${first} started ${LABEL[kind]} with you. Open the Game Room to play.`);
      return reply({ ok: true, game: g });
    }

    const { data: g } = await admin.from("games").select("*").eq("id", String(body.id ?? "")).maybeSingle();
    if (!g || g.family_id !== me.family_id) return reply({ ok: false, code: "no_game" }, 404);
    if (g.status !== "live") return reply({ ok: false, code: "over" }, 409);
    const isTable = g.kind === "trivia" && g.state?.table === true, isFeud = g.kind === "feud", judge = isFeud && g.created_by === me.id;
    if (body.action === "hand") {
      if (g.kind !== "spades") return reply({ ok: false, code: "kind" }, 400);
      const seat = g.state.seats.indexOf(me.id); if (seat < 0) return reply({ ok: false, code: "not_player" }, 403);
      const { data: sec } = await admin.from("game_secrets").select("data").eq("game_id", g.id).maybeSingle();
      if (!sec || sec.data.at !== g.moves) return reply({ ok: false, code: "stale" }, 409);
      return reply({ ok: true, seat, at: g.moves, hand: sec.data.hands[seat] });
    }
    if (body.action === "peek") {
      if (!judge) return reply({ ok: false, code: "not_judge" }, 403);
      const { data: sec } = await admin.from("game_secrets").select("data").eq("game_id", g.id).maybeSingle();
      return reply({ ok: true, board: sec?.data.boards[sec.data.order[g.state.round - 1]] ?? [] });
    }
    const spSeat = g.kind === "spades" ? g.state.seats.indexOf(me.id) : -1, bjSeat = g.kind === "blackjack" ? g.state.players.indexOf(me.id) : -1;
    const mySide = g.kind === "spades" ? (spSeat < 0 ? -1 : spSeat % 2) : isFeud ? (judge ? g.turn : -1) : isTable ? (g.side_a.includes(me.id) ? g.turn : -1) : g.side_a.includes(me.id) ? 0 : g.side_b.includes(me.id) ? 1 : -1;
    if (mySide < 0) return reply({ ok: false, code: isFeud ? "not_judge" : "not_player" }, 403);
    const bjStacks = async (s: { players: string[]; bank: number[] }) => {
      const { data } = await admin.from("members").select("id,name").in("id", s.players); const nm = (id: string) => String((data ?? []).find(m => m.id === id)?.name ?? "").split(" ")[0];
      return s.players.map((id, i) => [nm(id), s.bank[i]] as [string, number]).sort((a, b) => b[1] - a[1]).map(([n, b]) => `${n} ${b.toLocaleString("en-US")}`).join(" · "); };
    const sideNames = async (side: number) => { const ids = side === 0 ? g.side_a : g.side_b;
      const { data } = await admin.from("members").select("id,name").in("id", ids); return (data ?? []).map(m => String(m.name).split(" ")[0]).join(" & "); };
    const finish = async (winner: number, why: string) => {
      if (isTable) return;
      const label = LABEL[g.kind];
      const text = g.kind === "blackjack" ? `The Blackjack table closed. Final stacks: ${why}.` : winner === 2 ? `${label} ended in a draw (${why}).` : `${await sideNames(winner)} won ${label} (${why}).`;
      await alert([...new Set([...g.side_a, ...g.side_b, ...(isFeud && g.created_by ? [g.created_by] : [])])].filter(x => !isBot(x)), text);
    };

    // Trivia time's up may come from any player's phone (the answering phone may be closed); the server checks the clock
    const tvTimeout = body.action === "move" && g.kind === "trivia" && body.mv?.timeout === true;
    if (tvTimeout && !(g.side_a.includes(me.id) || g.side_b.includes(me.id))) return reply({ ok: false, code: "not_player" }, 403);
    if (body.action === "move") {
      if (!tvTimeout && g.kind !== "blackjack" && (g.kind === "spades" ? g.state.seat !== spSeat : g.turn !== mySide)) return reply({ ok: false, code: "not_your_turn" }, 409);
      if (Number(body.at) !== g.moves) return reply({ ok: false, code: "stale" }, 409);
      let r, nextSecret: unknown = null;
      if (g.kind === "trivia") {
        const secs = Number(g.state.secs) || 0, due = Date.parse(g.updated_at) + secs * 1000, now = Date.now();
        const pick = Number(body.mv?.pick);
        if (tvTimeout) { if (!secs) return reply({ ok: false, code: "illegal" }, 400); if (now < due - 1500) return reply({ ok: false, code: "early" }, 409); }
        else if (!Number.isInteger(pick) || pick < 0 || pick > 3) return reply({ ok: false, code: "illegal" }, 400);
        const late = tvTimeout || (secs > 0 && now > due + 3000);
        const { data: sec } = await admin.from("game_secrets").select("data").eq("game_id", g.id).maybeSingle();
        if (!sec) return reply({ ok: false, code: "server" }, 500);
        if (sec.data.at !== undefined && sec.data.at !== g.moves) return reply({ ok: false, code: "stale" }, 409);
        const st = structuredClone(g.state), side = g.turn, stealing = st.steal === true, owner = stealing ? 1 - side : side;
        if (late && !stealing && !st.solo) {                               // time's up: the same question passes over for a steal
          st.steal = true; st.last = { side, timeout: true, q: st.q.text };
          nextSecret = { ...sec.data, at: g.moves + 1 };
          r = { st, turn: 1 - side, over: null };
        } else {
          const right = !late && pick === sec.data.correct;
          if (right) st.score[side] += 1;
          st.last = late ? { side, timeout: true, stole: true, answer: sec.data.answer, q: st.q.text } : { side, pick, right, answer: sec.data.answer, q: st.q.text, ...(stealing ? { stole: true } : {}) };
          st.steal = false;
          let over = null, data = sec.data;
          if (st.n >= st.total) {
            over = { winner: st.score[0] === st.score[1] ? 2 : st.score[0] > st.score[1] ? 0 : 1, why: `${st.score[0]}–${st.score[1]}` };
            data = { ...data, correct: -1, answer: "" };
          } else {
            const ask = triviaAsk(data.deck[st.n]); st.n += 1; st.q = ask.q; data = { ...data, correct: ask.correct, answer: ask.answer };
          }
          nextSecret = { ...data, at: g.moves + 1 };          // written only after the move itself is recorded
          if (over && st.solo) over = { winner: 2, why: `${st.score[0]} of ${st.total}` };
          r = { st, turn: st.solo ? 0 : 1 - owner, over };   // the next question goes to the team that didn't own this one
        }
      } else if (g.kind === "spades") {
        const { data: sec } = await admin.from("game_secrets").select("data").eq("game_id", g.id).maybeSingle();
        if (!sec || sec.data.at !== g.moves) return reply({ ok: false, code: "stale" }, 409);
        let x; try { x = spApply(g.state, sec.data.hands, spSeat, body.mv ?? {}, () => spDeal(rand)); } catch { return reply({ ok: false, code: "illegal" }, 400); }
        if (!x.over) { const b = spBots(x.st, x.hands); x = { ...x, st: b.st, hands: b.hands, over: b.over }; }
        nextSecret = { hands: x.hands, at: g.moves + 1 };
        r = { st: x.st, turn: x.st.seat % 2, over: x.over };
      } else if (g.kind === "blackjack") {
        const { data: sec } = await admin.from("game_secrets").select("data").eq("game_id", g.id).maybeSingle();
        if (!sec || sec.data.at !== g.moves) return reply({ ok: false, code: "stale" }, 409);
        let x; try { x = bjApply(g.state, sec.data, bjSeat, body.mv ?? {}, rand); } catch (e) { return reply({ ok: false, code: (e as Error).message === "turn" ? "not_your_turn" : "illegal" }, (e as Error).message === "turn" ? 409 : 400); }
        nextSecret = { ...x.sec, at: g.moves + 1 };
        r = { st: x.st, turn: 0, over: x.over ? { winner: 2, why: await bjStacks(x.st) } : null };
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
      // the hidden state must follow the move, or the next player is told "stale" until it does: try it three times
      for (let k = 0; nextSecret && k < 3; k++) { const { error: se } = await admin.from("game_secrets").update({ data: nextSecret }).eq("game_id", g.id); if (!se) break;
        console.error("games secret write", k, se.message); }
      if (r.over) await finish(r.over.winner, r.over.why);
      return reply({ ok: true });
    }
    if (body.action === "resign") {
      if (g.kind === "blackjack") { await admin.from("games").update({ status: "done", winner: 2, why: await bjStacks(g.state), updated_at: new Date().toISOString() }).eq("id", g.id).eq("status", "live");
        await finish(2, await bjStacks(g.state)); return reply({ ok: true }); }
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
