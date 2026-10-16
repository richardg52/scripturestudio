# Table of 7 — Handoff

A family dining app for Richard Clark's family in Memphis. The name is **Table of 7**; the table currently has eight seats. Everyone gets a seat. They vote on where to eat or send formal invitations, book a table without anyone booking twice, check in when they arrive, and keep the photos, reviews and receipts in one place.

This folder holds a **working prototype**: one HTML file with no build step. The design and features are agreed. What it lacks is a shared backend: right now each phone keeps its own data in browser storage. This document is the plan for taking it live.

- **Repo:** `richardg52/scripturestudio` (public)
- **Branch:** `claude/table-of-5-app-zxebfq`
- **Folder:** `table-of-7/`. It is self-contained and has nothing to do with Scripture Studio.
- **Owner:** Richard Clark

---

## 1. Files

| File | What it is |
|---|---|
| `index.html` | The whole app: HTML, CSS and JS inline. Fonts come from Google Fonts (Bodoni Moda, Figtree, DM Mono, Pinyon Script). |
| `manifest.webmanifest`, `icon.svg`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` | Lets people install it to the home screen (iPhone: Share → Add to Home Screen). |
| `netlify.toml` | Netlify settings for this folder: no build, publish the folder as is. |
| `HANDOFF.md` | This document. |

To try it locally, open `index.html` in a browser, or run `npx serve table-of-7`. At the top of the script, `const DEMO = true;` loads sample plans, reviews and alerts so one person can try every flow. **Set `DEMO = false` before the family uses it.** The app then starts clean with just the eight family members.

---

## 2. Step 1: put it online on Netlify

The Netlify account is Richard's team (`69e078c4a4bfbab348e865cc`). **Do not deploy this into the `scripture-studio-2` site** (scripturestudio.app), and do not merge it into that repo's `main`. That is a separate live product.

Create a **new site**:

- **Option A, from Git (recommended).** Import `richardg52/scripturestudio`. Set the production branch to `claude/table-of-5-app-zxebfq`, or merge into a branch of your choosing. Set **Base directory** to `table-of-7`, **Build command** to empty and **Publish directory** to `table-of-7`. `table-of-7/netlify.toml` already says this.
- **Option B, CLI.** From the repo root, run `netlify sites:create --name table-of-7` and then `netlify deploy --dir table-of-7 --prod`. Add `.netlify` to `.gitignore`.
- Suggested site name: `table-of-7`. Ask Richard about a custom domain, for example `tableof7.com` or `table.richardglennclark.com`.
- **Turn on password protection** (Site configuration → Access & security) until accounts exist (Step 2). The team plan supports it. Share the password with the family only.

Check the deploy on a phone: the splash screen, choosing a seat, the 10-minute vote, the invitation, the gallery, and "Add to Home Screen" showing the gold "7" icon.

---

## 3. Privacy rule for contact information

Richard will give you the family's emails, phone numbers and other details. **Do not put real emails, phone numbers, birthdays or allergy notes into `index.html`.** Anything in that file is readable by anyone who reaches the site.

- **Until Step 2 is done:** each person enters their own details on their own phone under **Our Table → Edit**. That data stays on that phone. The site is password protected.
- **After Step 2:** load the details into the `members` and `contacts` tables below. The app reads them only after sign-in, and row-level security limits them to the family.

The eight family seats (names only) are already in `seed()` in `index.html`:

| Seat | Name |
|---|---|
| m1 | Richard Clark |
| m2 | Jasmine Clark |
| m3 | Devonte Clark |
| m4 | Rosa Andino |
| m5 | Mario Davison |
| m6 | Derrick Williams |
| m7 | Candyce Jackson |
| m8 | Nikki (last name to add) |

Fields to collect for each person: `email`, `mobile`, `birthday` (YYYY-MM-DD), `diet` (allergies and dietary notes), and payment handles for The Tab: `zelle` (email or phone), `cashtag` (Cash App $tag) and `applepay` (phone).

**Host / admin:** Richard Clark (seat `m1`, `const ADMIN` in `index.html`) is the table's host. In the backend this becomes `members.role = 'host'`.

---

## 4. Step 2: make it truly shared (backend)

Every one of these must live in shared storage: the 10-minute vote, check-ins, alerts, the gallery and RSVPs. **Recommended: Supabase.** It provides Postgres, auth, realtime, storage and edge functions. Richard already has a Supabase account connected. Netlify DB plus Netlify Functions would also work.

### Auth: full name + 4-digit PIN
Richard asked for this exact sign-in. The prototype already has the screens (`showSignIn()` / `trySignIn()`):
- Each person types their **full name** (it must match a seat; Nikki is just "Nikki") and their **4-digit PIN**.
- **First time:** they create a PIN and type it twice.
- **5 wrong tries** locks that name for 5 minutes.
- The app **locks itself after 10 minutes away**, and anyone can lock it from their initial at the top right.
- From the same place they can sign in as someone else or change their PIN.
- **Richard can reset anyone's PIN** in Host controls → Family seats.

The prototype keeps a SHA-256 hash of each PIN on the phone. That is fine for a demo, but it is **not real security**, because a 4-digit PIN in the browser can be guessed offline. For the live app:
- Store `members.pin_hash` (bcrypt or argon2) **on the server**, and check it in an edge function that returns a Supabase session for that member.
- Rate-limit by member and by IP, with the same 5 tries and 5-minute lock, and enforce it server-side.
- Keep the Netlify site password as the outer gate until this is live.
- Optional: send a one-time email code the first time a new phone signs in, so a PIN alone can't open the app on a stranger's device.

### Schema (starting point)

```sql
create table families (id uuid primary key default gen_random_uuid(), name text not null default 'Table of 7');
create table members (
  id uuid primary key default gen_random_uuid(), family_id uuid references families not null,
  user_id uuid unique references auth.users, name text not null, email text unique, mobile text, pin_hash text,
  birthday date, diet text, color text, role text check (role in ('host','member')) default 'member',
  status text check (status in ('active','suspended')) default 'active', zelle text, cashtag text, applepay text,
  created_at timestamptz default now());
create table contacts (
  id uuid primary key default gen_random_uuid(), family_id uuid references families not null,
  name text not null, relation text, email text, mobile text, banned boolean default false, added_by uuid references members);
create table restaurants (                       -- cache of Google Places + our own fields
  id text primary key, place_id text unique, name text not null, city text, neighborhood text,
  address text, price smallint, cuisines text[], meals text[], blurb text, menu_url text,
  first_seen date default current_date);         -- powers "new openings"
create table events (
  id uuid primary key default gen_random_uuid(), family_id uuid references families not null,
  type text not null, mode text check (mode in ('vote','host')) not null, host uuid references members,
  title text, date date not null, time time not null, dress text, note text,
  budget_cap smallint default 0, vote_ends timestamptz, chosen text references restaurants,
  arrive_by time, theme text, gifts text, adults_only boolean default false,
  excluded uuid[] not null default '{}',          -- members the host took off this event; only the host can change it
  status text check (status in ('open','set','done')) default 'open', created_at timestamptz default now());
create table event_options (event_id uuid references events on delete cascade, restaurant_id text references restaurants, added_by uuid references members, primary key (event_id, restaurant_id));
create table votes (event_id uuid references events on delete cascade, member_id uuid references members, restaurant_id text references restaurants, cast_at timestamptz default now(), primary key (event_id, member_id));
create table rsvps (event_id uuid references events on delete cascade, member_id uuid references members, answer text check (answer in ('yes','maybe','no')), primary key (event_id, member_id));
create table guests (id uuid primary key default gen_random_uuid(), event_id uuid references events on delete cascade, contact_id uuid references contacts, name text, email text, asked_by uuid references members);
create table guest_hands (guest_id uuid references guests on delete cascade, member_id uuid references members, primary key (guest_id, member_id));
create table reservations (event_id uuid primary key references events on delete cascade, status text check (status in ('none','claimed','booked')) default 'none', by uuid references members, confirmation text, updated_at timestamptz default now());
create table arrivals (event_id uuid references events on delete cascade, member_id uuid references members, status text check (status in ('way','late','here')), eta_min smallint, at timestamptz default now(), primary key (event_id, member_id));
create table table_ready (event_id uuid primary key references events on delete cascade, by uuid references members, at timestamptz default now());
create table visits (id uuid primary key default gen_random_uuid(), family_id uuid references families, restaurant_id text references restaurants, date date, event_id uuid references events);
create table reviews (id uuid primary key default gen_random_uuid(), restaurant_id text references restaurants, member_id uuid references members, event_id uuid references events, date date,
  food smallint, service smallint, price smallint, selection smallint, clean smallint, location smallint, text text,
  status text check (status in ('ok','held')) default 'ok');
create table payments (id uuid primary key default gen_random_uuid(), event_id uuid references events, restaurant_id text references restaurants, date date,
  payer uuid references members, mode text check (mode in ('all','for','split','self')), for_member uuid references members, amount numeric(10,2));
create table notes (id uuid primary key default gen_random_uuid(), event_id uuid references events, member_id uuid references members, text text,
  status text check (status in ('ok','held')) default 'ok', at timestamptz default now());
create table media (id uuid primary key default gen_random_uuid(), family_id uuid references families, event_id uuid references events, restaurant_id text references restaurants,
  kind text check (kind in ('photo','video','audio')) default 'photo', category text check (category in ('food','place','sights','family')),
  caption text, storage_path text not null, by uuid references members,
  status text check (status in ('pending','approved')) default 'pending', at timestamptz default now());
create table cards (id uuid primary key default gen_random_uuid(), family_id uuid references families, by uuid references members, media_id uuid references media,
  style text check (style in ('keepsake','snapshot')), message text, event_id uuid references events, recipients uuid[],
  status text check (status in ('pending','approved','declined','sent')) default 'pending', at timestamptz default now());
-- The Tab: one check, one payer, a guest-check ticket per person
create table tabs (event_id uuid primary key references events on delete cascade, payer uuid references members not null,
  tax_rate numeric(5,2) default 9.75, auto_gratuity boolean default false, receipt_total numeric(10,2),
  check_no int, closed boolean default false, created_at timestamptz default now());
create table tab_tickets (event_id uuid references tabs on delete cascade, owner uuid references members,
  covers text[] not null,                        -- who this ticket pays for: member ids and/or 'g:<guest id>'
  tip_pct smallint default 20,
  status text check (status in ('draft','sent','returned','confirmed','settled','payer')) default 'draft',
  return_note text, paid_via text,               -- 'Zelle' | 'Apple Pay' | 'Cash App' | 'Cash' (what the member says they used)
  sent_at timestamptz, confirmed_at timestamptz, settled_at timestamptz,
  primary key (event_id, owner));
create table tab_lines (id uuid primary key default gen_random_uuid(), event_id uuid, owner uuid,
  category text check (category in ('Appetizer','Drink','Entrée','Side','Dessert','Other')),
  description text, amount numeric(10,2) not null check (amount > 0),
  foreign key (event_id, owner) references tab_tickets on delete cascade);
create table never_again (family_id uuid references families, restaurant_id text references restaurants, by uuid references members, reason text, date date default current_date, primary key (family_id, restaurant_id));
create table alerts (id uuid primary key default gen_random_uuid(), to_member uuid references members, text text, event_id uuid references events, read boolean default false, at timestamptz default now());
create table push_subscriptions (member_id uuid references members, endpoint text primary key, keys jsonb, created_at timestamptz default now());
```

**Host powers in the backend:** only `role = 'host'` may:
- approve `media` and `cards`
- change `notes` and `reviews` status, and delete any post
- add or remove seats (`members` insert/delete), and set `members.status` (pause or reinstate)
- set `contacts.banned`
- change `events.excluded`. A member on that list gets no alerts or push for the event, can't read it, and can't vote, RSVP, ask for guests or check in. Nobody else can add them back.

Paused members can read but not write. Enforce all of this in RLS policies and in the alert/push function, not only in the UI.

**The Tab rules in the backend:**
- only the ticket owner may edit their lines, and only while the ticket is `draft` or `returned`
- only the payer may set `confirmed`, `returned` (with a note) or `settled`
- a ticket's balance is zero only when it is `settled`

**Moderation:** the prototype holds posts locally when they contain a hurtful word and name a person (`needsReview()`). In the live app, run each new note, review and caption through the Claude API with a short rubric ("is this unkind toward a family member or guest?") in an edge function. Set `status = 'held'` and alert the host.

**Row-level security:** turn it on for every table. Policy: a user may read and write rows whose `family_id` (directly, or through `events`) matches their own `members.family_id`. Votes, RSVPs, arrivals and hands may only be written for the member's own `member_id`.

**Realtime:** subscribe to `votes`, `event_options`, `arrivals`, `table_ready`, `rsvps`, `guest_hands`, `alerts` and `media`. These drive the live ballot, the check-in board and the alert badge.

**Storage:** a private bucket `media/{family_id}/…` for photos, short videos and voice notes ("Sights & Sounds"). Serve with signed URLs. Resize photos on upload; the prototype already downscales to 1000 px JPEG.

### Mapping from the prototype
The prototype state object `st` maps one-to-one onto these tables: `fam` → `members`, `contacts`, `events` (with `options`, `votes`, `rsvp`, `guests[].hands`, `reservation`), `arrivals`, `tableReady`, `visits`, `reviews`, `ledger` → `payments`, `notes`, `photos` → `media`, `blocked` → `never_again`, `alerts`. Replace `save()` and `localStorage` with Supabase calls. Keep the UI.

---

## 5. Step 3: notifications

Each alert the prototype creates (`alertAll(...)`) should also go out as a **push notification**:

- **Web Push:** a service worker plus VAPID keys. Send from a Supabase Edge Function or a Netlify Function triggered on insert into `alerts`. iPhone needs iOS 16.4 or later and the app added to the home screen.
- **Email invitations:** send the formal invitation (the ivory card design in `inviteCard()`) as an HTML email through Resend or Postmark. Include RSVP buttons that link back into the app.
- **SMS (optional):** Twilio, for "I've arrived" and "table is ready" texts to anyone who hasn't installed the app.

Alert triggers already in the code:
- a vote opens, and 2 minutes are left (sent to people who haven't voted)
- the winner is chosen
- an invitation is sent, and someone accepts or declines it
- a guest is requested or approved
- someone claims or books a reservation
- someone is on the way, running late (with ETA) or has arrived
- the table is ready
- a photo is shared
- a restaurant is added to Never Again
- birthday radar, 21 days out

---

## 6. Step 4: restaurant data

The prototype holds about 90 hand-entered restaurants: 68 in Memphis plus a few in each of seven other cities. Addresses come from general knowledge and need checking. Chains have no address on purpose, so Maps finds the nearest location. Going live:

- Use the **Google Places API (New)** through a server function. Keep the key in an environment variable and never send it to the browser. Pull every restaurant in Memphis and Shelby County (Germantown, Collierville, Bartlett, Cordova), then the other cities.
- Store results in `restaurants` with the price level, hours, phone, website (menu), rating and photos. Keep our own fields: `cuisines`, `meals`, `blurb`.
- **New openings:** set `first_seen` when a place first appears, and flag anything seen in the last 60 days.
- Cache the data and refresh it weekly.

## 6b. The Tab: one check instead of seven

The app **never moves money**. It replaces seven separate checks, and the wait for each one, with **one check** and a clear record of who owes the payer what.

1. **One person agrees to pay** the restaurant on their card ("I'll pay the restaurant"). Everyone is told: ask the server for one check.
2. **Each person fills out their own ticket.** It looks like a pale green restaurant guest check with "Table of 7" across the top, plus table, guests, check number and date.
   - Lines by category: Appetizer, Drink, Entrée, Side, Dessert, Other.
   - **Who they're paying for:** themselves, plus anyone else they're covering, such as a spouse, Nikki or a guest. People covered by someone else's ticket see "Your meal is on Rosa's ticket."
   - Tax is added automatically: Memphis 9.75%, or 9% elsewhere.
   - Each person chooses their tip (15–25%). If the restaurant already added gratuity, the payer ticks that box and tips go to zero.
3. **Send the ticket to the payer's wallet.**
4. **The payer verifies it by name.**
   - **Confirm:** the member is told "you owe $X."
   - **Send back for corrections,** with a note: the ticket reopens for editing, and the member fixes it and sends it again.
5. **The member pays the payer back** by Zelle, Apple Pay, Cash App or cash:
   - Cash App opens with the amount filled in.
   - Zelle and Apple Pay copy the payer's info and the amount.
   - The member's tap only tells the payer "Rosa says she paid by Zelle."
6. **Once the money actually arrives, the payer taps "Mark settled."** Only then does the ticket show **PAID** and **Balance $0.00**, and the member gets a "Paid ✓" alert.
7. **The payer's other views:**
   - **Full check:** every ticket with its name, items, who it covers and its total, then the grand totals and the balance still owed.
   - **Receipt check:** type in the restaurant receipt total to catch a missing or duplicate item.
   - **Remind them:** nudges anyone who hasn't sent a ticket.
   - **Put a guest on my ticket.**
   - **Close the tab:** saves it to Who's paid.

Payment handles (Zelle, Cash App $tag, Apple Pay phone) live on each member's profile. Cash App links take the form `https://cash.app/$tag/AMOUNT`. Zelle and Apple Cash have no public pre-fill links, which is why the app copies the details instead.

## 6c. Send a card

The card is drawn on a `<canvas>` (1200×1500 px) in two styles, Keepsake (ivory postcard) and Snapshot (tilted instant photo on green). It is shared as a PNG through the Web Share API (`navigator.share({files})`), which opens the phone's share sheet for text, email, WhatsApp and so on. That works on iPhone and Android over HTTPS. Where sharing isn't available, the app shows the image to press-and-hold and save. Cards from anyone except the host wait for host approval. In the live app, also store the rendered PNG in `media` and email it through Resend if recipients were chosen.

## 7. Step 5: reservations

Keep the "I'll book it → Booked + confirmation #" flow. It is what prevents double-booking. Add OpenTable and Resy deep links for each restaurant. Their booking APIs are partner-only, so don't plan on booking inside the app at first.

## 8. Step 6: App Store and Google Play

First run it as an installable web app. Once the backend and push notifications work, wrap it with **Capacitor** for iOS and Android. The app is already mobile-first, with safe-area insets and a single page.

---

## 9. Feature inventory: what the prototype does

- **Opening:** a gold place-setting splash, a round-table seat picker (eight seats today), and a greeting by first name.
- **Home:**
  - things that need you
  - the live vote bar
  - birthday radar
  - quick buttons for **Start a family vote** and **Send an invitation** (no vote)
  - this Sunday's concierge pick plus two alternates
  - upcoming plans
  - a Sights & Sounds photo strip
  - places that are new or not yet tried
- **Explore:**
  - eight cities, with Memphis first
  - filters for cuisine, budget (lighter $–$$ or high end $$$+) and meal (breakfast and brunch, lunch, dinner)
  - "not tried", "new openings", "favorites" and the **Never Again** list
- **Restaurant page:**
  - address with Google Maps, directions, menu search
  - typical cost per person, meals served
  - the 90-day rotation status
  - a sommelier note with a zero-proof option
  - family scores across six areas, plus reviews
  - Plan here, or add it to Never Again
- **Plan:**
  - occasion
  - who decides: **Family votes** (up to 3 choices, optional budget limit) or **I decide · just invite**
  - date and time, with a warning if it clashes with another plan
  - dress code, with a one-line explanation of what it means
  - optional occasion details: arrive-by time, theme or colors ("Wear red"), gifts line, adults only
  - restaurant picker, personal note
  - guests from Contacts or someone new
  - an invitation preview
- **10-minute live vote:**
  - full-screen countdown, with each restaurant's cost, rating, menu and location
  - anyone can add a restaurant to the ballot (up to 6)
  - it closes when everyone has voted or time runs out, and a **tie goes to the host's vote**
- **Welcome to dinner, family:**
  - a full-screen reveal with directions, menu and tip calculator
  - check-in: On my way / Running late (5–30 min) / I've arrived
  - "Our table is ready"
  - dietary notes for the server
  - photos from tonight and tonight's highlights
- **Formal invitation:**
  - ivory stationery card with a T7 monogram and script lettering
  - the date and time written out in words
  - restaurant, attire (with what it means), typical cost and confirmed seats
  - the occasion details: arrive by, what to wear, adults only, gifts
  - links for directions, menu, location and Google Calendar
  - a "Kindly reply by" line
  - in the feed it arrives as a sealed envelope that opens full screen with Accept / Maybe / Decline
  - Email invitation (one message to everyone) and Copy text
- **Guests:** they need a majority of the active family to raise hands (5 of 8 today).
- **Reservations:** claim (everyone sees "Rosa is booking"), then booked with a confirmation number. The booker sees the family's dietary notes.
- **Concierge and tip calculator:** Memphis sales tax of 9.75%. Tip by service rating: 1 → 12%, 2 → 15%, 3 → 18%, 4 → 20%, 5 → 22%. It warns about automatic gratuity for parties of 6+ and splits the bill per person.
- **Wrap-up:** rate the six areas, write feedback, and record who paid (all / for someone / split / each paid). A score of 2.2 or less offers to add the place to Never Again.
- **Our Table:**
  - the Sights & Sounds gallery entry
  - Never Again, favorites ranked by visits, who has paid and "hasn't treated in a while"
  - family seats with email, mobile, birthday, diet and payment handles
  - only Richard can add or remove seats; others can edit only their own profile
  - contacts
  - the quick tip guide
- **Sights & Sounds gallery:**
  - a full-screen magazine layout: a large lead photo, then a two-column mosaic grouped by month
  - filters: The food, The place, Sights & sounds, Family
  - each photo has a caption, restaurant and who shared it
  - video and voice notes come with Step 2 storage
- **Alerts:** a bell with an unread count. See Step 3.
- **Host controls (Richard only):**
  - approve or decline family photos ("in") and cards ("out")
  - allow or delete held posts
  - delete any post
  - pause, reinstate or remove a seat (a paused member can look but not vote or post)
  - mark a contact "Not welcome" so they can't be invited
  - **Who's invited** on any event: take a member off that event (no alerts, can't see, vote or RSVP) or remove a guest. Only Richard can put them back.
- **Send a card:** choose a photo (or a new one), a style and a note, pick recipients if you like, and send through the phone's share sheet.
- **The Tab:** one check, one payer, a guest-check ticket for each person. The payer verifies, confirms or sends back, and settles each one to $0.00. See section 6b.
- **Sunday rule:** a restaurant chosen within the last 90 days doesn't come back. After 90 days it shows as "back in rotation".

## 10. Known limits of the prototype

- Data lives in each phone's browser storage, and the live vote simulates other people's votes when `DEMO` is on.
- Photos are stored in the browser, roughly 5 MB in total. Real storage comes in Step 2.
- `mailto:` invitations are plain text. HTML email comes in Step 3.
- Restaurant facts need checking (see Step 4).

## 11. Before the family uses it (checklist)

1. Deploy (Step 1) behind a password, and test on an iPhone and an Android phone.
2. Set `const DEMO = false;` in `index.html`.
3. Add Nikki's last name to seat `m8`. If the family wants the name to match the head count, renaming to "Table of 8" touches the title, splash, monogram (T7) and the guest-check header; search for `Table of 7` and `T7`.
4. Build Step 2 (Supabase) so the eight phones share one table. Load everyone's email, mobile, birthday, dietary notes and payment handles **into the database only**.
5. Turn on push notifications (Step 3) so votes, invitations, tickets and "Paid ✓" reach phones.
6. Replace the hand-entered restaurants with Google Places (Step 4), and check the 68 Memphis entries against it.
7. Give each family member a 5-minute walkthrough. The **?** button in the app has the quick tip guide.

## 12. Ideas for later (not built)

- **A chair for those we miss.** An optional "In loving memory" place at the table: a photo and a favorite restaurant for a family member who has passed. On their birthday or a chosen day, the app suggests a dinner at their favorite place.
- **Venmo** links for The Tab, if the family uses it.
- **Short videos and voice notes** in Sights & Sounds (needs Step 2 storage).
- **Year in review** each December: most-loved restaurant, new places tried, total dinners together.

## 13. Suggested first message to the desktop Claude

> Read `table-of-7/HANDOFF.md` in `richardg52/scripturestudio` (branch `claude/table-of-5-app-zxebfq`). Do Step 1: create a new Netlify site called table-of-7 from the `table-of-7` folder with password protection on, and give me the URL. Do not touch the scripturestudio.app site. Then propose the Supabase setup from Step 2, and load our family's contact details into the database only, never into index.html. Work through the checklist in section 11.
