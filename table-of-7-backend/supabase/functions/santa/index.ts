// Table of 7 Secret Santa (his order, 2026-10-18; couples kept apart). The only road that writes an exchange.
//   new {name, budget?, date?, note?}      the organizer; joins it and tells the family
//   join {id} / leave {id}                 while it's open
//   households {id, groups:[[ids]]}        the organizer or host: couples / households who must not draw each other
//   wish {id, items:[{text, link?, size?}]}  your own wish list (up to 12 things), any time until it's revealed
//   draw {id}                              the organizer or host, 3 or more joined: the server draws names
//   undraw {id}                            the organizer or host, before the reveal: back to open, names cleared
//   mine {id}                              who YOU drew (only you), with your private "bought" mark
//   bought {id, value}                     your own mark
//   reveal {id}                            the organizer or host: everyone may now see who had whom
//   pairs {id}                             after the reveal only: the whole list
//   cancel {id}                            the organizer or host
// Who drew whom lives in santa_pairs, which no phone can read; this road never hands one person anyone else's match.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { santaDraw } from "./draw.js";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ALLOWED = [/^https:\/\/table-of-[78]\.netlify\.app$/, /^https:\/\/[a-z0-9-]+--table-of-[78]\.netlify\.app$/, /^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/];
const cors = (o: string | null) => ({
  "Access-Control-Allow-Origin": o && ALLOWED.some(r => r.test(o)) ? o : "https://table-of-8.netlify.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin",
});
const clip = (x: unknown, k: number) => String(x ?? "").replace(/\s+/g, " ").trim().slice(0, k);
const rand = () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;

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

    if (body.action === "new") {
      const name = clip(body.name, 60) || "Secret Santa";
      const budget = body.budget === undefined || body.budget === null || body.budget === "" ? null : Number(body.budget);
      if (budget !== null && !(budget > 0 && budget < 10000)) return reply({ ok: false, code: "budget" }, 400);
      const date = body.date ? String(body.date) : null;
      if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return reply({ ok: false, code: "when" }, 400);
      const { data: x, error } = await admin.from("santa_exchanges").insert({ family_id: me.family_id, created_by: me.id, name, budget, exchange_date: date,
        note: clip(body.note, 300) || null, joined: [me.id] }).select().single();
      if (error) return reply({ ok: false, code: "server" }, 500);
      // who is told (his order, 2026-10-22: "always an option to send to individual members"); nobody picked = everyone
      const { data: fam } = await admin.from("members").select("id").eq("family_id", me.family_id).eq("status", "active");
      const pick = new Set((Array.isArray(body.invited) ? body.invited : []).map(String));
      await alert((fam ?? []).map(m => m.id).filter(id => !pick.size || pick.has(id)), `🎁 ${first} started ${name}. Open Secret Santa to join and add your wish list.`);
      return reply({ ok: true, exchange: x });
    }

    const { data: x } = await admin.from("santa_exchanges").select("*").eq("id", String(body.id ?? "")).maybeSingle();
    if (!x || x.family_id !== me.family_id) return reply({ ok: false, code: "no_exchange" }, 404);
    if (x.status === "cancelled") return reply({ ok: false, code: "cancelled" }, 409);
    const boss = x.created_by === me.id || me.role === "host", inIt = x.joined.includes(me.id);
    const touch = (patch: Record<string, unknown> = {}) => admin.from("santa_exchanges").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", x.id);

    if (body.action === "join" || body.action === "leave") {
      if (x.status !== "open") return reply({ ok: false, code: "drawn" }, 409);
      const joined = body.action === "join" ? [...new Set([...x.joined, me.id])] : x.joined.filter((j: string) => j !== me.id);
      const households = (x.households ?? []).map((g: string[]) => g.filter(id => joined.includes(id))).filter((g: string[]) => g.length > 1);
      await touch({ joined, households });
      if (body.action === "join" && !inIt && x.created_by) await alert([x.created_by], `🎁 ${first} joined ${x.name}.`);
      return reply({ ok: true });
    }
    if (body.action === "households") {
      if (!boss) return reply({ ok: false, code: "not_boss" }, 403);
      if (x.status !== "open") return reply({ ok: false, code: "drawn" }, 409);
      const groups = (Array.isArray(body.groups) ? body.groups : []).map((g: unknown) => [...new Set((Array.isArray(g) ? g : []).map(String))])
        .filter((g: string[]) => g.length > 1);
      const all = groups.flat();
      if (all.some((id: string) => !x.joined.includes(id)) || new Set(all).size !== all.length) return reply({ ok: false, code: "groups" }, 400);
      await touch({ households: groups });
      return reply({ ok: true });
    }
    if (body.action === "wish") {
      if (!inIt) return reply({ ok: false, code: "not_in" }, 403);
      if (x.status === "revealed") return reply({ ok: false, code: "revealed" }, 409);
      const raw = Array.isArray(body.items) ? body.items : [];
      if (raw.length > 12) return reply({ ok: false, code: "too_many" }, 400);
      const items = raw.map((it: any) => ({ text: clip(it?.text, 120), link: clip(it?.link, 400), size: clip(it?.size, 40) })).filter((it: any) => it.text);
      if (items.some((it: any) => it.link && !/^https?:\/\/[^\s]+$/i.test(it.link))) return reply({ ok: false, code: "link" }, 400);
      await admin.from("santa_wishes").upsert({ exchange_id: x.id, member_id: me.id, items, updated_at: new Date().toISOString() });
      await touch();
      return reply({ ok: true });
    }
    if (body.action === "draw") {
      if (!boss) return reply({ ok: false, code: "not_boss" }, 403);
      if (x.status !== "open") return reply({ ok: false, code: "drawn" }, 409);
      if (x.joined.length < 3) return reply({ ok: false, code: "few" }, 409);
      const { data: seats } = await admin.from("members").select("id,status").eq("family_id", me.family_id).in("id", x.joined);
      if ((seats ?? []).length !== x.joined.length || (seats ?? []).some(s => s.status !== "active")) return reply({ ok: false, code: "seats" }, 409);
      const d = santaDraw(x.joined, x.households ?? [], rand);
      if (!d) return reply({ ok: false, code: "no_draw" }, 409);
      await admin.from("santa_pairs").delete().eq("exchange_id", x.id);
      const { error } = await admin.from("santa_pairs").insert(Object.entries(d).map(([giver, receiver]) => ({ exchange_id: x.id, giver, receiver })));
      if (error) return reply({ ok: false, code: "server" }, 500);
      const { data: done } = await admin.from("santa_exchanges").update({ status: "drawn", updated_at: new Date().toISOString() }).eq("id", x.id).eq("status", "open").select("id");
      if (!done?.length){ await admin.from("santa_pairs").delete().eq("exchange_id", x.id); return reply({ ok: false, code: "drawn" }, 409); }
      await alert(x.joined, `🎁 Names are drawn for ${x.name}! Open Secret Santa to see who you got. Keep it a secret!`);
      return reply({ ok: true });
    }
    if (body.action === "undraw") {
      if (!boss) return reply({ ok: false, code: "not_boss" }, 403);
      if (x.status !== "drawn") return reply({ ok: false, code: "not_drawn" }, 409);
      await admin.from("santa_pairs").delete().eq("exchange_id", x.id);
      await touch({ status: "open" });
      await alert(x.joined, `🎁 ${first} put the names for ${x.name} back in the hat. They'll be drawn again.`);
      return reply({ ok: true });
    }
    if (body.action === "mine" || body.action === "bought") {
      if (!inIt) return reply({ ok: false, code: "not_in" }, 403);
      if (x.status === "open") return reply({ ok: false, code: "not_drawn" }, 409);
      const { data: p } = await admin.from("santa_pairs").select("receiver,bought").eq("exchange_id", x.id).eq("giver", me.id).maybeSingle();
      if (!p) return reply({ ok: false, code: "not_drawn" }, 409);
      if (body.action === "bought") { await admin.from("santa_pairs").update({ bought: body.value === true }).eq("exchange_id", x.id).eq("giver", me.id); return reply({ ok: true }); }
      return reply({ ok: true, receiver: p.receiver, bought: p.bought });
    }
    if (body.action === "reveal") {
      if (!boss) return reply({ ok: false, code: "not_boss" }, 403);
      if (x.status !== "drawn") return reply({ ok: false, code: "not_drawn" }, 409);
      await touch({ status: "revealed" });
      await alert(x.joined, `🎁 ${x.name}: the Santas are revealed! Open Secret Santa to see who had whom.`);
      return reply({ ok: true });
    }
    if (body.action === "pairs") {
      if (x.status !== "revealed") return reply({ ok: false, code: "not_revealed" }, 409);
      if (!inIt && me.role !== "host") return reply({ ok: false, code: "not_in" }, 403);
      const { data: ps } = await admin.from("santa_pairs").select("giver,receiver").eq("exchange_id", x.id);
      return reply({ ok: true, pairs: ps ?? [] });
    }
    if (body.action === "cancel") {
      if (!boss) return reply({ ok: false, code: "not_boss" }, 403);
      await admin.from("santa_pairs").delete().eq("exchange_id", x.id);
      await touch({ status: "cancelled" });
      await alert(x.joined, `🎁 ${first} cancelled ${x.name}.`);
      return reply({ ok: true });
    }
    return reply({ ok: false, code: "action" }, 400);
  } catch (e) {
    console.error("santa", (e as Error).message);
    return reply({ ok: false, code: "server" }, 500);
  }
});
