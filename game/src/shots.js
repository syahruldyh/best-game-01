// FLOODWORKS — screenshot staging behind ?shot=start|cover|rescue|win|loss.
// One job: set the sim to a real, reachable game state, then let the normal
// renderer draw it. Nothing here is a mockup: every staged state is produced
// by the same fields the live game writes (storm, gates, reservoirs, floods,
// score, funds, floaters), so the frame is what real play looks like.

import { PHASE_TITLE, PHASE_PLAY, PHASE_INTERMISSION, PHASE_WIN, PHASE_LOSS, addFloater, startStorm } from './sim.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_INTERMISSION, SCREEN_WIN, SCREEN_LOSS } from './render.js';

function seedDroplets(sim, count) {
  // Scatter flow dots along the active routes so the staged frame is alive.
  sim.droplets = [];
  const routes = [];
  for (let ch = 0; ch < 3; ch += 1) {
    routes.push({ channel: ch, branch: null });
    const resGate = sim.gates.find((g) => g.channel === ch && g.target !== 'spill');
    if (resGate && resGate.open) routes.push({ channel: ch, branch: resGate.target });
    const spillGate = sim.gates.find((g) => g.channel === ch && g.target === 'spill');
    if (spillGate && spillGate.open) routes.push({ channel: ch, branch: 'spill' });
  }
  for (let i = 0; i < count; i += 1) {
    const r = routes[i % routes.length];
    sim.droplets.push({ channel: r.channel, branch: r.branch, t: (i * 0.37) % 1, speed: 0.3 });
  }
}

function openGate(sim, id) {
  const g = sim.gates.find((x) => x.id === id);
  if (g) g.open = true;
}

/**
 * Set `sim` to the named scene and return the screen to draw and the best
 * score to show. Unknown names fall back to the title scene.
 */
export function stageShot(name, sim) {
  if (name === 'cover') {
    // Storm 4 crisis, mid-match: two water routes running, one district
    // near overflow, reservoirs nearly full, combo live, named surges in.
    startStorm(sim);
    sim.stormIndex = 3;
    sim.stormElapsed = 12;
    sim.stormTime = 18;
    sim.score = 12840;
    sim.best = 21900;
    sim.funds = 286;
    sim.combo = 3;
    sim.comboTimer = 0;
    openGate(sim, 1);
    openGate(sim, 2);
    openGate(sim, 4);
    openGate(sim, 5);
    sim.reservoirs[0].level = 46;
    sim.reservoirs[1].level = 52;
    sim.districts[0].flood = 82; // OLD MILL near overflow
    sim.districts[1].flood = 34;
    sim.districts[2].flood = 12;
    sim.alarmOn = true;
    sim.stats.diverted = 312;
    sim.stats.spilled = 96;
    addFloater(sim, 560, 220, '+120 SAVED', '#f2b705');
    addFloater(sim, 760, 420, '+40 DIVERTED', '#7cc4f2');
    addFloater(sim, 880, 250, 'COMBO x3', '#7cf2a8');
    seedDroplets(sim, 42);
    return { screen: SCREEN_PLAY, best: 21900 };
  }

  if (name === 'rescue') {
    // Storm 5 near-loss rescue: LOWFIELD at 88%, emergency pump ready.
    startStorm(sim);
    sim.stormIndex = 4;
    sim.stormElapsed = 22;
    sim.stormTime = 8;
    sim.score = 38277;
    sim.best = 41200;
    sim.funds = 154;
    sim.combo = 4;
    openGate(sim, 1);
    openGate(sim, 3);
    openGate(sim, 5);
    openGate(sim, 6);
    sim.reservoirs[0].level = 58;
    sim.reservoirs[1].level = 55;
    sim.districts[0].flood = 41;
    sim.districts[1].flood = 22;
    sim.districts[2].flood = 88; // LOWFIELD about to flood
    sim.alarmOn = true;
    sim.pumpCooldown = 0;
    addFloater(sim, 640, 260, 'SAVED +300', '#f2b705');
    addFloater(sim, 760, 480, 'LAST SECOND', '#e86a1c');
    seedDroplets(sim, 36);
    return { screen: SCREEN_PLAY, best: 41200 };
  }

  if (name === 'win') {
    // A real victory state: storm 6 cleared, totals filled in.
    startStorm(sim);
    sim.stormIndex = 5;
    sim.phase = PHASE_WIN;
    sim.score = 51840;
    sim.best = 63200;
    sim.funds = 412;
    sim.stats.diverted = 1240;
    sim.stats.spilled = 388;
    sim.stats.damage = 214;
    sim.stats.spent = 380;
    sim.stats.stormsCleared = 6;
    sim.districts[0].flood = 22;
    sim.districts[1].flood = 31;
    sim.districts[2].flood = 18;
    sim.upgrades = { levee: 2, dredge: 1, pump: 1 };
    openGate(sim, 1);
    openGate(sim, 5);
    seedDroplets(sim, 18);
    return { screen: SCREEN_WIN, best: 63200 };
  }

  if (name === 'loss') {
    // A real loss state: LOWFIELD flooded on storm 5.
    startStorm(sim);
    sim.stormIndex = 4;
    sim.stormElapsed = 24;
    sim.stormTime = 6;
    sim.phase = PHASE_LOSS;
    sim.lostDistrict = 'LOWFIELD';
    sim.score = 12480;
    sim.best = 21900;
    sim.funds = 96;
    sim.districts[0].flood = 58;
    sim.districts[1].flood = 44;
    sim.districts[2].flood = 100;
    sim.districts[2].lost = true;
    sim.reservoirs[0].level = 60;
    sim.reservoirs[1].level = 60;
    sim.stats.diverted = 540;
    sim.stats.damage = 402;
    sim.stats.spent = 200;
    openGate(sim, 1);
    openGate(sim, 2);
    seedDroplets(sim, 20);
    return { screen: SCREEN_LOSS, best: 21900 };
  }

  // start (default): title screen over a living map.
  sim.phase = PHASE_TITLE;
  sim.best = 0;
  openGate(sim, 1);
  openGate(sim, 5);
  seedDroplets(sim, 24);
  return { screen: SCREEN_TITLE, best: 0 };
}

// Re-exported for main.js so the shot path and the live path share screens.
export { SCREEN_TITLE as TITLE, SCREEN_PLAY as PLAY, SCREEN_INTERMISSION as INTERMISSION, SCREEN_WIN as WIN, SCREEN_LOSS as LOSS };
