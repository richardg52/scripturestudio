// Table of 7 Family Recipe Book (his order, 2026-10-18; photos show right away). The only road that writes a recipe.
//   save {id?, title, credit?, kind?, serves?, time?, ingredients[], steps[], notes?, photo_path?}
//        new: anyone in the family (the family is told); change: the person who added it or the host.
//        A photo is uploaded by the phone into the family's own folder (<family>/recipes/…) and named here.
//   fav {id}       star it for yourself (tap again to unstar)
//   remove {id}    the person who added it or the host; its photo goes too
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ALLOWED = [/^https:\/\/table-of-7\.netlify\.app$/, /^https:\/\/[a-z0-9-]+--table-of-7\.netlify\.app$/, /^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/];
const cors = (o: string | null) => ({
  "Access-Control-Allow-Origin": o && ALLOWED.some(r => r.test(o)) ? o : "https://table-of-7.netlify.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin",
});
const KINDS = ["main", "side", "dessert", "bread", "breakfast", "drink", "other"];
const clip = (x: unknown, k: number) => String(x ?? "").replace(/\s+/g, " ").trim().slice(0, k);
const lines = (x: unknown, n: number, k: number) => (Array.isArray(x) ? x : []).map(v => clip(v, k)).filter(Boolean).slice(0, n);

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

    if (body.action === "save") {
      const title = clip(body.title, 80); if (!title) return reply({ ok: false, code: "title" }, 400);
      const kind = KINDS.includes(String(body.kind)) ? String(body.kind) : "main";
      const ingredients = lines(body.ingredients, 60, 160), steps = lines(body.steps, 40, 600);
      if (!ingredients.length && !steps.length) return reply({ ok: false, code: "empty" }, 400);
      let photo = body.photo_path ? String(body.photo_path) : null;
      if (photo && !(photo.startsWith(`${me.family_id}/recipes/`) && /^[A-Za-z0-9_\-\/]+\.jpg$/.test(photo))) return reply({ ok: false, code: "photo" }, 400);
      const row: Record<string, unknown> = { title, kind, credit: clip(body.credit, 60) || null, serves: clip(body.serves, 30) || null, time: clip(body.time, 30) || null,
        ingredients, steps, notes: clip(body.notes, 800) || null, updated_at: new Date().toISOString() };
      if (body.id) {
        const { data: r } = await admin.from("recipes").select("*").eq("id", String(body.id)).maybeSingle();
        if (!r || r.family_id !== me.family_id) return reply({ ok: false, code: "no_recipe" }, 404);
        if (r.added_by !== me.id && me.role !== "host") return reply({ ok: false, code: "not_owner" }, 403);
        if (photo !== null || body.photo_path === null) row.photo_path = photo;
        const { error } = await admin.from("recipes").update(row).eq("id", r.id);
        if (error) return reply({ ok: false, code: error.code === "23505" ? "photo" : "server" }, error.code === "23505" ? 400 : 500);
        if (r.photo_path && row.photo_path !== undefined && row.photo_path !== r.photo_path) await admin.storage.from("media").remove([r.photo_path]);
        return reply({ ok: true, id: r.id });
      }
      const { data: r, error } = await admin.from("recipes").insert({ ...row, family_id: me.family_id, added_by: me.id, photo_path: photo }).select("id").single();
      if (error) return reply({ ok: false, code: error.code === "23505" ? "photo" : "server" }, error.code === "23505" ? 400 : 500);
      const { data: fam } = await admin.from("members").select("id").eq("family_id", me.family_id).eq("status", "active");
      await alert((fam ?? []).map(m => m.id), `🍗 ${first} added ${title}${row.credit ? ` (${row.credit})` : ""} to the Family Recipe Book.`);
      return reply({ ok: true, id: r.id });
    }

    const { data: r } = await admin.from("recipes").select("*").eq("id", String(body.id ?? "")).maybeSingle();
    if (!r || r.family_id !== me.family_id) return reply({ ok: false, code: "no_recipe" }, 404);
    if (body.action === "fav") {
      const on = !r.favorites.includes(me.id);
      await admin.from("recipes").update({ favorites: on ? [...r.favorites, me.id] : r.favorites.filter((x: string) => x !== me.id) }).eq("id", r.id);
      return reply({ ok: true, fav: on });
    }
    if (body.action === "remove") {
      if (r.added_by !== me.id && me.role !== "host") return reply({ ok: false, code: "not_owner" }, 403);
      if (r.photo_path) await admin.storage.from("media").remove([r.photo_path]);
      await admin.from("recipes").delete().eq("id", r.id);
      return reply({ ok: true });
    }
    return reply({ ok: false, code: "action" }, 400);
  } catch (e) {
    console.error("recipes", (e as Error).message);
    return reply({ ok: false, code: "server" }, 500);
  }
});
