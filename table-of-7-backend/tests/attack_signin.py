#!/usr/bin/env python3
"""Table of 7 - attack the live sign-in and the database rules.

Runs ONLY against the test family 'zztest' (seats z1 host, z2 member, z3 paused; z4 starts paused and is woken
only for the Family Feud proofs, which need a judge and two teams).
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
check("test member sees only the test family (never the Clark seats)", ids == ["z1", "z2", "z3", "z4"], ids)
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
# --- Game Room (2026-10-17): every change goes through functions/games, which checks player, turn and move ---
G = URL + "/functions/v1/games"
s, b, _ = rest("POST", "games", tok_h, {"family_id": "zztest", "kind": "ttt", "side_a": ["z1"], "side_b": ["z2"], "state": {"b": [0]*9}}); check("no phone can write a game directly", s >= 400, (s, b))
s, b, _ = call("POST", G, {"action": "new", "kind": "ttt", "sideA": ["z2"], "sideB": ["z1"]}, tok_h); check("you can't start a game on a side you're not on", s == 403, (s, b))
s, b, _ = call("POST", G, {"action": "new", "kind": "ttt", "sideA": ["z1"], "sideB": ["z3"]}, tok_h); check("a paused seat can't be put in a game", s == 403, (s, b))
s, b, _ = call("POST", G, {"action": "new", "kind": "ttt", "sideA": ["z1"], "sideB": ["z2"]}, tok_h); gid = (b or {}).get("game", {}).get("id")
check("the host starts Tic-Tac-Toe against a member", s == 200 and bool(gid), (s, b))
s, b, _ = rest("PATCH", "games?id=eq." + str(gid), tok_h, {"winner": 0, "status": "done"}, "return=representation"); check("no phone can change a game directly", s >= 400 or b == [], (s, b))
s, b, _ = call("POST", G, {"action": "move", "id": gid, "mv": {"i": 4}, "at": 0}, tok_m); check("a player can't move out of turn", s == 409 and b.get("code") == "not_your_turn", (s, b))
s, b, _ = call("POST", G, {"action": "move", "id": gid, "mv": {"i": 9}, "at": 0}, tok_h); check("an illegal move is refused", s == 400 and b.get("code") == "illegal", (s, b))
s, b, _ = call("POST", G, {"action": "move", "id": gid, "mv": {"i": 0}, "at": 0}, tok_h); check("a legal move is taken", s == 200 and b.get("ok"), (s, b))
s, b, _ = call("POST", G, {"action": "move", "id": gid, "mv": {"i": 4}, "at": 0}, tok_m); check("a move made on an old board is refused", s == 409 and b.get("code") == "stale", (s, b))
s, b, _ = call("POST", G, {"action": "move", "id": gid, "mv": {"i": 0}, "at": 1}, tok_m); check("a taken square is refused", s == 400, (s, b))
for who, i, at in ((tok_m, 3, 1), (tok_h, 1, 2), (tok_m, 4, 3)): call("POST", G, {"action": "move", "id": gid, "mv": {"i": i}, "at": at}, who)
s, b, _ = call("POST", G, {"action": "move", "id": gid, "mv": {"i": 2}, "at": 4}, tok_h); check("three in a row ends the game", s == 200, (s, b))
s, b, _ = rest("GET", "games?id=eq." + str(gid) + "&select=status,winner,why", tok_m); check("the family sees the winner", b == [{"status": "done", "winner": 0, "why": "three in a row"}], b)
s, b, _ = call("POST", G, {"action": "move", "id": gid, "mv": {"i": 8}, "at": 5}, tok_m); check("no move after the game is over", s == 409 and b.get("code") == "over", (s, b))
s, b, _ = rest("GET", "alerts?select=text&text=like." + quote("*won Tic-Tac-Toe*"), tok_m); check("the result reaches the players", isinstance(b, list) and len(b) == 1, b)
s, b, _ = call("POST", G, {"action": "new", "kind": "checkers", "sideA": ["z1"], "sideB": ["z2"]}, tok_h); gid2 = (b or {}).get("game", {}).get("id")
s, b, _ = call("POST", G, {"action": "resign", "id": gid2}, tok_m); check("a player may resign", s == 200, (s, b))
s, b, _ = rest("GET", "games?id=eq." + str(gid2) + "&select=winner", tok_h); check("resigning gives the game to the other side", b == [{"winner": 0}], b)
# Trivia Night: the right answer lives in game_secrets, which no phone can read; the server scores every answer
s, b, _ = call("POST", G, {"action": "new", "kind": "trivia", "cat": "sports", "sideA": ["z1"], "sideB": ["z2"]}, tok_h); check("trivia refuses a category it doesn't have", s == 400 and b.get("code") == "cat", (s, b))
s, b, _ = call("POST", G, {"action": "new", "kind": "trivia", "cat": "mix", "sideA": ["z1"], "sideB": ["z2"]}, tok_h); tg = (b or {}).get("game", {})
check("the host starts family-teams trivia", s == 200 and bool(tg.get("id")), (s, b))
q0 = (tg.get("state") or {}).get("q") or {}
check("the phone gets a question and four answers", bool(q0.get("text")) and len(q0.get("options") or []) == 4, q0)
check("the phone never gets the right answer", "correct" not in json.dumps(tg.get("state")) and "answer" not in json.dumps(tg.get("state")), tg.get("state"))
s, b, _ = rest("GET", "game_secrets?select=data", tok_h); check("no phone can read the trivia answers", s >= 400 or b == [], (s, b))
s, b, _ = rest("POST", "game_secrets", tok_h, {"game_id": tg.get("id"), "data": {"correct": 0}}); check("no phone can write the trivia answers", s >= 400, (s, b))
s, b, _ = call("POST", G, {"action": "move", "id": tg.get("id"), "mv": {"pick": 0}, "at": 0}, tok_m); check("the other team can't answer out of turn", s == 409 and b.get("code") == "not_your_turn", (s, b))
s, b, _ = call("POST", G, {"action": "move", "id": tg.get("id"), "mv": {"pick": 4}, "at": 0}, tok_h); check("an answer must be one of the four", s == 400 and b.get("code") == "illegal", (s, b))
s, b, _ = call("POST", G, {"action": "move", "id": tg.get("id"), "mv": {"pick": 0}, "at": 0}, tok_h); check("the team answers", s == 200, (s, b))
s, b, _ = rest("GET", "games?id=eq." + str(tg.get("id")) + "&select=state,turn", tok_m); t1 = (b or [{}])[0]; L = (t1.get("state") or {}).get("last") or {}
check("the right answer shows only after the answer, and it was one of the four", L.get("answer") in q0.get("options", []) and L.get("right") == (q0["options"][0] == L.get("answer")), L)
check("the score counts it, the next team gets question 2", t1.get("turn") == 1 and t1["state"]["n"] == 2 and t1["state"]["score"] == [1 if L.get("right") else 0, 0], t1)
for k in range(1, 10): call("POST", G, {"action": "move", "id": tg.get("id"), "mv": {"pick": k % 4}, "at": k}, tok_m if k % 2 else tok_h)
s, b, _ = rest("GET", "games?id=eq." + str(tg.get("id")) + "&select=status,why,winner,state", tok_h); t2 = (b or [{}])[0]; sc = (t2.get("state") or {}).get("score", [0, 0])
check("ten questions end the game, and the score decides it", t2.get("status") == "done" and t2.get("why") == f"{sc[0]}\u2013{sc[1]}" and t2.get("winner") == (2 if sc[0] == sc[1] else 0 if sc[0] > sc[1] else 1), t2)
s, b, _ = call("POST", G, {"action": "new", "kind": "trivia", "cat": "bible", "table": True, "teams": ["Kids", "Grown-ups"]}, tok_h); tt = (b or {}).get("game", {})
check("trivia at the table runs on one phone with team names", s == 200 and tt.get("state", {}).get("teams") == ["Kids", "Grown-ups"] and tt.get("side_a") == ["z1"], (s, b))
s, b, _ = call("POST", G, {"action": "move", "id": tt.get("id"), "mv": {"pick": 1}, "at": 0}, tok_m); check("only the phone running the table can answer", s == 403 and b.get("code") == "not_player", (s, b))
s1, _, _ = call("POST", G, {"action": "move", "id": tt.get("id"), "mv": {"pick": 1}, "at": 0}, tok_h); s2, _, _ = call("POST", G, {"action": "move", "id": tt.get("id"), "mv": {"pick": 2}, "at": 1}, tok_h)
check("the table phone answers for each team in turn", s1 == 200 and s2 == 200, (s1, s2))
s, b, _ = call("POST", G, {"action": "resign", "id": tt.get("id")}, tok_h); s2, b2, _ = rest("GET", "games?id=eq." + str(tt.get("id")) + "&select=status,winner,why", tok_h)
check("ending a table game stops it without a winner", s == 200 and b2 == [{"status": "done", "winner": 2, "why": "stopped"}], (s, b2))
s, b, _ = rest("GET", "alerts?select=text&text=like." + quote("*Trivia Night*"), tok_m); check("only the family-teams game alerted the other team (table trivia alerts no one)", isinstance(b, list) and len(b) == 2, b)
# The countdown (his order, 2026-10-17): the server keeps the clock. Time's up passes the SAME question to the other team
import time as _time
s, b, _ = call("POST", G, {"action": "new", "kind": "trivia", "cat": "bible", "table": True, "teams": ["A", "B"], "secs": 10}, tok_h); tc = (b or {}).get("game", {})
check("trivia starts with a 10-second clock", s == 200 and tc.get("state", {}).get("secs") == 10 and tc["state"].get("steal") is False, (s, b))
s, b, _ = call("POST", G, {"action": "move", "id": tc.get("id"), "mv": {"timeout": True}, "at": 0}, tok_m); check("a phone outside the game can't call time", s == 403, (s, b))
s, b, _ = call("POST", G, {"action": "move", "id": tc.get("id"), "mv": {"timeout": True}, "at": 0}, tok_h); check("no phone can call time before the clock runs out", s == 409 and b.get("code") == "early", (s, b))
_time.sleep(10.5)
s, b, _ = call("POST", G, {"action": "move", "id": tc.get("id"), "mv": {"timeout": True}, "at": 0}, tok_h); check("when the clock runs out, time's up is accepted", s == 200, (s, b))
s, b, _ = rest("GET", "games?id=eq." + str(tc.get("id")) + "&select=state,turn,moves", tok_h); c1 = (b or [{}])[0]; L = (c1.get("state") or {}).get("last") or {}
check("time's up passes the same question to the other team to steal, its answer still hidden", c1.get("turn") == 1 and c1["state"]["steal"] is True and c1["state"]["n"] == 1 and L.get("timeout") is True and "answer" not in L, c1)
s, b, _ = call("POST", G, {"action": "move", "id": tc.get("id"), "mv": {"pick": 2}, "at": 1}, tok_h)
s, b, _ = rest("GET", "games?id=eq." + str(tc.get("id")) + "&select=state,turn", tok_h); c2 = (b or [{}])[0]; L = (c2.get("state") or {}).get("last") or {}
check("after the steal the answer shows, question 2 comes up, and it goes to the team that didn't own question 1", c2["state"]["n"] == 2 and c2["state"]["steal"] is False and L.get("stole") is True and bool(L.get("answer")) and c2.get("turn") == 1, c2)
_time.sleep(13.5)
s, b, _ = call("POST", G, {"action": "move", "id": tc.get("id"), "mv": {"pick": 0}, "at": 2}, tok_h)
s, b, _ = rest("GET", "games?id=eq." + str(tc.get("id")) + "&select=state,turn", tok_h); c3 = (b or [{}])[0]; L = (c3.get("state") or {}).get("last") or {}
check("an answer more than 3 seconds late counts as time's up (it scores nothing and passes for a steal)", L.get("timeout") is True and c3["state"]["steal"] is True and c3["state"]["score"] == c2["state"]["score"] and c3.get("turn") == 0, c3)
call("POST", G, {"action": "resign", "id": tc.get("id")}, tok_h)
# Round 2 (his order, 2026-10-17): Trivia alone, computer seats in Spades, Blackjack
s, b, _ = call("POST", G, {"action": "new", "kind": "trivia", "cat": "bible", "solo": True, "secs": 10}, tok_h); ts = (b or {}).get("game", {})
check("Trivia alone starts for one player with a clock", s == 200 and ts.get("state", {}).get("solo") is True and ts["state"]["secs"] == 10 and ts.get("side_a") == ["z1"], (s, b))
s, b, _ = call("POST", G, {"action": "move", "id": ts.get("id"), "mv": {"pick": 1}, "at": 0}, tok_m); check("nobody else can answer someone's Trivia alone", s == 403, (s, b))
_time.sleep(10.5)
s, b, _ = call("POST", G, {"action": "move", "id": ts.get("id"), "mv": {"timeout": True}, "at": 0}, tok_h)
s2, b2, _ = rest("GET", "games?id=eq." + str(ts.get("id")) + "&select=state,turn", tok_h); so = (b2 or [{}])[0]; L = (so.get("state") or {}).get("last") or {}
check("alone, time's up shows the answer and moves on (no steal, still your turn)", s == 200 and so.get("turn") == 0 and so["state"]["n"] == 2 and so["state"]["steal"] is False and bool(L.get("answer")), so)
call("POST", G, {"action": "resign", "id": ts.get("id")}, tok_h)
s, b, _ = call("POST", G, {"action": "new", "kind": "ttt", "sideA": ["z1"], "sideB": ["bot:1"]}, tok_h); check("a computer seat is refused outside Spades", s == 400 and b.get("code") == "sides", (s, b))
s, b, _ = call("POST", G, {"action": "new", "kind": "spades", "sideA": ["z1", "bot:2"], "sideB": ["bot:1", "bot:1"]}, tok_h); check("the same computer seat can't be used twice", s == 400, (s, b))
s, b, _ = call("POST", G, {"action": "new", "kind": "spades", "sideA": ["z1", "bot:2"], "sideB": ["z2", "bot:3"], "target": 300}, tok_h); sb = (b or {}).get("game", {})
check("Spades starts with computers in the empty seats", s == 200 and sb.get("state", {}).get("seats") == ["z1", "z2", "bot:2", "bot:3"], (s, b))
s, b, _ = call("POST", G, {"action": "move", "id": sb.get("id"), "mv": {"bid": 3}, "at": 0}, tok_h)
s, b, _ = call("POST", G, {"action": "move", "id": sb.get("id"), "mv": {"bid": 2}, "at": 1}, tok_m)
s2, b2, _ = rest("GET", "games?id=eq." + str(sb.get("id")) + "&select=state", tok_h); bs = ((b2 or [{}])[0].get("state") or {})
check("the server bids for the computers, and the turn comes back to a person", bs.get("phase") == "play" and all(x is not None for x in bs.get("bids", [None])) and bs["seats"][bs["seat"]] in ("z1", "z2"), bs)
check("a computer's cards never reach a phone", "hands" not in json.dumps(bs), bs)
s, b, _ = rest("GET", "alerts?select=to_member&to_member=like.bot*", tok_h); check("no alert is ever addressed to a computer", b == [] or s >= 400, (s, b))
call("POST", G, {"action": "resign", "id": sb.get("id")}, tok_h)
s, b, _ = call("POST", G, {"action": "new", "kind": "blackjack", "sideA": ["z2", "z1"]}, tok_h); check("a Blackjack table must be opened by its first player", s == 403, (s, b))
s, b, _ = call("POST", G, {"action": "new", "kind": "blackjack", "sideA": ["z1", "z2"]}, tok_h); bj = (b or {}).get("game", {})
check("a family Blackjack table opens, everyone with 1,000 points", s == 200 and bj.get("state", {}).get("bank") == [1000, 1000], (s, b))
s, b, _ = call("POST", G, {"action": "move", "id": bj.get("id"), "mv": {"bet": 5}, "at": 0}, tok_h); check("a bet under 10 is refused", s == 400, (s, b))
s, b, _ = call("POST", G, {"action": "move", "id": bj.get("id"), "mv": {"bet": 100}, "at": 0}, tok_h); check("a player bets", s == 200, (s, b))
s, b, _ = call("POST", G, {"action": "move", "id": bj.get("id"), "mv": {"bet": 50}, "at": 1}, tok_m); check("the second player bets and the cards are dealt", s == 200, (s, b))
s2, b2, _ = rest("GET", "games?id=eq." + str(bj.get("id")) + "&select=state,moves", tok_m); bst = (b2 or [{}])[0].get("state") or {}
check("the dealer shows one card; the face-down card and the shoe are not on any phone", len(bst.get("dealer", [])) in (1, 2) and '"shoe"' not in json.dumps(bst) and '"hole"' not in json.dumps(bst), bst)
n = (b2 or [{}])[0].get("moves", 2); guard = 0
while bst.get("phase") == "play" and guard < 12:
    guard += 1; who = tok_h if bst["players"][bst["seat"]] == "z1" else tok_m; other = tok_m if who == tok_h else tok_h
    if guard == 1: s, b, _ = call("POST", G, {"action": "move", "id": bj.get("id"), "mv": {"act": "stand"}, "at": n}, other); check("only the player whose turn it is may act", s == 409, (s, b))
    call("POST", G, {"action": "move", "id": bj.get("id"), "mv": {"act": "stand"}, "at": n}, who); n += 1
    s2, b2, _ = rest("GET", "games?id=eq." + str(bj.get("id")) + "&select=state", tok_h); bst = (b2 or [{}])[0].get("state") or {}
check("when everyone stands the dealer plays and every hand is settled", bst.get("phase") == "over" and len(bst.get("dealer", [])) >= 2 and all(len(r) == 1 for r in bst.get("results", [])), bst)
check("the points add up: 2,000 on the table, plus wins, minus losses", sum(bst.get("bank", [0])) == 2000 + sum(x["net"] for r in bst.get("results", []) for x in r), bst)
s, b, _ = call("POST", G, {"action": "resign", "id": bj.get("id")}, tok_m); s2, b2, _ = rest("GET", "games?id=eq." + str(bj.get("id")) + "&select=status,why", tok_h)
check("closing the table ends it and lists the final stacks", s == 200 and (b2 or [{}])[0].get("status") == "done" and "Zed" in ((b2 or [{}])[0].get("why") or ""), b2)
# Family Feud: the family is the survey. Answers live in feud_answers, which no phone can read; only the judge moves
s, b, _ = rest("PATCH", "members?id=eq.z4", tok_h, {"status": "active"}, "return=representation"); check("the host wakes the fourth test seat", s == 200 and b and b[0]["status"] == "active", (s, b))
pin_4 = f"{random.randint(0, 9999):04d}"; s, b, _ = signin("Zed Testfour", pin_4, pin_4); tok_4 = (b.get("session") or {}).get("access_token"); check("a fourth test seat signs in", bool(tok_4), b)
s, b, _ = rest("POST", "feud_surveys", tok_h, {"family_id": "zztest", "prompts": ["x"]}); check("no phone can write a survey directly", s >= 400, (s, b))
s, b, _ = call("POST", G, {"action": "survey_new", "prompts": ["", "  "]}, tok_h); check("a survey needs a question", s == 400 and b.get("code") == "prompts", (s, b))
s, b, _ = call("POST", G, {"action": "survey_new", "prompts": ["Name a food", "Name a colour", "Name a letter"]}, tok_h); sv = (b or {}).get("survey", {}).get("id")
check("the host starts a survey", s == 200 and bool(sv), (s, b))
s, b, _ = call("POST", G, {"action": "survey_new", "prompts": ["Another"]}, tok_m); check("only one survey open at a time", s == 409 and b.get("code") == "survey_open", (s, b))
s, b, _ = call("POST", G, {"action": "survey_close", "id": sv}, tok_h); check("a survey can't close before two people answer", s == 409 and b.get("code") == "few", (s, b))
s, b, _ = call("POST", G, {"action": "survey_answer", "id": sv, "answers": ["Pizza", "", "x"]}, tok_m); check("every question needs an answer", s == 400 and b.get("code") == "blank", (s, b))
for tok, ans in ((tok_m, ["Pizza", "Red", "x"]), (tok_h, ["pizzas", "Blue", "y"]), (tok_4, ["Wings", "red", "z"])):
    s, b, _ = call("POST", G, {"action": "survey_answer", "id": sv, "answers": ans}, tok)
check("three people answer", s == 200, (s, b))
s, b, _ = rest("GET", "feud_answers?select=*", tok_h); check("no phone can read anyone's survey answers", s >= 400 or b == [], (s, b))
s, b, _ = rest("GET", "feud_surveys?id=eq." + str(sv) + "&select=*", tok_m); row = (b or [{}])[0]
check("the family sees who answered, never what", len(row.get("answered", [])) == 3 and "izza" not in json.dumps(row) and "Wings" not in json.dumps(row), row)
s, b, _ = call("POST", G, {"action": "survey_mine", "id": sv}, tok_m); check("you can read back only your own answers", b.get("answers") == ["Pizza", "Red", "x"], b)
s, b, _ = call("POST", G, {"action": "survey_close", "id": sv}, tok_m); check("only the starter or the host closes a survey", s == 403 and b.get("code") == "not_starter", (s, b))
s, b, _ = call("POST", G, {"action": "new", "kind": "feud", "survey": sv, "sideA": ["z2"], "sideB": ["z4"]}, tok_h); check("no game from a survey still open", s == 409 and b.get("code") == "survey_open", (s, b))
s, b, _ = call("POST", G, {"action": "survey_close", "id": sv}, tok_h); check("the host closes the survey", s == 200, (s, b))
s, b, _ = call("POST", G, {"action": "survey_answer", "id": sv, "answers": ["Tacos", "Green", "q"]}, tok_m); check("no answers after it closes", s == 409 and b.get("code") == "survey_closed", (s, b))
s, b, _ = call("POST", G, {"action": "new", "kind": "feud", "survey": sv, "sideA": ["z1", "z2"], "sideB": ["z4"]}, tok_h); check("the judge can't be on a team", s == 403 and b.get("code") == "judge_plays", (s, b))
s, b, _ = call("POST", G, {"action": "new", "kind": "feud", "survey": sv, "sideA": ["z2"], "sideB": ["z4"]}, tok_h); fg = (b or {}).get("game", {}); fid = fg.get("id"); fs = fg.get("state") or {}
check("the host judges Family Feud: kids vs grown-ups", s == 200 and bool(fid), (s, b))
check("the board starts hidden: no answer reaches a phone", fs.get("slots") == 2 and fs.get("shown") == [None, None] and "izza" not in json.dumps(fs) and "Wings" not in json.dumps(fs), fs)
check("the board says how many of the family were asked", fs.get("people") == 3 and fs.get("prompt") == "Name a food", fs)
s, b, _ = call("POST", G, {"action": "peek", "id": fid}, tok_m); check("a player can't peek at the answers", s == 403 and b.get("code") == "not_judge", (s, b))
s, b, _ = call("POST", G, {"action": "peek", "id": fid}, tok_h); check("the judge sees the real counts: 2 said pizza, 1 said wings", [x.get("n") for x in b.get("board", [])] == [2, 1] and b["board"][1]["t"] == "Wings", b)
s, b, _ = call("POST", G, {"action": "move", "id": fid, "mv": {"reveal": 0}, "at": 0}, tok_m); check("only the judge runs the board", s == 403 and b.get("code") == "not_judge", (s, b))
fmv = lambda mv, at: call("POST", G, {"action": "move", "id": fid, "mv": mv, "at": at}, tok_h)
fst = lambda: (rest("GET", "games?id=eq." + str(fid) + "&select=state,status,winner,why", tok_m)[1] or [{}])[0]
s, b, _ = fmv({"reveal": 0}, 0); x = fst()["state"]; check("a reveal shows the answer and banks its 2 points", s == 200 and x["shown"][0]["n"] == 2 and x["bank"] == 2, x)
s, b, _ = fmv({"reveal": 0}, 1); check("the same answer can't be revealed twice", s == 400, (s, b))
for at in (1, 2, 3): fmv({"strike": True}, at)
x = fst()["state"]; check("three strikes: the other team may steal", x["phase"] == "steal" and x["turn"] == 1, x)
fmv({"reveal": 1}, 4); x = fst()["state"]; check("a good steal takes the bank (2 + 1)", x["score"] == [0, 3] and x["phase"] == "between" and all(x["shown"]), x)
s, b, _ = fmv({"strike": True}, 5); check("between rounds only Next round", s == 400, (s, b))
fmv({"next": True}, 5); x = fst()["state"]; check("round 2: the other team starts, real counts (red/Red = 2)", x["round"] == 2 and x["turn"] == 1 and x["slots"] == 2, x)
for at in (6, 7, 8): fmv({"strike": True}, at)
fmv({"strike": True}, 9); x = fst()["state"]; check("a missed steal gives the bank to the team that built it", x["score"] == [0, 3] and x["phase"] == "between", x)
fmv({"next": True}, 10)
for i, at in ((0, 11), (1, 12), (2, 13)): fmv({"reveal": i}, at)
x = fst(); check("the last round ends the game and the score decides it", x.get("status") == "done" and x["state"]["score"] == [3, 3] and x.get("winner") == 2 and x.get("why") == "3\u20133", x)
s, b, _ = rest("GET", "alerts?select=text&text=like." + quote("*Family Feud*"), tok_h); check("the judge hears the result too", isinstance(b, list) and any("draw" in a["text"] for a in b), b)
s, b, _ = rest("GET", "alerts?select=text&text=like." + quote("*Family Feud survey*"), tok_4); check("the survey reached the family", isinstance(b, list) and len(b) == 1, b)
# Spades for couples (Jokers & deuces): four phones, each sees only its own cards; every bid and card is checked by spades.js
s, b, _ = rest("PATCH", "members?id=eq.z3", tok_h, {"status": "active"}, "return=representation"); check("the host wakes the paused seat for Spades", s == 200 and b and b[0]["status"] == "active", (s, b))
s, b, _ = signin("Zed Testpaused", pin_p); tok_3 = (b.get("session") or {}).get("access_token"); check("the third test seat signs in", bool(tok_3), b)
TOK = {"z1": tok_h, "z2": tok_m, "z3": tok_3, "z4": tok_4}
s, b, _ = call("POST", G, {"action": "new", "kind": "spades", "sideA": ["z1", "z3"], "sideB": ["z2"]}, tok_h); check("Spades needs two on each team", s == 400 and b.get("code") == "four", (s, b))
s, b, _ = call("POST", G, {"action": "new", "kind": "spades", "sideA": ["z1", "z3"], "sideB": ["z2", "z4"], "target": 300}, tok_h); sg = (b or {}).get("game", {}); sid = sg.get("id"); ss = sg.get("state") or {}
check("the host deals Spades: partners across, seats z1 z2 z3 z4", s == 200 and ss.get("seats") == ["z1", "z2", "z3", "z4"] and ss.get("target") == 300, (s, b))
import re as _re
check("no card reaches a phone through the board", not _re.search(r'"[SHDC]\d+"|"BJ"|"LJ"', json.dumps(ss)), ss)
def hand_of(z):
    s, b, _ = call("POST", G, {"action": "hand", "id": sid}, TOK[z]); return b.get("hand") if b.get("ok") else None
H = {z: hand_of(z) for z in TOK}
check("each player gets their own 13 cards, and only theirs", all(len(H[z] or []) == 13 for z in H) and len(set(sum(H.values(), []))) == 52, {z: len(H[z] or []) for z in H})
check("the deck is Jokers & deuces: no 2 of clubs or hearts, both jokers in", {"C2", "H2"}.isdisjoint(sum(H.values(), [])) and {"BJ", "LJ", "S2", "D2"} <= set(sum(H.values(), [])))
spm = lambda z, mv, at: call("POST", G, {"action": "move", "id": sid, "mv": mv, "at": at}, TOK[z])
sst = lambda: (rest("GET", "games?id=eq." + str(sid) + "&select=state,moves,status,winner,why", tok_m)[1] or [{}])[0]
s, b, _ = spm("z2", {"bid": 3}, 0); check("no bidding out of turn", s == 409 and b.get("code") == "not_your_turn", (s, b))
s, b, _ = spm("z1", {"bid": 14}, 0); check("a bid must be 0 to 13", s == 400 and b.get("code") == "illegal", (s, b))
for k, z in enumerate(["z1", "z2", "z3", "z4"]): spm(z, {"bid": 3}, k)
x = sst(); check("four bids, then the play starts with seat 1", x["state"]["phase"] == "play" and x["state"]["seat"] == 0 and x["state"]["bids"] == [3, 3, 3, 3], x["state"])
SUIT = lambda c: "S" if c in ("BJ", "LJ", "D2") or c[0] == "S" else c[0]
def legal(st, hand):
    if not st["trick"]: return hand if st["broken"] or all(SUIT(c) == "S" for c in hand) else [c for c in hand if SUIT(c) != "S"]
    same = [c for c in hand if SUIT(c) == SUIT(st["trick"][0]["card"])]; return same or hand
s, b, _ = spm("z1", {"card": H["z2"][0]}, 4); check("you can't play a card you don't hold", s == 400 and b.get("code") == "illegal", (s, b))
if any(SUIT(c) != "S" for c in H["z1"]) and any(SUIT(c) == "S" for c in H["z1"]):
    s, b, _ = spm("z1", {"card": [c for c in H["z1"] if SUIT(c) == "S"][0]}, 4); check("spades can't be led before they're broken", s == 400, (s, b))
else: check("spades can't be led before they're broken (hand had one kind only; proven in spades_rules_test)", True)
def play_one():
    x = sst(); st = x["state"]; z = st["seats"][st["seat"]]; hand = hand_of(z)
    return spm(z, {"card": legal(st, hand)[0]}, x["moves"])
for k in range(4): s, b, _ = play_one()
x = sst()["state"]; check("a trick of four goes to one player, who leads next", sum(x["tricks"]) == 1 and x["trick"] == [] and x["last"]["winner"] == x["seat"], x)
s, b, _ = spm(x["seats"][x["seat"]], {"card": "H3"}, 0); check("a card played on an old board is refused", s == 409 and b.get("code") == "stale", (s, b))
check("everyone now holds 12", all(len(hand_of(z) or []) == 12 for z in TOK))
for k in range(48): s, b, _ = play_one()
x = sst()["state"]
check("after 13 tricks the hand is scored and the next is dealt", x["hand"] == 2 and x["phase"] == "bid" and x["dealer"] == 0 and x["lastHand"]["hand"] == 1 and sum(x["lastHand"]["tricks"]) == 13, x)
check("the score is the hand's real result", x["score"] == [r["pts"] for r in x["lastHand"]["res"]], x)
check("new cards: 13 each again", all(len(hand_of(z) or []) == 13 for z in TOK))
s, b, _ = call("POST", G, {"action": "resign", "id": sid}, tok_m); x = sst(); check("a couple may resign: the other couple wins", s == 200 and x.get("status") == "done" and x.get("winner") == 0, x)
s, b, _ = rest("GET", "alerts?select=text&text=like." + quote("*won Spades*"), tok_3); check("the result reaches the partner", isinstance(b, list) and len(b) == 1, b)
# --- round 3 (2026-10-17): Wild Card, Bid Whist and Dominoes run on one engine; hands stay on the server ---
tget = lambda gid: (rest("GET", "games?id=eq." + str(gid) + "&select=state,moves,status,winner,why,turn", tok_h)[1] or [{}])[0]
tmv = lambda gid, z, mv, at: call("POST", G, {"action": "move", "id": gid, "mv": mv, "at": at}, TOK[z])
thand = lambda gid, z: (call("POST", G, {"action": "hand", "id": gid}, TOK[z])[1] or {}).get("hand")
s, b, _ = call("POST", G, {"action": "new", "kind": "wildcard", "sideA": ["z2", "z1"]}, tok_h); check("a Wild Card game must be started by its first player", s == 400 and b.get("code") == "sides", (s, b))
s, b, _ = call("POST", G, {"action": "new", "kind": "wildcard", "sideA": ["z1", "z2", "z3", "z4", "bot:1"]}, tok_h); check("Wild Card seats four at most", s == 400, (s, b))
s, b, _ = call("POST", G, {"action": "new", "kind": "wildcard", "sideA": ["z1", "z2", "bot:1"], "target": 200}, tok_h); wc = (b or {}).get("game", {}); wst = wc.get("state", {})
check("Wild Card deals three seats, 7 cards each, first to 200", s == 200 and wst.get("seats") == ["z1", "z2", "bot:1"] and wst.get("counts") == [7, 7, 7] and wst.get("target") == 200, (s, b))
check("no Wild Card hand or draw pile is on the board", "hands" not in json.dumps(wst) and isinstance(wst.get("pile"), int), wst)
H1, H2 = thand(wc.get("id"), "z1"), thand(wc.get("id"), "z2")
check("each Wild Card player gets their own 7 cards", len(H1 or []) == 7 and len(H2 or []) == 7, (H1, H2))
s, b, _ = call("POST", G, {"action": "hand", "id": wc.get("id")}, TOK["z3"]); check("someone not playing can't see a Wild Card hand", s == 403, (s, b))
s, b, _ = tmv(wc.get("id"), "z2", {"draw": True}, 0); check("no Wild Card move out of turn", s == 409 and b.get("code") == "not_your_turn", (s, b))
bad = next(c for c in ["W4", "W", "R0", "B0", "G0", "Y0", "R9", "B9"] if c not in (H1 or []))
s, b, _ = tmv(wc.get("id"), "z1", {"card": bad, "color": "R"}, 0); check("you can't play a Wild Card card you don't hold", s == 400 and b.get("code") == "illegal", (s, b))
s, b, _ = tmv(wc.get("id"), "z1", {"draw": True}, 0); x = tget(wc.get("id"))
if x["state"]["turn"] == 0: s, b, _ = tmv(wc.get("id"), "z1", {"pass": True}, x["moves"]); x = tget(wc.get("id"))
check("Wild Card: draw (then pass) and the turn goes on to the next player", s == 200 and x["state"]["turn"] == 1 and x["state"]["counts"][0] == 8, x["state"])
s, b, _ = call("POST", G, {"action": "resign", "id": wc.get("id")}, tok_m); x = tget(wc.get("id"))
check("stopping a Wild Card game ends it for everyone, with no winner", s == 200 and x.get("status") == "done" and x.get("why") == "stopped" and x.get("winner") == 2, x)
s, b, _ = rest("GET", "alerts?select=text&text=like." + quote("*stopped the game of Wild Card*"), tok_h); check("the other players are told the game was stopped", isinstance(b, list) and len(b) >= 1, b)
s, b, _ = call("POST", G, {"action": "new", "kind": "bidwhist", "sideA": ["z1"], "sideB": ["z2"]}, tok_h); check("Bid Whist needs two on each side", s == 400 and b.get("code") == "four", (s, b))
s, b, _ = call("POST", G, {"action": "new", "kind": "bidwhist", "sideA": ["z1", "bot:2"], "sideB": ["z2", "bot:1"]}, tok_h); bw = (b or {}).get("game", {}); bst = bw.get("state", {})
check("Bid Whist seats partners across: z1, z2, computer, computer", s == 200 and bst.get("seats") == ["z1", "z2", "bot:2", "bot:1"] and bst.get("phase") == "bid" and bst.get("seat") == 0, (s, b))
check("the kitty and the hands are not on the board", "kitty" not in json.dumps(bst) and "hands" not in json.dumps(bst), bst)
HB = thand(bw.get("id"), "z1"); check("each Bid Whist player gets 12 cards", len(HB or []) == 12, HB)
s, b, _ = tmv(bw.get("id"), "z1", {"bid": {"n": 3, "mode": "up"}}, 0); check("a bid under 4 is refused", s == 400, (s, b))
s, b, _ = tmv(bw.get("id"), "z1", {"bid": {"n": 4, "mode": "up"}}, 0); check("the first bid is taken", s == 200, (s, b))
s, b, _ = tmv(bw.get("id"), "z2", {"bid": {"n": 4, "mode": "down"}}, 1); check("a bid must beat the high bid (4 Downtown can't top 4 Uptown)", s == 400, (s, b))
s, b, _ = tmv(bw.get("id"), "z2", {"bid": None}, 1); x = tget(bw.get("id")); xs = x["state"]
check("the server bids for the computers; the turn comes back to a person", s == 200 and xs["phase"] in ("kitty", "play") and xs["seats"][xs["seat"]] in ("z1", "z2"), xs)
if xs["phase"] == "kitty" and xs["bidder"] == 0:
    HK = thand(bw.get("id"), "z1"); check("the bidder picks up the kitty: 18 cards", len(HK or []) == 18, len(HK or []))
    s, b, _ = tmv(bw.get("id"), "z1", {"discard": HK[:5], "trump": "S"}, x["moves"]); check("exactly 6 cards must go back", s == 400, (s, b))
    s, b, _ = tmv(bw.get("id"), "z1", {"discard": HK[:6], "trump": "S"}, x["moves"]); x = tget(bw.get("id"))
    check("6 back, trump named: the kitty is the bidders' first book and the bidder leads", s == 200 and x["state"]["trump"] == "S" and x["state"]["books"][0] == 1 and x["state"]["phase"] == "play", x["state"])
else: check("a computer outbid us and took the kitty (its kitty play is proven in bidwhist_rules_test)", xs["bidder"] in (2, 3), xs)
s, b, _ = call("POST", G, {"action": "resign", "id": bw.get("id")}, tok_m); x = tget(bw.get("id")); check("a Bid Whist couple may resign: the other couple wins", s == 200 and x.get("status") == "done" and x.get("winner") == 0, x)
s, b, _ = call("POST", G, {"action": "new", "kind": "dominoes", "sideA": ["z1", "z2"]}, tok_h); dm = (b or {}).get("game", {}); dst = dm.get("state", {})
check("Dominoes for two: 7 tiles each, 14 in the boneyard", s == 200 and dst.get("counts") == [7, 7] and dst.get("yard") == 14 and dst.get("center") is None, (s, b))
check("no domino hand is on the board", "hands" not in json.dumps(dst), dst)
zt = dst["seats"][dst["turn"]]; zo = "z2" if zt == "z1" else "z1"; HT = thand(dm.get("id"), zt) or []
dbls = [t for z in ("z1", "z2") for t in (thand(dm.get("id"), z) or []) if t[0] == t[1]]
check("the highest double starts the first round", not dbls or max(dbls) in HT, (dbls, HT))
s, b, _ = tmv(dm.get("id"), zo, {"tile": (thand(dm.get("id"), zo) or [[0, 0]])[0]}, 0); check("no domino out of turn", s == 409, (s, b))
notmine = next(t for t in [[a, c] for a in range(7) for c in range(a, 7)] if t not in HT)
s, b, _ = tmv(dm.get("id"), zt, {"tile": notmine}, 0); check("you can't set down a tile you don't hold", s == 400, (s, b))
s, b, _ = tmv(dm.get("id"), zt, {"tile": HT[0]}, 0); x = tget(dm.get("id"))
check("the first tile goes down, scoring only if its pips make a five", s == 200 and x["state"]["center"] == HT[0] and x["state"]["score"][dst["turn"]] == (sum(HT[0]) if sum(HT[0]) % 5 == 0 else 0), x["state"])
s, b, _ = call("POST", G, {"action": "resign", "id": dm.get("id")}, tok_h); x = tget(dm.get("id")); check("Dominoes can be stopped", s == 200 and x.get("why") == "stopped", x)
s, b, _ = rest("PATCH", "members?id=eq.z3", tok_h, {"status": "suspended"}, "return=representation"); check("the paused seat goes back to sleep", s == 200 and b and b[0]["status"] == "suspended", (s, b))
s, b, _ = rest("PATCH", "members?id=eq.z4", tok_h, {"status": "suspended"}, "return=representation"); check("the fourth test seat goes back to sleep", s == 200 and b and b[0]["status"] == "suspended", (s, b))
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

# Movie Night (his order, 2026-10-17): phones only read; the server checks who may plan, buy, pay and confirm
MV = URL + "/functions/v1/movies"
s, b, _ = rest("POST", "movie_nights", tok_h, {"family_id": "zztest", "movie": {"title": "x"}, "date": "2030-01-01", "time": "19:00", "invited": ["z1"]}); check("no phone can write a movie night directly", s >= 400, (s, b))
s, b, _ = rest("POST", "movie_people", tok_h, {"night_id": "x", "member_id": "z1", "pay": "received"}); check("no phone can mark a payment received directly", s >= 400, (s, b))
s, b, _ = call("POST", MV, {"action": "now"}, tok_h); now = (b or {}).get("movies") or []
check("Movie Night lists movies now in theaters (TMDB)", s == 200 and len(now) > 0 and bool(now[0].get("title")), (s, str(b)[:200]))
s, b, _ = call("POST", MV, {"action": "search", "q": "Black Panther"}, tok_h); check("a movie search finds the movie", s == 200 and any("Black Panther" in m.get("title", "") for m in (b or {}).get("movies", [])), (s, str(b)[:200]))
mid = now[0]["id"] if now else 284054
s, b, _ = call("POST", MV, {"action": "movie", "id": mid}, tok_h); mv = (b or {}).get("movie") or {}
check("a movie's page has its story, rating and reviews list", s == 200 and bool(mv.get("title")) and "reviews" in mv and "overview" in mv, (s, str(b)[:200]))
s, b, _ = call("POST", MV, {"action": "new", "movie_id": mid, "date": "2030-01-05", "time": "7pm", "invited": []}, tok_h); check("a movie night needs a real date and showtime", s == 400 and b.get("code") == "when", (s, b))
s, b, _ = call("POST", MV, {"action": "new", "movie_id": mid, "date": "2030-01-05", "time": "19:30", "theater_pid": "ChIJxxxxxxxxxxxxxx", "invited": []}, tok_h); solo_n = ((b or {}).get("night") or {}).get("id")
s2, b2, _ = rest("GET", "movie_nights?id=eq." + str(solo_n) + "&select=id", tok_m); check("a movie night is hidden from anyone not invited", b2 == [], b2)
s, b, _ = call("POST", MV, {"action": "rsvp", "id": solo_n, "ans": "yes"}, tok_m); check("someone not invited can't answer it", s == 404, (s, b))
s, b, _ = call("POST", MV, {"action": "new", "movie_id": mid, "date": "2030-01-06", "time": "19:30", "theater_pid": "ChIJxxxxxxxxxxxxxx", "invited": ["z2"], "note": "Lobby at 7:15"}, tok_h); nid = ((b or {}).get("night") or {}).get("id")
check("the planner invites the family; the movie's title comes from TMDB, not the phone", s == 200 and bool(nid) and ((b or {}).get("night") or {}).get("movie", {}).get("title") == mv.get("title"), (s, str(b)[:200]))
s, b, _ = rest("GET", "alerts?select=text&text=like." + quote("*invited you to see*"), tok_m); check("the invited family member is told", isinstance(b, list) and len(b) >= 1, b)
s, b, _ = call("POST", MV, {"action": "claim", "id": nid}, tok_m); check("you have to say Going before you can buy the tickets", s == 409 and b.get("code") == "going", (s, b))
call("POST", MV, {"action": "rsvp", "id": nid, "ans": "yes"}, tok_m)
s, b, _ = call("POST", MV, {"action": "claim", "id": nid}, tok_m); check("a family member offers to buy the tickets", s == 200, (s, b))
s, b, _ = call("POST", MV, {"action": "claim", "id": nid}, tok_h); check("only one person can be buying (nobody buys twice)", s == 409 and b.get("code") == "claimed", (s, b))
s, b, _ = call("POST", MV, {"action": "tickets", "id": nid, "count": 2, "each": 12.5, "fees": 3}, tok_h); check("only the buyer can enter the tickets", s == 403, (s, b))
s, b, _ = call("POST", MV, {"action": "tickets", "id": nid, "count": 0, "each": 12.5}, tok_m); check("the ticket numbers are checked", s == 400 and b.get("code") == "numbers", (s, b))
s, b, _ = call("POST", MV, {"action": "tickets", "id": nid, "count": 2, "each": 12.5, "fees": 3, "seats": "F7, F8", "conf": "ABC123", "room": "7"}, tok_m); check("the buyer enters the tickets", s == 200, (s, b))
s, b, _ = rest("GET", "movie_people?night_id=eq." + str(nid) + "&member_id=eq.z1&select=pay,amount", tok_h); check("each person going owes their share: (2 × 12.50 + 3) ÷ 2 = 14.00", b == [{"pay": "owe", "amount": 14.0}] or b == [{"pay": "owe", "amount": 14}], b)
s, b, _ = call("POST", MV, {"action": "received", "id": nid, "member": "z1"}, tok_h); check("only the buyer can confirm money received", s == 403, (s, b))
s, b, _ = call("POST", MV, {"action": "pay", "id": nid, "mode": "sent", "via": "Zelle"}, tok_h); check("you tell the buyer you paid them back", s == 200, (s, b))
s, b, _ = rest("GET", "alerts?select=text&text=like." + quote("*says they paid you*"), tok_m); check("the buyer is told you paid", isinstance(b, list) and len(b) >= 1, b)
s, b, _ = call("POST", MV, {"action": "received", "id": nid, "member": "z1"}, tok_m); check("the buyer confirms it arrived", s == 200, (s, b))
s, b, _ = rest("GET", "movie_people?night_id=eq." + str(nid) + "&member_id=eq.z1&select=pay,via,received_at", tok_h); r1 = (b or [{}])[0]
check("the payment is received, with how and when: the receipt is ready", r1.get("pay") == "received" and r1.get("via") == "Zelle" and bool(r1.get("received_at")), b)
s, b, _ = rest("GET", "alerts?select=text&text=like." + quote("*Your receipt is in Movie Night*"), tok_h); check("you are told your receipt is ready", isinstance(b, list) and len(b) >= 1, b)
s, b, _ = call("POST", MV, {"action": "pay", "id": nid, "mode": "self"}, tok_h); check("a receipt can't be undone by switching to paying for yourself", s == 400, (s, b))
s, b, _ = call("POST", MV, {"action": "cancel", "id": nid}, tok_m); check("only the planner (or the host) can cancel", s == 403, (s, b))
s, b, _ = call("POST", MV, {"action": "cancel", "id": nid}, tok_h); s2, b2, _ = call("POST", MV, {"action": "rsvp", "id": nid, "ans": "no"}, tok_m)
check("a cancelled movie night takes no more answers", s == 200 and s2 == 409 and b2.get("code") == "cancelled", (s, s2, b2))
call("POST", MV, {"action": "cancel", "id": solo_n}, tok_h)
s, b, _ = call("POST", MV, {"action": "new", "movie_id": mid, "date": "2030-01-07", "time": "19:00", "theater_pid": "ChIJxxxxxxxxxxxxxx", "invited": ["z2"]}, tok_h); n2 = ((b or {}).get("night") or {}).get("id")
call("POST", MV, {"action": "claim", "id": n2}, tok_h); call("POST", MV, {"action": "tickets", "id": n2, "count": 2, "each": 10, "fees": 0}, tok_h)
call("POST", MV, {"action": "rsvp", "id": n2, "ans": "yes"}, tok_m)
s, b, _ = rest("GET", "movie_people?night_id=eq." + str(n2) + "&member_id=eq.z2&select=pay,amount", tok_m); check("someone who says yes after the tickets are bought takes a spare ticket and owes its share", b in ([{"pay": "owe", "amount": 10.0}], [{"pay": "owe", "amount": 10}]), b)
call("POST", MV, {"action": "cancel", "id": n2}, tok_h)

print(f"\n{fails} FAILED" if fails else "\nALL PROOFS HOLD")
sys.exit(1 if fails else 0)
