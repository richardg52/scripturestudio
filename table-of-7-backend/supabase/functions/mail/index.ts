// Table of 8 Family Mail (his order, 2026-10-23: "a way to send direct message to certain members" and "send a private
// request to someone in the app about anything and if the family member are not on the app it will have a pop up waiting
// on their return to the app that says while you were away you got mail"). The only road that writes mail.
//   send {to[], kind: note|request|hug, subject?, body, thread?}   to one person or a few; never the whole family by default
//   read {ids[]}                                                    I've seen these (the sender sees "Read")
//   answer {id, ans: yes|no, note?}                                 my answer to a private request
//   archive {id, on}                                                tuck it away (mine only)
// Private: only the sender and the people it was sent to can read it — not the host, not the owner. The lock-screen alert
// names the sender, never the words.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ALLOWED = [/^https:\/\/table-of-[78]\.netlify\.app$/, /^https:\/\/[a-z0-9-]+--table-of-[78]\.netlify\.app$/, /^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/];
const cors = (o: string | null) => ({
  "Access-Control-Allow-Origin": o && ALLOWED.some(r => r.test(o)) ? o : "https://table-of-8.netlify.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin",
});
const clip = (x: unknown, k: number) => String(x ?? "").replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim().slice(0, k);
const KINDS = new Set(["note", "request", "hug"]);
const PER_DAY = 80;

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

    if (body.action === "send") {
      const kind = KINDS.has(body.kind) ? body.kind : "note";
      const text = clip(body.body, 4000) || (kind === "hug" ? "💛 Thinking of you." : "");
      if (!text) return reply({ ok: false, code: "empty" });
      const to = [...new Set((Array.isArray(body.to) ? body.to : []).map(String))].filter(x => x !== me.id).slice(0, 40);
      if (!to.length) return reply({ ok: false, code: "nobody" });
      const { data: seats } = await admin.from("members").select("id,status").eq("family_id", me.family_id).in("id", to);
      if ((seats ?? []).length !== to.length) return reply({ ok: false, code: "not_family" });
      const live = (seats ?? []).filter(s => s.status === "active").map(s => s.id);
      if (!live.length) return reply({ ok: false, code: "nobody" });
      const since = new Date(Date.now() - 864e5).toISOString();
      const { count } = await admin.from("mail").select("id", { count: "exact", head: true }).eq("from_member", me.id).gte("created_at", since);
      if ((count ?? 0) >= PER_DAY) return reply({ ok: false, code: "too_many" });
      let thread: string | null = null;
      if (body.thread) {   // a reply stays in its conversation, and only someone already in it may reply
        const { data: t } = await admin.from("mail").select("id,thread,from_member,to_members,family_id").eq("id", String(body.thread)).maybeSingle();
        if (!t || t.family_id !== me.family_id || !(t.from_member === me.id || (t.to_members ?? []).includes(me.id))) return reply({ ok: false, code: "no_mail" });
        thread = t.thread ?? t.id;
      }
      const { data: m, error } = await admin.from("mail").insert({ family_id: me.family_id, from_member: me.id, to_members: live, kind,
        subject: clip(body.subject, 120) || null, body: text, thread }).select("id").single();
      if (error) { console.error("mail send", error.message); return reply({ ok: false, code: "server" }, 500); }
      await admin.from("mail_box").insert(live.map(x => ({ mail_id: m.id, member_id: x, family_id: me.family_id })));
      const say = kind === "request" ? `📬 ${first} sent you a private request` : kind === "hug" ? `💛 ${first} is thinking of you` : `📬 Family Mail from ${first}`;
      await admin.from("alerts").insert(live.map(x => ({ to_member: x, text: say })));
      return reply({ ok: true, id: m.id, sent: live.length, skipped: to.length - live.length });
    }

    if (body.action === "read") {
      const ids = (Array.isArray(body.ids) ? body.ids : []).map(String).slice(0, 200);
      if (ids.length) await admin.from("mail_box").update({ read_at: new Date().toISOString() }).eq("member_id", me.id).in("mail_id", ids).is("read_at", null);
      return reply({ ok: true });
    }

    if (body.action === "answer") {
      const ans = body.ans === "yes" ? "yes" : body.ans === "no" ? "no" : null;
      if (!ans) return reply({ ok: false, code: "answer" });
      const { data: m } = await admin.from("mail").select("id,kind,from_member,subject").eq("id", String(body.id ?? "")).maybeSingle();
      if (!m || m.kind !== "request") return reply({ ok: false, code: "no_mail" });
      const { data: b } = await admin.from("mail_box").update({ answer: ans, answer_note: clip(body.note, 500) || null, answered_at: new Date().toISOString(), read_at: new Date().toISOString() })
        .eq("mail_id", m.id).eq("member_id", me.id).select("mail_id").maybeSingle();
      if (!b) return reply({ ok: false, code: "no_mail" });
      await admin.from("alerts").insert({ to_member: m.from_member, text: `📬 ${first} answered your request${m.subject ? ` “${clip(m.subject, 60)}”` : ""}: ${ans === "yes" ? "Yes ✅" : "No ❌"}` });
      return reply({ ok: true });
    }

    if (body.action === "archive") {
      const { data: b } = await admin.from("mail_box").update({ archived: !!body.on }).eq("mail_id", String(body.id ?? "")).eq("member_id", me.id).select("mail_id").maybeSingle();
      return reply(b ? { ok: true } : { ok: false, code: "no_mail" });
    }
    return reply({ ok: false, code: "action" }, 400);
  } catch (e) {
    console.error("mail", (e as Error).message);
    return reply({ ok: false, code: "server" }, 500);
  }
});
