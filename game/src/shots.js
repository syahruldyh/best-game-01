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
    // Storm 6/6 — THE DELUGE as the boss moment. Numbers are a real frame
    // from a winning run (S trace, skilled pump timing): 28s into the
    // Deluge, 2s left on the clock, LOWFIELD at 82% with the alarm up
    // (it fires at 75%), the basin pinned FULL at 125/125, all six
    // gates open. The Final Torrent is live in phase 3/3 BREAK with
    // 36u of its 80u pressure still standing — the player has routed
    // 44u of torrent water, so the boss bar is half drained. Combo is
    // genuinely x5: the player shut G3 while the torrent opened to let
    // LOWFIELD take the first hit, pumped the tank down, then opened G3
    // at 24s and routed every unit of the last four seconds clean — the
    // flood on LOWFIELD built up in those first three seconds and
    // barely recedes at 0.4%/s while the player routes everything. The
    // tank sits at 86/125 because it is still absorbing the torrent;
    // that room is why the routing works. Score 92,108 equals BEST
    // 92,108 — this run has just set a new best, on its way to a real
    // 93,714 win. The pump is honestly on cooldown (11.9s — it fired
    // at 19.9s, just before the Final Torrent), so the button reads
    // "ready in 12s". Floaters use only texts the game itself emits:
    // the surge banner, the combo callout and the pump receipt.
    startStorm(sim);
    sim.stormIndex = 5;
    sim.stormElapsed = 28;
    sim.stormTime = 2;
    sim.score = 92108;
    sim.best = 92108;
    sim.funds = 2036;
    sim.combo = 5;
    sim.comboTimer = 0;
    sim.torrentRouted = 44;
    sim.pumpCooldown = 11.9;
    openGate(sim, 1);
    openGate(sim, 2);
    openGate(sim, 3);
    openGate(sim, 4);
    openGate(sim, 5);
    openGate(sim, 6);
    sim.reservoirs[0].level = 125;
    sim.reservoirs[1].level = 86;
    sim.districts[0].flood = 25; // OLD MILL holding
    sim.districts[1].flood = 41;
    sim.districts[2].flood = 82; // LOWFIELD near overflow
    sim.alarmOn = true;
    sim.stats.diverted = 2799;
    sim.stats.spilled = 353;
    sim.stats.damage = 230;
    sim.stats.spent = 1530;
    sim.upgrades = { levee: 3, dredge: 3, pump: 3 };
    addFloater(sim, 640, 200, '⚠ FINAL TORRENT!', '#e86a1c', 20);
    addFloater(sim, 640, 260, 'COMBO x5!', '#7cf2a8', 22);
    addFloater(sim, 795, 320, 'PUMPED 50u  +100', '#7cc4f2');
    seedDroplets(sim, 48);
    return { screen: SCREEN_PLAY, best: 92108 };
  }

  if (name === 'rescue') {
    // Storm 5 near-loss rescue: LOWFIELD at 88%, emergency pump ready.
    // (Unused slot — kept rendering, numbers in the new balance's range.)
    startStorm(sim);
    sim.stormIndex = 4;
    sim.stormElapsed = 22;
    sim.stormTime = 8;
    sim.score = 68277;
    sim.best = 93714;
    sim.funds = 154;
    sim.combo = 4;
    openGate(sim, 1);
    openGate(sim, 3);
    openGate(sim, 5);
    openGate(sim, 6);
    sim.reservoirs[0].level = 48;
    sim.reservoirs[1].level = 46;
    sim.districts[0].flood = 41;
    sim.districts[1].flood = 22;
    sim.districts[2].flood = 88; // LOWFIELD about to flood
    sim.alarmOn = true;
    sim.pumpCooldown = 0;
    addFloater(sim, 640, 260, '⚠ BLACKWATER SURGE!', '#e86a1c', 20);
    addFloater(sim, 760, 480, 'PUMPED 50u  +100', '#7cc4f2');
    seedDroplets(sim, 36);
    return { screen: SCREEN_PLAY, best: 93714 };
  }

  if (name === 'win') {
    // A real victory state: the S trace's actual winning run — score
    // 93,714, all three districts alive at the end of THE DELUGE
    // (LOWFIELD finished at 76% after the repair crews), every upgrade
    // maxed, every gate open, both reservoirs full.
    startStorm(sim);
    sim.stormIndex = 5;
    sim.phase = PHASE_WIN;
    sim.score = 93714;
    sim.best = 93714;
    sim.funds = 2138;
    sim.stats.diverted = 2831;
    sim.stats.spilled = 363;
    sim.stats.pumped = 2581;
    sim.stats.damage = 240;
    sim.stats.spent = 1530;
    sim.stats.stormsCleared = 6;
    sim.districts[0].flood = 9;
    sim.districts[1].flood = 27;
    sim.districts[2].flood = 76;
    sim.reservoirs[0].level = 125;
    sim.reservoirs[1].level = 125;
    sim.upgrades = { levee: 3, dredge: 3, pump: 3 };
    openGate(sim, 1);
    openGate(sim, 2);
    openGate(sim, 3);
    openGate(sim, 4);
    openGate(sim, 5);
    openGate(sim, 6);
    seedDroplets(sim, 18);
    return { screen: SCREEN_WIN, best: 93714 };
  }

  if (name === 'loss') {
    // A real loss state: the gates-shut run — MARKET ROW floods to 100%
    // eight seconds into storm 2, after storm 1 left every district
    // battered (repairs only took 15% off). Nothing was diverted: both
    // reservoirs sit empty behind the modal, which is the failure story.
    startStorm(sim);
    sim.stormIndex = 1;
    sim.stormElapsed = 8;
    sim.stormTime = 22;
    sim.phase = PHASE_LOSS;
    sim.lostDistrict = 'MARKET ROW';
    sim.score = 979;
    sim.best = 93714;
    sim.funds = 160;
    sim.districts[0].flood = 76;
    sim.districts[1].flood = 100;
    sim.districts[2].flood = 76;
    sim.districts[1].lost = true;
    sim.reservoirs[0].level = 0;
    sim.reservoirs[1].level = 0;
    sim.stats.diverted = 0;
    sim.stats.spilled = 0;
    sim.stats.damage = 297;
    sim.stats.spent = 0;
    seedDroplets(sim, 20);
    return { screen: SCREEN_LOSS, best: 93714 };
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
