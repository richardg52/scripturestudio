// Table of 7 Rides matching (his order, 2026-10-18). ONE copy: the server (functions/rides) matches riders to drivers
// with it, and the app carries the identical text (index.html, between the RIDES RULES markers) to show the seats left.
// tests/rides_match_test.mjs proves both. Every helper carries the "rd" prefix.
//   offers: [{driver, seats, t}]   seats = passengers the driver can take (not counting the driver)
//   asks:   [{id, rider, party, driver, t, declined}]   party = the rider and everyone coming with them;
//           declined = drivers who let this rider go (never matched to them again)
// The oldest ask is matched first, to the driver with the most free seats that fit the WHOLE party (a party is never
// split; ties go to whoever offered first). Nobody is put in their own car, or back in a car that let them go. An ask that fits nowhere waits.
export function rdFree(offers, asks){
  const free = {};
  for(const o of offers) free[o.driver] = o.seats;
  for(const a of asks) if(a.driver && free[a.driver] !== undefined) free[a.driver] -= a.party;
  return free;
}
export function rdMatch(offers, asks){
  const free = rdFree(offers, asks), drivers = [...offers].sort((a, b) => a.t - b.t), plan = [];
  for(const a of asks.filter(x => !x.driver).sort((x, y) => x.t - y.t)){
    let best = null;
    for(const o of drivers){ if(o.driver === a.rider || (a.declined || []).includes(o.driver) || free[o.driver] < a.party) continue; if(!best || free[o.driver] > free[best]) best = o.driver; }
    if(best){ free[best] -= a.party; plan.push({ ask: a.id, driver: best }); }
  }
  return plan;
}
