#!/usr/bin/env python3
"""Table of 7 - attack the live sign-in and the database rules.

Runs ONLY against the test family 'zztest' (seats z1 host, z2 member, z3 paused).
It never touches a real family seat. Reads the project URL and public key below
(both are public by design; the service key is never used here).

    python3 table-of-7-backend/tests/attack_signin.py

Every line prints PASS or FAIL; the last line says how many failed.
"""
import json, random, sys, urllib.request, urllib.error

URL = "https://vhonljdavmklymrocgiu.supabase.co"
ANON = "sb_publishable_F-Wjwoek1ZzMLKl_aoxK2w_pF2ac_Qw"
FN = URL + "/functions/v1/pin-signin"
fails = 0


def call(method, url, body=None, token=None, headers=None):
    h = {"apikey": ANON, "Content-Type": "application/json"}
    if token: h["Authorization"] = "Bearer " + token
    h.update(headers or {})
    req = urllib.request.Request(url, data=None if body is None else json.dumps(body).encode(), method=method, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            txt = r.read().decode(); return r.status, (json.loads(txt) if txt else None), dict(r.headers)
    except urllib.error.HTTPError as e:
        txt = e.read().decode()
        try: return e.code, json.loads(txt), dict(e.headers)
        except Exception: return e.code, txt, dict(e.headers)


def check(name, ok, detail=""):
    global fails
    if not ok: fails += 1
    print(("PASS " if ok else "FAIL ") + name + ("" if ok else f"  -> {detail}"))


def signin(name, pin, pin2=None):
    return call("POST", FN, {"name": name, "pin": pin, "pin2": pin2}, headers={"Origin": "https://table-of-7.netlify.app"})


def rest(method, path, token, body=None, prefer=None):
    return call(method, URL + "/rest/v1/" + path, body, token, {"Prefer": prefer} if prefer else None)


pin_h = f"{random.randint(0, 9999):04d}"
pin_m = f"{random.randint(0, 9999):04d}"
pin_p = f"{random.randint(0, 9999):04d}"
wrong = f"{(int(pin_m) + 1) % 10000:04d}"

# --- sign-in itself ---
s, b, _ = signin("Nobody Here", "1234"); check("unknown name is refused", b.get("code") == "no_name", b)
s, b, _ = signin("zed testmember", "12a4"); check("PIN must be 4 numbers", b.get("code") in ("format", "create"), b)
s, b, _ = signin("Zed Testmember", pin_m); check("first time asks to create a PIN", b.get("code") == "create", b)
s, b, _ = signin("Zed Testmember", pin_m, wrong); check("mismatched new PINs are refused", b.get("code") == "mismatch", b)
s, b, _ = signin("  zed   TESTMEMBER ", pin_m, pin_m); check("PIN created; name match ignores case and spaces", b.get("ok") and b.get("session"), b)
s, b, _ = signin("Zed Testmember", pin_m); check("right PIN signs in", b.get("ok"), b); tok_m = b["session"]["access_token"]
s, b, _ = signin("Zed Testhost", pin_h, pin_h); tok_h = b["session"]["access_token"]; check("host signs in", b.get("ok"), b)
s, b, _ = signin("Zed Testpaused", pin_p, pin_p); tok_p = b["session"]["access_token"]; check("paused-to-be seat signs in", b.get("ok"), b)
left = []
for i in range(4):
    s, b, _ = signin("Zed Testmember", wrong); left.append(b.get("tries_left"))
check("wrong PIN counts down 4,3,2,1", left == [4, 3, 2, 1], left)
s, b, _ = signin("Zed Testmember", wrong); check("5th wrong PIN locks for 5 minutes", b.get("code") == "locked" and b.get("minutes") == 5, b)
s, b, _ = signin("Zed Testmember", pin_m); check("RIGHT PIN is still refused while locked", b.get("code") == "locked", b)
s, b, h = signin("Zed Testhost", pin_h); check("a session never comes back without the right PIN", "session" not in (signin("Zed Testhost", wrong)[1] or {}), "")
s, b, h = call("POST", FN, {"name": "x", "pin": "1"}, headers={"Origin": "https://evil.example"})
check("another website cannot use the sign-in from a browser", h.get("Access-Control-Allow-Origin") != "https://evil.example", h.get("Access-Control-Allow-Origin"))

# --- PINs can never be read or forced ---
s, b, _ = rest("GET", "member_secrets?select=*", tok_h); check("host cannot read PIN table", s in (401, 403) or b == [], (s, b))
s, b, _ = rest("GET", "member_secrets?select=*", None); check("public cannot read PIN table", s in (401, 403) or b == [], (s, b))
s, b, _ = rest("POST", "rpc/t7_pin_signin", tok_h, {"p_name": "Zed Testmember", "p_pin": pin_m, "p_pin2": None, "p_ip": "1"})
check("phones cannot call the PIN checker directly", s in (401, 403, 404), (s, b))
s, b, _ = rest("GET", "members?select=*", None); check("public sees no members", s in (401, 403) or b == [], (s, b))

# --- family walls ---
s, b, _ = rest("GET", "members?select=id,name", tok_m)
ids = sorted(x["id"] for x in b) if isinstance(b, list) else b
check("test member sees only the test family (never the Clark seats)", ids == ["z1", "z2", "z3"], ids)
check("member rows carry no PIN", isinstance(b, list) and all("pin_hash" not in x for x in b), b)

# --- seat powers ---
s, b, _ = rest("PATCH", "members?id=eq.z2", tok_m, {"diet": "no shellfish"}, "return=representation")
check("member edits own profile", s == 200 and b and b[0]["diet"] == "no shellfish", (s, b))
s, b, _ = rest("PATCH", "members?id=eq.z1", tok_m, {"diet": "hacked"}, "return=representation")
check("member cannot edit someone else", s == 200 and b == [], (s, b))
s, b, _ = rest("PATCH", "members?id=eq.z2", tok_m, {"status": "suspended"}, "return=representation")
check("member cannot pause/unpause a seat", s >= 400, (s, b))
s, b, _ = rest("PATCH", "members?id=eq.z2", tok_m, {"role": "host"}, "return=representation")
check("member cannot make themselves host", s >= 400, (s, b))
s, b, _ = rest("POST", "rpc/host_reset_pin", tok_m, {"p_member": "z1"}); check("member cannot reset a PIN", b.get("ok") is False, b)
s, b, _ = rest("POST", "rpc/host_reset_pin", tok_h, {"p_member": "m1"}); check("test host cannot reset a Clark seat", b.get("ok") is False, b)
s, b, _ = rest("POST", "rpc/host_reset_pin", tok_h, {"p_member": "z2"}); check("host resets a PIN (and clears the lock)", b.get("ok") is True, b)
s, b, _ = signin("Zed Testmember", pin_m); check("after reset the member creates a new PIN", b.get("code") == "create", b)
s, b, _ = signin("Zed Testmember", pin_m, pin_m); tok_m = b["session"]["access_token"]
s, b, _ = rest("POST", "rpc/change_my_pin", tok_m, {"old_pin": wrong, "new_pin": "0000"}); check("change PIN needs the old PIN", b.get("ok") is False, b)
s, b, _ = rest("POST", "rpc/change_my_pin", tok_m, {"old_pin": pin_m, "new_pin": pin_p}); check("change PIN with the right old PIN", b.get("ok") is True, b)
s, b, _ = signin("Zed Testmember", pin_p); check("new PIN works", b.get("ok"), b)
s, b, _ = rest("PATCH", "members?id=eq.z3", tok_h, {"status": "suspended"}, "return=representation")
check("host pauses a seat", s == 200 and b and b[0]["status"] == "suspended", (s, b))

# --- events, exclusion, votes ---
s, b, _ = rest("POST", "events", tok_h, {"id": "zz-ev1", "family_id": "zztest", "type": "sunday", "mode": "vote", "host": "z1", "date": "2030-01-06", "time": "17:00", "vote_ends": "2030-01-06T00:00:00Z"}, "return=representation")
check("host creates an event", s == 201, (s, b))
for r in ("gus", "acre"):
    rest("POST", "event_options", tok_h, {"event_id": "zz-ev1", "restaurant_id": r, "added_by": "z1"})
s, b, _ = rest("POST", "votes", tok_m, {"event_id": "zz-ev1", "member_id": "z2", "restaurant_id": "gus"}); check("member votes", s == 201, (s, b))
s, b, _ = rest("POST", "votes", tok_m, {"event_id": "zz-ev1", "member_id": "z1", "restaurant_id": "acre"}); check("member cannot vote for someone else", s >= 400, (s, b))
s, b, _ = rest("POST", "votes?on_conflict=event_id,member_id", tok_m, {"event_id": "zz-ev1", "member_id": "z2", "restaurant_id": "nowhere"}, "resolution=merge-duplicates")
check("cannot vote for a place not on the ballot", s >= 400, (s, b))
s, b, _ = rest("POST", "rsvps", tok_p, {"event_id": "zz-ev1", "member_id": "z3", "answer": "yes"}); check("paused member cannot RSVP", s >= 400, (s, b))
s, b, _ = rest("GET", "events?id=eq.zz-ev1&select=id", tok_p); check("paused member can still read", b == [{"id": "zz-ev1"}], b)
s, b, _ = rest("PATCH", "events?id=eq.zz-ev1", tok_m, {"excluded": []}, "return=representation"); check("member cannot change who is invited", s >= 400 or b == [], (s, b))
s, b, _ = rest("PATCH", "events?id=eq.zz-ev1", tok_h, {"excluded": ["z2"]}, "return=representation"); check("host takes a member off the event", s == 200 and b and b[0]["excluded"] == ["z2"], (s, b))
s, b, _ = rest("GET", "events?id=eq.zz-ev1&select=id", tok_m); check("excluded member cannot see the event", b == [], b)
s, b, _ = rest("GET", "votes?event_id=eq.zz-ev1&select=*", tok_m); check("excluded member cannot see its votes", b == [], b)
s, b, _ = rest("POST", "rsvps", tok_m, {"event_id": "zz-ev1", "member_id": "z2", "answer": "yes"}); check("excluded member cannot RSVP", s >= 400, (s, b))
s, b, _ = rest("POST", "alerts", tok_h, [{"to_member": "z2", "text": "excluded-test", "event_id": "zz-ev1"}, {"to_member": "z3", "text": "paused-test", "event_id": None}])
check("alert insert accepted", s == 201, (s, b))
s, b, _ = rest("GET", "alerts?select=text", tok_m); check("no alert reached the excluded member", b == [], b)
s, b, _ = rest("GET", "alerts?select=text", tok_p); check("no alert reached the paused member", b == [], b)
s, b, _ = rest("POST", "alerts", tok_h, {"to_member": "z2", "text": "hello", "event_id": None})
s, b, _ = rest("GET", "alerts?select=text", tok_m); check("normal alert goes through", b == [{"text": "hello"}], b)
s, b, _ = rest("GET", "alerts?select=to_member", tok_h); check("you only read your own alerts", b == [], b)

# --- photos need the host ---
s, b, _ = rest("POST", "media", tok_m, {"family_id": "zztest", "storage_path": "x.jpg", "by": "z2", "status": "approved"}, "return=representation")
check("a member's photo always starts pending", s == 201 and b[0]["status"] == "pending", (s, b))
mid = b[0]["id"] if isinstance(b, list) and b else ""
s, b, _ = rest("PATCH", f"media?id=eq.{mid}", tok_m, {"status": "approved"}, "return=representation"); check("member cannot approve own photo", s >= 400, (s, b))
s, b, _ = rest("PATCH", f"media?id=eq.{mid}", tok_h, {"status": "approved"}, "return=representation"); check("host approves the photo", s == 200 and b and b[0]["status"] == "approved", (s, b))

# --- The Tab ---
rest("PATCH", "events?id=eq.zz-ev1", tok_h, {"excluded": []})
s, b, _ = rest("POST", "tabs", tok_h, {"event_id": "zz-ev1", "payer": "z1"}); check("payer opens the tab", s == 201, (s, b))
s, b, _ = rest("POST", "tab_tickets", tok_m, {"event_id": "zz-ev1", "owner": "z2", "covers": ["z2"], "status": "settled"}, "return=representation")
check("a new ticket always starts as draft", s == 201 and b[0]["status"] == "draft", (s, b))
s, b, _ = rest("POST", "tab_lines", tok_m, {"event_id": "zz-ev1", "owner": "z2", "category": "Entrée", "description": "Catfish", "amount": 18.5}); check("member adds a line", s == 201, (s, b))
s, b, _ = rest("PATCH", "tab_tickets?event_id=eq.zz-ev1&owner=eq.z2", tok_m, {"status": "settled"}, "return=representation"); check("member cannot mark own ticket settled", s >= 400, (s, b))
s, b, _ = rest("PATCH", "tab_tickets?event_id=eq.zz-ev1&owner=eq.z2", tok_m, {"status": "sent"}, "return=representation"); check("member sends ticket to payer", s == 200 and b and b[0]["status"] == "sent", (s, b))
s, b, _ = rest("POST", "tab_lines", tok_m, {"event_id": "zz-ev1", "owner": "z2", "category": "Dessert", "description": "sneaky", "amount": 1}); check("no new lines once sent", s >= 400, (s, b))
s, b, _ = rest("PATCH", "tab_tickets?event_id=eq.zz-ev1&owner=eq.z2", tok_h, {"status": "settled"}, "return=representation"); check("payer cannot skip confirm", s >= 400, (s, b))
s, b, _ = rest("PATCH", "tab_tickets?event_id=eq.zz-ev1&owner=eq.z2", tok_h, {"status": "confirmed"}, "return=representation"); check("payer confirms", s == 200 and b and b[0]["status"] == "confirmed", (s, b))
s, b, _ = rest("PATCH", "tab_tickets?event_id=eq.zz-ev1&owner=eq.z2", tok_m, {"paid_via": "Zelle"}, "return=representation"); check("member says 'paid by Zelle'", s == 200 and b and b[0]["paid_via"] == "Zelle", (s, b))
s, b, _ = rest("PATCH", "tab_tickets?event_id=eq.zz-ev1&owner=eq.z2", tok_h, {"status": "settled"}, "return=representation"); check("payer marks settled", s == 200 and b and b[0]["status"] == "settled", (s, b))

# --- 2b: things that belong to the whole table happen on the server, once ---
from urllib.parse import quote
s, b, _ = rest("POST", "events", tok_h, {"id": "zz-ev2", "family_id": "zztest", "type": "sunday", "mode": "vote", "host": "z1", "date": "2030-02-03", "time": "18:00"}, "return=representation")
check("host creates a second plan", s == 201, (s, b))
rest("POST", "event_options", tok_h, {"event_id": "zz-ev2", "restaurant_id": "gus", "added_by": "z1", "pos": 0})
rest("POST", "event_options", tok_h, {"event_id": "zz-ev2", "restaurant_id": "acre", "added_by": "z1", "pos": 1})
s, b, _ = rest("POST", "rpc/open_live_vote", tok_p, {"p_event": "zz-ev2"}); check("paused member cannot open a vote", b.get("ok") is False, b)
s, b, _ = rest("POST", "rpc/open_live_vote", tok_m, {"p_event": "zz-ev2"}); check("member opens the 10-minute vote", b.get("ok") and b.get("started"), b)
s, b, _ = rest("POST", "rpc/open_live_vote", tok_h, {"p_event": "zz-ev2"}); check("a second opener joins; the clock does not restart", b.get("ok") and b.get("started") is False, b)
s, b, _ = rest("GET", "alerts?select=text&text=like.*" + quote("10-minute") + "*", tok_h); check("the host is told once that the vote opened", isinstance(b, list) and len(b) == 1, b)
s, b, _ = rest("POST", "rpc/close_vote", tok_m, {"p_event": "zz-ev2", "p_force": False}); check("nobody can close a vote with time left", b.get("code") == "still_open", b)
s, b, _ = rest("POST", "rpc/close_vote", tok_m, {"p_event": "zz-ev2", "p_force": True}); check("a member cannot lock in someone else's vote", b.get("code") == "not_host", b)
s, b, _ = rest("PATCH", "events?id=eq.zz-ev2", tok_m, {"chosen": "acre", "status": "set"}, "return=representation"); check("a member cannot pick the winner directly", s >= 400 or b == [], (s, b))
s, b, _ = rest("PATCH", "events?id=eq.zz-ev2", tok_m, {"vote_ends": "2030-01-01T00:00:00Z"}, "return=representation"); check("a member cannot move the vote clock", s >= 400 or b == [], (s, b))
s, b, _ = rest("POST", "rpc/set_config", tok_m, {"setting_name": "t7.server_action", "new_value": "on", "is_local": False}); check("phones cannot switch on the server-action mark", s in (401, 403, 404), (s, b))
rest("POST", "votes", tok_m, {"event_id": "zz-ev2", "member_id": "z2", "restaurant_id": "acre"})
rest("POST", "votes", tok_h, {"event_id": "zz-ev2", "member_id": "z1", "restaurant_id": "gus"})
s, b, _ = rest("POST", "rpc/close_vote", tok_m, {"p_event": "zz-ev2", "p_force": False}); check("everyone voted: anyone may close it, and a 1-1 tie goes to the host's vote", b.get("ok") and b.get("chosen") == "gus", b)
s, b, _ = rest("POST", "rpc/close_vote", tok_h, {"p_event": "zz-ev2", "p_force": False}); check("closing twice changes nothing", b.get("already") is True, b)
s, b, _ = rest("GET", "alerts?select=text&text=like." + quote("The family chose") + "*", tok_m); check("the winner is announced once", isinstance(b, list) and len(b) == 1, b)
s, b, _ = rest("POST", "votes?on_conflict=event_id,member_id", tok_m, {"event_id": "zz-ev2", "member_id": "z2", "restaurant_id": "gus"}, "resolution=merge-duplicates"); check("no voting after the vote closed", s >= 400, (s, b))
s, b, _ = rest("POST", "event_options", tok_h, {"event_id": "zz-ev2", "restaurant_id": "rendezvous", "added_by": "z1", "pos": 2}); check("no new place on a closed vote's ballot", s >= 400, (s, b))
# an invitation ("I decide · just invite") is born decided; its one restaurant must still save (2026-10-17: it was refused,
# and the refusal lost the family's alerts, the host's RSVP and the booking record)
rest("POST", "events", tok_h, {"id": "zz-ev3", "family_id": "zztest", "type": "birthday", "mode": "host", "host": "z1", "date": "2030-03-03", "time": "19:00", "chosen": "acre", "status": "set", "dessert": "muddys"})
s, b, _ = rest("POST", "event_options", tok_h, {"event_id": "zz-ev3", "restaurant_id": "acre", "added_by": "z1", "pos": 0}); check("an invitation saves its chosen restaurant", s < 300, (s, b))
s, b, _ = rest("POST", "event_options", tok_h, {"event_id": "zz-ev3", "restaurant_id": "gus", "added_by": "z1", "pos": 1}); check("an invitation takes no second restaurant", s >= 400, (s, b))
s, b, _ = rest("PATCH", "events?id=eq.zz-ev3", tok_m, {"dessert": "crumbl"}, "return=representation"); check("a member cannot change someone else's dessert stop", s >= 400 or b == [], (s, b))
s, b, _ = rest("GET", "events?id=eq.zz-ev3&select=dessert", tok_m); check("the family reads the dessert stop", b == [{"dessert": "muddys"}], b)
# --- Want to Try (2026-10-17): anyone saves a place; only the saver or the host takes it off ---
s, b, _ = rest("POST", "want_to_try", tok_m, {"family_id": "zztest", "restaurant_id": "gus", "added_by": "z2"}); check("a member saves a place to Want to Try", s < 300, (s, b))
s, b, _ = rest("POST", "want_to_try", tok_m, {"family_id": "zztest", "restaurant_id": "acre", "added_by": "z1"}); check("a member cannot save a place in someone else's name", s >= 400, (s, b))
s, b, _ = rest("POST", "want_to_try", tok_p, {"family_id": "zztest", "restaurant_id": "acre", "added_by": "z3"}); check("a paused member cannot save a place", s >= 400, (s, b))
rest("POST", "want_to_try", tok_h, {"family_id": "zztest", "restaurant_id": "acre", "added_by": "z1"})
s, b, _ = rest("DELETE", "want_to_try?family_id=eq.zztest&restaurant_id=eq.acre", tok_m, None, "return=representation"); check("a member cannot take off someone else's saved place", s >= 400 or b == [], (s, b))
s, b, _ = rest("GET", "want_to_try?select=restaurant_id,added_by&order=restaurant_id", tok_m); check("the family sees who saved each place", b == [{"restaurant_id": "acre", "added_by": "z1"}, {"restaurant_id": "gus", "added_by": "z2"}], b)
s, b, _ = rest("DELETE", "want_to_try?family_id=eq.zztest&restaurant_id=eq.gus", tok_h, None, "return=representation"); check("the host may take any saved place off", s < 300 and len(b) == 1, (s, b))
rest("DELETE", "want_to_try?family_id=eq.zztest&restaurant_id=eq.acre", tok_h)
rest("POST", "want_to_try", tok_m, {"family_id": "zztest", "restaurant_id": "rendezvous", "added_by": "z2"})
s, b, _ = rest("DELETE", "want_to_try?family_id=eq.zztest&restaurant_id=eq.rendezvous", tok_m, None, "return=representation"); check("a member takes their own saved place off", s < 300 and len(b) == 1, (s, b))
# --- What I ordered (2026-10-17): the dish lives on the reviewer's own review ---
s, b, _ = rest("POST", "reviews", tok_m, {"id": "zz-rv1", "family_id": "zztest", "restaurant_id": "gus", "member_id": "z2", "date": "2030-01-06", "overall": 9, "text": "Great night", "ordered": "Three-piece dark, spicy"}, "return=representation"); check("a member saves what they ordered with their review", s < 300 and b and b[0]["ordered"] == "Three-piece dark, spicy", (s, b))
s, b, _ = rest("POST", "reviews", tok_m, {"id": "zz-rv2", "family_id": "zztest", "restaurant_id": "gus", "member_id": "z1", "date": "2030-01-06", "overall": 2, "ordered": "Words put in his mouth"}); check("a member cannot write a review or order in someone else's name", s >= 400, (s, b))
s, b, _ = rest("POST", "reviews", tok_h, {"id": "zz-rv3", "family_id": "zztest", "restaurant_id": "acre", "member_id": "z1", "date": "2030-01-06", "overall": 8, "ordered": "Pork chop"})
s, b, _ = rest("PATCH", "reviews?id=eq.zz-rv3", tok_m, {"ordered": "Changed by someone else"}, "return=representation"); check("a member cannot change someone else's order line", s >= 400 or b == [], (s, b))
s, b, _ = rest("POST", "reviews", tok_m, {"id": "zz-rv4", "family_id": "zztest", "restaurant_id": "acre", "member_id": "z2", "date": "2030-01-07", "overall": 7, "ordered": "x" * 201}); check("an order line longer than 200 letters is refused", s >= 400, (s, b))
s, b, _ = rest("GET", "reviews?id=eq.zz-rv1&select=ordered", tok_h); check("the family reads the order line", b == [{"ordered": "Three-piece dark, spicy"}], b)
# --- Standing dinners (2026-10-17): only the host sets the rule; the server alone opens the vote ---
s, b, _ = rest("POST", "standing_dinners", tok_m, {"id": "zz-sd-m", "family_id": "zztest", "label": "Member's rule", "weekday": 0, "nth": 1, "created_by": "z2"}); check("a member cannot set a standing dinner", s >= 400, (s, b))
s, b, _ = rest("POST", "standing_dinners", tok_h, {"id": "zz-sd-h", "family_id": "zztest", "label": "First Sunday Dinner", "weekday": 0, "nth": 1, "created_by": "z1"}, "return=representation"); check("the host sets a standing dinner", s < 300 and b and b[0]["lead_days"] == 6, (s, b))
s, b, _ = rest("PATCH", "standing_dinners?id=eq.zz-sd-h", tok_m, {"active": False}, "return=representation"); check("a member cannot pause the host's standing dinner", s >= 400 or b == [], (s, b))
s, b, _ = rest("GET", "standing_dinners?id=eq.zz-sd-h&select=label", tok_m); check("the family reads the standing dinners", b == [{"label": "First Sunday Dinner"}], b)
s, b, _ = rest("POST", "standing_runs", tok_h, {"standing_id": "zz-sd-h", "dinner_date": "2030-01-06"}); check("no phone can fake a standing-dinner run, not even the host's", s >= 400, (s, b))
s, b, _ = rest("POST", "rpc/run_standing_dinners", tok_h, {}); check("no phone can start the standing-dinner run", s >= 400, (s, b))
s, b, _ = rest("DELETE", "standing_dinners?id=eq.zz-sd-h", tok_h, None, "return=representation"); check("the host deletes a standing dinner", s < 300 and len(b) == 1, (s, b))
s, b, _ = rest("PATCH", "events?id=eq.zz-ev2", tok_m, {"status": "done"}, "return=representation"); check("anyone at the dinner may mark it done after the wrap-up", s == 200 and b and b[0]["status"] == "done", (s, b))
s, b, _ = rest("POST", "rpc/radar_claim", tok_m, {"p_key": "zz-radar-" + pin_h}); s2, b2, _ = rest("POST", "rpc/radar_claim", tok_h, {"p_key": "zz-radar-" + pin_h})
check("a birthday reminder is claimed by one phone only", b is True and b2 is False, (b, b2))

# --- photos: a family's pictures stay in that family's private folder ---
def upload(path, token):
    req = urllib.request.Request(URL + "/storage/v1/object/media/" + path, data=b"\xff\xd8\xff\xe0proof", method="POST",
        headers={"apikey": ANON, "Authorization": "Bearer " + token, "Content-Type": "image/jpeg", "x-upsert": "true"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r: return r.status
    except urllib.error.HTTPError as e: return e.code
def download(path, token):
    req = urllib.request.Request(URL + "/storage/v1/object/media/" + path, headers={"apikey": ANON, "Authorization": "Bearer " + token})
    try:
        with urllib.request.urlopen(req, timeout=30) as r: return r.status
    except urllib.error.HTTPError as e: return e.code
photo = f"zztest/attack-{pin_h}{pin_m}.jpg"      # a new name each run
check("member uploads into the family folder", upload(photo, tok_m) == 200)
check("member reads a family photo", download(photo, tok_m) == 200)
check("nobody can overwrite an existing photo", upload(photo, tok_h) in (400, 403, 409))
check("nobody can upload into another family's folder", upload("clark/attack-proof.jpg", tok_m) in (400, 403, 404))
check("nobody can read another family's folder", download("clark/anything.jpg", tok_m) in (400, 403, 404))
req = urllib.request.Request(URL + "/storage/v1/object/media/" + photo, headers={"apikey": ANON})
try:
    with urllib.request.urlopen(req, timeout=30) as r: code = r.status
except urllib.error.HTTPError as e: code = e.code
check("the public cannot read a family photo", code in (400, 401, 403, 404), code)
req = urllib.request.Request(URL + "/storage/v1/object/media/" + photo, method="DELETE", headers={"apikey": ANON, "Authorization": "Bearer " + tok_m})
try:
    with urllib.request.urlopen(req, timeout=30) as r: code = r.status
except urllib.error.HTTPError as e: code = e.code
def listing(token):
    s2, b2, _ = call("POST", URL + "/storage/v1/object/list/media", {"prefix": "zztest/", "limit": 1000}, token)
    return [x["name"] for x in b2] if isinstance(b2, list) else []
# (a download can still answer for about a minute from the storage network's cache; the folder listing is the truth)
check("the person who shared a photo can remove it", code == 200 and photo.split("/")[1] not in listing(tok_m), code)
# leave no test pictures behind
for n in listing(tok_m):
    req = urllib.request.Request(URL + "/storage/v1/object/media/zztest/" + n, method="DELETE", headers={"apikey": ANON, "Authorization": "Bearer " + tok_h})
    try: urllib.request.urlopen(req, timeout=30)
    except urllib.error.HTTPError: pass
check("the test family's pictures are cleaned up", listing(tok_m) == [], listing(tok_m))

# --- Google restaurants: family only, nothing of Google's stored (these checks never reach Google) ---
s, b, _ = call("POST", URL + "/functions/v1/places", {"action": "search", "q": "seafood", "city": "Memphis"})
check("Google search refuses anyone not signed in", s == 401, (s, b))
s, b, _ = call("POST", URL + "/functions/v1/places", {"action": "search", "q": "seafood", "city": "Memphis"}, tok_p)
check("Google search refuses a paused seat", s == 403 and isinstance(b, dict) and b.get("code") == "not_active", (s, b))
s, b, _ = call("POST", URL + "/functions/v1/places", {"action": "search", "q": "x", "city": "Memphis"}, tok_m)
check("a too-short search is refused before Google is asked", isinstance(b, dict) and b.get("code") == "short", (s, b))
s, b, _ = call("POST", URL + "/functions/v1/places", {"action": "search", "q": "seafood", "city": "Paris"}, tok_m)
check("only the family's cities can be searched", isinstance(b, dict) and b.get("code") == "city", (s, b))
s, b, _ = rest("POST", "restaurants", tok_m, {"id": "g:ATTACKTESTPLACEID1", "place_id": "ATTACKTESTPLACEID1", "source": "google", "name": "Stored Google name", "city": "Memphis"})
check("Google's names can never be stored in our database", s >= 400, (s, b))
s, b, _ = rest("POST", "restaurants", tok_m, {"id": "zz-attack", "name": "Made-up place", "source": "family"})
check("a member cannot add to the family's own restaurant list", s >= 400, (s, b))
s, b, _ = rest("POST", "rpc/places_take", tok_m, {"p_sku": "text_pro", "p_n": -1000})
check("phones cannot touch the free-amount counter", s in (401, 403, 404), (s, b))

# --- notifications: only your own phone, and only the database can send ---
s, b, _ = call("POST", URL + "/functions/v1/push", {"action": "key"})
check("the notification key needs a signed-in seat", s == 401, (s, b))
s, b, _ = call("POST", URL + "/functions/v1/push", {"action": "send", "alert_id": "x"})
check("nobody but the database can send a notification", s == 403, (s, b))
s, b, _ = call("POST", URL + "/functions/v1/push", {"action": "send", "alert_id": "x"}, None, {"x-t7-token": "guess"})
check("a guessed pass cannot send a notification", s == 403, (s, b))
s, b, _ = rest("POST", "push_subscriptions", tok_m, {"member_id": "z1", "endpoint": "https://example.invalid/not-yours", "keys": {}})
check("you cannot register a phone for someone else's notifications", s >= 400, (s, b))
s, b, _ = rest("POST", "rpc/push_config_get", tok_m, {})
check("phones cannot read the notification keys", s in (401, 403, 404), (s, b))

print(f"\n{fails} FAILED" if fails else "\nALL PROOFS HOLD")
sys.exit(1 if fails else 0)
