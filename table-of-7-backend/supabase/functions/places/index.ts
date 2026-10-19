// Table of 7: live Google restaurant search, inside Google's free monthly amount.
// - Only a signed-in, active family member can call it (verify_jwt + a seat check).
// - Every call to Google first takes from our own monthly counter (places_take); when the
//   counter is spent, the app is told "month" and Google is never asked, so nothing is charged.
//   If Google's own daily limit answers 429, the app is told "resting" (until tomorrow).
// - Field masks choose the tier on purpose: search and basic details use the Pro tier only
//   (name, address, type, status, Maps link); price, rating, hours, phone and website are the
//   Enterprise tier and are fetched only when someone taps "More from Google".
// - Nothing Google returns is stored (Google's terms). Only the Place ID is kept, by the app.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const GKEY = Deno.env.get("GOOGLE_PLACES_KEY") ?? "";

const ALLOWED = [/^https:\/\/table-of-7\.netlify\.app$/, /^https:\/\/[a-z0-9-]+--table-of-7\.netlify\.app$/, /^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/];
const cors = (o: string | null) => ({
  "Access-Control-Allow-Origin": o && ALLOWED.some(r => r.test(o)) ? o : "https://table-of-7.netlify.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin",
});
const SEARCH_FIELDS = "places.id,places.displayName,places.formattedAddress,places.shortFormattedAddress,places.types,places.primaryTypeDisplayName,places.businessStatus,places.googleMapsUri,nextPageToken";
// Places the family can eat at. The search used to ask Google for type "restaurant" only, and Google
// files most bakeries, dessert and ice cream shops under their own types, so Muddy's, Gibson's Donuts
// and Café Du Monde never came back. Now Google is asked without a type and we keep any eating place:
// a restaurant of any kind, or a bakery, café, dessert, ice cream, donut, candy or chocolate shop.
// ("food" alone is not enough: Google gives it to grocery stores too.) types is the same Pro tier.
const EAT = new Set(["restaurant","bakery","cafe","coffee_shop","dessert_shop","dessert_restaurant","ice_cream_shop","donut_shop",
  "confectionery","candy_store","chocolate_shop","chocolate_factory","bagel_shop","pastry_shop","cake_shop","juice_shop","tea_house",
  "meal_takeaway","bar_and_grill","diner","food_court","snack_bar","cafeteria","deli","sandwich_shop","bistro","brunch_restaurant"]);
const isEat = (p: any) => (p.types ?? []).some((t: string) => EAT.has(t) || t.endsWith("_restaurant"));
// Movie night (his order, 2026-10-17): the same search finds cinemas when the app asks for kind "theater".
const isTheater = (p: any) => (p.types ?? []).includes("movie_theater");
// Topgolf outings (his order, 2026-10-18): kind "topgolf" keeps Topgolf venues only, by name (Google files Topgolf
// Memphis as a restaurant, so its type alone can't single it out).
const isTopgolf = (p: any) => /\btopgolf\b/i.test(p.displayName?.text ?? "");
// Family Outing (his order, 2026-10-18): kind "any" keeps every place Google returns for the words asked
// (bowling alleys, the zoo, FedExForum, escape rooms…), still only inside the area chosen.
const isAny = (_p: any) => true;
const BASIC_FIELDS = "id,displayName,formattedAddress,shortFormattedAddress,primaryTypeDisplayName,businessStatus,googleMapsUri";
const FULL_FIELDS = BASIC_FIELDS + ",priceLevel,rating,userRatingCount,currentOpeningHours.openNow,nationalPhoneNumber,websiteUri";
const PRICE: Record<string, number> = { PRICE_LEVEL_FREE: 1, PRICE_LEVEL_INEXPENSIVE: 1, PRICE_LEVEL_MODERATE: 2, PRICE_LEVEL_EXPENSIVE: 3, PRICE_LEVEL_VERY_EXPENSIVE: 4 };
// A hard map boundary per area: Google returns only places inside it (a city name alone is only a hint,
// which sent "Pappadeaux in Memphis" to Dallas). [south, west, north, east]
const MEMPHIS_AREA = [34.85, -90.15, 35.45, -89.55];
const AREA: Record<string, number[]> = {
  Memphis: MEMPHIS_AREA, Germantown: [35.03, -89.85, 35.13, -89.73], Collierville: [34.99, -89.75, 35.10, -89.60], Bartlett: [35.17, -89.92, 35.26, -89.78],
  Cordova: [35.13, -89.82, 35.21, -89.70], Arlington: [35.23, -89.72, 35.33, -89.60], Lakeland: [35.20, -89.78, 35.28, -89.68], Millington: [35.30, -89.95, 35.38, -89.84],
  Southaven: [34.93, -90.06, 35.00, -89.93], "Olive Branch": [34.92, -89.90, 35.01, -89.77],
  Nashville: [35.95, -87.05, 36.35, -86.50], Atlanta: [33.55, -84.65, 34.05, -84.15], "New Orleans": [29.85, -90.30, 30.10, -89.90], Chicago: [41.60, -87.95, 42.10, -87.50],
  "New York": [40.50, -74.30, 40.95, -73.70], Dallas: [32.60, -97.10, 33.10, -96.55], Houston: [29.50, -95.80, 30.10, -95.00], "Los Angeles": [33.70, -118.70, 34.35, -118.10],
};
const shape = (p: any) => ({ placeId: p.id, id: "g:" + p.id, name: p.displayName?.text ?? "", address: p.formattedAddress ?? "", short: p.shortFormattedAddress ?? "",
  type: p.primaryTypeDisplayName?.text ?? "Restaurant", status: p.businessStatus ?? "OPERATIONAL", mapsUri: p.googleMapsUri ?? "",
  ...(p.priceLevel !== undefined || p.rating !== undefined ? { price: PRICE[p.priceLevel] ?? null, rating: p.rating ?? null, ratings: p.userRatingCount ?? null,
    openNow: p.currentOpeningHours?.openNow ?? null, phone: p.nationalPhoneNumber ?? "", website: p.websiteUri ?? "" } : {}) });

Deno.serve(async (req) => {
  const h = { ...cors(req.headers.get("origin")), "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  const reply = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: h });
  try {
    if (!GKEY) return reply({ ok: false, code: "no_key" }, 500);
    // who is asking: a signed-in, active seat
    const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } });
    const { data: u } = await admin.auth.getUser(jwt);
    if (!u?.user) return reply({ ok: false, code: "signed_out" }, 401);
    const { data: seat } = await admin.from("members").select("id,status").eq("user_id", u.user.id).maybeSingle();
    if (!seat || seat.status !== "active") return reply({ ok: false, code: "not_active" }, 403);

    const body = await req.json().catch(() => ({}));
    const take = async (sku: string, n = 1) => (await admin.rpc("places_take", { p_sku: sku, p_n: n })).data?.ok === true;
    const google = async (url: string, init: RequestInit, fields: string) => {
      const r = await fetch(url, { ...init, headers: { ...(init.headers ?? {}), "X-Goog-Api-Key": GKEY, "X-Goog-FieldMask": fields } });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { console.error("places google", r.status, JSON.stringify(d).slice(0, 300)); return { error: r.status === 429 ? "resting" : "google" }; }
      return { data: d };
    };

    if (body.action === "search") {
      const q = String(body.q ?? "").trim().slice(0, 80), city = String(body.city ?? "Memphis");
      if (q.length < 2) return reply({ ok: false, code: "short" });
      const box = AREA[city]; if (!box) return reply({ ok: false, code: "city" });
      if (!(await take("text_pro"))) return reply({ ok: false, code: "month" });
      const payload: Record<string, unknown> = { textQuery: q, pageSize: 20,
        locationRestriction: { rectangle: { low: { latitude: box[0], longitude: box[1] }, high: { latitude: box[2], longitude: box[3] } } } };
      if (body.pageToken) payload.pageToken = String(body.pageToken);
      const g = await google("https://places.googleapis.com/v1/places:searchText", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }, SEARCH_FIELDS);
      if (g.error) return reply({ ok: false, code: g.error });
      return reply({ ok: true, results: (g.data.places ?? []).filter(body.kind === "theater" ? isTheater : body.kind === "topgolf" ? isTopgolf : body.kind === "any" ? isAny : isEat).map(shape), next: g.data.nextPageToken ?? null, attribution: "Results from Google" });
    }

    if (body.action === "details") {
      const full = body.level === "full";
      const ids = [...new Set((Array.isArray(body.ids) ? body.ids : []).map(String).filter((x: string) => /^[A-Za-z0-9_-]{10,}$/.test(x)))].slice(0, full ? 1 : 10);
      if (!ids.length) return reply({ ok: true, places: [] });
      if (!(await take(full ? "details_enterprise" : "details_pro", ids.length))) return reply({ ok: false, code: "month" });
      const out = [];
      for (const id of ids) {
        const g = await google(`https://places.googleapis.com/v1/places/${id}`, { method: "GET" }, full ? FULL_FIELDS : BASIC_FIELDS);
        if (!g.error) out.push(shape(g.data));
      }
      return reply({ ok: true, places: out, attribution: "Results from Google" });
    }
    return reply({ ok: false, code: "action" }, 400);
  } catch (e) {
    console.error("places", (e as Error).message);
    return reply({ ok: false, code: "server" }, 500);
  }
});
