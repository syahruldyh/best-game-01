// FLOODWORKS — renderer: everything the player sees, on one 1280x720 canvas.
// One job: paint the sim state. No rules, no input here.
// Layout: top bar, left panel, right panel, canal map, bottom bar, overlays.

import {
  W, H, C, MAP, PANEL_L, PANEL_R, CHANNELS, CHANNEL_X0, CHANNEL_X1,
  DISTRICTS, RESERVOIRS, GATES, GATE_R, STORMS, UPGRADES, upgradePrice,
  BTN, UPGRADE_CARDS, gateChipRect, upgradeChipRect,
} from './config.js';
import {
  PHASE_TITLE, PHASE_PLAY, PHASE_INTERMISSION, PHASE_WIN, PHASE_LOSS,
  reservoirCapacity, pumpRate, channelInflow, upcomingSurges, stormDef,
  stormWaterTotal, stormWaterRemaining,
} from './sim.js';

export const SCREEN_TITLE = PHASE_TITLE;
export const SCREEN_PLAY = PHASE_PLAY;
export const SCREEN_INTERMISSION = PHASE_INTERMISSION;
export const SCREEN_WIN = PHASE_WIN;
export const SCREEN_LOSS = PHASE_LOSS;

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function text(s, x, y, size, color, align, bold) {
    ctx.fillStyle = color || C.ink;
    ctx.font = `${bold ? 'bold ' : ''}${size}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(s, x, y);
  }
  function bar(x, y, w, h, frac, fill, bg) {
    ctx.fillStyle = bg || 'rgba(20,50,74,0.25)';
    rr(x, y, w, h, 4);
    ctx.fill();
    const f = Math.max(0, Math.min(1, frac));
    if (f > 0) {
      ctx.fillStyle = fill;
      rr(x, y, Math.max(6, w * f), h, 4);
      ctx.fill();
    }
  }

  // Divert-branch curve for a gate: from gate circle to its target.
  function branchPath(g) {
    if (g.target === 'basin') {
      if (g.id === 1) return { from: [g.x, g.y], ctrl: [560, 100], to: [700, 112] };
      return { from: [g.x, g.y], ctrl: [600, 205], to: [790, 140] };
    }
    if (g.target === 'tank') {
      if (g.id === 3) return { from: [g.x, g.y], ctrl: [560, 592], to: [700, 572] };
      return { from: [g.x, g.y], ctrl: [730, 460], to: [800, 538] };
    }
    return { from: [g.x, g.y], ctrl: [g.x, (g.y + 625) / 2], to: [640, 625] }; // spillway
  }
  function bezier(p, t) {
    const u = 1 - t;
    return [
      u * u * p.from[0] + 2 * u * t * p.ctrl[0] + t * t * p.to[0],
      u * u * p.from[1] + 2 * u * t * p.ctrl[1] + t * t * p.to[1],
    ];
  }

  function drawTopBar(sim, best) {
    ctx.fillStyle = C.navy;
    ctx.fillRect(0, 0, W, 64);
    ctx.fillStyle = C.gold;
    ctx.fillRect(0, 60, W, 4);
    text('🌊 FLOODWORKS', 16, 22, 24, '#ffffff', 'left', true);
    const def = stormDef(sim);
    const stormLabel = sim.phase === PHASE_TITLE
      ? '6 STORMS — PROTECT ALL 3 DISTRICTS'
      : `STORM ${sim.stormIndex + 1}/6 — ${def.name}`;
    text(stormLabel, 250, 22, 18, '#ffd97a', 'left', true);
    if (sim.phase === PHASE_PLAY) {
      text(`⏱ ${Math.max(0, Math.ceil(sim.stormTime))}s`, 250, 46, 14, '#bcd9ee');
      bar(330, 40, 180, 10, sim.stormTime / 30, C.waterLight, 'rgba(255,255,255,0.2)');
    }
    text(`SCORE ${Math.floor(sim.score)}`, 640, 22, 18, '#ffffff', 'left', true);
    text(`BEST ${Math.max(best, Math.floor(sim.score))}`, 640, 46, 13, '#bcd9ee');
    text(`💰 FUNDS $${Math.floor(sim.funds)}`, 800, 22, 18, '#ffd97a', 'left', true);
    text(`COMBO x${sim.combo}`, 800, 46, 13, sim.combo > 1 ? '#7cf2a8' : '#bcd9ee', 'left', true);
    text('WIN: protect all 3 districts', 960, 18, 12, '#7cf2a8', 'left', true);
    text('LOSE: a district floods', 960, 40, 12, '#ff9a7a', 'left', true);
    // Pause + mute buttons (top-right corner, inside the bar).
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    rr(W - 116, 12, 48, 40, 6); ctx.fill();
    rr(W - 60, 12, 48, 40, 6); ctx.fill();
    text(sim.paused ? '▶' : 'II', W - 92, 33, 16, '#ffffff', 'center', true);
    text(sim.muted ? '🔇' : '🔊', W - 36, 33, 16, '#ffffff', 'center', true);
  }

  function drawLeftPanel(sim) {
    ctx.fillStyle = C.cream;
    ctx.fillRect(PANEL_L.x, PANEL_L.y, PANEL_L.w, PANEL_L.h);
    ctx.fillStyle = C.navy;
    ctx.fillRect(PANEL_L.x, PANEL_L.y, PANEL_L.w, 30);
    text('⚠ INCOMING', 12, PANEL_L.y + 16, 15, '#ffffff', 'left', true);
    let y = PANEL_L.y + 52;
    const surges = upcomingSurges(sim);
    if (sim.phase === PHASE_TITLE) {
      text('6 storms forecast.', 12, y, 13, C.ink);
      text('Storm 1: First Rains', 12, y + 22, 13, C.ink);
      text('Storm 6: THE DELUGE', 12, y + 44, 13, C.orange, true);
      text('Check the gates,', 12, y + 76, 13, C.grey);
      text('then press START.', 12, y + 96, 13, C.grey);
    } else {
      if (surges.length === 0) text('No surges left', 12, y, 13, C.grey);
      for (const s of surges.slice(0, 4)) {
        ctx.fillStyle = s.live ? '#fde8d8' : '#fff8ea';
        rr(8, y - 14, PANEL_L.w - 16, 34, 5); ctx.fill();
        text(`${s.live ? '🔴 ' : ''}${s.name}`, 14, y - 3, 13, C.ink, 'left', true);
        text(`${s.units}u · ${s.channel}`, 14, y + 11, 11, C.grey);
        y += 40;
      }
      y += 4;
    }
    const dy = sim.phase === PHASE_TITLE ? PANEL_L.y + 210 : y + 8;
    ctx.fillStyle = C.navy;
    ctx.fillRect(PANEL_L.x, dy, PANEL_L.w, 30);
    text('🏘 DISTRICTS', 12, dy + 16, 15, '#ffffff', 'left', true);
    let yy = dy + 48;
    sim.districts.forEach((d, i) => {
      const health = 100 - d.flood;
      const col = d.lost ? C.red : health < 25 ? C.red : health < 50 ? C.orange : C.green;
      text(`${d.name}`, 12, yy, 13, C.ink, 'left', true);
      text(d.lost ? 'FLOODED' : `${Math.round(d.flood)}% FLOOD`, PANEL_L.w - 12, yy, 12, col, 'right', true);
      bar(12, yy + 12, PANEL_L.w - 24, 12, d.flood / 100, col);
      text(`health ${Math.max(0, Math.round(health))}%`, 12, yy + 36, 11, C.grey);
      yy += 56;
      void i;
    });
    text('CLICK A GATE', 12, yy + 6, 13, C.orange, 'left', true);
    text('to route water →', 12, yy + 24, 12, C.ink);
    text('reservoir or spillway.', 12, yy + 42, 12, C.ink);
    text('Inflows now:', 12, yy + 70, 12, C.grey);
    CHANNELS.forEach((c, i) => {
      text(`${c.name}: ${channelInflow(sim, i).toFixed(1)} u/s`, 12, yy + 88 + i * 18, 12, C.waterDeep);
    });
  }

  function drawRightPanel(sim) {
    ctx.fillStyle = C.cream;
    ctx.fillRect(PANEL_R.x, PANEL_R.y, PANEL_R.w, PANEL_R.h);
    ctx.fillStyle = C.navy;
    ctx.fillRect(PANEL_R.x, PANEL_R.y, PANEL_R.w, 30);
    text('💧 RESERVOIRS', PANEL_R.x + 12, PANEL_R.y + 16, 15, '#ffffff', 'left', true);
    const cap = reservoirCapacity(sim);
    let y = PANEL_R.y + 52;
    sim.reservoirs.forEach((r) => {
      text(r.name, PANEL_R.x + 12, y, 13, C.ink, 'left', true);
      text(`${Math.floor(r.level)}/${cap}u`, PANEL_R.x + PANEL_R.w - 12, y, 12, C.waterDeep, 'right', true);
      bar(PANEL_R.x + 12, y + 12, PANEL_R.w - 24, 14, r.level / cap, C.water);
      y += 52;
    });
    text(`Pumps drain ${pumpRate(sim)} u/s`, PANEL_R.x + 12, y, 12, C.grey);
    y += 30;
    ctx.fillStyle = C.navy;
    ctx.fillRect(PANEL_R.x, y, PANEL_R.w, 30);
    text('📈 UPGRADES', PANEL_R.x + 12, y + 16, 15, '#ffffff', 'left', true);
    y += 46;
    UPGRADES.forEach((u) => {
      const lvl = sim.upgrades[u.id];
      text(`${u.name}`, PANEL_R.x + 12, y, 12, C.ink, 'left', true);
      text(`Lv ${lvl}/${u.max}`, PANEL_R.x + PANEL_R.w - 12, y, 12, lvl ? C.green : C.grey, 'right', true);
      y += 20;
    });
    y += 8;
    // Emergency pump button.
    const b = BTN.pump;
    const afford = sim.funds >= 40 && sim.pumpCooldown <= 0;
    ctx.fillStyle = afford ? C.orange : '#9aa7b1';
    rr(b.x, b.y, b.w, b.h, 8); ctx.fill();
    text('🚨 EMERG. PUMP [E]', b.x + b.w / 2, b.y + 15, 12, '#ffffff', 'center', true);
    text(sim.pumpCooldown > 0 ? `ready in ${Math.ceil(sim.pumpCooldown)}s` : '$40 · drains 50u', b.x + b.w / 2, b.y + 32, 11, '#ffffff', 'center');
    text('SPACE next storm', PANEL_R.x + 12, 616, 12, C.grey);
    text('R restart · P pause', PANEL_R.x + 12, 634, 12, C.grey);
    text('M mute · E pump', PANEL_R.x + 12, 652 - 6, 12, C.grey);
  }

  function drawMap(sim) {
    // Ground.
    ctx.fillStyle = C.cream2;
    ctx.fillRect(MAP.x, MAP.y, MAP.w, MAP.h);
    ctx.fillStyle = '#dccfae';
    for (let gx = MAP.x + 40; gx < MAP.x + MAP.w; gx += 88) {
      for (let gy = MAP.y + 40; gy < MAP.y + MAP.h; gy += 88) {
        ctx.fillRect(gx, gy, 3, 3);
      }
    }
    // Spillway drain line (behind channels).
    ctx.strokeStyle = C.orange;
    ctx.setLineDash([8, 6]);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(640, 150);
    ctx.lineTo(640, 625);
    ctx.stroke();
    ctx.setLineDash([]);
    text('SPILLWAY → SAFE DRAIN', 676, 625, 11, C.orange, 'left', true);
    ctx.fillStyle = C.navy;
    ctx.fillRect(612, 618, 56, 14);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(618, 622, 8, 6); ctx.fillRect(632, 622, 8, 6); ctx.fillRect(646, 622, 8, 6);

    // Storm 6 — THE DELUGE: the map darkens and the water turns luminous,
    // so the final storm reads as the boss moment, not a sixth beige field.
    // Rain streaks drift with sim.time; the overlay sits under the channels
    // so the routes stay the brightest thing on the map.
    const isDeluge = sim.phase === PHASE_PLAY && sim.stormIndex === 5;
    if (isDeluge) {
      ctx.fillStyle = 'rgba(10,26,44,0.30)';
      ctx.fillRect(MAP.x, MAP.y, MAP.w, MAP.h);
      ctx.strokeStyle = 'rgba(124,196,242,0.30)';
      ctx.lineWidth = 2;
      const drift = Math.floor(sim.time * 36);
      for (let i = 0; i < 40; i += 1) {
        const rx = MAP.x + ((i * 97 + drift) % MAP.w);
        const ry = MAP.y + ((i * 53) % MAP.h);
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 5, ry + 13);
        ctx.stroke();
      }
    }

    // Channels: bed + water. In the Deluge the water runs thicker and glows.
    for (const c of CHANNELS) {
      ctx.strokeStyle = C.channelBed;
      ctx.lineWidth = isDeluge ? 30 : 26;
      ctx.beginPath(); ctx.moveTo(CHANNEL_X0, c.y); ctx.lineTo(CHANNEL_X1, c.y); ctx.stroke();
      if (isDeluge) { ctx.shadowColor = '#7cc4f2'; ctx.shadowBlur = 14; }
      ctx.strokeStyle = C.channel;
      ctx.lineWidth = isDeluge ? 26 : 20;
      ctx.beginPath(); ctx.moveTo(CHANNEL_X0, c.y); ctx.lineTo(CHANNEL_X1, c.y); ctx.stroke();
      ctx.shadowBlur = 0;
      // Inlet arrow + label.
      ctx.fillStyle = C.waterDeep;
      ctx.beginPath();
      ctx.moveTo(CHANNEL_X0 + 2, c.y - 12);
      ctx.lineTo(CHANNEL_X0 + 22, c.y);
      ctx.lineTo(CHANNEL_X0 + 2, c.y + 12);
      ctx.closePath(); ctx.fill();
      text(c.inlet, CHANNEL_X0 + 28, c.y - 20, 11, C.waterDeep, 'left', true);
      text(c.name, CHANNEL_X0 + 28, c.y + 22, 10, C.grey);
    }

    // Divert branches (drawn under gates).
    for (const g of sim.gates) {
      const p = branchPath(g);
      ctx.strokeStyle = g.open ? C.water : 'rgba(20,96,168,0.35)';
      ctx.lineWidth = g.open ? 7 : 4;
      if (g.target === 'spill') ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(p.from[0], p.from[1]);
      ctx.quadraticCurveTo(p.ctrl[0], p.ctrl[1], p.to[0], p.to[1]);
      ctx.stroke();
      ctx.setLineDash([]);
      if (g.open) {
        ctx.fillStyle = C.water;
        ctx.beginPath(); ctx.arc(p.to[0], p.to[1], 4, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Reservoirs.
    sim.reservoirs.forEach((r, i) => {
      const def = RESERVOIRS[i];
      const cap = reservoirCapacity(sim);
      ctx.fillStyle = '#ffffff';
      rr(def.x, def.y, def.w, def.h, 8); ctx.fill();
      ctx.strokeStyle = C.navy;
      ctx.lineWidth = 2;
      rr(def.x, def.y, def.w, def.h, 8); ctx.stroke();
      const frac = r.level / cap;
      ctx.fillStyle = C.water;
      const wh = Math.max(0, (def.h - 10) * frac);
      if (wh > 0) {
        rr(def.x + 5, def.y + def.h - 5 - wh, def.w - 10, wh, 5); ctx.fill();
      }
      ctx.fillStyle = C.water;
      ctx.beginPath();
      ctx.moveTo(def.x + 5, def.y + def.h - 5 - wh);
      ctx.lineTo(def.x + def.w - 5, def.y + def.h - 5 - wh);
      ctx.stroke();
      // No name label above the box: the right panel and the gate
      // destination labels already name each reservoir.
      text(`${Math.floor(r.level)}/${cap}u ${frac > 0.9 ? '⚠ FULL' : ''}`, def.x + def.w / 2, def.y + def.h / 2, 13, frac > 0.5 ? '#ffffff' : C.waterDeep, 'center', true);
    });

    // Districts: building blocks with flood meters.
    sim.districts.forEach((d, i) => {
      const def = DISTRICTS[i];
      ctx.fillStyle = d.lost ? '#5a3a32' : def.color;
      rr(def.x, def.y, def.w, def.h, 8); ctx.fill();
      ctx.strokeStyle = C.navy;
      ctx.lineWidth = 2;
      rr(def.x, def.y, def.w, def.h, 8); ctx.stroke();
      // Rooftops / windows.
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (let k = 0; k < 3; k += 1) ctx.fillRect(def.x + 10 + k * 24, def.y + 12, 14, 12);
      ctx.fillStyle = d.lost ? '#ff9a7a' : '#ffffff';
      text(d.name, def.x + def.w / 2, def.y + 44, 12, '#ffffff', 'center', true);
      text(d.lost ? '💧 FLOODED' : `${Math.round(d.flood)}% FLOOD`, def.x + def.w / 2, def.y + 62, 12, '#ffffff', 'center', true);
      bar(def.x + 6, def.y + def.h - 14, def.w - 12, 8, d.flood / 100, d.flood >= 75 ? C.red : C.orange, 'rgba(255,255,255,0.35)');
    });

    // Gates: numbered circles, green = open, grey = closed.
    for (const g of sim.gates) {
      ctx.fillStyle = g.open ? C.green : '#8a97a3';
      ctx.beginPath(); ctx.arc(g.x, g.y, GATE_R, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(g.x, g.y, GATE_R, 0, Math.PI * 2); ctx.stroke();
      text(g.label, g.x, g.y - 1, 14, '#ffffff', 'center', true);
      text(g.open ? 'OPEN' : 'SHUT', g.x, g.y + GATE_R + 11, 10, g.open ? C.green : C.grey, 'center', true);
      // Destination label: 12px bold on a cream pill, so the routing verb
      // reads at thumbnail size instead of being the smallest text on screen.
      const dest = `→ ${g.targetName}`;
      ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
      const dw = ctx.measureText(dest).width;
      ctx.fillStyle = 'rgba(250,243,227,0.94)';
      rr(g.x - dw / 2 - 6, g.y - GATE_R - 21, dw + 12, 16, 5);
      ctx.fill();
      text(dest, g.x, g.y - GATE_R - 12, 12, C.navy, 'center', true);
    }

    // Flow droplets.
    for (const d of sim.droplets) {
      let x; let y;
      if (d.branch === null) {
        const c = CHANNELS[d.channel];
        x = CHANNEL_X0 + d.t * (CHANNEL_X1 - CHANNEL_X0);
        y = c.y;
      } else {
        const g = sim.gates.find((gg) => gg.channel === d.channel && gg.target === d.branch);
        if (!g) continue;
        [x, y] = bezier(branchPath(g), d.t);
      }
      ctx.fillStyle = d.branch === 'spill' ? C.orange : C.water;
      ctx.beginPath(); ctx.arc(x, y, isDeluge ? 5 : 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath(); ctx.arc(x - 1, y - 1, 1.5, 0, Math.PI * 2); ctx.fill();
    }

    // Floating reward numbers (staged floaters may carry their own size).
    for (const f of sim.floaters) {
      ctx.globalAlpha = Math.max(0, Math.min(1, f.life / f.max));
      text(f.text, f.x, f.y, f.size || 18, f.color, 'center', true);
      ctx.globalAlpha = 1;
    }

    // THE DELUGE boss bar: storm 6 is the boss. Its "health" is the surge
    // water still to come — the bar drains as the storm runs out, so the
    // final seconds read as finishing a boss, not waiting out a timer.
    if (isDeluge) {
      const total = stormWaterTotal(sim);
      const left = stormWaterRemaining(sim);
      const frac = total > 0 ? left / total : 0;
      ctx.fillStyle = 'rgba(14,36,56,0.92)';
      rr(210, 70, 470, 34, 8); ctx.fill();
      ctx.strokeStyle = C.gold;
      ctx.lineWidth = 2;
      rr(210, 70, 470, 34, 8); ctx.stroke();
      if (frac > 0) {
        ctx.fillStyle = frac > 0.5 ? C.orange : C.red;
        rr(214, 74, Math.max(8, 462 * frac), 26, 5); ctx.fill();
      }
      text(`🌊 THE DELUGE — ${Math.round(left)}u SURGE LEFT`, 445, 88, 15, '#ffffff', 'center', true);
    }

    // Alarm banner. It drops to the bottom of the map during the Deluge so
    // it never overlaps the boss bar above or the gate destination pills
    // below it (both sit in the y=70..145 band); the bottom-left ground
    // between the south channel and the spillway grate is empty.
    if (sim.alarmOn && (sim.phase === PHASE_PLAY)) {
      const worst = sim.districts.filter((d) => !d.lost).sort((a, b) => b.flood - a.flood)[0];
      if (worst) {
        const pulse = 0.6 + 0.4 * Math.sin(sim.time * 6);
        const alarmY = isDeluge ? 592 : 70;
        const alarmW = isDeluge ? 390 : 470;
        ctx.fillStyle = `rgba(217,58,43,${0.85 * pulse})`;
        rr(210, alarmY, alarmW, 34, 8); ctx.fill();
        text(`⚠ ${worst.name} NEAR FLOODING (${Math.round(worst.flood)}%) — OPEN A GATE!`, 210 + alarmW / 2, alarmY + 18, 15, '#ffffff', 'center', true);
      }
    }
    // Next-storm warning on storm 5: the Deluge is coming.
    if (sim.phase === PHASE_INTERMISSION && sim.stormIndex === 4) {
      ctx.fillStyle = 'rgba(232,106,28,0.95)';
      rr(210, 70, 470, 34, 8); ctx.fill();
      text('⚠ NEXT: STORM 6 — THE DELUGE approaches!', 445, 88, 15, '#ffffff', 'center', true);
    }
  }

  function drawBottomBar(sim) {
    ctx.fillStyle = C.navy;
    ctx.fillRect(0, H - 64, W, 64);
    text('GATES — click to open / shut:', 12, H - 40, 13, '#ffd97a', 'left', true);
    sim.gates.forEach((g, i) => {
      const r = gateChipRect(i);
      ctx.fillStyle = g.open ? C.green : '#54636f';
      rr(r.x, r.y, r.w, r.h, 6); ctx.fill();
      text(`${g.label} ${g.open ? 'OPEN' : 'SHUT'}`, r.x + r.w / 2, r.y + 15, 12, '#ffffff', 'center', true);
      text(`→ ${g.targetName}`, r.x + r.w / 2, r.y + 33, 11, '#dcebf7', 'center');
    });
    UPGRADES.forEach((u, i) => {
      const r = upgradeChipRect(i);
      const lvl = sim.upgrades[u.id];
      const price = upgradePrice(u, lvl);
      const afford = lvl < u.max && sim.funds >= price;
      ctx.fillStyle = lvl >= u.max ? C.green : afford ? C.orange : '#54636f';
      rr(r.x, r.y, r.w, r.h, 6); ctx.fill();
      text(`${u.name} Lv${lvl}`, r.x + r.w / 2, r.y + 15, 11, '#ffffff', 'center', true);
      text(lvl >= u.max ? 'MAXED' : `$${price}`, r.x + r.w / 2, r.y + 33, 11, '#ffffff', 'center', true);
    });
  }

  function dim() {
    ctx.fillStyle = 'rgba(14,36,56,0.72)';
    ctx.fillRect(0, 0, W, H);
  }
  function panel(x, y, w, h) {
    ctx.fillStyle = C.paper;
    rr(x, y, w, h, 14); ctx.fill();
    ctx.strokeStyle = C.navy;
    ctx.lineWidth = 3;
    rr(x, y, w, h, 14); ctx.stroke();
  }
  function bigButton(b, label, sub) {
    ctx.fillStyle = C.orange;
    rr(b.x, b.y, b.w, b.h, 10); ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    rr(b.x, b.y, b.w, b.h, 10); ctx.stroke();
    text(label, b.x + b.w / 2, b.y + (sub ? 22 : b.h / 2), 22, '#ffffff', 'center', true);
    if (sub) text(sub, b.x + b.w / 2, b.y + 46, 13, '#ffe8d2', 'center');
  }

  function drawTitle(sim, best) {
    dim();
    panel(340, 60, 600, 560);
    text('🌊 FLOODWORKS', 640, 118, 52, C.navy, 'center', true);
    text('EMERGENCY CANAL CONTROL', 640, 158, 18, C.orange, 'center', true);
    text('The river is rising. Route the floodwater through', 640, 200, 16, C.ink, 'center');
    text('your gates into reservoirs — keep all 3 districts dry', 640, 224, 16, C.ink, 'center');
    text('through 6 storms. Storm 6 is THE DELUGE.', 640, 248, 16, C.ink, 'center', true);
    text('HOW TO PLAY', 640, 292, 15, C.navy, 'center', true);
    text('🖱 Click a gate (G1–G6) to open / shut it', 640, 320, 14, C.ink, 'center');
    text('␣ SPACE starts the next storm   ·   E emergency pump ($40)', 640, 344, 14, C.ink, 'center');
    text('R restart   ·   P pause   ·   M mute', 640, 368, 14, C.ink, 'center');
    text('Between storms, spend your funds on upgrades.', 640, 396, 14, C.ink, 'center');
    text('WIN: all 3 districts survive 6 storms.', 640, 424, 14, C.green, 'center', true);
    text('LOSE: any district floods to 100%.', 640, 446, 14, C.red, 'center', true);
    bigButton(BTN.start, '▶  START GAME', 'or press SPACE');
    if (best > 0) text(`BEST SCORE: ${best}`, 640, 606, 14, C.grey, 'center');
  }

  function drawIntermission(sim) {
    dim();
    panel(240, 70, 800, 560);
    text(`✅ STORM ${sim.stormIndex + 1} CLEARED!`, 640, 140, 34, C.green, 'center', true);
    text(`Storm bonus +${Math.round(sim.stormBonus)}  ·  +$60 relief funds`, 640, 178, 16, C.ink, 'center');
    text('Spend your funds on upgrades before the next storm:', 640, 214, 15, C.navy, 'center', true);
    UPGRADES.forEach((u, i) => {
      const c = UPGRADE_CARDS[i];
      const lvl = sim.upgrades[u.id];
      const price = upgradePrice(u, lvl);
      const maxed = lvl >= u.max;
      const afford = !maxed && sim.funds >= price;
      ctx.fillStyle = afford ? '#fff8ea' : '#ece4d2';
      rr(c.x, c.y, c.w, c.h, 10); ctx.fill();
      ctx.strokeStyle = afford ? C.orange : C.grey;
      ctx.lineWidth = 2;
      rr(c.x, c.y, c.w, c.h, 10); ctx.stroke();
      text(u.name, c.x + c.w / 2, c.y + 26, 15, C.navy, 'center', true);
      text(u.desc, c.x + c.w / 2, c.y + 58, 11, C.ink, 'center');
      text(u.desc.split(' ').length > 6 ? '' : '', c.x, c.y, 1, C.ink);
      text(`Level ${lvl}/${u.max}`, c.x + c.w / 2, c.y + 84, 12, C.grey, 'center');
      ctx.fillStyle = maxed ? C.green : afford ? C.orange : '#9aa7b1';
      rr(c.x + 45, c.y + 102, 130, 34, 7); ctx.fill();
      text(maxed ? 'MAXED' : `BUY $${price}`, c.x + c.w / 2, c.y + 120, 14, '#ffffff', 'center', true);
    });
    text(`FUNDS: $${Math.floor(sim.funds)}`, 640, 480, 16, C.orange, 'center', true);
    if (sim.stormIndex + 1 < STORMS.length) {
      text(`Next: STORM ${sim.stormIndex + 2}/6 — ${STORMS[sim.stormIndex + 1].name}`, 640, 512, 15, C.navy, 'center', true);
    }
    bigButton(BTN.nextStorm, `▶  START STORM ${sim.stormIndex + 2}`, 'or press SPACE');
  }

  function drawWin(sim, best) {
    dim();
    panel(340, 90, 600, 530);
    text('🏆 CITY SAVED!', 640, 170, 44, C.green, 'center', true);
    text('All 3 districts survived all 6 storms —', 640, 214, 16, C.ink, 'center');
    text('even THE DELUGE.', 640, 238, 16, C.ink, 'center', true);
    text(`DISTRICTS PROTECTED: 3/3`, 640, 288, 18, C.navy, 'center', true);
    text(`Water diverted: ${Math.round(sim.stats.diverted)}u  ·  Spilled safe: ${Math.round(sim.stats.spilled)}u`, 640, 320, 14, C.ink, 'center');
    text(`Cumulative flood: ${Math.round(sim.stats.damage)}%  ·  Spent: $${sim.stats.spent}`, 640, 346, 14, C.ink, 'center');
    text(`SCORE: ${Math.floor(sim.score)}`, 640, 392, 26, C.navy, 'center', true);
    text(`BEST: ${Math.max(best, Math.floor(sim.score))}`, 640, 424, 15, C.grey, 'center');
    bigButton(BTN.playAgain, '↻  PLAY AGAIN', 'or press R');
  }

  function drawLoss(sim, best) {
    dim();
    panel(340, 90, 600, 530);
    text('💧 DISTRICT LOST', 640, 170, 44, C.red, 'center', true);
    text(`${sim.lostDistrict || 'A district'} flooded to 100% on Storm ${sim.stormIndex + 1}/6.`, 640, 214, 16, C.ink, 'center');
    text('The water won this time — reroute faster,', 640, 240, 15, C.ink, 'center');
    text('watch the reservoirs, and mind the surges.', 640, 264, 15, C.ink, 'center');
    sim.districts.forEach((d, i) => {
      text(`${d.name}: ${d.lost ? 'FLOODED' : `${Math.round(d.flood)}% flood`}`, 640, 304 + i * 24, 14, d.lost ? C.red : C.ink, 'center', true);
    });
    text(`SCORE: ${Math.floor(sim.score)}`, 640, 404, 26, C.navy, 'center', true);
    text(`BEST: ${Math.max(best, Math.floor(sim.score))}`, 640, 436, 15, C.grey, 'center');
    bigButton(BTN.tryAgain, '↻  TRY AGAIN', 'or press R');
  }

  function drawPaused() {
    dim();
    panel(440, 280, 400, 160);
    text('⏸ PAUSED', 640, 330, 34, C.navy, 'center', true);
    text('Press P or click ▶ to resume.', 640, 372, 15, C.ink, 'center');
    text('R restarts · M mutes', 640, 398, 13, C.grey, 'center');
  }

  function draw(sim, best) {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = C.cream;
    ctx.fillRect(0, 0, W, H);
    drawMap(sim);
    drawLeftPanel(sim);
    drawRightPanel(sim);
    drawTopBar(sim, best);
    drawBottomBar(sim);
    if (sim.phase === PHASE_TITLE) drawTitle(sim, best);
    else if (sim.phase === PHASE_INTERMISSION) drawIntermission(sim);
    else if (sim.phase === PHASE_WIN) drawWin(sim, best);
    else if (sim.phase === PHASE_LOSS) drawLoss(sim, best);
    else if (sim.paused) drawPaused();
    // Mute state lives on the top bar; nothing else to draw.
  }

  return { draw, branchPath };
}
