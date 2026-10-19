// Table of 8: sign in with email + 4-digit PIN (his order, 2026-10-19; full-name sign-in is gone).
// The PIN is checked in the database (bcrypt; 5 wrong tries lock the seat until the host unlocks it; a network limit).
// Only a correct PIN gets a session, and the session belongs to that one seat.
// Deployed with verify_jwt = false: callers are not signed in yet; the PIN is the check.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

const ALLOWED = [/^https:\/\/table-of-[78]\.netlify\.app$/, /^https:\/\/[a-z0-9-]+--table-of-[78]\.netlify\.app$/, /^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/];
function cors(origin: string | null) {
  const ok = origin && ALLOWED.some(r => r.test(origin));
  return {
    "Access-Control-Allow-Origin": ok ? origin! : "https://table-of-8.netlify.app",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
const seatEmail = (id: string) => `${id}@seats.tableof7.invalid`;

Deno.serve(async (req) => {
  const h = { ...cors(req.headers.get("origin")), "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  if (req.method !== "POST") return new Response(JSON.stringify({ ok: false, code: "method" }), { status: 405, headers: h });
  const reply = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: h });
  try {
    const body = await req.json().catch(() => ({}));
    if (body.email == null && body.name != null) return reply({ ok: false, code: "update" });   // an old copy of the app
    const email = String(body.email ?? "").slice(0, 160);
    const pin = String(body.pin ?? "").slice(0, 8);
    const pin2 = body.pin2 == null ? null : String(body.pin2).slice(0, 8);
    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "?";

    const admin = createClient(URL_, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: r, error } = await admin.rpc("t7_pin_signin_email", { p_email: email, p_pin: pin, p_pin2: pin2, p_ip: ip });
    if (error) { console.error("pin-signin rpc", error.message); return reply({ ok: false, code: "server" }, 500); }
    if (!r.ok) return reply(r);

    // A seat's sign-in account is made the first time that person gets their PIN right.
    let userId: string | null = r.user_id;
    if (!userId) {
      const { data: u, error: ue } = await admin.auth.admin.createUser({ email: seatEmail(r.member_id), email_confirm: true, app_metadata: { member_id: r.member_id } });
      if (ue) { console.error("pin-signin createUser", ue.message); return reply({ ok: false, code: "server" }, 500); }
      userId = u.user.id;
      const { error: le } = await admin.rpc("t7_link_user", { p_member: r.member_id, p_user: userId });
      if (le) { console.error("pin-signin link", le.message); return reply({ ok: false, code: "server" }, 500); }
    }
    // Mint a session for that seat without sending any email.
    const { data: link, error: ge } = await admin.auth.admin.generateLink({ type: "magiclink", email: seatEmail(r.member_id) });
    if (ge || !link?.properties?.hashed_token) { console.error("pin-signin link", ge?.message); return reply({ ok: false, code: "server" }, 500); }
    const pub = createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: v, error: ve } = await pub.auth.verifyOtp({ type: "magiclink", token_hash: link.properties.hashed_token });
    if (ve || !v.session) { console.error("pin-signin verify", ve?.message); return reply({ ok: false, code: "server" }, 500); }
    return reply({ ok: true, member_id: r.member_id, created: !!r.created,
      session: { access_token: v.session.access_token, refresh_token: v.session.refresh_token } });
  } catch (e) {
    console.error("pin-signin", (e as Error).message);
    return reply({ ok: false, code: "server" }, 500);
  }
});
