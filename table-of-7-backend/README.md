# Table of 7 — backend (Supabase)

Not published by Netlify: the site publishes only `table-of-7/`.

- **Project:** Supabase "Table of 7" (`vhonljdavmklymrocgiu`, us-east-2), free plan.
- **`supabase/migrations/`** — every database change, in the order it was applied: tables, the security rules on every table, the guards (host-only powers, The Tab's steps, alerts that skip paused or excluded members), and the PIN functions. The live project's migration history matches these files.
- **`supabase/functions/pin-signin/`** — the sign-in server function. Full name + 4-digit PIN, checked with bcrypt in the database; 5 wrong tries locks that name for 5 minutes, and 20 wrong tries from one network in 15 minutes locks that network. Only a correct PIN gets a session, for that one seat. No email is ever sent.
- **`tests/attack_signin.py`** — 91 attacks against the live project, run only on the test family `zztest` (never a real seat). Run `tests/reset_test_family.sql` in the SQL editor first, then:

  ```
  /usr/bin/python3 table-of-7-backend/tests/attack_signin.py
  ```

  The last line must read `ALL PROOFS HOLD`.

- **Server actions** (run once for the whole table, never per phone): `open_live_vote`, `vote_warn`, `close_vote` (a tie goes to the plan host's vote), `radar_claim`. They mark themselves trusted for their own transaction so the plan guard lets them through; phones cannot set that mark.
- **Photos** live in the private bucket `media/<family id>/…`; only that family's signed-in members can read or add them. The app shows them through signed links that expire.
- **`supabase/seed_restaurants.sql`** — the app's 89 restaurants (68 in Memphis), loaded so plans and votes can point at them.

- **`supabase/functions/places/`** — live Google restaurant search (Places API (New), Google Cloud project "Table of 7 Places" on "My Billing Account"; key "Table of 7 - Places only", restricted to Places API (New), stored only as the Supabase secret `GOOGLE_PLACES_KEY`). Signed-in active seats only. Only the Place ID is ever stored (`restaurants.source = 'google'`, enforced by the `google_rows_hold_ids_only` check), because Google's terms forbid storing names, addresses, prices or ratings. **Staying at $0:** our counter (`places_usage`, `places_take`) refuses past 4,500 Text Search Pro, 4,500 Place Details Pro and 900 Place Details Enterprise a month, under Google's free 5,000 / 5,000 / 1,000. Google's own daily quotas are set to 150 text search, 150 details, 30 photos and 0 for everything else, plus a $1 budget alert on the billing account.

**Family contact details** (email, mobile, birthday, diet, payment handles) go only into the `members` and `contacts` tables, never into `index.html`.
