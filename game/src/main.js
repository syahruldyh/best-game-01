// FLOODWORKS — boot and the one loop: input every frame, the sim advances in
// fixed 1/60 s steps, the renderer paints what is there. Screens: title,
// play, intermission, win, loss, paused (overlay).
//
// ?shot=start|cover|rescue|win|loss stages that scene instead of running the
// loop, paints it twice and sets window.__shotReady for a screenshot.
// window.__fw exposes the live sim for playtesting (state, step, actions).

import { BEST_KEY, STEP } from './config.js';
import {
  createSim, stepSim, toggleGate, buyUpgrade, emergencyPump, startStorm,
  startGame, PHASE_TITLE, PHASE_PLAY, PHASE_INTERMISSION, PHASE_WIN, PHASE_LOSS,
} from './sim.js';
import { createRenderer } from './render.js';
import { createInput, ACTION_START, ACTION_PAUSE, ACTION_RESTART, ACTION_MUTE, ACTION_PUMP } from './input.js';
import { stageShot } from './shots.js';
import * as audio from './audio.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const sim = createSim();
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}
function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off: the best score then lasts this visit only.
  }
}
sim.best = readBest();

function runShot(name) {
  const scene = stageShot(name, sim);
  sim.best = scene.best;
  let painted = 0;
  function paint() {
    renderer.draw(sim, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let best = sim.best;
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }
  function syncBest() {
    if (sim.score > best) {
      best = sim.score;
      sim.best = best;
      saveBest(best);
    }
  }
  function playEvents(events) {
    for (const e of events) {
      if (e === 'alarm') audio.sfxAlarm();
      else if (e === 'surge') audio.sfxSurge();
      else if (e === 'clear') audio.sfxClear();
      else if (e === 'win') audio.sfxWin();
      else if (e === 'lose') audio.sfxLose();
    }
    syncBest();
  }

  function doAction(bit) {
    if (bit & ACTION_MUTE) {
      sim.muted = !sim.muted;
      audio.setMuted(sim.muted);
      return;
    }
    if (bit & ACTION_RESTART) {
      if (sim.phase !== PHASE_TITLE) {
        startGame(sim);
        announce('Restarted. Storm 1: First Rains.');
      }
      return;
    }
    if (bit & ACTION_PAUSE) {
      if (sim.phase === PHASE_PLAY) {
        sim.paused = !sim.paused;
        announce(sim.paused ? 'Paused.' : 'Playing.');
      }
      return;
    }
    if (bit & ACTION_PUMP) {
      if (sim.phase === PHASE_PLAY && !sim.paused) {
        if (emergencyPump(sim)) { audio.sfxGurgle(); announce('Emergency pump drained 30 units.'); }
        else audio.sfxClick();
      }
      return;
    }
    if (bit & ACTION_START) {
      if (sim.phase === PHASE_TITLE) {
        startGame(sim);
        audio.sfxClick();
        announce('Playing. Storm 1: First Rains. Click gates to route the water.');
      } else if (sim.phase === PHASE_INTERMISSION) {
        sim.stormIndex += 1;
        startStorm(sim);
        audio.sfxClick();
        announce(`Storm ${sim.stormIndex + 1} started.`);
      } else if (sim.phase === PHASE_WIN || sim.phase === PHASE_LOSS) {
        startGame(sim);
        audio.sfxClick();
        announce('Playing again. Storm 1: First Rains.');
      }
    }
  }

  const input = createInput(canvas, {
    onClick: (x, y) => input.clickAt(x, y, sim),
    onGate: (id) => {
      if (sim.phase !== PHASE_PLAY || sim.paused) return;
      const g = toggleGate(sim, id);
      if (!g) return;
      if (g.open) audio.sfxGurgle();
      else audio.sfxClick();
      announce(`Gate ${g.label} ${g.open ? 'open' : 'shut'} — routing to ${g.targetName}.`);
    },
    onUpgrade: (id) => {
      if (buyUpgrade(sim, id)) {
        audio.sfxBuy();
        announce(`Bought ${id}. Funds $${Math.floor(sim.funds)}.`);
      } else {
        audio.sfxClick();
      }
    },
    onAction: doAction,
  });

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    while (accumulator >= STEP) {
      const events = stepSim(sim, STEP);
      if (events.length) playEvents(events);
      accumulator -= STEP;
    }
    renderer.draw(sim, best);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && sim.phase === PHASE_PLAY) {
      sim.paused = true;
      announce('Paused.');
    }
  });

  // Playtest hooks: the real sim, driven from outside the page.
  window.__fw = {
    sim,
    step: (dt) => playEvents(stepSim(sim, dt)),
    startGame: () => { startGame(sim); },
    toggleGate: (id) => toggleGate(sim, id),
    buyUpgrade: (id) => buyUpgrade(sim, id),
    emergencyPump: () => emergencyPump(sim),
    doAction,
    get best() { return best; },
  };

  announce('Floodworks. Press Space or click Start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
