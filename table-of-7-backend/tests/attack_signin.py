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


# Table of 8 signs in with EMAIL + PIN (his order, 2026-10-19). The proofs still name the test seats; this maps each
# name to the seat's test email (set by reset_test_family.sql). An unknown name is sent as an unknown email.
TEST_EMAIL = {"zed testhost": "z1@zztest.invalid", "zed testmember": "z2@zztest.invalid", "zed testpaused": "z3@zztest.invalid", "zed testfour": "z4@zztest.invalid"}
def signin(name, pin, pin2=None):
    email = TEST_EMAIL.get(" ".join(name.split()).lower(), name.strip().lower().replace(" ", ".") + "@nowhere.invalid")
    return call("POST", FN, {"email": email, "pin": pin, "pin2": pin2}, headers={"Origin": "https://table-of-8.netlify.app"})


def rest(method, path, token, body=None, prefer=None):
    return call(method, URL + "/rest/v1/" + path, body, token, {"Prefer": prefer} if prefer else None)


pin_h = f"{random.randint(0, 9999):04d}"
pin_m = f"{random.randint(0, 9999):04d}"
pin_p = f"{random.randint(0, 9999):04d}"
wrong = f"{(int(pin_m) + 1) % 10000:04d}"

# --- sign-in itself ---
s, b, _ = signin("Nobody Here", "1234"); check("an email that isn't on a seat is refused", b.get("code") == "no_email", b)
s, b, _ = call("POST", FN, {"name": "Zed Testmember", "pin": "1234"}, headers={"Origin": "https://table-of-8.netlify.app"}); check("the old full-name sign-in is gone (an old app copy is told to reopen)", b.get("code") == "update" and "session" not in b, b)
s, b, _ = signin("zed testmember", "12a4"); check("PIN must be 4 numbers", b.get("code") in ("format", "create"), b)
s, b, _ = signin("Zed Testmember", pin_m); check("first time asks to create a PIN", b.get("code") == "create", b)
s, b, _ = signin("Zed Testmember", pin_m, wrong); check("mismatched new PINs are refused", b.get("code") == "mismatch", b)
s, b, _ = call("POST", FN, {"email": "  Z2@ZZTEST.invalid ", "pin": pin_m, "pin2": pin_m}, headers={"Origin": "https://table-of-8.netlify.app"}); check("PIN created; the email ignores capitals and spaces", b.get("ok") and b.get("session"), b)
s, b, _ = signin("Zed Testmember", pin_m); check("right PIN signs in", b.get("ok"), b); tok_m = b["session"]["access_token"]
s, b, _ = signin("Zed Testhost", pin_h, pin_h); tok_h = b["session"]["access_token"]; check("host signs in", b.get("ok"), b)
s, b, _ = signin("Zed Testpaused", pin_p, pin_p); tok_p = b["session"]["access_token"]; check("paused-to-be seat signs in", b.get("ok"), b)
left = []
for i in range(4):
    s, b, _ = signin("Zed Testmember", wrong); left.append(b.get("tries_left"))
check("wrong PIN counts down 4,3,2,1", left == [4, 3, 2, 1], left)
s, b, _ = signin("Zed Testmember", wrong); check("5th wrong PIN locks the seat (no timer: the host unlocks it)", b.get("code") == "locked" and "minutes" not in b, b)
s, b, _ = signin("Zed Testmember", pin_m); check("RIGHT PIN is still refused while locked", b.get("code") == "locked", b)
s, b, h = signin("Zed Testhost", pin_h); check("a session never comes back without the right PIN", "session" not in (signin("Zed Testhost", wrong)[1] or {}), "")
s, b, h = call("POST", FN, {"email": "x@y.z", "pin": "1"}, headers={"Origin": "https://evil.example"})
check("another website cannot use the sign-in from a browser", h.get("Access-Control-Allow-Origin") != "https://evil.example", h.get("Access-Control-Allow-Origin"))

# --- PINs can never be read or forced ---
s, b, _ = rest("GET", "member_secrets?select=*", tok_h); check("host cannot read PIN table", s in (401, 403) or b == [], (s, b))
s, b, _ = rest("GET", "member_secrets?select=*", None); check("public cannot read PIN table", s in (401, 403) or b == [], (s, b))
s, b, _ = rest("POST", "rpc/t7_pin_signin_email", tok_h, {"p_email": "z2@zztest.invalid", "p_pin": pin_m, "p_pin2": None, "p_ip": "1"})
check("phones cannot call the PIN checker directly", s in (401, 403, 404), (s, b))
s, b, _ = rest("POST", "rpc/t7_pin_signin_email", None, {"p_email": "z2@zztest.invalid", "p_pin": pin_m, "p_pin2": None, "p_ip": "1"})
check("the public cannot call the PIN checker directly", s in (401, 403, 404), (s, b))
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
s, b, _ = rest("POST", "rpc/pin_status", tok_m, {}); check("a member can't see who is locked out", b == [] or s >= 400, (s, b))
s, b, _ = rest("POST", "rpc/pin_status", tok_h, {}); st_ = {x["member_id"]: x for x in (b or [])}
check("the host sees the locked seat (never a PIN)", st_.get("z2", {}).get("locked") is True and all(set(x) == {"member_id", "has_pin", "locked"} for x in (b or [])), b)
s, b, _ = rest("POST", "rpc/host_unlock_pin", tok_m, {"p_member": "z2"}); check("a member cannot unlock a seat", b.get("ok") is False, b)
s, b, _ = rest("POST", "rpc/host_unlock_pin", tok_h, {"p_member": "m1"}); check("the test host cannot unlock a Clark seat", b.get("ok") is False, b)
s, b, _ = rest("POST", "rpc/host_unlock_pin", tok_h, {"p_member": "z2"}); check("the host unlocks the seat", b.get("ok") is True, b)
s, b, _ = signin("Zed Testmember", pin_m); check("after the unlock the same PIN works", b.get("ok") and b.get("session"), b); tok_m = b["session"]["access_token"]
for i in range(5): signin("Zed Testmember", wrong)
s, b, _ = rest("PATCH", "members?id=eq.z2", tok_m, {"email": "z2-new@zztest.invalid"}, "return=representation"); check("a member cannot change their own sign-in email", s >= 400, (s, b))
s, b, _ = rest("PATCH", "members?id=eq.z3", tok_h, {"email": "z2@zztest.invalid"}, "return=representation"); check("two seats can't share a sign-in email", s >= 400, (s, b))
s, b, _ = rest("PATCH", "members?id=eq.z4", tok_h, {"email": "z4-new@zztest.invalid"}, "return=representation"); check("the host changes a seat's sign-in email", s == 200 and b and b[0]["email"] == "z4-new@zztest.invalid", (s, b))
rest("PATCH", "members?id=eq.z4", tok_h, {"email": "z4@zztest.invalid"})
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

# Topgolf Outing (his order, 2026-10-18: "like we do for the movies"): phones only read; the server checks who may plan, book, pay and confirm
TG = URL + "/functions/v1/golf"; PL = URL + "/functions/v1/places"
s, b, _ = rest("POST", "golf_outings", tok_h, {"family_id": "zztest", "date": "2030-01-01", "time": "17:00", "invited": ["z1"]}); check("no phone can write a Topgolf outing directly", s >= 400, (s, b))
s, b, _ = rest("POST", "golf_people", tok_h, {"outing_id": "x", "member_id": "z1", "pay": "received"}); check("no phone can mark a Topgolf payment received directly", s >= 400, (s, b))
s, b, _ = call("POST", PL, {"action": "search", "q": "Topgolf", "city": "Memphis", "kind": "topgolf"}, tok_h); tgv = (b or {}).get("results") or []
check("Find Topgolf lists Topgolf venues only (Google)", s == 200 and len(tgv) >= 1 and all("topgolf" in v["name"].lower() for v in tgv), (s, str(b)[:300]))
pid = tgv[0]["placeId"] if tgv else "ChIJxxxxxxxxxxxxxx"
s, b, _ = call("POST", TG, {"action": "new", "date": "2030-01-05", "time": "5pm", "hours": 2, "venue_pid": pid, "invited": []}, tok_h); check("an outing needs a real date and time", s == 400 and b.get("code") == "when", (s, b))
s, b, _ = call("POST", TG, {"action": "new", "date": "2030-01-05", "time": "17:00", "hours": 9, "venue_pid": pid, "invited": []}, tok_h); check("an outing is 1 to 4 hours", s == 400 and b.get("code") == "hours", (s, b))
s, b, _ = call("POST", TG, {"action": "new", "date": "2030-01-05", "time": "17:00", "hours": 2, "invited": []}, tok_h); check("an outing needs a Topgolf", s == 400 and b.get("code") == "venue", (s, b))
s, b, _ = call("POST", TG, {"action": "new", "date": "2030-01-05", "time": "17:00", "hours": 2, "venue_pid": pid, "invited": ["z3"]}, tok_h); check("only active family seats can be invited", s == 403 and b.get("code") == "seats", (s, b))
s, b, _ = call("POST", TG, {"action": "new", "date": "2030-01-05", "time": "17:00", "hours": 2, "venue_pid": pid, "invited": []}, tok_h); solo_o = ((b or {}).get("outing") or {}).get("id")
s2, b2, _ = rest("GET", "golf_outings?id=eq." + str(solo_o) + "&select=id", tok_m); check("an outing is hidden from anyone not invited", b2 == [], b2)
s, b, _ = call("POST", TG, {"action": "rsvp", "id": solo_o, "ans": "yes"}, tok_m); check("someone not invited can't answer it", s == 404, (s, b))
s, b, _ = call("POST", TG, {"action": "new", "date": "2030-01-06", "time": "17:00", "hours": 2, "venue_pid": pid, "invited": ["z2"], "note": "Front desk at 4:45"}, tok_h); oid = ((b or {}).get("outing") or {}).get("id")
check("the planner invites the family", s == 200 and bool(oid), (s, b))
s, b, _ = rest("GET", "alerts?select=text&text=like." + quote("*invited you to Topgolf*"), tok_m); check("the invited family member is told", isinstance(b, list) and len(b) >= 1, b)
s, b, _ = call("POST", TG, {"action": "claim", "id": oid}, tok_m); check("you have to say Going before you can book the bay", s == 409 and b.get("code") == "going", (s, b))
call("POST", TG, {"action": "rsvp", "id": oid, "ans": "yes"}, tok_m)
s, b, _ = call("POST", TG, {"action": "claim", "id": oid}, tok_m); check("a family member offers to book the bay", s == 200, (s, b))
s, b, _ = call("POST", TG, {"action": "claim", "id": oid}, tok_h); check("only one person can be booking (nobody books twice)", s == 409 and b.get("code") == "claimed", (s, b))
s, b, _ = call("POST", TG, {"action": "booking", "id": oid, "players": 2, "bays": 1, "bay_cost": 60}, tok_h); check("only the booker can enter the booking", s == 403, (s, b))
s, b, _ = call("POST", TG, {"action": "booking", "id": oid, "players": 7, "bays": 1, "bay_cost": 60}, tok_m); check("a bay holds up to 6 players", s == 400 and b.get("code") == "numbers", (s, b))
s, b, _ = call("POST", TG, {"action": "booking", "id": oid, "players": 2, "bays": 1, "bay_cost": 0}, tok_m); check("the booking needs a real bay cost", s == 400 and b.get("code") == "numbers", (s, b))
s, b, _ = call("POST", TG, {"action": "booking", "id": oid, "players": 2, "bays": 1, "bay_cost": 60, "extras": 21, "bay_no": "214", "conf": "TG123"}, tok_m); check("the booker enters the booking", s == 200, (s, b))
s, b, _ = rest("GET", "golf_people?outing_id=eq." + str(oid) + "&member_id=eq.z1&select=pay,amount", tok_h); check("each player owes their share: (60 + 21) ÷ 2 = 40.50", b in ([{"pay": "owe", "amount": 40.5}],), b)
s, b, _ = call("POST", TG, {"action": "received", "id": oid, "member": "z1"}, tok_h); check("only the booker can confirm money received", s == 403, (s, b))
s, b, _ = call("POST", TG, {"action": "pay", "id": oid, "mode": "sent", "via": "Cash App"}, tok_h); check("you tell the booker you paid them back", s == 200, (s, b))
s, b, _ = rest("GET", "alerts?select=text&text=like." + quote("*for Topgolf by*"), tok_m); check("the booker is told you paid", isinstance(b, list) and len(b) >= 1, b)
s, b, _ = call("POST", TG, {"action": "received", "id": oid, "member": "z1"}, tok_m); check("the booker confirms it arrived", s == 200, (s, b))
s, b, _ = rest("GET", "golf_people?outing_id=eq." + str(oid) + "&member_id=eq.z1&select=pay,via,received_at", tok_h); r1 = (b or [{}])[0]
check("the payment is received, with how and when: the receipt is ready", r1.get("pay") == "received" and r1.get("via") == "Cash App" and bool(r1.get("received_at")), b)
s, b, _ = rest("GET", "alerts?select=text&text=like." + quote("*Your receipt is in Topgolf Outing*"), tok_h); check("you are told your receipt is ready", isinstance(b, list) and len(b) >= 1, b)
s, b, _ = call("POST", TG, {"action": "pay", "id": oid, "mode": "self"}, tok_h); check("a receipt can't be undone by switching to paying your own way", s == 400, (s, b))
s, b, _ = call("POST", TG, {"action": "cancel", "id": oid}, tok_m); check("only the planner (or the host) can cancel", s == 403, (s, b))
s, b, _ = call("POST", TG, {"action": "cancel", "id": oid}, tok_h); s2, b2, _ = call("POST", TG, {"action": "rsvp", "id": oid, "ans": "no"}, tok_m)
check("a cancelled outing takes no more answers", s == 200 and s2 == 409 and b2.get("code") == "cancelled", (s, s2, b2))
call("POST", TG, {"action": "cancel", "id": solo_o}, tok_h)
s, b, _ = call("POST", TG, {"action": "new", "date": "2030-01-07", "time": "17:00", "hours": 2, "venue_pid": pid, "invited": ["z2"]}, tok_h); o2 = ((b or {}).get("outing") or {}).get("id")
call("POST", TG, {"action": "claim", "id": o2}, tok_h); call("POST", TG, {"action": "booking", "id": o2, "players": 2, "bays": 1, "bay_cost": 50}, tok_h)
call("POST", TG, {"action": "rsvp", "id": o2, "ans": "yes"}, tok_m)
s, b, _ = rest("GET", "golf_people?outing_id=eq." + str(o2) + "&member_id=eq.z2&select=pay,amount", tok_m); check("someone who says yes after the booking takes a booked place and owes its share", b in ([{"pay": "owe", "amount": 25.0}], [{"pay": "owe", "amount": 25}]), b)
call("POST", TG, {"action": "cancel", "id": o2}, tok_h)

# Secret Santa (his order, 2026-10-18; couples kept apart): the server draws; each phone learns only its own match
SA = URL + "/functions/v1/santa"
s, b, _ = rest("POST", "santa_exchanges", tok_h, {"family_id": "zztest", "name": "x", "joined": ["z1"]}); check("no phone can write a Secret Santa directly", s >= 400, (s, b))
s, b, _ = call("POST", SA, {"action": "new", "name": "Test Christmas", "budget": -5}, tok_h); check("the spending limit is checked", s == 400 and b.get("code") == "budget", (s, b))
s, b, _ = call("POST", SA, {"action": "new", "name": "Test Christmas", "budget": 40, "date": "2030-12-20"}, tok_h); sx = ((b or {}).get("exchange") or {}).get("id")
check("the host starts a Secret Santa and is in it", s == 200 and bool(sx) and (b.get("exchange") or {}).get("joined") == ["z1"], (s, b))
s, b, _ = rest("GET", "alerts?select=text&text=like." + quote("*Open Secret Santa to join*"), tok_m); check("the family is told", isinstance(b, list) and len(b) >= 1, b)
s, b, _ = call("POST", SA, {"action": "wish", "id": sx, "items": [{"text": "Socks"}]}, tok_m); check("you join before you write a wish list", s == 403 and b.get("code") == "not_in", (s, b))
for z in ("z3", "z4"): rest("PATCH", "members?id=eq." + z, tok_h, {"status": "active"}, "return=representation")
for t in (tok_m, tok_3, tok_4): call("POST", SA, {"action": "join", "id": sx}, t)
s, b, _ = rest("GET", "santa_exchanges?id=eq." + str(sx) + "&select=joined", tok_m); check("four have joined", sorted((b or [{}])[0].get("joined", [])) == ["z1", "z2", "z3", "z4"], b)
s, b, _ = call("POST", SA, {"action": "wish", "id": sx, "items": [{"text": "A book", "link": "javascript:alert(1)"}]}, tok_m); check("a wish link must be a real web link", s == 400 and b.get("code") == "link", (s, b))
s, b, _ = call("POST", SA, {"action": "wish", "id": sx, "items": [{"text": "Bluetooth speaker", "size": "Red", "link": "https://example.com/speaker"}]}, tok_m); check("a wish list is saved", s == 200, (s, b))
s, b, _ = rest("GET", "santa_wishes?exchange_id=eq." + str(sx) + "&member_id=eq.z2&select=items", tok_h); check("everyone in it can read the wish lists", (b or [{}])[0].get("items", [{}])[0].get("text") == "Bluetooth speaker", b)
s, b, _ = call("POST", SA, {"action": "households", "id": sx, "groups": [["z1", "z2"]]}, tok_m); check("only the organizer or host marks households", s == 403 and b.get("code") == "not_boss", (s, b))
s, b, _ = call("POST", SA, {"action": "households", "id": sx, "groups": [["z1", "z2"], ["z2", "z3"]]}, tok_h); check("a person can be in one household only", s == 400 and b.get("code") == "groups", (s, b))
s, b, _ = call("POST", SA, {"action": "households", "id": sx, "groups": [["z1", "z2"], ["z3", "z4"]]}, tok_h); check("the organizer marks two couples", s == 200, (s, b))
s, b, _ = call("POST", SA, {"action": "draw", "id": sx}, tok_m); check("only the organizer or host draws", s == 403 and b.get("code") == "not_boss", (s, b))
s, b, _ = call("POST", SA, {"action": "mine", "id": sx}, tok_m); check("nobody has a match before the draw", s == 409 and b.get("code") == "not_drawn", (s, b))
s, b, _ = call("POST", SA, {"action": "draw", "id": sx}, tok_h); check("the server draws the names", s == 200, (s, b))
M = {}
for z, t in (("z1", tok_h), ("z2", tok_m), ("z3", tok_3), ("z4", tok_4)):
    s, b, _ = call("POST", SA, {"action": "mine", "id": sx}, t); M[z] = (b or {}).get("receiver")
check("each person learns their own match", all(M.values()), M)
check("nobody drew themselves", all(g != r for g, r in M.items()), M)
check("no couple drew each other", all({g, r} not in ({"z1", "z2"}, {"z3", "z4"}) for g, r in M.items()), M)
check("everyone gets exactly one gift", sorted(M.values()) == ["z1", "z2", "z3", "z4"], M)
s, b, _ = rest("GET", "santa_pairs?select=*", tok_h); check("no phone can read who drew whom", s >= 400 or b == [], (s, b))
s, b, _ = call("POST", SA, {"action": "pairs", "id": sx}, tok_h); check("the full list stays hidden until the reveal", s == 409 and b.get("code") == "not_revealed", (s, b))
s, b, _ = call("POST", SA, {"action": "join", "id": sx}, tok_m); check("nobody joins after the draw", s == 409 and b.get("code") == "drawn", (s, b))
s, b, _ = call("POST", SA, {"action": "bought", "id": sx, "value": True}, tok_m); s2, b2, _ = call("POST", SA, {"action": "mine", "id": sx}, tok_m); s3, b3, _ = call("POST", SA, {"action": "mine", "id": sx}, tok_h)
check("your bought mark is yours alone", b2.get("bought") is True and b3.get("bought") is False, (b2, b3))
s, b, _ = rest("GET", "alerts?select=text&text=like." + quote("*Names are drawn*"), tok_4); check("everyone is told the names are drawn", isinstance(b, list) and len(b) == 1, b)
s, b, _ = call("POST", SA, {"action": "reveal", "id": sx}, tok_m); check("only the organizer or host reveals", s == 403, (s, b))
s, b, _ = call("POST", SA, {"action": "reveal", "id": sx}, tok_h); s2, b2, _ = call("POST", SA, {"action": "pairs", "id": sx}, tok_m)
check("after the reveal, everyone sees who had whom, and it matches each secret", s == 200 and {p["giver"]: p["receiver"] for p in b2.get("pairs", [])} == M, (b2, M))
s, b, _ = call("POST", SA, {"action": "wish", "id": sx, "items": []}, tok_m); check("wish lists close after the reveal", s == 409 and b.get("code") == "revealed", (s, b))
s, b, _ = call("POST", SA, {"action": "new", "name": "Impossible"}, tok_h); sy = ((b or {}).get("exchange") or {}).get("id")
for t in (tok_m, tok_4): call("POST", SA, {"action": "join", "id": sy}, t)
call("POST", SA, {"action": "households", "id": sy, "groups": [["z1", "z2"]]}, tok_h)
s, b, _ = call("POST", SA, {"action": "draw", "id": sy}, tok_h); check("a draw the couple rule makes impossible is refused, never broken", s == 409 and b.get("code") == "no_draw", (s, b))
call("POST", SA, {"action": "cancel", "id": sy}, tok_h)
for z in ("z3", "z4"): rest("PATCH", "members?id=eq." + z, tok_h, {"status": "suspended"}, "return=representation")

# Family Outing (his order, 2026-10-18, with the Memphis Tigers): phones only read; Tigers games come from their official schedule
OU = URL + "/functions/v1/outings"
s, b, _ = rest("POST", "outings", tok_h, {"family_id": "zztest", "kind": "bowling", "date": "2030-01-01", "time": "17:00", "invited": ["z1"]}); check("no phone can write an outing directly", s >= 400, (s, b))
s, b, _ = call("POST", OU, {"action": "tigers"}, tok_h); games = (b or {}).get("games") or []; homes = [g for g in games if g.get("home")]
check("the Tigers' schedule is read from their official calendar", s == 200 and len(games) >= 1 and all(g.get("opponent") and g.get("date") for g in games), (s, str(b)[:200]))
s, b, _ = call("POST", PL, {"action": "search", "q": "FedExForum", "city": "Memphis", "kind": "any"}, tok_h); ff = [v for v in (b or {}).get("results", []) if "fedexforum" in v["name"].lower()]
check("Find (any kind) finds FedExForum on Google", s == 200 and len(ff) >= 1, (s, str(b)[:200]))
fpid = ff[0]["placeId"] if ff else "ChIJxxxxxxxxxxxxxx"
s, b, _ = call("POST", OU, {"action": "new", "kind": "tigers", "game": "not-a-game", "place_pid": fpid, "invited": []}, tok_h); check("a Tigers outing must name a real game", s == 400 and b.get("code") == "game", (s, b))
if homes:
    hg = homes[-1]
    s, b, _ = call("POST", OU, {"action": "new", "kind": "tigers", "game": hg["uid"], "date": "2030-01-01", "time": "03:00", "place_pid": fpid, "invited": ["z2"]}, tok_h); to = (b or {}).get("outing") or {}
    check("a Tigers outing takes the game's date and time from the schedule, not the phone", s == 200 and to.get("date") == hg["date"] and to.get("time") == (hg["time"] or "TBA") and (to.get("game") or {}).get("opponent") == hg["opponent"], (s, to, hg))
    s, b, _ = rest("GET", "alerts?select=text&text=like." + quote("*invited you to the Tigers vs*"), tok_m); check("the family is invited to the Tigers game", isinstance(b, list) and len(b) >= 1, b)
    call("POST", OU, {"action": "cancel", "id": to.get("id")}, tok_h)
else: check("(no home games left this season to plan; schedule proof above still holds)", True)
s, b, _ = call("POST", OU, {"action": "new", "kind": "bowling", "date": "2030-01-05", "time": "17:00", "invited": []}, tok_h); check("an outing needs a place", s == 400 and b.get("code") == "place", (s, b))
s, b, _ = call("POST", OU, {"action": "new", "kind": "other", "date": "2030-01-05", "time": "17:00", "place_pid": fpid, "invited": []}, tok_h); check("'something else' needs a name", s == 400 and b.get("code") == "title", (s, b))
s, b, _ = call("POST", OU, {"action": "new", "kind": "bowling", "date": "2030-01-05", "time": "5pm", "place_pid": fpid, "invited": []}, tok_h); check("an outing needs a real date and time", s == 400 and b.get("code") == "when", (s, b))
s, b, _ = call("POST", OU, {"action": "new", "kind": "bowling", "date": "2030-01-05", "time": "17:00", "place_pid": fpid, "invited": []}, tok_h); so = ((b or {}).get("outing") or {}).get("id")
s2, b2, _ = rest("GET", "outings?id=eq." + str(so) + "&select=id", tok_m); check("an outing is hidden from anyone not invited", b2 == [], b2)
s, b, _ = call("POST", OU, {"action": "new", "kind": "bowling", "date": "2030-01-06", "time": "17:00", "hours": 2, "place_pid": fpid, "invited": ["z2"]}, tok_h); oid2 = ((b or {}).get("outing") or {}).get("id")
check("the planner invites the family to bowling", s == 200 and bool(oid2), (s, b))
s, b, _ = call("POST", OU, {"action": "claim", "id": oid2}, tok_m); check("you say Going before you book", s == 409 and b.get("code") == "going", (s, b))
call("POST", OU, {"action": "rsvp", "id": oid2, "ans": "yes"}, tok_m)
s, b, _ = call("POST", OU, {"action": "claim", "id": oid2}, tok_m); s2, b2, _ = call("POST", OU, {"action": "claim", "id": oid2}, tok_h)
check("one person books (nobody books twice)", s == 200 and s2 == 409 and b2.get("code") == "claimed", (s, s2, b2))
s, b, _ = call("POST", OU, {"action": "booking", "id": oid2, "count": 2, "extras": 50}, tok_h); check("only the booker enters the booking", s == 403, (s, b))
s, b, _ = call("POST", OU, {"action": "booking", "id": oid2, "count": 2}, tok_m); check("a booking needs a real cost", s == 400 and b.get("code") == "numbers", (s, b))
s, b, _ = call("POST", OU, {"action": "booking", "id": oid2, "count": 2, "each": 0, "extras": 55, "details": "Lanes 7-8", "conf": "BW77"}, tok_m); check("the booker enters a lane cost", s == 200, (s, b))
s, b, _ = rest("GET", "outing_people?outing_id=eq." + str(oid2) + "&member_id=eq.z1&select=pay,amount", tok_h); check("each person owes their share: 55 ÷ 2 = 27.50", b in ([{"pay": "owe", "amount": 27.5}],), b)
s, b, _ = call("POST", OU, {"action": "pay", "id": oid2, "mode": "sent", "via": "Zelle"}, tok_h); s2, b2, _ = call("POST", OU, {"action": "received", "id": oid2, "member": "z1"}, tok_h)
check("only the booker confirms money received", s == 200 and s2 == 403, (s, s2))
s, b, _ = call("POST", OU, {"action": "received", "id": oid2, "member": "z1"}, tok_m); s2, b2, _ = rest("GET", "outing_people?outing_id=eq." + str(oid2) + "&member_id=eq.z1&select=pay,via", tok_h)
check("the booker confirms it: the receipt is ready", s == 200 and b2 == [{"pay": "received", "via": "Zelle"}], (s, b2))
s, b, _ = rest("GET", "alerts?select=text&text=like." + quote("*Your receipt is in Family Outing*"), tok_h); check("you are told your receipt is ready", isinstance(b, list) and len(b) >= 1, b)
s, b, _ = call("POST", OU, {"action": "cancel", "id": oid2}, tok_m); check("only the planner (or the host) cancels", s == 403, (s, b))
call("POST", OU, {"action": "cancel", "id": oid2}, tok_h); call("POST", OU, {"action": "cancel", "id": so}, tok_h)
s, b, _ = call("POST", OU, {"action": "rsvp", "id": oid2, "ans": "no"}, tok_m); check("a cancelled outing takes no more answers", s == 409 and b.get("code") == "cancelled", (s, b))

# Family Prayer Wall (his order, 2026-10-18): the whole family sees requests; an unnamed request can't be traced to its author
PR = URL + "/functions/v1/prayer"
s, b, _ = rest("POST", "prayers", tok_h, {"family_id": "zztest", "text": "x"}); check("no phone can write a prayer request directly", s >= 400, (s, b))
s, b, _ = call("POST", PR, {"action": "new", "text": "   "}, tok_m); check("a request needs words", s == 400 and b.get("code") == "empty", (s, b))
s, b, _ = call("POST", PR, {"action": "new", "text": "Please pray for my job interview on Monday.", "anon": True}, tok_m); pa = ((b or {}).get("prayer") or {}).get("id")
check("a member shares a request without their name", s == 200 and bool(pa) and (b.get("prayer") or {}).get("shown_by") is None, (s, b))
s, b, _ = rest("GET", "prayers?id=eq." + str(pa) + "&select=*", tok_h); row = (b or [{}])[0]
check("the family sees it, with no name and nothing that points to the author", row.get("text", "").startswith("Please pray") and row.get("shown_by") is None and "z2" not in json.dumps(row), row)
s, b, _ = rest("GET", "prayer_authors?select=*", tok_h); check("no phone (not even the host's) can read who wrote it", s >= 400 or b == [], (s, b))
s, b, _ = call("POST", PR, {"action": "mine"}, tok_h); s2, b2, _ = call("POST", PR, {"action": "mine"}, tok_m)
check("only the author's own phone knows it's theirs", pa not in (b or {}).get("ids", []) and pa in (b2 or {}).get("ids", []), (b, b2))
s, b, _ = rest("GET", "alerts?select=text&text=like." + quote("*Someone in the family shared a prayer request*"), tok_h); check("the family is told without a name", isinstance(b, list) and len(b) == 1 and "Zed" not in b[0]["text"], b)
s, b, _ = call("POST", PR, {"action": "pray", "id": pa}, tok_h); check("the host prays for it", s == 200 and b.get("prayed") is True, (s, b))
s, b, _ = rest("GET", "alerts?select=text&text=like." + quote("*prayed for your request*"), tok_m); check("the author is encouraged, privately", isinstance(b, list) and len(b) == 1, b)
s, b, _ = call("POST", PR, {"action": "answer", "id": pa, "praise": "Got it"}, tok_h); check("only the author marks it answered", s == 403 and b.get("code") == "not_author", (s, b))
s, b, _ = call("POST", PR, {"action": "answer", "id": pa, "praise": "I got the job! Thank you all."}, tok_m); s2, b2, _ = rest("GET", "prayers?id=eq." + str(pa) + "&select=status,praise", tok_h)
check("the author marks it answered with a praise report", s == 200 and b2 == [{"status": "answered", "praise": "I got the job! Thank you all."}], (s, b2))
s, b, _ = rest("GET", "alerts?select=text&text=like." + quote("*A prayer you prayed for was answered*"), tok_h); check("everyone who prayed hears the good news", isinstance(b, list) and len(b) == 1, b)
s, b, _ = call("POST", PR, {"action": "new", "text": "Traveling mercies for Saturday."}, tok_h); pn = ((b or {}).get("prayer") or {}).get("id")
check("a request with a name shows who shared it", ((b or {}).get("prayer") or {}).get("shown_by") == "z1", b)
s, b, _ = call("POST", PR, {"action": "remove", "id": pn}, tok_m); check("someone else can't take your request down", s == 403, (s, b))
s, b, _ = call("POST", PR, {"action": "remove", "id": pa}, tok_h); s2, b2, _ = rest("GET", "prayers?id=eq." + str(pa) + "&select=id", tok_m)
check("the host can take any request down", s == 200 and b2 == [], (s, b2))
call("POST", PR, {"action": "remove", "id": pn}, tok_h)

# Game Night Tournament (his order, 2026-10-18): 1st = 3, 2nd = 1; the server crowns the champion
TN = URL + "/functions/v1/tourney"
s, b, _ = rest("POST", "tournaments", tok_h, {"family_id": "zztest", "name": "x", "date": "2030-01-01", "players": ["z1", "z2"], "games": []}); check("no phone can write a tournament directly", s >= 400, (s, b))
s, b, _ = call("POST", TN, {"action": "new", "date": "2030-01-01", "players": ["z2"], "games": [{"kind": "ttt", "label": "Tic-Tac-Toe"}]}, tok_h); check("a tournament needs at least 2 games", s == 400 and b.get("code") == "games", (s, b))
s, b, _ = call("POST", TN, {"action": "new", "date": "2030-01-01", "players": ["z3"], "games": [{"kind": "ttt", "label": "Tic-Tac-Toe"}, {"kind": "c4", "label": "Connect Four"}]}, tok_h); check("only active family seats can play", s == 403 and b.get("code") == "seats", (s, b))
s, b, _ = call("POST", TN, {"action": "new", "name": "Test Game Night", "date": "2030-01-01", "players": ["z2"], "games": [{"kind": "spades", "label": "Spades"}, {"kind": "other", "label": "Uno at the table"}, {"kind": "trivia", "label": "Trivia Night"}]}, tok_h); tid = ((b or {}).get("tournament") or {}).get("id")
check("the host starts a 3-game tournament with a member", s == 200 and bool(tid) and (b.get("tournament") or {}).get("players") == ["z1", "z2"], (s, b))
s, b, _ = rest("GET", "alerts?select=text&text=like." + quote("*started Test Game Night*"), tok_m); check("the players are told", isinstance(b, list) and len(b) == 1, b)
s, b, _ = call("POST", TN, {"action": "result", "id": tid, "i": 0, "first": ["z9"]}, tok_m); check("only players can be placed", s == 400 and b.get("code") == "placing", (s, b))
s, b, _ = call("POST", TN, {"action": "result", "id": tid, "i": 0, "first": ["z1"], "second": ["z1"]}, tok_m); check("one person can't be 1st and 2nd", s == 400, (s, b))
s, b, _ = call("POST", TN, {"action": "finish", "id": tid}, tok_h); check("no champion before any result", s == 409 and b.get("code") == "no_results", (s, b))
call("POST", TN, {"action": "result", "id": tid, "i": 0, "first": ["z1"], "second": ["z2"]}, tok_m)
call("POST", TN, {"action": "result", "id": tid, "i": 1, "first": ["z2"], "second": ["z1"]}, tok_h)
call("POST", TN, {"action": "result", "id": tid, "i": 2, "first": ["z2"]}, tok_m)
s, b, _ = call("POST", TN, {"action": "finish", "id": tid}, tok_m); check("only the organizer or host crowns the champion", s == 403 and b.get("code") == "not_boss", (s, b))
s, b, _ = call("POST", TN, {"action": "finish", "id": tid}, tok_h); check("the champion is the most points: z2 has 1 + 3 + 3 = 7, z1 has 3 + 1 = 4", s == 200 and b.get("champions") == ["z2"], (s, b))
s, b, _ = rest("GET", "alerts?select=text&text=like." + quote("*champion*"), tok_m); check("everyone hears who won", isinstance(b, list) and any("Zed is the Test Game Night champion" in a["text"] for a in b), b)
s, b, _ = call("POST", TN, {"action": "result", "id": tid, "i": 0, "first": ["z1"]}, tok_h); check("a finished tournament takes no more results", s == 409 and b.get("code") == "over", (s, b))

# Family Recipe Book (his order, 2026-10-18; photos show right away): anyone adds; the author or host changes or removes
RC = URL + "/functions/v1/recipes"
def rc_list(token):
    s2, b2, _ = call("POST", URL + "/storage/v1/object/list/media", {"prefix": "zztest/recipes/", "limit": 1000}, token)
    return [x["name"] for x in b2] if isinstance(b2, list) else []
s, b, _ = rest("POST", "recipes", tok_m, {"family_id": "zztest", "title": "x", "added_by": "z2"}); check("no phone can write a recipe directly", s >= 400, (s, b))
s, b, _ = call("POST", RC, {"action": "save", "title": "  ", "ingredients": ["1 egg"]}, tok_m); check("a recipe needs a name", s == 400 and b.get("code") == "title", (s, b))
s, b, _ = call("POST", RC, {"action": "save", "title": "Nothing in it"}, tok_m); check("a recipe needs ingredients or steps", s == 400 and b.get("code") == "empty", (s, b))
for bad in ("zztest/attack.jpg", "zztest/cards/x.jpg", "clark/recipes/x.jpg", "zztest/recipes/../x.jpg", "zztest/recipes/x.png"):
    s, b, _ = call("POST", RC, {"action": "save", "title": "Bad photo", "ingredients": ["1 egg"], "photo_path": bad}, tok_m)
    check(f"a recipe photo must be in the family's own recipe folder ({bad})", s == 400 and b.get("code") == "photo", (s, b))
s, b, _ = call("POST", RC, {"action": "save", "title": "Paused pie", "ingredients": ["1 egg"]}, tok_p); check("a paused seat cannot add a recipe", s == 403, (s, b))
p1, p2 = f"zztest/recipes/rc{pin_h}{pin_m}a.jpg", f"zztest/recipes/rc{pin_h}{pin_m}b.jpg"
check("a member uploads a recipe photo into the family's recipe folder", upload(p1, tok_m) == 200 and upload(p2, tok_m) == 200)
s, b, _ = call("POST", RC, {"action": "save", "title": "Test Sweet Potato Pie", "credit": "Rosa", "kind": "dessert", "serves": "8", "time": "1 hour",
    "ingredients": ["2 cups sweet potato", "1 stick butter", "", "3 eggs"], "steps": ["Heat the oven to 350F.", "Bake 45 minutes."], "photo_path": p1}, tok_m); rid = (b or {}).get("id")
check("a member adds a recipe with a photo", s == 200 and bool(rid), (s, b))
s, b, _ = rest("GET", "recipes?id=eq." + str(rid) + "&select=title,credit,kind,ingredients,steps,photo_path,added_by,family_id", tok_h); row = (b or [{}])[0]
check("the family reads it at once, blank lines dropped", row.get("title") == "Test Sweet Potato Pie" and row.get("ingredients") == ["2 cups sweet potato", "1 stick butter", "3 eggs"] and row.get("photo_path") == p1 and row.get("added_by") == "z2", row)
s, b, _ = rest("GET", "alerts?select=text&text=like." + quote("*added Test Sweet Potato Pie (Rosa)*"), tok_h); check("the family is told", isinstance(b, list) and len(b) == 1, b)
s, b, _ = rest("GET", "alerts?select=text&text=like." + quote("*added Test Sweet Potato Pie*"), tok_m); check("the person who added it isn't told about their own recipe", b == [], b)
s, b, _ = call("POST", RC, {"action": "save", "title": "Copycat", "ingredients": ["1 egg"], "photo_path": p1}, tok_h); check("one photo can't belong to two recipes", s == 400 and b.get("code") == "photo", (s, b))
s, b, _ = rest("PATCH", "recipes?id=eq." + str(rid), tok_h, {"title": "Changed directly"}, "return=representation"); check("no phone can change a recipe directly", s >= 400 or b == [], (s, b))
s, b, _ = call("POST", RC, {"action": "save", "title": "Host Greens", "ingredients": ["1 bunch collards"]}, tok_h); hid = (b or {}).get("id")
s, b, _ = call("POST", RC, {"action": "save", "id": hid, "title": "Changed by someone else", "ingredients": ["x"]}, tok_m); check("someone else can't change your recipe", s == 403 and b.get("code") == "not_owner", (s, b))
s, b, _ = call("POST", RC, {"action": "remove", "id": hid}, tok_m); check("someone else can't remove your recipe", s == 403 and b.get("code") == "not_owner", (s, b))
s, b, _ = call("POST", RC, {"action": "fav", "id": hid}, tok_m); s2, b2, _ = rest("GET", "recipes?id=eq." + str(hid) + "&select=favorites", tok_h)
check("anyone can star a recipe", b.get("fav") is True and b2 == [{"favorites": ["z2"]}], (b, b2))
s, b, _ = call("POST", RC, {"action": "fav", "id": hid}, tok_m); s2, b2, _ = rest("GET", "recipes?id=eq." + str(hid) + "&select=favorites", tok_h)
check("tapping the star again takes it off", b.get("fav") is False and b2 == [{"favorites": []}], (b, b2))
s, b, _ = call("POST", RC, {"action": "save", "id": rid, "title": "Test Sweet Potato Pie", "ingredients": ["2 cups sweet potato"], "photo_path": p2}, tok_m); names = rc_list(tok_m)
check("a new photo replaces the old one, and the old file is gone", s == 200 and p2.split("/")[-1] in names and p1.split("/")[-1] not in names, (s, b, names))
s, b, _ = call("POST", RC, {"action": "save", "id": rid, "title": "Test Sweet Potato Pie", "ingredients": ["2 cups sweet potato"], "steps": ["Bake it."]}, tok_m); s2, b2, _ = rest("GET", "recipes?id=eq." + str(rid) + "&select=photo_path,steps", tok_h)
check("saving without naming a photo keeps the photo", b2 == [{"photo_path": p2, "steps": ["Bake it."]}], b2)
s, b, _ = call("POST", RC, {"action": "save", "id": hid, "title": "Host Greens", "ingredients": ["2 bunches collards"]}, tok_h); check("the host changes their own recipe", s == 200, (s, b))
s, b, _ = call("POST", RC, {"action": "remove", "id": rid}, tok_h); s2, b2, _ = rest("GET", "recipes?id=eq." + str(rid) + "&select=id", tok_m)
check("the host can remove any recipe, and its photo goes with it", s == 200 and b2 == [] and p2.split("/")[-1] not in rc_list(tok_m), (s, b2, rc_list(tok_m)))
call("POST", RC, {"action": "remove", "id": hid}, tok_h)
s, b, _ = rest("GET", "recipes?select=family_id", tok_m); check("a test seat sees no other family's recipes", isinstance(b, list) and all(r["family_id"] == "zztest" for r in b), b)
for n in rc_list(tok_m):
    req = urllib.request.Request(URL + "/storage/v1/object/media/zztest/recipes/" + n, method="DELETE", headers={"apikey": ANON, "Authorization": "Bearer " + tok_h})
    try: urllib.request.urlopen(req, timeout=30)
    except urllib.error.HTTPError: pass
check("the test family's recipe photos are cleaned up", rc_list(tok_m) == [], rc_list(tok_m))

# Rides (his order, 2026-10-18): "I can drive 3" / "I need a ride", matched up; the pickup address goes only to the driver
RD = URL + "/functions/v1/rides"
for z in ("z3", "z4"): rest("PATCH", "members?id=eq." + z, tok_h, {"status": "active"}, "return=representation")
rest("POST", "events", tok_h, {"id": "zz-ride", "family_id": "zztest", "type": "sunday", "mode": "host", "host": "z1", "date": "2030-04-07", "time": "17:00", "chosen": "gus", "status": "set", "excluded": ["z4"]})
rest("POST", "events", tok_h, {"id": "zz-ride-old", "family_id": "zztest", "type": "sunday", "mode": "host", "host": "z1", "date": "2020-04-05", "time": "17:00", "chosen": "gus", "status": "set"})
P = {"kind": "dinner", "ref": "zz-ride"}
def asks():
    s2, b2, _ = rest("GET", "ride_asks?kind=eq.dinner&ref_id=eq.zz-ride&select=id,rider,party,driver,declined&order=rider", tok_h); return {a["rider"]: a for a in (b2 or [])}
s, b, _ = rest("POST", "ride_offers", tok_h, {"family_id": "zztest", "kind": "dinner", "ref_id": "zz-ride", "driver": "z1", "seats": 7}); check("no phone can write a ride directly", s >= 400, (s, b))
s, b, _ = call("POST", RD, {"action": "offer", **P, "seats": 0}, tok_h); check("a driver offers 1 to 7 seats", s == 400 and b.get("code") == "seats", (s, b))
s, b, _ = call("POST", RD, {"action": "offer", **P, "seats": 1, "leaving": "4:30 PM"}, tok_h); check("the host offers to drive 1", s == 200, (s, b))
s, b, _ = call("POST", RD, {"action": "ask", **P, "party": 1, "address": "x"}, tok_m); check("a ride needs a pickup address", s == 400 and b.get("code") == "address", (s, b))
s, b, _ = call("POST", RD, {"action": "ask", **P, "party": 1, "address": "100 Test Lane, Memphis", "details": "Blue door"}, tok_m); zid = (b or {}).get("id")
check("a member asks for a ride and is matched at once; the reply names the driver", s == 200 and b.get("driver") == "z1" and asks().get("z2", {}).get("driver") == "z1", (s, b, asks()))
s, b, _ = rest("GET", "alerts?select=text&text=like." + quote("*driving Zed to the family dinner*"), tok_h); check("the driver is told, with no address on the lock screen", isinstance(b, list) and len(b) == 1 and "Test Lane" not in b[0]["text"], b)
s, b, _ = rest("GET", "ride_pickups?select=*", tok_h); check("no phone can read the pickup addresses", s >= 400 or b == [], (s, b))
s, b, _ = call("POST", RD, {"action": "pickup", "id": zid}, tok_h); check("the driver gets the pickup address", b.get("address") == "100 Test Lane, Memphis" and b.get("details") == "Blue door", (s, b))
s, b, _ = call("POST", RD, {"action": "pickup", "id": zid}, tok_3); check("nobody else gets it", s == 403, (s, b))
s, b, _ = call("POST", RD, {"action": "ask", **P, "party": 1, "address": "1 Host Way"}, tok_h); check("a driver can't also ask for a ride", s == 409 and b.get("code") == "both", (s, b))
s, b, _ = call("POST", RD, {"action": "ask", **P, "party": 1, "address": "4 Left Out Rd"}, tok_4); check("someone left off the dinner can't ride to it", s == 403 and b.get("code") == "not_invited", (s, b))
s, b, _ = rest("GET", "ride_asks?kind=eq.dinner&ref_id=eq.zz-ride&select=rider", tok_4); check("someone left off the dinner can't see its rides", b == [], b)
s, b, _ = call("POST", RD, {"action": "ask", "kind": "dinner", "ref": "zz-ride-old", "party": 1, "address": "1 Late Ln"}, tok_m); check("no rides to a dinner whose day has passed", s == 409 and b.get("code") == "over", (s, b))
s, b, _ = call("POST", RD, {"action": "ask", **P, "party": 2, "address": "300 Third St"}, tok_3); a3 = asks().get("z3", {})
check("a party of 2 waits when the car has no room (a party is never split)", s == 200 and a3.get("driver") is None, a3)
s, b, _ = call("POST", RD, {"action": "take", "id": a3.get("id")}, tok_h); check("the database refuses to overfill a car", s == 409 and b.get("code") == "full", (s, b))
s, b, _ = call("POST", RD, {"action": "offer", **P, "seats": 3}, tok_h); check("more seats: the waiting party is matched", s == 200 and asks().get("z3", {}).get("driver") == "z1", asks())
s, b, _ = rest("GET", "alerts?select=text&text=like." + quote("*Zed is driving you to the family dinner on Sun, Apr 7*"), tok_3); check("a waiting rider is told who is driving", isinstance(b, list) and len(b) == 1, b)
s, b, _ = call("POST", RD, {"action": "offer", **P, "seats": 2}, tok_h); check("a driver can't cut seats below who is riding", s == 409 and b.get("code") == "seats_taken", (s, b))
s, b, _ = call("POST", RD, {"action": "release", "id": a3.get("id")}, tok_m); check("only the driver can let a rider go", s == 403, (s, b))
s, b, _ = call("POST", RD, {"action": "release", "id": a3.get("id")}, tok_h); a3 = asks().get("z3", {})
check("a driver lets a rider go, and is never matched back to them", s == 200 and a3.get("driver") is None and a3.get("declined") == ["z1"], a3)
s, b, _ = rest("GET", "alerts?select=text&text=like." + quote("*can't take you to*"), tok_3); check("the rider who was let go is told", isinstance(b, list) and len(b) == 1, b)
s, b, _ = call("POST", RD, {"action": "take", "id": a3.get("id")}, tok_h); check("a driver may still choose to take them", s == 200 and asks().get("z3", {}).get("driver") == "z1", (s, b))
s, b, _ = call("POST", RD, {"action": "unoffer", **P}, tok_h); A = asks()
check("a driver who can't go puts their riders back on the list", s == 200 and A["z2"]["driver"] is None and A["z3"]["driver"] is None, A)
s, b, _ = call("POST", RD, {"action": "unask", **P}, tok_3); s, b, _ = call("POST", RD, {"action": "pickup", "id": a3.get("id")}, tok_3); check("a rider takes their ask down, address and all", s == 404, (s, b))
# two riders tap at the same moment for the last seat: exactly one gets it
import threading as _th
call("POST", RD, {"action": "unask", **P}, tok_m)
call("POST", RD, {"action": "offer", **P, "seats": 1}, tok_h)
_res = []
def _ask(tok, addr): _res.append(call("POST", RD, {"action": "ask", **P, "party": 1, "address": addr}, tok)[0])
_t = [_th.Thread(target=_ask, args=(tok_m, "1 Race St")), _th.Thread(target=_ask, args=(tok_3, "2 Race St"))]
[t.start() for t in _t]; [t.join() for t in _t]; A = asks()
check("two riders at once for one seat: exactly one is matched", _res == [200, 200] and sorted(x["driver"] or "" for x in A.values()) == ["", "z1"], (_res, A))
s, b, _ = call("POST", RD, {"action": "last"}, tok_m); s2, b2, _ = call("POST", RD, {"action": "last"}, tok_4)
check("a rider's last pickup address fills in for them, and for nobody else", b.get("address") == "1 Race St" and b2.get("address") == "", (b, b2))
rest("DELETE", "events?id=eq.zz-ride", tok_h); rest("POST", "events", tok_h, {"id": "zz-ride", "family_id": "zztest", "type": "sunday", "mode": "host", "host": "z1", "date": "2030-04-07", "time": "17:00", "status": "set"})
check("a ride goes when its dinner goes", asks() == {}, asks())
rest("DELETE", "events?id=in.(zz-ride,zz-ride-old)", tok_h)
# --- Memphis Live (his order, 2026-10-22): what's on in Memphis, and "Who's in?" ---
LV = URL + "/functions/v1/live"; DT = URL + "/functions/v1/dates"
s, b, _ = call("POST", LV, {"action": "refresh"}, tok_m); check("any seat can ask for the event list to be brought up to date", s == 200 and b.get("ok"), (s, b))
s, b, _ = rest("GET", "live_events?select=id,title,venue,starts_at,ticket_url&order=starts_at&starts_at=gt." + quote(_time.strftime("%Y-%m-%dT%H:%M:%SZ", _time.gmtime(_time.time() + 3600))), tok_m)
check("a signed-in seat reads the shared event list (real shows, with their ticket links)", s == 200 and isinstance(b, list) and len(b) >= 5 and any(e["ticket_url"].startswith("https://") for e in b), (s, str(b)[:200]))
s2, b2, _ = rest("GET", "live_events?select=id", None); check("someone signed out reads no events", not (isinstance(b2, list) and b2), (s2, str(b2)[:100]))
evx = b[0] if isinstance(b, list) and b else {}
s, b, _ = call("POST", LV, {"action": "ask", "event_id": evx.get("id"), "note": "Proof: who's in?"}, tok_m); ask_id = b.get("id")
check("Who's in? goes up", s == 200 and ask_id and not b.get("already"), (s, b))
s, b, _ = call("POST", LV, {"action": "ask", "event_id": evx.get("id")}, tok_3); check("asking about the same show again joins the same question (no second question)", b.get("id") == ask_id and b.get("already"), b)
s, b, _ = call("POST", LV, {"action": "ask", "event_id": "gpac:no-such-show"}, tok_m); check("a show that isn't listed can't be asked about", s == 404 and b.get("code") == "no_event", (s, b))
s, b, _ = rest("GET", "alerts?select=to_member,text&text=like." + quote("*Are you in?*"), tok_h); check("the family is asked (the host's bell rings)", isinstance(b, list) and len(b) == 1 and "Proof: who" in b[0]["text"], b)
s, b, _ = call("POST", LV, {"action": "answer", "ask_id": ask_id, "answer": "yes", "picks": [evx.get("id"), "gpac:not-this-show"], "note": "Count me in"}, tok_h)
s2, b2, _ = rest("GET", "live_answers?select=picks&member_id=eq.z1", tok_h); check("an answer keeps only real dates of that same show", s == 200 and b2 == [{"picks": [evx.get("id")]}], (s, b, b2))
s, b, _ = call("POST", LV, {"action": "answer", "ask_id": ask_id, "answer": "no", "picks": [evx.get("id")]}, tok_3)
s2, b2, _ = rest("GET", "live_answers?select=answer,picks&member_id=eq.z3", tok_3); check("a No carries no dates", b2 == [{"answer": "no", "picks": []}], b2)
s, b, _ = call("POST", LV, {"action": "answer", "ask_id": ask_id, "answer": "sure"}, tok_3); check("only Yes, Maybe or No", s == 400, (s, b))
s, b, _ = rest("GET", "alerts?select=text&text=like." + quote("*Count me in*"), tok_m); check("the asker is told each answer", isinstance(b, list) and len(b) == 1, b)
s, b, _ = rest("POST", "live_asks", tok_m, {"family_id": "zztest", "event_id": "x", "title": "x", "starts_at": "2030-01-01T00:00:00Z", "by_member": "z2"}); check("a phone can't write a question itself", s in (401, 403), (s, b))
s, b, _ = rest("PATCH", "live_answers?member_id=eq.z1", tok_m, {"answer": "no"}, "return=representation"); check("a phone can't change someone's answer", s in (401, 403) or b == [], (s, b))
s, b, _ = rest("GET", "live_sync?select=*", tok_h); check("the source log is not readable from a phone", s in (401, 403), (s, b))
s, b, _ = call("POST", LV, {"action": "status"}, tok_m); check("only the host sees where the list comes from", s == 403, (s, b))
s, b, _ = call("POST", LV, {"action": "status"}, tok_h); check("the host sees each source, and whether Ticketmaster is on", s == 200 and {x["source"] for x in b.get("sources", [])} >= {"gpac", "shell", "overton"} and "ticketmaster" in b, b)
s, b, _ = call("POST", LV, {"action": "unask", "ask_id": ask_id}, tok_3); check("only the asker or the host takes a question down", s == 403, (s, b))
s, b, _ = call("POST", LV, {"action": "unask", "ask_id": ask_id}, tok_h); s2, b2, _ = rest("GET", "live_answers?select=member_id", tok_h)
check("the host takes it down, answers and all", s == 200 and b2 == [], (s, b, b2))

# --- Date Night and Adventure Club: a date is between two people, and nobody else sees it ---
soon = _time.strftime("%Y-%m-%d", _time.localtime(_time.time() + 9 * 86400))
s, b, _ = call("POST", DT, {"action": "plan", "kind": "couple", "partner": "z3", "title": "Proof date", "date": soon, "time": "6:30 PM", "stops": [{"place": "Tom Lee Park", "time": "6:30 PM"}, {"place": "Gus's", "rid": "gus", "time": "8:00 PM"}]}, tok_m); did = b.get("id")
check("a date night is planned", s == 200 and did, (s, b))
s, b, _ = rest("GET", "dates?select=id", tok_h); check("the host can't see a date between two other people", b == [], b)
s, b, _ = rest("GET", "dates?select=id,stops", tok_3); check("the person invited sees it, stops and all", isinstance(b, list) and len(b) == 1 and len(b[0]["stops"]) == 2, b)
s, b, _ = rest("GET", "alerts?select=text&text=like." + quote("*planned a Date Night for the two of you*"), tok_3); check("they're asked", isinstance(b, list) and len(b) == 1, b)
s, b, _ = call("POST", DT, {"action": "reply", "id": did, "answer": "yes"}, tok_h); check("nobody outside the date can answer it", s == 404, (s, b))
s, b, _ = call("POST", DT, {"action": "move", "id": did, "date": soon}, tok_3); check("only the planner moves the day", s == 403, (s, b))
s, b, _ = call("POST", DT, {"action": "done", "id": did}, tok_3); check("it can't be marked done before a yes", b.get("code") == "not_yes", b)
s, b, _ = call("POST", DT, {"action": "reply", "id": did, "answer": "yes"}, tok_3); check("they say yes", s == 200, (s, b))
s, b, _ = call("POST", DT, {"action": "done", "id": did}, tok_3); check("it can't be marked done before its day", b.get("code") == "early", b)
s, b, _ = call("POST", DT, {"action": "plan", "kind": "kids", "partner": "z2", "title": "x", "date": soon, "stops": [{"place": "Memphis Zoo"}]}, tok_m); check("nobody plans a date with themselves", b.get("code") == "partner", b)
s, b, _ = call("POST", DT, {"action": "plan", "kind": "kids", "partner": "z1", "title": "x", "date": "2020-01-01", "stops": [{"place": "Memphis Zoo"}]}, tok_m); check("nobody plans a date in the past", b.get("code") == "date", b)
s, b, _ = rest("POST", "dates", tok_m, {"family_id": "zztest", "kind": "couple", "created_by": "z2", "partner": "z1", "title": "x", "date": soon}); check("a phone can't write a date itself", s in (401, 403), (s, b))
s, b, _ = call("POST", DT, {"action": "cancel", "id": did}, tok_m); s2, b2, _ = call("POST", DT, {"action": "cancel", "id": did}, tok_m)
check("either of the two calls it off, once", s == 200 and b2.get("code") == "closed", (b, b2))

# --- Pick who (his order, 2026-10-22: "always an option to send to individual members and not everybody") ---
# Memphis Live: ask only the people picked
evy = (b0 := rest("GET", "live_events?select=id&order=starts_at&limit=1&offset=3&starts_at=gt." + quote(_time.strftime("%Y-%m-%dT%H:%M:%SZ", _time.gmtime(_time.time() + 3600))), tok_m)[1]) and b0[0]["id"]
s, b, _ = call("POST", LV, {"action": "ask", "event_id": evy, "invited": ["z1"]}, tok_m); ask2 = b.get("id"); check("Who's in? can ask one person", s == 200 and ask2, (s, b))
s, b, _ = rest("GET", "live_asks?select=id,invited&id=eq." + str(ask2), tok_h); check("only the asker and the person picked are on it", isinstance(b, list) and len(b) == 1 and sorted(b[0]["invited"]) == ["z1", "z2"], b)
s, b, _ = rest("GET", "live_asks?select=id&id=eq." + str(ask2), tok_3); check("someone not asked doesn't see the question", b == [], b)
s, b, _ = rest("GET", "alerts?select=text&to_member=eq.z3&text=like." + quote("*Are you in?*"), tok_3); n3 = len(b) if isinstance(b, list) else -1
s, b, _ = call("POST", LV, {"action": "answer", "ask_id": ask2, "answer": "yes"}, tok_3); check("someone not asked can't answer it", s == 404, (s, b))
s, b, _ = call("POST", LV, {"action": "ask", "event_id": evy, "invited": []}, tok_m); s, b, _ = call("POST", LV, {"action": "ask", "event_id": evy, "invited": ["nobody-here"]}, tok_m)
check("asking nobody is refused (a question needs someone to answer it)", b.get("code") == "nobody" or b.get("already"), b)
s, b, _ = call("POST", LV, {"action": "ask", "event_id": evy}, tok_3); s2, b2, _ = rest("GET", "live_asks?select=invited&id=eq." + str(ask2), tok_3)
check("someone not asked who taps Who's in? on the same show joins it (just them)", b.get("id") == ask2 and isinstance(b2, list) and sorted(b2[0]["invited"]) == ["z1", "z2", "z3"], (b, b2))
evy_title = (rest("GET", "live_events?select=title&id=eq." + quote(str(evy)), tok_m)[1] or [{}])[0].get("title", "")
s, b, _ = rest("GET", "alerts?select=text&text=like." + quote("*is in for " + evy_title + " too*"), tok_m); check("the asker is told they joined", isinstance(b, list) and len(b) == 1 and evy_title, (evy_title, b))
call("POST", LV, {"action": "unask", "ask_id": ask2}, tok_m)
# family dinners: the planner chooses who's invited before it goes out
s, b, _ = rest("POST", "events", tok_m, {"id": "zz-pick", "family_id": "zztest", "type": "personal", "mode": "host", "host": "z2", "date": "2030-05-05", "time": "18:00", "chosen": "gus", "status": "set", "excluded": ["z3", "z2", "nobody"]}, "return=representation")
check("a member's own invitation keeps the people they left out (never themselves, only real seats)", s in (200, 201) and isinstance(b, list) and b and b[0]["excluded"] == ["z3"], (s, b))
s, b, _ = rest("GET", "events?select=id&id=eq.zz-pick", tok_3); check("someone left out can't see it", b == [], b)
s, b, _ = rest("POST", "alerts", tok_m, [{"to_member": "z3", "text": "pick-test", "event_id": "zz-pick"}, {"to_member": "z1", "text": "pick-test", "event_id": "zz-pick"}])
s, b, _ = rest("GET", "alerts?select=to_member&text=eq.pick-test", tok_h); s2, b2, _ = rest("GET", "alerts?select=to_member&text=eq.pick-test", tok_3)
check("someone left out gets no alert for it; someone invited does", isinstance(b, list) and [x["to_member"] for x in b] == ["z1"] and b2 == [], (b, b2))
s, b, _ = rest("PATCH", "events?id=eq.zz-pick", tok_m, {"excluded": ["z2"]}, "return=representation"); check("the planner can't leave themselves off", s >= 400, (s, b))
s, b, _ = rest("PATCH", "events?id=eq.zz-pick", tok_m, {"excluded": []}, "return=representation"); check("the planner can put someone back", s == 200 and b and b[0]["excluded"] == [], (s, b))
s, b, _ = rest("PATCH", "events?id=eq.zz-pick", tok_3, {"excluded": ["z1"]}, "return=representation"); check("someone else can't change who's invited", s >= 400 or b == [], (s, b))
s, b, _ = rest("PATCH", "events?id=eq.zz-pick", tok_h, {"excluded": ["z3"]}, "return=representation"); check("the host still can", s == 200 and b and b[0]["excluded"] == ["z3"], (s, b))
rest("DELETE", "events?id=eq.zz-pick", tok_h)

# --- Netflix & Chill and Big Game Night watch parties (his order, 2026-10-22) ---
WT = URL + "/functions/v1/watch"
s, b, _ = call("POST", WT, {"action": "netflix", "kind": "movie"}, tok_m); check("Netflix & Chill lists real Netflix titles with posters", s == 200 and len(b.get("items", [])) >= 5 and all(x["poster"].startswith("https://image.tmdb.org/") for x in b["items"]), (s, str(b)[:200]))
s, b, _ = call("POST", WT, {"action": "logos"}, tok_m); check("the networks' logos are there for the game cards (NBC, ESPN, Prime Video, Netflix)", s == 200 and all(k in b.get("logos", {}) for k in ("NBC", "ESPN", "Amazon Prime Video", "Netflix")), (s, list(b.get("logos", {}))[:10]))
wday = _time.strftime("%Y-%m-%d", _time.localtime(_time.time() + 3 * 86400))
s, b, _ = call("POST", WT, {"action": "new", "kind": "game", "ref": "401", "title": "Chiefs at Seahawks", "info": {"slot": "Sunday Night Football", "networks": ["NBC"], "home": {"short": "Seahawks", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/sea.png"}, "away": {"short": "Chiefs", "logo": "javascript:alert(1)"}},
  "date": wday, "time": "6:50 PM", "at_member": "z2", "invited": ["z1"], "needs": ["Wings", "Pizza", "wings"], "note": "Wear red"}, tok_m); pid = (b.get("party") or {}).get("id")
check("a watch party at my house, inviting one person", s == 200 and pid, (s, b))
s, b, _ = rest("GET", "watch_parties?select=invited,needs,info&id=eq." + str(pid), tok_m)
check("only me and the person picked are invited; “wings” twice is one item on the list", isinstance(b, list) and b and sorted(b[0]["invited"]) == ["z1", "z2"] and b[0]["needs"] == ["Wings", "Pizza"], b)
check("a logo that isn't an https link is dropped", isinstance(b, list) and b and b[0]["info"]["away"]["logo"] == "" and b[0]["info"]["home"]["logo"].startswith("https://"), b)
s, b, _ = rest("GET", "watch_parties?select=id&id=eq." + str(pid), tok_3); check("someone not invited can't see it", b == [], b)
s, b, _ = call("POST", WT, {"action": "rsvp", "id": pid, "ans": "yes"}, tok_3); check("someone not invited can't answer it", s == 404, (s, b))
s, b, _ = call("POST", WT, {"action": "rsvp", "id": pid, "ans": "yes"}, tok_h); check("the person invited says they're coming", s == 200, (s, b))
s, b, _ = call("POST", WT, {"action": "bring", "id": pid, "item": "Wings", "on": True}, tok_h); check("they sign up to bring the wings", s == 200, (s, b))
s, b, _ = call("POST", WT, {"action": "bring", "id": pid, "item": "wings", "on": True}, tok_m); check("nobody else can take the wings once someone's bringing them", b.get("code") == "taken", b)
s, b, _ = rest("GET", "alerts?select=text&text=like." + quote("*is bringing Wings*"), tok_m); check("the planner is told who's bringing what", isinstance(b, list) and len(b) == 1, b)
s, b, _ = rest("GET", "alerts?select=text&text=like." + quote("*invited you to watch Chiefs at Seahawks at Zed's house*"), tok_h); check("the person invited was told whose house and when", isinstance(b, list) and len(b) == 1, b)
s, b, _ = call("POST", WT, {"action": "invite", "id": pid, "invited": ["z3"]}, tok_h); check("only the planner (or the host) changes who's invited", s == 200, (s, b))
s, b, _ = call("POST", WT, {"action": "invite", "id": pid, "invited": ["z3"]}, tok_3); check("someone else can't change who's invited", s in (403, 404), (s, b))
s, b, _ = rest("GET", "watch_parties?select=id&id=eq." + str(pid), tok_3); check("someone added can now see it", isinstance(b, list) and len(b) == 1, b)
s, b, _ = rest("POST", "watch_parties", tok_m, {"family_id": "zztest", "kind": "game", "title": "x", "date": wday, "at_member": "z2", "created_by": "z2"}); check("a phone can't write a watch party itself", s in (401, 403), (s, b))
s, b, _ = call("POST", WT, {"action": "new", "kind": "netflix", "title": "x", "date": "2020-01-01", "at_member": "z2", "invited": ["z1"]}, tok_m); check("no watch party in the past", b.get("code") == "date", b)
s, b, _ = call("POST", WT, {"action": "new", "kind": "netflix", "title": "x", "date": wday, "at_member": "nobody", "invited": ["z1"]}, tok_m); check("whose house must be a real seat", b.get("code") == "house", b)
s, b, _ = call("POST", WT, {"action": "cancel", "id": pid}, tok_m); s2, b2, _ = call("POST", WT, {"action": "rsvp", "id": pid, "ans": "no"}, tok_h)
check("the planner calls it off, and it's closed", s == 200 and b2.get("code") == "cancelled", (b, b2))

# --- 8.3 (his order, 2026-10-23) ---
RPC = lambda fn, tok, args=None: call("POST", URL + "/rest/v1/rpc/" + fn, args or {}, tok)
ML, HG, GA, FA = (URL + "/functions/v1/" + f for f in ("mail", "hangouts", "getaways", "family"))
# Family Mail: only the sender and the people it was sent to; the host can't read anyone else's
s, b, _ = call("POST", ML, {"action": "send", "to": ["z1"], "kind": "request", "subject": "Can you bring chairs?", "body": "For Sunday, six chairs please."}, tok_m); mreq = b.get("id")
check("a private request goes to just the one person picked", s == 200 and b.get("sent") == 1 and mreq, (s, b))
s, b, _ = rest("GET", "mail?select=id&id=eq." + str(mreq), tok_3); check("someone it wasn't sent to can't read it", b == [], b)
s, b, _ = rest("GET", "mail?select=body&id=eq." + str(mreq), tok_h); check("the person it was sent to can read it", isinstance(b, list) and len(b) == 1, b)
s, b, _ = rest("GET", "alerts?select=text&text=like." + quote("*sent you a private request*"), tok_h)
check("their lock screen says who it's from, never the words", isinstance(b, list) and len(b) == 1 and "chairs" not in b[0]["text"], b)
s, b, _ = call("POST", ML, {"action": "send", "to": ["z3"], "kind": "note", "body": "Just between us."}, tok_m); mnote = b.get("id")
s, b, _ = rest("GET", "mail?select=id&id=eq." + str(mnote), tok_h); check("not even the host can read mail between two other people", s == 200 and b == [], b)
s, b, _ = call("POST", ML, {"action": "answer", "id": mreq, "ans": "yes", "note": "Bringing six."}, tok_3); check("someone it wasn't sent to can't answer it", b.get("code") == "no_mail", b)
s, b, _ = call("POST", ML, {"action": "answer", "id": mreq, "ans": "yes", "note": "Bringing six."}, tok_h); check("the person asked answers Yes with a note", s == 200 and b.get("ok"), (s, b))
s, b, _ = rest("GET", "alerts?select=text&text=like." + quote("*answered your request*"), tok_m); check("the sender is told the answer", isinstance(b, list) and len(b) == 1 and "Yes" in b[0]["text"], b)
s, b, _ = rest("GET", "mail_box?select=answer,answer_note,read_at&mail_id=eq." + str(mreq), tok_m)
check("the sender sees the answer, the note and that it was read", isinstance(b, list) and b and b[0]["answer"] == "yes" and b[0]["answer_note"] == "Bringing six." and b[0]["read_at"], b)
s, b, _ = call("POST", ML, {"action": "send", "to": ["z3"], "kind": "note", "body": "Butting in", "thread": mnote}, tok_h); check("nobody can reply into a conversation they're not in", b.get("code") == "no_mail", b)
s, b, _ = call("POST", ML, {"action": "send", "to": ["y1"], "kind": "note", "body": "Hello other family"}, tok_m); check("mail can't go to another family", b.get("code") == "not_family", b)
s, b, _ = rest("POST", "mail", tok_m, {"family_id": "zztest", "from_member": "z2", "to_members": ["z1"], "body": "x"}); check("a phone can't write mail itself", s in (401, 403), (s, b))
s, b, _ = call("POST", ML, {"action": "send", "to": [], "body": "to nobody"}, tok_m); check("mail needs someone to go to", b.get("code") == "nobody", b)
# Hangouts: a few people, after something; a link for someone outside the app
hday = _time.strftime("%Y-%m-%d", _time.localtime(_time.time() + 2 * 86400))
s, b, _ = call("POST", HG, {"action": "new", "title": "Late wings", "place": {"name": "Central BBQ", "address": "2249 Central Ave, Memphis, TN", "menu": "javascript:alert(1)"}, "date": hday, "time": "9:30 PM",
  "dress": "Casual", "cost_pp": 18, "invited": ["z2"], "after_of": {"kind": "watch", "id": "x", "title": "the game"}, "outside": True}, tok_h); hid, hlink = b.get("id"), b.get("link") or ""
check("a hangout after the game, for one person, with an outside link", s == 200 and hid and hlink.startswith("https://table-of-8.netlify.app/invite.html?t="), (s, b))
htok = hlink.split("t=")[-1]
s, b, _ = rest("GET", "hangouts?select=place,after_of&id=eq." + str(hid), tok_m); check("the person invited sees it, and a menu link that isn't https is dropped", isinstance(b, list) and b and b[0]["place"]["menu"] == "" and b[0]["after_of"]["title"] == "the game", b)
s, b, _ = rest("GET", "hangouts?select=id&id=eq." + str(hid), tok_3); check("someone not invited can't see it", b == [], b)
s, b, _ = call("POST", HG, {"action": "rsvp", "id": hid, "ans": "yes"}, tok_3); check("someone not invited can't answer it", b.get("code") == "not_invited", b)
s, b, _ = rest("GET", "alerts?select=text&text=like." + quote("*After the game: Zed invited you to Late wings*"), tok_m); check("the person invited is told what it's after", isinstance(b, list) and len(b) == 1, b)
s, b, _ = call("POST", HG, {"action": "public_get", "t": htok}, headers={"Origin": "https://table-of-8.netlify.app"})
check("the invite page shows place, day, time, dress and cost, and nothing about the family", b.get("ok") and b.get("title") == "Late wings" and b.get("from") == "Zed" and b.get("dress") == "Casual" and float(b.get("cost_pp")) == 18
  and not any(k in b for k in ("invited", "family_id", "created_by", "id")), b)
s, b, _ = call("POST", HG, {"action": "public_get", "t": "x" * 24}); check("a made-up link shows nothing", b.get("code") == "link", b)
s, b, _ = call("POST", HG, {"action": "public_reply", "t": htok, "name": "Pat", "ans": "yes", "note": "Save me a seat"}); check("someone outside the app answers Yes by the link", b.get("ok"), b)
s, b, _ = rest("GET", "alerts?select=text&text=like." + quote("*Pat said yes*"), tok_h); check("the planner is told who answered through the link", isinstance(b, list) and len(b) == 1, b)
s, b, _ = call("POST", HG, {"action": "eta", "id": hid, "plan": "9:45 PM"}, tok_m); check("an arrival time is saved", s == 200, (s, b))
s, b, _ = call("POST", HG, {"action": "eta", "id": hid, "plan": "soonish"}, tok_m); check("an arrival time has to be a time", b.get("code") == "eta", b)
s, b, _ = call("POST", HG, {"action": "eta", "id": hid, "way": 15}, tok_m); check("on my way, 15 minutes", s == 200, (s, b))
s, b, _ = rest("GET", "hangout_people?select=plan_at,way_min,way_at&member_id=eq.z2&hangout_id=eq." + str(hid), tok_h)
check("everyone sees when they'll get there", isinstance(b, list) and b and b[0]["plan_at"] == "9:45 PM" and b[0]["way_min"] == 15 and b[0]["way_at"], b)
s, b, _ = rest("GET", "alerts?select=text&text=like." + quote("*on the way to Late wings, about 15 min*"), tok_h); check("the planner is told they're on the way", isinstance(b, list) and len(b) == 1, b)
s, b, _ = call("POST", HG, {"action": "share", "id": hid, "on": False}, tok_h); s2, b2, _ = call("POST", HG, {"action": "public_get", "t": htok})
check("the planner turns the link off, and it stops working", b.get("ok") and b2.get("code") == "link", (b, b2))
s, b, _ = call("POST", HG, {"action": "new", "title": "x", "place": {"name": "y"}, "date": "2020-01-01", "invited": ["z2"]}, tok_h); check("no hangout in the past", b.get("code") == "date", b)
s, b, _ = call("POST", HG, {"action": "new", "title": "x", "place": {"name": "y"}, "date": hday, "invited": []}, tok_h); check("a hangout needs someone (or an outside link)", b.get("code") == "nobody", b)
s, b, _ = rest("POST", "hangouts", tok_h, {"family_id": "zztest", "created_by": "z1", "title": "x", "date": hday}); check("a phone can't write a hangout itself", s in (401, 403), (s, b))
s, b, _ = call("POST", HG, {"action": "cancel", "id": hid}, tok_m); check("only the planner or the host calls it off", b.get("code") == "not_yours", b)
s, b, _ = call("POST", HG, {"action": "cancel", "id": hid}, tok_h); check("the planner calls it off", b.get("ok"), b)
# Watch parties: when each person will get there, and the house's address
s, b, _ = call("POST", WT, {"action": "new", "kind": "netflix", "title": "Movie night", "date": wday, "time": "7:00 PM", "at_member": "z2", "invited": ["z1"], "needs": ["Popcorn"], "address": "1 Test St, Memphis"}, tok_m); wp2 = (b.get("party") or {}).get("id")
s, b, _ = call("POST", WT, {"action": "eta", "id": wp2, "way": 10}, tok_h); check("a guest taps 🚗 10 min", s == 200, (s, b))
s, b, _ = rest("GET", "alerts?select=text&text=like." + quote("*on the way to Movie night, about 10 min*"), tok_m); check("the house is told they're on the way", isinstance(b, list) and len(b) == 1, b)
s, b, _ = call("POST", WT, {"action": "eta", "id": wp2, "here": True}, tok_h); s2, b2, _ = rest("GET", "watch_people?select=here_at,way_min&member_id=eq.z1&party_id=eq." + str(wp2), tok_m)
check("📍 I'm here shows on the list", isinstance(b2, list) and b2 and b2[0]["here_at"] and b2[0]["way_min"] is None, b2)
s, b, _ = call("POST", WT, {"action": "address", "id": wp2, "address": "Somewhere else"}, tok_h)
s2, b2, _ = rest("GET", "watch_parties?select=address&id=eq." + str(wp2), tok_m); check("the host can fix the address; everyone reads it for directions", b.get("ok") and b2 and b2[0]["address"] == "Somewhere else", (b, b2))
call("POST", WT, {"action": "cancel", "id": wp2}, tok_m)
# Getaways
gday = _time.strftime("%Y-%m-%d", _time.localtime(_time.time() + 10 * 86400)); gend = _time.strftime("%Y-%m-%d", _time.localtime(_time.time() + 12 * 86400))
s, b, _ = call("POST", GA, {"action": "events", "city": "Atlanta", "from": gday, "to": gend}, tok_m)
check("Getaways reads Ticketmaster for the trip dates, and nothing outside them", s == 200 and b.get("ok") and all(gday <= e["day"] <= gend for e in b.get("events", [])) and not any(e["title"].lower().endswith(" pass") for e in b.get("events", [])), (s, str(b)[:200]))
plan = {"days": [{"date": gday, "slots": [{"k": "dinner", "n": "Paschal's", "time": "7:00 PM"}]}]}
s, b, _ = call("POST", GA, {"action": "new", "city": "Atlanta", "title": "ATL for two", "start": gday, "nights": 2, "travel": "drive", "tier": "mid", "adults": 2, "kids": 0, "invited": ["z2"], "plan": plan, "estimate": {"low": 900, "high": 1500}}, tok_h); gid = b.get("id")
check("a getaway is saved and one person invited", s == 200 and gid, (s, b))
s, b, _ = rest("GET", "getaways?select=id&id=eq." + str(gid), tok_3); check("someone not invited can't see the getaway", b == [], b)
s, b, _ = rest("GET", "alerts?select=text&text=like." + quote("*invited you on a getaway: ATL for two*"), tok_m); check("the person invited is told", isinstance(b, list) and len(b) == 1, b)
s, b, _ = call("POST", GA, {"action": "rsvp", "id": gid, "ans": "yes"}, tok_m); check("they say they're going", s == 200 and b.get("ok"), (s, b))
s, b, _ = call("POST", GA, {"action": "save", "id": gid, "plan": plan, "estimate": {}}, tok_m); check("only the planner changes the plan", b.get("code") == "not_yours", b)
s, b, _ = call("POST", GA, {"action": "new", "city": "Paris", "start": gday, "nights": 2, "adults": 2, "plan": {}, "estimate": {}}, tok_h); check("only our Getaway cities", b.get("code") == "city", b)
s, b, _ = call("POST", GA, {"action": "new", "city": "Atlanta", "start": gday, "nights": 30, "adults": 2, "plan": {}, "estimate": {}}, tok_h); check("1 to 14 nights", b.get("code") == "nights", b)
s, b, _ = rest("POST", "getaways", tok_h, {"family_id": "zztest", "created_by": "z1", "city": "Atlanta", "title": "x", "start": gday, "nights": 1}); check("a phone can't write a getaway itself", s in (401, 403), (s, b))
s, b, _ = call("POST", GA, {"action": "cancel", "id": gid}, tok_h); check("the planner calls it off", b.get("ok"), b)
# A new family table: anyone can ask; only the owner approves
nem = f"newhost{random.randint(1000, 9999)}@zztest.invalid"
s, b, _ = call("POST", FA, {"action": "request", "family_name": "The Test Table", "name": "Testy Newhost", "email": "not-an-email"}); check("a request needs a real email", b.get("code") == "email", b)
s, b, _ = call("POST", FA, {"action": "request", "family_name": "T", "name": "Testy Newhost", "email": nem}); check("a request needs the table's name", b.get("code") == "family_name", b)
s, b, _ = call("POST", FA, {"action": "request", "family_name": "The Test Table", "name": "Testy Newhost", "email": "z3@zztest.invalid"}, tok_m); check("an email that already has a seat can't start another table", b.get("code") == "email_taken", b)
s, b, _ = call("POST", FA, {"action": "request", "family_name": "The Test Table", "name": "Testy Newhost", "email": nem}, tok_m); check("someone at a table asks for a new family table", b.get("ok") and not b.get("already"), b)
s, b, _ = call("POST", FA, {"action": "request", "family_name": "The Test Table", "name": "Testy Newhost", "email": nem}, tok_m); check("asking twice is one request", b.get("ok") and b.get("already"), b)
s, b, _ = call("POST", FN, {"email": nem, "pin": "1234"}, headers={"Origin": "https://table-of-8.netlify.app"}); check("the new host is told it's waiting for Dr. Clark's OK", b.get("code") == "pending" and b.get("family") == "The Test Table", b)
s, b, _ = rest("GET", "family_requests?select=id", tok_h); check("no phone can read the requests", s in (401, 403) or b == [], (s, b))
for fn, args in (("owner_desk", {}), ("owner_decide", {"p_request": "x", "p_ok": True}), ("owner_new_family", {"p_family": "X", "p_name": "Y Z", "p_email": "q@zztest.invalid"}), ("owner_family_set", {"p_family": "zztest2", "p_on": False})):
    s, b, _ = RPC(fn, tok_h, args); check(f"only the owner can use {fn} (a family's host can't)", isinstance(b, dict) and b.get("code") == "not_owner", (s, b))
# Turning a seat off (only ever the test seats; a second test family stands in for "another family")
s, b, _ = RPC("shut_off", tok_m, {"p_member": "z3", "p_until": None, "p_note": "x"}); check("a member can't turn anyone off", b.get("code") == "not_allowed", b)
s, b, _ = RPC("shut_off", tok_h, {"p_member": "z1", "p_until": None, "p_note": "x"}); check("the host can't turn their own seat off", b.get("code") == "self", b)
s, b, _ = RPC("shut_off", tok_h, {"p_member": "y1", "p_until": None, "p_note": "x"}); check("a host can't turn off a seat at another family's table", b.get("code") == "not_allowed", b)
s, b, _ = rest("PATCH", "members?id=eq.z2", tok_h, {"status": "off"}, "return=representation"); check("a seat can't be turned off by editing it directly (only through Turn off)", s >= 400, (s, b))
s, b, _ = RPC("shut_off", tok_h, {"p_member": "z3", "p_until": None, "p_note": "Let's talk Sunday."}); check("the host turns a seat off, with a message", b.get("ok"), b)
s, b, _ = rest("GET", "members?select=id", tok_3); check("a turned-off seat sees nothing at the table", s in (401, 403) or b == [], (s, b))
s, b, _ = call("POST", WT, {"action": "logos"}, tok_3); check("a turned-off seat can't use the app's roads", s in (401, 403), (s, b))
s, b, _ = signin("Zed Testpaused", pin_p); check("signing in shows the message instead of the table", b.get("code") == "off" and b.get("note") == "Let's talk Sunday." and b.get("until") is None and "session" not in b, b)
s, b, _ = signin("Zed Testpaused", f"{(int(pin_p) + 1) % 10000:04d}"); check("…and only after the right PIN (an email alone never reads the note)", b.get("code") in ("wrong", "locked") and "note" not in b, b)
s, b, _ = rest("GET", "members?select=status&id=eq.z3", tok_h); check("the family sees the seat is off", b and b[0]["status"] == "off", b)
s, b, _ = rest("PATCH", "members?id=eq.z3", tok_h, {"status": "active"}, "return=representation"); check("…and nobody switches it back by editing it directly", s >= 400, (s, b))
s, b, _ = RPC("turn_on", tok_h, {"p_member": "z3"}); s2, b2, _ = signin("Zed Testpaused", pin_p); tok_3 = (b2.get("session") or {}).get("access_token")
check("the host turns it back on and they sign in again", b.get("ok") and b2.get("ok"), (b, b2))
s, b, _ = RPC("shut_off", tok_h, {"p_member": "z3", "p_until": _time.strftime("%Y-%m-%dT%H:%M:%SZ", _time.gmtime(_time.time() + 4)), "p_note": "Four seconds"}); _time.sleep(6)
s2, b2, _ = signin("Zed Testpaused", pin_p); tok_3 = (b2.get("session") or {}).get("access_token")
check("a turn-off for a while ends by itself", b.get("ok") and b2.get("ok"), (b, b2))
s, b, _ = RPC("my_standing", tok_h); check("the host's own standing: on, host, and not the owner", b.get("status") == "active" and b.get("host") is True and b.get("owner") is False, b)

for z in ("z3", "z4"): rest("PATCH", "members?id=eq." + z, tok_h, {"status": "suspended"}, "return=representation")

print(f"\n{fails} FAILED" if fails else "\nALL PROOFS HOLD")
sys.exit(1 if fails else 0)
