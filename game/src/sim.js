// FLOODWORKS — simulation: discrete water routing, storms, scoring, win/loss.
// One job: the rules. No drawing, no input, no sound here.
// Water is discrete units per second along channels — no fluid physics.
// A gate OPEN diverts its channel into a reservoir (or the spillway drain);
// a gate CLOSED lets the channel run on into its district.

import {
  CHANNELS, DISTRICTS, GATES, PUMP_BASE, PUMP_COST, PUMP_DRAIN, PUMP_COOLDOWN,
  RESERVOIR_BASE_CAP, RESERVOIRS, START_FUNDS, STORMS, STORM_DURATION,
  UPGRADES, upgradePrice, FLOOD_PER_UNIT, EVAP_PER_SEC, SPILLWAY_MAX,
  SPILLWAY_SURGE_MULT,
} from './config.js';

export const PHASE_TITLE = 'title';
export const PHASE_PLAY = 'play';
export const PHASE_INTERMISSION = 'intermission';
export const PHASE_WIN = 'win';
export const PHASE_LOSS = 'loss';

export function createSim() {
  return {
    phase: PHASE_TITLE,
    paused: false,
    muted: false,
    time: 0,
    stormIndex: 0, // 0-based; storm number shown is +1
    stormTime: 0, // seconds left in the running storm
    stormElapsed: 0,
    score: 0,
    best: 0,
    funds: START_FUNDS,
    combo: 1,
    comboTimer: 0,
    districts: DISTRICTS.map((d) => ({ name: d.name, flood: 0, lost: false })),
    reservoirs: RESERVOIRS.map((r) => ({ name: r.name, level: 0 })),
    gates: GATES.map((g) => ({ ...g, open: false })),
    upgrades: { levee: 0, dredge: 0, pump: 0 },
    stats: { diverted: 0, spilled: 0, pumped: 0, damage: 0, spent: 0, stormsCleared: 0 },
    floaters: [], // {x, y, text, color, life, max}
    droplets: [], // {channel, branch, t, speed} visual flow dots
    surgesFired: [],
    pumpCooldown: 0,
    alarmOn: false,
    alarmTimer: 0,
    lostDistrict: null,
    stormBonus: 0,
    seed: 12345,
  };
}

export function reservoirCapacity(sim) {
  return RESERVOIR_BASE_CAP + 25 * sim.upgrades.dredge;
}
export function pumpRate(sim) {
  return PUMP_BASE + 2 * sim.upgrades.pump;
}
export function leveeMult(sim) {
  return Math.pow(0.75, sim.upgrades.levee);
}
export function stormDef(sim) {
  return STORMS[Math.min(sim.stormIndex, STORMS.length - 1)];
}
export function comboMult(sim) {
  return sim.combo;
}

function rand(sim) {
  // Tiny deterministic LCG so staged scenes and droplets are reproducible.
  sim.seed = (sim.seed * 1664525 + 1013904223) >>> 0;
  return sim.seed / 4294967296;
}

export function addFloater(sim, x, y, text, color, size) {
  sim.floaters.push({ x, y, text, color: color || '#ffffff', size: size || 18, life: 2.2, max: 2.2 });
  if (sim.floaters.length > 24) sim.floaters.shift();
}

/** Is a named surge live on this channel right now? */
export function surgeLiveOnChannel(sim, ch) {
  if (sim.phase !== PHASE_PLAY || sim.paused) return false;
  const def = stormDef(sim);
  for (const s of def.surges) {
    if (s.channel === ch && sim.stormElapsed >= s.at && sim.stormElapsed < s.at + s.dur) return true;
  }
  return false;
}

/** Total water (units) this storm will deliver, baseline + all surges. */
export function stormWaterTotal(sim) {
  const def = stormDef(sim);
  let total = 0;
  for (let ch = 0; ch < 3; ch += 1) total += (def.inflow[ch] || 0) * STORM_DURATION;
  for (const s of def.surges) total += s.extra * s.dur;
  return total;
}

/** Water (units) this storm still has to deliver from now on. */
export function stormWaterRemaining(sim) {
  const def = stormDef(sim);
  let left = 0;
  for (let ch = 0; ch < 3; ch += 1) left += (def.inflow[ch] || 0) * Math.max(0, sim.stormTime);
  for (const s of def.surges) {
    const ends = s.at + s.dur;
    if (sim.stormElapsed < ends) left += s.extra * (Math.min(ends, STORM_DURATION) - Math.max(s.at, sim.stormElapsed));
  }
  return left;
}

/** Fraction of this storm's water already delivered (0 at storm start, 1 at end). */
export function stormProgress(sim) {
  const total = stormWaterTotal(sim);
  if (total <= 0) return 1;
  return Math.max(0, Math.min(1, 1 - stormWaterRemaining(sim) / total));
}

/** Inflow (units/s) on a channel right now, including any live named surge. */
export function channelInflow(sim, ch) {
  if (sim.phase !== PHASE_PLAY || sim.paused) return 0;
  const def = stormDef(sim);
  let rate = def.inflow[ch] || 0;
  for (const s of def.surges) {
    const t = sim.stormElapsed;
    if (t >= s.at && t < s.at + s.dur && s.channel === ch) rate += s.extra;
  }
  return rate;
}

/** Named surges still to come in this storm, for the INCOMING panel. */
export function upcomingSurges(sim) {
  const def = stormDef(sim);
  const list = [];
  for (const s of def.surges) {
    if (sim.stormElapsed < s.at + s.dur) {
      list.push({
        name: s.name,
        units: s.units,
        channel: CHANNELS[s.channel].name,
        live: sim.stormElapsed >= s.at && sim.stormElapsed < s.at + s.dur,
      });
    }
  }
  return list;
}

function gateForChannel(sim, ch, target) {
  return sim.gates.find((g) => g.channel === ch && g.target === target);
}

export function toggleGate(sim, gateId) {
  const g = sim.gates.find((x) => x.id === gateId);
  if (!g) return null;
  g.open = !g.open;
  return g;
}

export function buyUpgrade(sim, id) {
  const def = UPGRADES.find((u) => u.id === id);
  if (!def) return false;
  const level = sim.upgrades[id];
  if (level >= def.max) return false;
  const price = upgradePrice(def, level);
  if (sim.funds < price) return false;
  sim.funds -= price;
  sim.stats.spent += price;
  sim.upgrades[id] = level + 1;
  return true;
}

export function emergencyPump(sim) {
  if (sim.pumpCooldown > 0 || sim.funds < PUMP_COST) return 0;
  // Drain the fullest reservoir.
  let fullest = null;
  for (const r of sim.reservoirs) {
    if (r.level > 0 && (!fullest || r.level > fullest.level)) fullest = r;
  }
  if (!fullest) return 0;
  const drained = Math.min(PUMP_DRAIN, fullest.level);
  fullest.level -= drained;
  sim.funds -= PUMP_COST;
  sim.stats.spent += PUMP_COST;
  sim.stats.pumped += drained;
  sim.pumpCooldown = PUMP_COOLDOWN;
  sim.score += drained * 2;
  addFloater(sim, 795, 320, `PUMPED ${Math.round(drained)}u  +${Math.round(drained * 2)}`, '#7cc4f2');
  return drained;
}

export function startStorm(sim) {
  sim.phase = PHASE_PLAY;
  sim.paused = false;
  sim.stormTime = STORM_DURATION;
  sim.stormElapsed = 0;
  sim.surgesFired = [];
  sim.combo = 1;
  sim.comboTimer = 0;
}

export function startGame(sim) {
  const fresh = createSim();
  fresh.best = sim.best;
  fresh.muted = sim.muted;
  Object.keys(fresh).forEach((k) => { sim[k] = fresh[k]; });
  startStorm(sim);
}

function districtHit(sim, ch, units, dt) {
  const d = sim.districts[ch];
  if (d.lost) return;
  const flood = units * FLOOD_PER_UNIT * leveeMult(sim);
  d.flood = Math.min(100, d.flood + flood);
  sim.stats.damage += flood;
  sim.combo = 1;
  sim.comboTimer = 0;
  if (d.flood >= 100) {
    d.lost = true;
    // First district to flood is the recorded loss; a second district
    // hitting 100% in the same tick must not overwrite it.
    if (sim.phase !== PHASE_LOSS) {
      sim.lostDistrict = d.name;
      sim.phase = PHASE_LOSS;
      if (sim.score > sim.best) sim.best = sim.score;
    }
  }
}

function stepWater(sim, dt) {
  const cap = reservoirCapacity(sim);
  const dredgeFunds = 1 + 0.25 * sim.upgrades.dredge;
  let anyDistrictHit = false;
  const remaining = [0, 0, 0];

  // Pass 1 — reservoir gates: every OPEN reservoir gate on a channel diverts
  // into its reservoir (in gate order) while that reservoir has room.
  for (let ch = 0; ch < 3; ch += 1) {
    const rate = channelInflow(sim, ch);
    if (rate <= 0) continue;
    let left = rate * dt;
    const resGates = sim.gates.filter((g) => g.channel === ch && g.target !== 'spill' && g.open);
    for (const rg of resGates) {
      if (left <= 0) break;
      const res = sim.reservoirs[rg.target === 'basin' ? 0 : 1];
      const room = Math.max(0, cap - res.level);
      const diverted = Math.min(left, room);
      if (diverted > 0) {
        res.level += diverted;
        sim.stats.diverted += diverted;
        // Fractional score: round only for display, never per 60 Hz step.
        sim.score += diverted * 10 * comboMult(sim);
        sim.funds += diverted * 0.6 * dredgeFunds;
        left -= diverted;
      }
    }
    remaining[ch] = left;
  }

  // Pass 2 — spillway: each OPEN spillway gate drains ONLY its own channel.
  // G4 drains the north channel, G6 drains the south channel; the west
  // channel has no spillway gate and must use its reservoirs.
  // Trade-off: while a named surge is live on a channel, the surge
  // overwhelms that channel's drain, halving its spillway capacity —
  // surges must be caught by the reservoirs, not waved through.
  for (let ch = 0; ch < 3; ch += 1) {
    if (remaining[ch] <= 0) continue;
    const spillGate = sim.gates.find((g) => g.channel === ch && g.target === 'spill');
    if (spillGate && spillGate.open) {
      const cap = SPILLWAY_MAX * (surgeLiveOnChannel(sim, ch) ? SPILLWAY_SURGE_MULT : 1);
      const drained = Math.min(remaining[ch], cap * dt);
      sim.stats.spilled += drained;
      sim.score += drained * 4;
      sim.funds += drained * 0.25;
      remaining[ch] -= drained;
    }
    if (remaining[ch] > 0) {
      districtHit(sim, ch, remaining[ch], dt);
      anyDistrictHit = true;
    }
  }

  // Pumps drain reservoirs into safe storage: small steady reward.
  const pr = pumpRate(sim);
  for (const r of sim.reservoirs) {
    if (r.level > 0) {
      const drained = Math.min(r.level, pr * dt);
      r.level -= drained;
      sim.stats.pumped += drained;
      sim.score += drained;
      sim.funds += drained * 0.2;
    }
  }

  // Combo grows each clean second, up to x5; any district hit resets it.
  if (!anyDistrictHit) {
    sim.comboTimer += dt;
    if (sim.comboTimer >= 1) {
      sim.comboTimer = 0;
      if (sim.combo < 5) sim.combo += 1;
    }
  }

  // Flood recedes a little when a district is receiving no water at all.
  for (let ch = 0; ch < 3; ch += 1) {
    const d = sim.districts[ch];
    if (!d.lost && remaining[ch] <= 0) d.flood = Math.max(0, d.flood - EVAP_PER_SEC * dt);
  }
}

function spawnDroplets(sim, dt) {
  // Visual flow dots along each channel and each open divert branch.
  for (let ch = 0; ch < 3; ch += 1) {
    const rate = channelInflow(sim, ch);
    if (rate > 0 && rand(sim) < rate * dt * 1.6) {
      sim.droplets.push({ channel: ch, branch: null, t: 0, speed: 0.25 + rand(sim) * 0.15 });
    }
    const resGate = sim.gates.find((g) => g.channel === ch && g.target !== 'spill');
    if (resGate && resGate.open && rate > 0 && rand(sim) < rate * dt * 0.9) {
      sim.droplets.push({ channel: ch, branch: resGate.target, t: 0, speed: 0.3 + rand(sim) * 0.15 });
    }
    const spillGate = sim.gates.find((g) => g.channel === ch && g.target === 'spill');
    if (spillGate && spillGate.open && rate > 0 && rand(sim) < rate * dt * 0.9) {
      sim.droplets.push({ channel: ch, branch: 'spill', t: 0, speed: 0.3 + rand(sim) * 0.15 });
    }
  }
  if (sim.droplets.length > 220) sim.droplets.splice(0, sim.droplets.length - 220);
}

function stepDroplets(sim, dt) {
  for (const d of sim.droplets) d.t += d.speed * dt;
  sim.droplets = sim.droplets.filter((d) => d.t < 1);
}

function stepFloaters(sim, dt) {
  for (const f of sim.floaters) {
    f.life -= dt;
    f.y -= 14 * dt;
  }
  sim.floaters = sim.floaters.filter((f) => f.life > 0);
}

function endStorm(sim) {
  sim.stats.stormsCleared += 1;
  const healthBonus = sim.districts.reduce((n, d) => n + Math.max(0, 100 - d.flood), 0);
  const bonus = 500 + healthBonus * 5; // fractional; rounded only for display
  sim.stormBonus = bonus;
  sim.score += bonus;
  sim.funds += 60;
  // Repair crews drain 15% flood from every surviving district between storms.
  for (const d of sim.districts) {
    if (!d.lost) d.flood = Math.max(0, d.flood - 15);
  }
  addFloater(sim, 640, 300, `STORM CLEAR  +${Math.round(bonus)}`, '#f2b705');
  if (sim.stormIndex >= STORMS.length - 1) {
    sim.phase = PHASE_WIN;
    if (sim.score > sim.best) sim.best = sim.score;
  } else {
    sim.phase = PHASE_INTERMISSION;
  }
}

/** Advance the simulation by dt seconds. Returns event names for sound. */
export function stepSim(sim, dt) {
  const events = [];
  sim.time += dt;
  stepFloaters(sim, dt);

  if (sim.phase === PHASE_TITLE) {
    // Attract mode: gentle water runs so the title sits over a living map.
    spawnDroplets(sim, dt * 0.5);
    stepDroplets(sim, dt);
    return events;
  }
  if (sim.phase !== PHASE_PLAY || sim.paused) {
    stepDroplets(sim, dt * 0.2);
    return events;
  }

  // The pump cooldown ticks only during unpaused play — pausing must not
  // fast-forward it.
  if (sim.pumpCooldown > 0) sim.pumpCooldown -= dt;
  sim.stormElapsed += dt;
  sim.stormTime -= dt;

  // Named surge banners when a surge starts.
  const def = stormDef(sim);
  for (const s of def.surges) {
    if (sim.stormElapsed >= s.at && !sim.surgesFired.includes(s.name + s.at)) {
      sim.surgesFired.push(s.name + s.at);
      addFloater(sim, 640, 200, `⚠ ${s.name.toUpperCase()}!`, '#e86a1c');
      events.push('surge');
    }
  }

  stepWater(sim, dt);
  spawnDroplets(sim, dt);
  stepDroplets(sim, dt);

  // Alarm while any district is near flooding.
  const near = sim.districts.some((d) => !d.lost && d.flood >= 75);
  if (near && !sim.alarmOn) {
    sim.alarmOn = true;
    events.push('alarm');
  } else if (!near) {
    sim.alarmOn = false;
  }
  if (sim.alarmOn) {
    sim.alarmTimer += dt;
    if (sim.alarmTimer >= 2) {
      sim.alarmTimer = 0;
      events.push('alarm');
    }
  }

  if (sim.phase === PHASE_PLAY && sim.stormTime <= 0) {
    endStorm(sim);
    events.push(sim.phase === PHASE_WIN ? 'win' : 'clear');
  }
  if (sim.phase === PHASE_LOSS) events.push('lose');
  return events;
}
