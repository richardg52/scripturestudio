// Table of 7 Family Prayer Wall (his order, 2026-10-18). The only road that writes a prayer request.
//   new {text, anon?}           share a request (anon = without your name); the family is told
//   pray {id}                   "I prayed" (tap again to take it back); the author is encouraged
//   mine {}                     the ids of YOUR requests, so your phone can show Mark answered / Take down
//   answer {id, praise?}        the author: mark it answered, with a praise report; everyone who prayed is told
//   reopen {id}                 the author: back to open
//   remove {id}                 the author or the host: take it down
// Who wrote an unnamed request is kept only in prayer_authors (no phone reads it) and is never sent to anyone else.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ALLOWED = [/^https:\/\/table-of-7\.netlify\.app$/, /^https:\/\/[a-z0-9-]+--table-of-7\.netlify\.app$/, /^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/];
const cors = (o: string | null) => ({
  "Access-Control-Allow-Origin": o && ALLOWED.some(r => r.test(o)) ? o : "https://table-of-7.netlify.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin",
});
const clip = (x: unknown, k: number) => String(x ?? "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, k);

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
      const text = clip(body.text, 600); if (!text) return reply({ ok: false, code: "empty" }, 400);
      const anon = body.anon === true;
      const { data: p, error } = await admin.from("prayers").insert({ family_id: me.family_id, shown_by: anon ? null : me.id, text }).select().single();
      if (error) return reply({ ok: false, code: "server" }, 500);
      await admin.from("prayer_authors").insert({ prayer_id: p.id, member_id: me.id });
      const { data: fam } = await admin.from("members").select("id").eq("family_id", me.family_id).eq("status", "active");
      await alert((fam ?? []).map(m => m.id), anon ? "🙏 Someone in the family shared a prayer request. Open the Prayer Wall to pray with them."
        : `🙏 ${first} shared a prayer request. Open the Prayer Wall to pray with them.`);
      return reply({ ok: true, prayer: p });
    }
    if (body.action === "mine") {
      const { data: fam } = await admin.from("prayers").select("id").eq("family_id", me.family_id);
      const ids = (fam ?? []).map(p => p.id);
      const { data: mine } = ids.length ? await admin.from("prayer_authors").select("prayer_id").eq("member_id", me.id).in("prayer_id", ids) : { data: [] };
      return reply({ ok: true, ids: (mine ?? []).map(x => x.prayer_id) });
    }

    const { data: p } = await admin.from("prayers").select("*").eq("id", String(body.id ?? "")).maybeSingle();
    if (!p || p.family_id !== me.family_id) return reply({ ok: false, code: "no_prayer" }, 404);
    const { data: au } = await admin.from("prayer_authors").select("member_id").eq("prayer_id", p.id).maybeSingle();
    const author = au?.member_id ?? null, isAuthor = author === me.id;
    const touch = (patch: Record<string, unknown>) => admin.from("prayers").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", p.id);

    if (body.action === "pray") {
      const on = !p.prayed.includes(me.id);
      await touch({ prayed: on ? [...p.prayed, me.id] : p.prayed.filter((x: string) => x !== me.id) });
      if (on && author && !isAuthor) await alert([author], `🙏 ${first} prayed for your request.`);
      return reply({ ok: true, prayed: on });
    }
    if (body.action === "answer") {
      if (!isAuthor) return reply({ ok: false, code: "not_author" }, 403);
      await touch({ status: "answered", praise: clip(body.praise, 600) || null, answered_at: new Date().toISOString() });
      await alert(p.prayed, `🙌 A prayer you prayed for was answered! Open the Prayer Wall to read the praise report.`);
      return reply({ ok: true });
    }
    if (body.action === "reopen") {
      if (!isAuthor) return reply({ ok: false, code: "not_author" }, 403);
      await touch({ status: "open", praise: null, answered_at: null });
      return reply({ ok: true });
    }
    if (body.action === "remove") {
      if (!isAuthor && me.role !== "host") return reply({ ok: false, code: "not_author" }, 403);
      await admin.from("prayers").delete().eq("id", p.id);
      return reply({ ok: true });
    }
    return reply({ ok: false, code: "action" }, 400);
  } catch (e) {
    console.error("prayer", (e as Error).message);
    return reply({ ok: false, code: "server" }, 500);
  }
});
