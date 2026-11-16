// FLOODWORKS — input: mouse clicks and keyboard, translated into game actions.
// One job: read the player's clicks/keys and report what they meant.
// Hit regions come from config.js (the same rects the renderer draws).

import {
  BTN, GATES, GATE_R, UPGRADE_CARDS, UPGRADES, gateChipRect, upgradeChipRect,
} from './config.js';
import { PHASE_TITLE, PHASE_PLAY, PHASE_INTERMISSION, PHASE_WIN, PHASE_LOSS } from './sim.js';

export const ACTION_NONE = 0;
export const ACTION_START = 1; // start game / next storm / play again
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;
export const ACTION_MUTE = 8;
export const ACTION_PUMP = 16;

function inside(x, y, r) {
  return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
}
function canvasPos(canvas, e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}

/**
 * Wire up input. `handlers` gets called with plain facts:
 * onGate(id), onUpgrade(id), onAction(bitmask), onClick(x, y).
 * Returns nothing; listeners live on the canvas + window.
 */
export function createInput(canvas, handlers) {
  const keys = new Set();

  function clickAt(x, y, sim) {
    // Pause / mute buttons in the top bar (always live).
    if (x >= 1280 - 116 && x < 1280 - 68 && y >= 12 && y < 52) { handlers.onAction(ACTION_PAUSE); return; }
    if (x >= 1280 - 60 && x < 1280 - 12 && y >= 12 && y < 52) { handlers.onAction(ACTION_MUTE); return; }

    if (sim.phase === PHASE_TITLE) {
      if (inside(x, y, BTN.start)) handlers.onAction(ACTION_START);
      return;
    }
    if (sim.phase === PHASE_WIN) {
      if (inside(x, y, BTN.playAgain)) handlers.onAction(ACTION_START);
      return;
    }
    if (sim.phase === PHASE_LOSS) {
      if (inside(x, y, BTN.tryAgain)) handlers.onAction(ACTION_START);
      return;
    }
    if (sim.phase === PHASE_INTERMISSION) {
      if (inside(x, y, BTN.nextStorm)) { handlers.onAction(ACTION_START); return; }
      for (let i = 0; i < 3; i += 1) {
        if (inside(x, y, UPGRADE_CARDS[i])) { handlers.onUpgrade(UPGRADES[i].id); return; }
      }
      // The bottom-bar upgrade chips also buy during the intermission.
      for (let i = 0; i < 3; i += 1) {
        if (inside(x, y, upgradeChipRect(i))) { handlers.onUpgrade(UPGRADES[i].id); return; }
      }
      return;
    }
    if (sim.phase !== PHASE_PLAY) return;

    // Emergency pump button (right panel).
    if (inside(x, y, BTN.pump)) { handlers.onAction(ACTION_PUMP); return; }
    // Gate circles on the map.
    for (const g of GATES) {
      const dx = x - g.x;
      const dy = y - g.y;
      if (dx * dx + dy * dy <= (GATE_R + 8) * (GATE_R + 8)) { handlers.onGate(g.id); return; }
    }
    // Gate chips + upgrade chips in the bottom bar.
    for (let i = 0; i < 6; i += 1) {
      if (inside(x, y, gateChipRect(i))) { handlers.onGate(GATES[i].id); return; }
    }
    for (let i = 0; i < 3; i += 1) {
      if (inside(x, y, upgradeChipRect(i))) { handlers.onUpgrade(UPGRADES[i].id); return; }
    }
  }

  canvas.addEventListener('click', (e) => {
    const p = canvasPos(canvas, e);
    handlers.onClick(p.x, p.y);
  });

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    keys.add(e.code);
    if (e.code === 'Space') { e.preventDefault(); handlers.onAction(ACTION_START); }
    else if (e.code === 'KeyR') handlers.onAction(ACTION_RESTART);
    else if (e.code === 'KeyP') handlers.onAction(ACTION_PAUSE);
    else if (e.code === 'KeyM') handlers.onAction(ACTION_MUTE);
    else if (e.code === 'KeyE') handlers.onAction(ACTION_PUMP);
    else if (e.code === 'Digit1') handlers.onGate(1);
    else if (e.code === 'Digit2') handlers.onGate(2);
    else if (e.code === 'Digit3') handlers.onGate(3);
    else if (e.code === 'Digit4') handlers.onGate(4);
    else if (e.code === 'Digit5') handlers.onGate(5);
    else if (e.code === 'Digit6') handlers.onGate(6);
  });

  return { clickAt, keys };
}
