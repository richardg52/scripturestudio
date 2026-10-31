// Table of 8 for sale (his order + GO, 2026-10-23: "setup Stripe (under the SmartestDesk) … when the customer add it
// automatically uploads the new product"). The only road between Table of 8 and Stripe (SmartestDesk's account).
//   catalog                               public: the price list (catalog.js) for the storefront and the Table Store
//   checkout {plan, cycle, rooms[], premium[], seats, family_name, host_name, host_email, terms}   public: a Stripe Checkout page
//   thanks {session_id}                   public: after paying — makes the table if the webhook hasn't yet, and says how to sign in
//   (Stripe webhook, signed)              checkout.session.completed → the table is made; customer.subscription.updated/deleted →
//                                         what the table has, or the table closes; invoice.payment_failed → the host is told
//   store                                 host: the plan, what's on, what can be added
//   add {key} / remove {key} / seats {n}  host: changes the subscription (Stripe charges or credits the difference) and the
//                                         feature turns on (or off) at once on every phone — no new build, no upload
//   portal                                host: Stripe's own page for the card, invoices and cancelling
//   group_add {family_name, host_name, host_email}   Church & Community host: another table in the group (up to 5)
// Keys: Supabase secrets STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET (his to place; never in this file). Without them checkout
// answers "not_ready". Deployed with verify_jwt = false (Stripe and buyers aren't signed in); host actions check the seat.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { T8_PLANS, T8_ROOMS, T8_PREMIUM, T8_SEAT, T8_PREMIUM_KEYS, t8Price, t8Lookup, t8Features, t8Order, t8Cents, t8Name } from "./catalog.js";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SK = (Deno.env.get("STRIPE_SECRET_KEY") ?? "").trim();
const WHSEC = (Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "").trim();
const APP = "https://table-of-8.netlify.app/";
const ALLOWED = [/^https:\/\/tableof8\.netlify\.app$/, /^https:\/\/[a-z0-9-]+--tableof8\.netlify\.app$/, /^https:\/\/table-of-[78]\.netlify\.app$/, /^https:\/\/[a-z0-9-]+--table-of-[78]\.netlify\.app$/,
  /^https:\/\/(www\.)?tableof8\.com$/, /^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/];
const cors = (o: string | null) => ({
  "Access-Control-Allow-Origin": o && ALLOWED.some(r => r.test(o)) ? o : "https://tableof8.netlify.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin",
});
const clip = (x: unknown, k: number) => String(x ?? "").replace(/\s+/g, " ").trim().slice(0, k);
const isEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

// ── Stripe, by plain HTTPS ──
function form(obj: Record<string, unknown>, prefix = "", out: string[] = []): string {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}[${k}]` : k;
    if (v === undefined || v === null) continue;
    if (typeof v === "object") form(v as Record<string, unknown>, key, out); else out.push(encodeURIComponent(key) + "=" + encodeURIComponent(String(v)));
  }
  return out.join("&");
}
async function stripe(path: string, method = "GET", params?: Record<string, unknown>) {
  const r = await fetch("https://api.stripe.com/v1/" + path, { method, headers: { authorization: "Bearer " + SK, "content-type": "application/x-www-form-urlencoded", "stripe-version": "2024-06-20" },
    body: params ? form(params) : undefined, signal: AbortSignal.timeout(20000) });
  const j = await r.json(); if (!r.ok) throw new Error("stripe " + r.status + ": " + (j?.error?.message ?? "error"));
  return j;
}
async function verify(raw: string, header: string | null) {
  if (!header || !WHSEC) return false;
  const parts = Object.fromEntries(header.split(",").map(p => p.split("=")).filter(x => x.length === 2).map(([k, v]) => [k.trim(), v.trim()]));
  const sigs = header.split(",").filter(p => p.trim().startsWith("v1=")).map(p => p.trim().slice(3));
  const t = Number(parts.t); if (!t || Math.abs(Date.now() / 1000 - t) > 300) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(WHSEC), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${raw}`)));
  const good = [...mac].map(b => b.toString(16).padStart(2, "0")).join("");
  return sigs.some(s => s.length === good.length && [...s].reduce((d, c, i) => d | (c.charCodeAt(0) ^ good.charCodeAt(i)), 0) === 0);
}
// sales tax: added at checkout whenever Stripe Tax is active on the account (a registration exists), read from Stripe itself
// so the store never charges tax before it may, and starts the moment it may. Prices are before tax (USD).
let taxAt = 0, taxOn = false;
async function taxActive() {
  if (Date.now() - taxAt < 10 * 60000) return taxOn;
  try { const t = await stripe("tax/settings"); taxOn = t?.status === "active"; } catch { taxOn = false; }
  taxAt = Date.now(); return taxOn;
}
// every product and price exists once in Stripe, found by its lookup key (made the first time it's needed)
const priceCache = new Map<string, string>();
async function priceId(key: string, cycle: string) {
  const lk = t8Lookup(key, cycle); if (priceCache.has(lk)) return priceCache.get(lk)!;
  const found = await stripe(`prices?active=true&lookup_keys[]=${encodeURIComponent(lk)}&limit=1`);
  let id = found?.data?.[0]?.id;
  if (!id) {
    const cents = t8Cents(key); if (cents == null) throw new Error("unknown item " + key);
    const prod = await stripe("products", "POST", { name: "Table of 8 · " + t8Name(key), tax_code: "txcd_10103000", metadata: { app: "tableof8", t8_key: key } });   // SaaS, personal use
    const p = await stripe("prices", "POST", { product: prod.id, currency: "usd", unit_amount: t8Price(cents, cycle), lookup_key: lk, tax_behavior: "exclusive",
      recurring: { interval: cycle === "year" ? "year" : "month" }, metadata: { app: "tableof8", t8_key: key } });
    id = p.id;
  }
  priceCache.set(lk, id); return id;
}
const itemsOf = (sub: any) => (sub?.items?.data ?? []).map((i: any) => ({ id: i.id, key: String(i.price?.lookup_key ?? "").replace(/^t8_/, "").replace(/_(month|year)$/, ""), qty: i.quantity ?? 1,
  cycle: /_year$/.test(i.price?.lookup_key ?? "") ? "year" : "month" })).filter((i: any) => i.key);

Deno.serve(async (req) => {
  const h = { ...cors(req.headers.get("origin")), "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  const reply = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: h });
  const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } });
  const origin = (() => { const o = req.headers.get("origin") ?? ""; return ALLOWED.some(r => r.test(o)) && !/table-of-[78]/.test(o) ? o : "https://tableof8.netlify.app"; })();

  // the table's features follow its subscription (and every table in a church group follows the one that pays)
  async function sync(sub: any) {
    const { plan, features, seats } = t8Features(itemsOf(sub));
    const { data: rows } = await admin.from("billing").select("family_id").eq("subscription", sub.id);
    const live = ["active", "trialing", "past_due"].includes(sub.status);
    for (const r of rows ?? []) {
      await admin.from("families").update({ plan, features: live ? features : [], seats }).eq("id", r.family_id);
      await admin.from("billing").update({ plan, status: sub.status, period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null, updated_at: new Date().toISOString() }).eq("family_id", r.family_id);
      await admin.rpc("billing_family_state", { p_family: r.family_id, p_open: live,
        p_note: live ? null : "Your Table of 8 plan has ended. Renew any time at tableof8.netlify.app — your family's dinners, photos and mail are kept." });
    }
    return { plan, features, seats };
  }
  // make the table for a paid checkout (once, however many times Stripe or the buyer knocks)
  async function provision(sessionId: string) {
    const s = await stripe(`checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=subscription`);
    if (s?.metadata?.app !== "tableof8") return { code: "not_ours" };
    if (s.status !== "complete" || !["paid", "no_payment_required"].includes(s.payment_status)) return { code: "unpaid" };
    const sub = s.subscription, { plan, features, seats } = t8Features(itemsOf(sub)), m = s.metadata;
    const { data: x, error } = await admin.rpc("billing_make_family", { p_session: s.id, p_family: clip(m.family_name, 60), p_name: clip(m.host_name, 80),
      p_email: clip(m.host_email || s.customer_details?.email, 160), p_plan: plan, p_features: features, p_seats: seats, p_customer: s.customer, p_subscription: sub?.id ?? null,
      p_cycle: m.cycle === "year" ? "year" : "month", p_group_owner: null });
    if (error) throw new Error("provision " + error.message);
    if (sub?.id) await stripe(`subscriptions/${sub.id}`, "POST", { metadata: { app: "tableof8", family_id: x.family_id } }).catch(() => null);
    return { ok: true, family_id: x.family_id, already: !!x.already, email_taken: !!x.email_taken, family: clip(m.family_name, 60), host: clip(m.host_name, 80).split(" ")[0], email: clip(m.host_email, 160) };
  }

  try {
    const sig = req.headers.get("stripe-signature");
    if (sig) {   // ── Stripe's webhook ──
      const raw = await req.text();
      if (!(await verify(raw, sig))) return reply({ ok: false, code: "signature" }, 400);
      // the event names WHAT changed; its body is in the webhook's own API version (Stripe offers only the newest for a new
      // endpoint, and it moved fields such as current_period_end and invoice.subscription). So every subscription or invoice
      // is read again here, in this file's pinned version, and only that copy is trusted.
      const ev = JSON.parse(raw), o = ev?.data?.object ?? {};
      if (ev.type === "checkout.session.completed" || ev.type === "checkout.session.async_payment_succeeded") {
        if (o?.metadata?.app !== "tableof8") return reply({ ok: true, skipped: "not_ours" });
        return reply(await provision(o.id));
      }
      if (ev.type === "customer.subscription.updated" || ev.type === "customer.subscription.deleted") {
        const sub = await stripe(`subscriptions/${encodeURIComponent(o.id)}`);
        if (sub?.metadata?.app !== "tableof8") return reply({ ok: true, skipped: "not_ours" });
        return reply({ ok: true, ...(await sync(sub)) });
      }
      if (ev.type === "invoice.payment_failed") {
        const inv = await stripe(`invoices/${encodeURIComponent(o.id)}`); if (!inv?.subscription) return reply({ ok: true, skipped: "no_subscription" });
        const { data: rows } = await admin.from("billing").select("family_id").eq("subscription", inv.subscription);
        for (const r of rows ?? []) {
          const { data: hosts } = await admin.from("members").select("id").eq("family_id", r.family_id).eq("role", "host");
          if (hosts?.length) await admin.from("alerts").insert(hosts.map(x => ({ to_member: x.id, text: "💳 Your Table of 8 payment didn't go through. Update your card: Host controls → 🛍️ Table Store → Card & invoices." })));
        }
        return reply({ ok: true });
      }
      return reply({ ok: true, ignored: ev.type });
    }

    const body = await req.json().catch(() => ({}));
    if (body.action === "catalog") return reply({ ok: true, plans: T8_PLANS, rooms: T8_ROOMS, premium: T8_PREMIUM, seat: T8_SEAT, premiumKeys: T8_PREMIUM_KEYS, ready: !!SK, tax: SK ? await taxActive() : false });

    if (body.action === "checkout") {
      if (body.terms !== true) return reply({ ok: false, code: "terms" });
      const cycle = body.cycle === "year" ? "year" : "month", o = t8Order({ plan: String(body.plan ?? ""), rooms: body.rooms ?? [], premium: body.premium ?? [], seats: body.seats ?? 12 });
      if ("code" in o) return reply({ ok: false, code: o.code });
      const family = clip(body.family_name, 60), name = clip(body.host_name, 80), email = clip(body.host_email, 160).toLowerCase();
      if (family.length < 2) return reply({ ok: false, code: "family_name" });
      if (name.length < 2) return reply({ ok: false, code: "name" });
      if (!isEmail(email)) return reply({ ok: false, code: "email" });
      const exact = email.replace(/[\\%_]/g, c => "\\" + c);
      const { data: seat } = await admin.from("members").select("id").ilike("email", exact).maybeSingle();
      if (seat) return reply({ ok: false, code: "email_taken" });
      if (!SK) return reply({ ok: false, code: "not_ready" });
      const line_items: Record<string, unknown> = {};
      for (const [i, it] of o.items.entries()) line_items[i] = { price: await priceId(it.key, cycle), quantity: it.qty };
      const meta = { app: "tableof8", kind: "new", plan: body.plan, cycle, family_name: family, host_name: name, host_email: email, seats: String(body.seats ?? 12), terms_accepted_at: new Date().toISOString() };
      const tax = await taxActive();
      const s = await stripe("checkout/sessions", "POST", { mode: "subscription", line_items, customer_email: email, allow_promotion_codes: "true",
        billing_address_collection: tax ? "required" : "auto", automatic_tax: { enabled: tax ? "true" : "false" },
        success_url: `${origin}/thanks.html?session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${origin}/#plans`, metadata: meta,
        subscription_data: { metadata: { app: "tableof8", plan: String(body.plan), family_name: family } } });
      return reply({ ok: true, url: s.url });
    }

    if (body.action === "thanks") {
      const id = String(body.session_id ?? ""); if (!/^cs_[A-Za-z0-9_]{10,}$/.test(id)) return reply({ ok: false, code: "session" });
      if (!SK) return reply({ ok: false, code: "not_ready" });
      const r = await provision(id); return reply("code" in r ? { ok: false, code: r.code } : { ...r, sign_in: APP });
    }

    // ── a signed-in host ──
    const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: u } = await admin.auth.getUser(jwt);
    if (!u?.user) return reply({ ok: false, code: "signed_out" }, 401);
    const { data: me } = await admin.from("members").select("id,family_id,status,role,name").eq("user_id", u.user.id).maybeSingle();
    if (!me || me.status !== "active") return reply({ ok: false, code: "not_active" }, 403);
    const { data: fam } = await admin.from("families").select("id,name,plan,features,seats,billing_status").eq("id", me.family_id).maybeSingle();
    const { data: bill } = await admin.from("billing").select("*").eq("family_id", me.family_id).maybeSingle();
    const owner = (fam?.features ?? []).includes("all"), gift = fam?.plan === "gift";
    if (body.action === "store") {
      const { count } = bill?.subscription ? await admin.from("billing").select("family_id", { count: "exact", head: true }).eq("subscription", bill.subscription) : { count: 0 };
      return reply({ ok: true, plan: fam?.plan, features: fam?.features ?? [], seats: fam?.seats ?? 12, owner, gift, cycle: bill?.cycle ?? "month", billed: !!bill?.subscription,
        host: me.role === "host", tables: count ?? 0, plans: T8_PLANS, rooms: T8_ROOMS, premium: T8_PREMIUM, seat: T8_SEAT, ready: !!SK });
    }
    if (me.role !== "host") return reply({ ok: false, code: "not_host" }, 403);
    if (!bill?.subscription) return reply({ ok: false, code: owner || gift ? "not_billed" : "no_plan" });
    if (!SK) return reply({ ok: false, code: "not_ready" });
    const sub = await stripe(`subscriptions/${bill.subscription}`), items = itemsOf(sub), cycle = bill.cycle === "year" ? "year" : "month", P = T8_PLANS[t8Features(items).plan ?? "table"];
    if (bill.group_owner) return reply({ ok: false, code: "group_member" });   // a church group's extra table: its leader's table holds the plan

    if (body.action === "add" || body.action === "remove") {
      const key = String(body.key ?? "");
      const sellable = (T8_ROOMS[key] && !T8_ROOMS[key].soon && !P.rooms) || T8_PREMIUM[key];
      if (!sellable) return reply({ ok: false, code: T8_ROOMS[key]?.soon ? "soon" : "not_sold" });
      const have = items.find((i: any) => i.key === key);
      if (body.action === "add") {
        if (have) return reply({ ok: true, ...t8Features(items) });
        if (key === "pass") for (const i of items.filter((i: any) => T8_PREMIUM_KEYS.includes(i.key))) await stripe(`subscription_items/${i.id}`, "DELETE", { proration_behavior: "create_prorations" });
        else if (T8_PREMIUM_KEYS.includes(key) && items.some((i: any) => i.key === "pass")) return reply({ ok: true, ...t8Features(items) });
        await stripe("subscription_items", "POST", { subscription: sub.id, price: await priceId(key, cycle), quantity: T8_PREMIUM[key] ? P.tables : 1, proration_behavior: "always_invoice" });
      } else {
        if (!have) return reply({ ok: true, ...t8Features(items) });
        await stripe(`subscription_items/${have.id}`, "DELETE", { proration_behavior: "create_prorations" });
      }
      const fresh = await stripe(`subscriptions/${sub.id}`);
      return reply({ ok: true, ...(await sync(fresh)) });
    }
    if (body.action === "seats") {
      const n = Math.round(+body.n); if (!(n >= 2 && n <= 40)) return reply({ ok: false, code: "seats" });
      const { count } = await admin.from("members").select("id", { count: "exact", head: true }).eq("family_id", me.family_id);
      if (n < (count ?? 0)) return reply({ ok: false, code: "seats_in_use" });
      const extra = Math.max(0, n - 12) * P.tables, have = items.find((i: any) => i.key === "seat");
      if (extra && have) await stripe(`subscription_items/${have.id}`, "POST", { quantity: extra, proration_behavior: "always_invoice" });
      else if (extra) await stripe("subscription_items", "POST", { subscription: sub.id, price: await priceId("seat", cycle), quantity: extra, proration_behavior: "always_invoice" });
      else if (have) await stripe(`subscription_items/${have.id}`, "DELETE", { proration_behavior: "create_prorations" });
      return reply({ ok: true, ...(await sync(await stripe(`subscriptions/${sub.id}`))) });
    }
    if (body.action === "portal") {
      const p = await stripe("billing_portal/sessions", "POST", { customer: bill.customer, return_url: APP });
      return reply({ ok: true, url: p.url });
    }
    if (body.action === "group_add") {
      if (t8Features(items).plan !== "church") return reply({ ok: false, code: "not_church" });
      const { count } = await admin.from("billing").select("family_id", { count: "exact", head: true }).eq("subscription", sub.id);
      if ((count ?? 0) >= 5) return reply({ ok: false, code: "group_full" });
      const family = clip(body.family_name, 60), name = clip(body.host_name, 80), email = clip(body.host_email, 160).toLowerCase();
      if (family.length < 2 || name.length < 2 || !isEmail(email)) return reply({ ok: false, code: "form" });
      const exact = email.replace(/[\\%_]/g, c => "\\" + c);
      const { data: seat } = await admin.from("members").select("id").ilike("email", exact).maybeSingle();
      if (seat) return reply({ ok: false, code: "email_taken" });
      const f = t8Features(items);
      const { data: x, error } = await admin.rpc("billing_make_family", { p_session: null, p_family: family, p_name: name, p_email: email, p_plan: "church", p_features: f.features,
        p_seats: f.seats, p_customer: bill.customer, p_subscription: sub.id, p_cycle: cycle, p_group_owner: me.family_id });
      if (error || !x?.ok) return reply({ ok: false, code: x?.code ?? "server" });
      return reply({ ok: true, family_id: x.family_id, tables: (count ?? 0) + 1 });
    }
    return reply({ ok: false, code: "action" }, 400);
  } catch (e) {
    console.error("billing", (e as Error).message);
    return reply({ ok: false, code: "server" }, 500);
  }
});
