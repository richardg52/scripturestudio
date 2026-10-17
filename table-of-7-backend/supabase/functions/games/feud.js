// Table of 7 Family Feud (his order, 2026-10-17). SERVER ONLY. THE FAMILY IS THE SURVEY: the board for a question
// is built from the family's own private answers, and an answer is worth the number of people who gave it.
// Nothing here invents a number. Spellings are grouped ("Pizza", "pizzas", "the pizza" are one answer); answers
// that mean the same but are worded differently ("soda", "pop") stay apart on the board, and the judge decides at the
// table whether a spoken guess matches one.
// Play (no face-off): the team on turn calls out answers; the judge reveals a match (its points go in the bank) or
// gives a strike. Three strikes and the other team gets one guess to steal the bank. Clearing the board, or the
// steal, ends the round; the round's winner banks the points. The team that starts alternates each round.
export const FEUD_PROMPTS = [
  "Name something the family always orders when we eat out.",
  "Name a reason someone shows up late to a family dinner.",
  "Name a side dish that has to be on the table at Thanksgiving.",
  "Name something you'd find in Grandma's purse.",
  "Name a dessert you could never turn down.",
  "Name something people do right after a big meal.",
  "Name a restaurant chain everyone in the family knows.",
  "Name a word that describes our family.",
  "Name something you bring to a church potluck.",
  "Name a reason to call a family meeting.",
  "Name a board game or card game families play.",
  "Name something that is always in the family fridge.",
  "Name a place the family should go on a trip together.",
  "Name a chore nobody wants to do.",
  "Name something people argue about at the dinner table.",
  "Name a food that's better the next day.",
  "Name something you say grace for.",
  "Name a song everyone knows the words to.",
  "Name something kids ask for at a restaurant.",
  "Name a hymn or gospel song sung at church.",
  "Name something you do on a Sunday afternoon.",
  "Name a TV show the whole family can watch together.",
  "Name a topping you'd put on a pizza.",
  "Name something that makes a birthday special.",
  "Name a reason to leave a restaurant a big tip.",
  "Name a famous person you'd invite to Sunday dinner.",
  "Name a holiday tradition in our family.",
  "Name something you'd find at a family reunion.",
  "Name something that gets left behind at a restaurant.",
  "Name a food you'd order at a soul food restaurant.",
];
export const FEUD_SLOTS = 6, FEUD_STRIKES = 3;

export function feudNorm(s){
  let t = String(s ?? "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  t = t.replace(/^(a|an|the|my|our|some) /, "");
  // one key for singular and plural: drop a plural s, and spell a consonant + y ending as "ie"
  // (cookies/cookie -> cookie, berries/berry -> berrie, turkeys/turkey -> turkey)
  return t.split(" ").map(w => { if(w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) w = w.slice(0, -1);
    return /[^aeiou]y$/.test(w) && w.length > 2 ? w.slice(0, -1) + "ie" : w; }).join(" ");
}
// raw answers for one question -> [{t, n}] most given first, at most six; t is the spelling given most often
export function feudBoard(list){
  const g = new Map();
  for(const raw of list){ const r = String(raw ?? "").trim().slice(0, 40), k = feudNorm(r); if(!k) continue;
    const e = g.get(k) || { n: 0, spell: new Map() }; e.n++; e.spell.set(r, (e.spell.get(r) || 0) + 1); g.set(k, e); }
  return [...g.values()].map(e => ({ t: [...e.spell.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0], n: e.n }))
    .sort((a, b) => b.n - a.n || a.t.localeCompare(b.t)).slice(0, FEUD_SLOTS);
}
// rows: [{answers:[...]}] one per person -> secret {prompts, boards, order}; order = the questions anyone answered
export function feudSecret(prompts, rows){
  const boards = prompts.map((_, i) => feudBoard(rows.map(r => (r.answers || [])[i])));
  return { prompts, boards, order: boards.map((b, i) => b.length ? i : -1).filter(i => i >= 0) };
}
function feudRound(st, sec, r, starter){
  const b = sec.boards[sec.order[r]];
  Object.assign(st, { round: r + 1, prompt: sec.prompts[sec.order[r]], slots: b.length, shown: Array(b.length).fill(null),
    bank: 0, strikes: 0, phase: "play", starter, turn: starter });
  return st;
}
export function feudInit(sec, survey, people){
  return feudRound({ survey, people, rounds: sec.order.length, score: [0, 0], last: null }, sec, 0, 0);
}
// mv: {reveal:i} | {strike:true} | {next:true}; returns {st, turn, over}
export function feudApply(st0, sec, mv){
  const st = JSON.parse(JSON.stringify(st0)), b = sec.boards[sec.order[st.round - 1]];
  const endRound = win => {
    st.score[win] += st.bank; st.last = { ...(st.last || {}), round: { win, bank: st.bank } };
    st.shown = b.map(x => ({ ...x })); st.phase = "between";
    if(st.round >= st.rounds){ const [x, y] = st.score; return { st, turn: st.turn, over: { winner: x === y ? 2 : x > y ? 0 : 1, why: `${x}–${y}` } }; }
    return { st, turn: st.turn, over: null };
  };
  if(st.phase === "between"){
    if(!mv || mv.next !== true) throw new Error("illegal");
    feudRound(st, sec, st.round, 1 - st.starter); st.last = null; return { st, turn: st.turn, over: null };
  }
  if(mv && Number.isInteger(mv.reveal)){
    const i = mv.reveal; if(i < 0 || i >= b.length || st.shown[i]) throw new Error("illegal");
    st.shown[i] = { ...b[i] }; st.bank += b[i].n;
    st.last = { kind: st.phase === "steal" ? "stole" : "hit", side: st.turn, t: b[i].t, n: b[i].n };
    if(st.phase === "steal") return endRound(st.turn);
    if(st.shown.every(Boolean)) return endRound(st.turn);
    return { st, turn: st.turn, over: null };
  }
  if(mv && mv.strike === true){
    if(st.phase === "steal"){ st.last = { kind: "nosteal", side: st.turn }; return endRound(1 - st.turn); }
    st.strikes += 1; st.last = { kind: "strike", side: st.turn, strikes: st.strikes };
    if(st.strikes >= FEUD_STRIKES){ st.phase = "steal"; st.turn = 1 - st.turn; }
    return { st, turn: st.turn, over: null };
  }
  throw new Error("illegal");
}
