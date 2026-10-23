// Table of 8 — start a new family (his order, 2026-10-23: "Can we add start a new family in the app").
//   request {family_name, name, email, mobile?, note?}
// Anyone can ask from the sign-in screen, and anyone at a table can ask for someone else. The OWNER (Dr. Clark) sees
// every request in Host controls → Owner desk and approves or declines it there (public.owner_decide); the new host then
// signs in with that email and chooses their PIN. Nothing is created until he approves, so nobody can fill his database.
// Deployed with verify_jwt = false (the person asking is not signed in yet); a signed-in caller is recorded as asked_by.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

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
    const body = await req.json().catch(() => ({}));
    if (body.action !== "request") return reply({ ok: false, code: "action" }, 400);

    let asker: { id: string; name: string } | null = null;
    const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (jwt.split(".").length === 3) {
      const { data: u } = await admin.auth.getUser(jwt);
      if (u?.user) {
        const { data: m } = await admin.from("members").select("id,name,status").eq("user_id", u.user.id).maybeSingle();
        if (m && m.status === "active") asker = { id: m.id, name: m.name };
      }
    }
    const family = clip(body.family_name, 60), name = clip(body.name, 80), email = clip(body.email, 160).toLowerCase();
    if (family.length < 2) return reply({ ok: false, code: "family_name" });
    if (name.length < 2) return reply({ ok: false, code: "name" });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply({ ok: false, code: "email" });

    // a few a day from one network, so nobody can flood his desk
    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "?";
    const day = new Date(Date.now() - 864e5).toISOString();
    const { count } = await admin.from("rate_hits").select("k", { count: "exact", head: true }).eq("k", "family:" + ip).gte("at", day);
    if (!asker && (count ?? 0) >= 3) return reply({ ok: false, code: "slow" });

    const exact = email.replace(/[\\%_]/g, c => "\\" + c);   // ilike, with its wildcards taken literally
    const { data: seat } = await admin.from("members").select("id").ilike("email", exact).maybeSingle();
    if (seat) return reply({ ok: false, code: "email_taken" });
    const { data: open } = await admin.from("family_requests").select("id").ilike("email", exact).eq("status", "pending").maybeSingle();
    if (open) return reply({ ok: true, already: true });

    await admin.from("rate_hits").insert({ k: "family:" + ip });
    const { error } = await admin.from("family_requests").insert({ family_name: family, name, email, mobile: clip(body.mobile, 30) || null,
      note: clip(body.note, 400) || null, asked_by: asker?.id ?? null, ip });
    if (error) { console.error("family request", error.message); return reply({ ok: false, code: "server" }, 500); }
    const { data: owners } = await admin.from("app_owners").select("member_id");
    const by = asker ? ` (asked by ${asker.name.split(" ")[0]})` : "";
    // a reserved test address (.invalid can never be a real inbox) never pages the owner's phone
    if (owners?.length && !email.endsWith(".invalid")) await admin.from("alerts").insert(owners.map(o => ({ to_member: o.member_id, text: `🏡 New family request: ${family}, for ${name}${by}. Host controls → Owner desk.` })));
    return reply({ ok: true });
  } catch (e) {
    console.error("family", (e as Error).message);
    return reply({ ok: false, code: "server" }, 500);
  }
});
