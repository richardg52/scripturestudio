// Table of 8 Hangouts (his order, 2026-10-23: "give members a way to invite members to a second event after a current
// event to something else that only a few may be asked to attend", and from Getaways and couples' places "send an
// invitation to a friend or family member out of the app … Place, Time, Dress, $Cost (estimates), Menu or event place and
// driving directions"). The only road that writes a hangout.
//   new {title, place{name,address,maps,menu,website,reviews}, date, time, dress?, cost_pp?, note?, invited[], after_of?, src?, outside?}
//   rsvp {id, ans}                       my answer
//   eta {id, plan?|way?|here?|clear?}    when I'll get there: a planned time, "on my way, N minutes", or "I'm here"
//   invite {id, invited[]}               the planner changes who's invited (people added are told)
//   cancel {id}                          the planner or the host
//   share {id, on}                       the planner makes (or ends) the outside-invite link
//   public_get {t} / public_reply {t, name, ans, note?}   the invite page, for people who aren't in the app (no sign-in)
// Only the people invited (and the planner, and the host) can see a hangout. Deployed with verify_jwt = false so the invite
// page can read its one hangout by its link; every other action checks the seat itself.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ALLOWED = [/^https:\/\/table-of-[78]\.netlify\.app$/, /^https:\/\/[a-z0-9-]+--table-of-[78]\.netlify\.app$/, /^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/];
const cors = (o: string | null) => ({
  "Access-Control-Allow-Origin": o && ALLOWED.some(r => r.test(o)) ? o : "https://table-of-8.netlify.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin",
});
const LINK = "https://table-of-8.netlify.app/invite.html?t=";
const clip = (x: unknown, k: number) => String(x ?? "").replace(/\s+/g, " ").trim().slice(0, k);
const https = (u: unknown) => /^https:\/\/[^\s"'<>]+$/.test(String(u ?? "")) ? String(u).slice(0, 600) : "";
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
const dayOf = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
const DRESS = new Set(["Casual", "Smart casual", "Dressy", "Game day", "Comfy", "Outdoor"]);
const SRC = new Set(["free", "after", "restaurant", "couples", "getaway", "live", "watch"]);
const token = () => { const b = new Uint8Array(18); crypto.getRandomValues(b); return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
const placeOf = (p: any) => ({ name: clip(p?.name, 120), address: clip(p?.address, 200), maps: https(p?.maps), menu: https(p?.menu),
  website: https(p?.website), reviews: https(p?.reviews), city: clip(p?.city, 40) });
const timeOk = (t: string) => !t || /^\d{1,2}(:\d{2})?\s?(AM|PM|am|pm)?$/.test(t);

Deno.serve(async (req) => {
  const h = { ...cors(req.headers.get("origin")), "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  const reply = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: h });
  try {
    const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } });
    const body = await req.json().catch(() => ({}));
    const firstOf = async (id: string) => { const { data } = await admin.from("members").select("name").eq("id", id).maybeSingle(); return String(data?.name ?? "Someone").split(" ")[0]; };

    // ── the invite page (no sign-in): one hangout, by its link ──
    if (body.action === "public_get" || body.action === "public_reply") {
      const t = String(body.t ?? "");
      if (!/^[A-Za-z0-9_-]{20,40}$/.test(t)) return reply({ ok: false, code: "link" });
      const { data: x } = await admin.from("hangouts").select("id,family_id,created_by,title,place,date,time,dress,cost_pp,note,status").eq("share_token", t).maybeSingle();
      if (!x) return reply({ ok: false, code: "link" });
      const { data: fam } = await admin.from("families").select("status").eq("id", x.family_id).maybeSingle();
      if (x.status !== "open" || fam?.status !== "active") return reply({ ok: false, code: "closed" });
      if (x.date < new Date(Date.now() - 2 * 864e5).toLocaleDateString("en-CA", { timeZone: "America/Chicago" })) return reply({ ok: false, code: "past" });
      const from = await firstOf(x.created_by);
      if (body.action === "public_get") {
        const { count } = await admin.from("hangout_guests").select("id", { count: "exact", head: true }).eq("hangout_id", x.id).eq("rsvp", "yes");
        return reply({ ok: true, from, title: x.title, place: x.place, date: x.date, day: dayOf(x.date), time: x.time, dress: x.dress, cost_pp: x.cost_pp, note: x.note, yes: count ?? 0 });
      }
      const name = clip(body.name, 60), ans = ["yes", "maybe", "no"].includes(body.ans) ? body.ans : "";
      if (!name || !ans) return reply({ ok: false, code: "form" });
      const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "?";
      const hour = new Date(Date.now() - 3600e3).toISOString();
      const { count: hits } = await admin.from("rate_hits").select("k", { count: "exact", head: true }).eq("k", "invite:" + ip).gte("at", hour);
      if ((hits ?? 0) >= 12) return reply({ ok: false, code: "slow" });
      const { count: guests } = await admin.from("hangout_guests").select("id", { count: "exact", head: true }).eq("hangout_id", x.id);
      if ((guests ?? 0) >= 40) return reply({ ok: false, code: "full" });
      await admin.from("rate_hits").insert({ k: "invite:" + ip });
      await admin.from("hangout_guests").insert({ hangout_id: x.id, name, rsvp: ans, note: clip(body.note, 300) || null });
      await admin.from("alerts").insert({ to_member: x.created_by, text: `📨 ${name} ${ans === "yes" ? "said yes ✅" : ans === "maybe" ? "said maybe 🤔" : "can't make it ❌"} to ${clip(x.title, 60)} (through your invite link)` });
      return reply({ ok: true });
    }

    // ── everything else: a signed-in, active seat ──
    const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: u } = await admin.auth.getUser(jwt);
    if (!u?.user) return reply({ ok: false, code: "signed_out" }, 401);
    const { data: me } = await admin.from("members").select("id,family_id,status,name,role").eq("user_id", u.user.id).maybeSingle();
    if (!me || me.status !== "active") return reply({ ok: false, code: "not_active" }, 403);
    const host = me.role === "host", first = String(me.name).split(" ")[0];
    const alert = async (to: string[], text: string) => { const t = [...new Set(to)].filter(x => x && x !== me.id); if (t.length) await admin.from("alerts").insert(t.map(x => ({ to_member: x, text }))); };
    const seatsOk = async (ids: string[]) => {
      const { data } = await admin.from("members").select("id,status").eq("family_id", me.family_id).in("id", ids.length ? ids : ["-"]);
      return (data ?? []).length === ids.length && (data ?? []).every(s => s.status === "active");
    };
    const load = async () => {
      const { data: x } = await admin.from("hangouts").select("*").eq("id", String(body.id ?? "")).maybeSingle();
      return x && x.family_id === me.family_id ? x : null;
    };

    if (body.action === "new") {
      const title = clip(body.title, 120), date = String(body.date ?? ""), time = clip(body.time, 12);
      if (!title) return reply({ ok: false, code: "title" });
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < today()) return reply({ ok: false, code: "date" });
      if (!timeOk(time)) return reply({ ok: false, code: "time" });
      const invited = [...new Set((Array.isArray(body.invited) ? body.invited : []).map(String))].filter(x => x !== me.id).slice(0, 40);
      if (!invited.length && !body.outside) return reply({ ok: false, code: "nobody" });
      if (invited.length && !(await seatsOk(invited))) return reply({ ok: false, code: "not_family" });
      const place = placeOf(body.place); if (!place.name) return reply({ ok: false, code: "place" });
      const cost = Number(body.cost_pp); const after = body.after_of && typeof body.after_of === "object"
        ? { kind: clip(body.after_of.kind, 20), id: clip(body.after_of.id, 60), title: clip(body.after_of.title, 120) } : null;
      const row = { family_id: me.family_id, created_by: me.id, title, place, date, time, dress: DRESS.has(body.dress) ? body.dress : null,
        cost_pp: Number.isFinite(cost) && cost >= 0 && cost <= 10000 ? Math.round(cost * 100) / 100 : null, note: clip(body.note, 400) || null,
        invited, after_of: after, src: SRC.has(body.src) ? body.src : "free", share_token: body.outside ? token() : null };
      const { data: x, error } = await admin.from("hangouts").insert(row).select("id,share_token").single();
      if (error) { console.error("hangouts new", error.message); return reply({ ok: false, code: "server" }, 500); }
      await admin.from("hangout_people").insert({ hangout_id: x.id, member_id: me.id, family_id: me.family_id, rsvp: "yes" });
      await alert(invited, after ? `🌙 After ${clip(after.title, 50)}: ${first} invited you to ${title} · ${dayOf(date)}${time ? " " + time : ""}` : `✨ ${first} invited you: ${title} · ${dayOf(date)}${time ? " " + time : ""}`);
      return reply({ ok: true, id: x.id, link: x.share_token ? LINK + x.share_token : null });
    }

    const x = await load();
    if (!x) return reply({ ok: false, code: "no_hangout" });
    const boss = x.created_by === me.id || host, invited = (x.invited ?? []).includes(me.id) || x.created_by === me.id;
    if (!invited && !host) return reply({ ok: false, code: "not_invited" });

    if (body.action === "rsvp") {
      if (x.status !== "open") return reply({ ok: false, code: "cancelled" });
      if (!invited) return reply({ ok: false, code: "not_invited" });
      const ans = ["yes", "maybe", "no"].includes(body.ans) ? body.ans : null; if (!ans) return reply({ ok: false, code: "answer" });
      await admin.from("hangout_people").upsert({ hangout_id: x.id, member_id: me.id, family_id: me.family_id, rsvp: ans, updated_at: new Date().toISOString() });
      if (x.created_by !== me.id) await alert([x.created_by], `${ans === "yes" ? "✅" : ans === "maybe" ? "🤔" : "❌"} ${first} ${ans === "yes" ? "is coming to" : ans === "maybe" ? "might come to" : "can't make"} ${x.title}`);
      return reply({ ok: true });
    }

    if (body.action === "eta") {
      if (x.status !== "open") return reply({ ok: false, code: "cancelled" });
      if (!invited) return reply({ ok: false, code: "not_invited" });
      const now = new Date().toISOString(), patch: Record<string, unknown> = { hangout_id: x.id, member_id: me.id, family_id: me.family_id, updated_at: now };
      let say = "";
      if (body.clear) Object.assign(patch, { plan_at: null, way_min: null, way_at: null, here_at: null });
      else if (body.here) { Object.assign(patch, { here_at: now, way_min: null, way_at: null }); say = `📍 ${first} is here at ${x.title}`; }
      else if (body.way != null) {
        const m = Math.round(Number(body.way)); if (!(m >= 1 && m <= 240)) return reply({ ok: false, code: "eta" });
        Object.assign(patch, { way_min: m, way_at: now, here_at: null }); say = `🚗 ${first} is on the way to ${x.title}, about ${m} min`;
      } else {
        const plan = clip(body.plan, 12); if (!plan || !timeOk(plan)) return reply({ ok: false, code: "eta" });
        Object.assign(patch, { plan_at: plan });
      }
      const { data: had } = await admin.from("hangout_people").select("rsvp").eq("hangout_id", x.id).eq("member_id", me.id).maybeSingle();
      if (!had) patch.rsvp = "yes";
      await admin.from("hangout_people").upsert(patch);
      if (say && x.created_by !== me.id) await alert([x.created_by], say);
      return reply({ ok: true });
    }

    if (body.action === "invite") {
      if (!boss) return reply({ ok: false, code: "not_yours" });
      const list = [...new Set((Array.isArray(body.invited) ? body.invited : []).map(String))].filter(y => y !== x.created_by).slice(0, 40);
      if (list.length && !(await seatsOk(list))) return reply({ ok: false, code: "not_family" });
      const added = list.filter(y => !(x.invited ?? []).includes(y));
      await admin.from("hangouts").update({ invited: list, updated_at: new Date().toISOString() }).eq("id", x.id);
      await admin.from("hangout_people").delete().eq("hangout_id", x.id).not("member_id", "in", `(${[x.created_by, ...list].map(s => `"${s}"`).join(",")})`);
      await alert(added, `✨ ${first} invited you: ${x.title} · ${dayOf(x.date)}${x.time ? " " + x.time : ""}`);
      return reply({ ok: true });
    }

    if (body.action === "share") {
      if (x.created_by !== me.id) return reply({ ok: false, code: "not_yours" });
      if (x.status !== "open") return reply({ ok: false, code: "cancelled" });
      const t = body.on === false ? null : (x.share_token ?? token());
      await admin.from("hangouts").update({ share_token: t, updated_at: new Date().toISOString() }).eq("id", x.id);
      return reply({ ok: true, link: t ? LINK + t : null });
    }

    if (body.action === "cancel") {
      if (!boss) return reply({ ok: false, code: "not_yours" });
      await admin.from("hangouts").update({ status: "cancelled", share_token: null, updated_at: new Date().toISOString() }).eq("id", x.id);
      await alert([...(x.invited ?? []), x.created_by], `${x.title} on ${dayOf(x.date)} was called off.`);
      return reply({ ok: true });
    }
    return reply({ ok: false, code: "action" }, 400);
  } catch (e) {
    console.error("hangouts", (e as Error).message);
    return reply({ ok: false, code: "server" }, 500);
  }
});
