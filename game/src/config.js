// FLOODWORKS — configuration: layout, storms, gates, upgrades, palette.
// One job: every number the rest of the game shares, so tuning lives here.

export const W = 1280;
export const H = 720;
export const BEST_KEY = 'floodworks_best';

// Layout: top bar, left panel, right panel, map, bottom bar.
export const TOP_H = 64;
export const BOT_H = 64;
export const LEFT_W = 196;
export const RIGHT_W = 196;
export const MAP = { x: LEFT_W, y: TOP_H, w: W - LEFT_W - RIGHT_W, h: H - TOP_H - BOT_H };
export const PANEL_L = { x: 0, y: TOP_H, w: LEFT_W, h: H - TOP_H - BOT_H };
export const PANEL_R = { x: W - RIGHT_W, y: TOP_H, w: RIGHT_W, h: H - TOP_H - BOT_H };

// Palette: daylight water + cream infrastructure + orange danger.
export const C = {
  navy: '#14324a',
  navy2: '#0e2438',
  cream: '#f2e8d5',
  cream2: '#e6d9bd',
  paper: '#faf3e3',
  water: '#1f7fd0',
  waterDeep: '#1460a8',
  waterLight: '#7cc4f2',
  channel: '#bcd9ee',
  channelBed: '#8fb8d8',
  orange: '#e86a1c',
  orangeSoft: '#f5a623',
  green: '#2e9e5b',
  red: '#d93a2b',
  gold: '#f2b705',
  ink: '#1c2b39',
  grey: '#6b7a88',
};

export const STEP = 1 / 60;
export const STORM_DURATION = 30; // seconds per storm
export const RESERVOIR_BASE_CAP = 60; // water units a reservoir holds
export const PUMP_BASE = 2; // units drained per second
export const PUMP_COST = 40; // emergency pump price
export const PUMP_DRAIN = 30; // units the emergency pump removes
export const PUMP_COOLDOWN = 20; // seconds
export const FLOOD_PER_UNIT = 1.0; // % flood per water unit reaching a district
export const EVAP_PER_SEC = 0.4; // % flood that recedes per second with no inflow
export const SPILLWAY_MAX = 5; // units/s the safe drain can take per channel
export const START_FUNDS = 100;

// The three channels: river inlets on the left, districts on the right.
export const CHANNELS = [
  { id: 0, name: 'NORTH CHANNEL', y: 150, inlet: 'NORTH INLET', district: 0 },
  { id: 1, name: 'WEST CHANNEL', y: 330, inlet: 'WEST INLET', district: 1 },
  { id: 2, name: 'SOUTH CHANNEL', y: 510, inlet: 'SOUTH INLET', district: 2 },
];
export const CHANNEL_X0 = MAP.x + 10;
export const CHANNEL_X1 = 990; // district left edge

// Districts the player protects (flood 0..100; 100 = lost).
export const DISTRICTS = [
  { name: 'OLD MILL', x: 990, y: 105, w: 86, h: 90, color: '#c98a2e' },
  { name: 'MARKET ROW', x: 990, y: 285, w: 86, h: 90, color: '#7a9e4b' },
  { name: 'LOWFIELD', x: 990, y: 465, w: 86, h: 90, color: '#b0563a' },
];

// Reservoirs that absorb diverted water.
export const RESERVOIRS = [
  { name: 'NORTH BASIN', x: 700, y: 84, w: 190, h: 56 },
  { name: 'EAST TANK', x: 700, y: 540, w: 190, h: 64 },
];

// Gates: click to open/close. target 'basin' | 'tank' | 'spill'.
export const GATES = [
  { id: 1, label: 'G1', x: 420, y: 150, channel: 0, target: 'basin', targetName: 'NORTH BASIN' },
  { id: 2, label: 'G2', x: 420, y: 330, channel: 1, target: 'basin', targetName: 'NORTH BASIN' },
  { id: 3, label: 'G3', x: 420, y: 510, channel: 2, target: 'tank', targetName: 'EAST TANK' },
  { id: 4, label: 'G4', x: 640, y: 150, channel: 0, target: 'spill', targetName: 'SPILLWAY' },
  { id: 5, label: 'G5', x: 640, y: 330, channel: 1, target: 'tank', targetName: 'EAST TANK' },
  { id: 6, label: 'G6', x: 640, y: 510, channel: 2, target: 'spill', targetName: 'SPILLWAY' },
];
export const GATE_R = 24;

// Six storms, escalating. inflow = units/second per channel [north, west, south].
// surges: named mid-storm bursts {at (s into storm), dur, channel, extra u/s, name}.
export const STORMS = [
  {
    name: 'FIRST RAINS', inflow: [2, 2, 2],
    surges: [{ at: 12, dur: 6, channel: 1, extra: 3, name: 'Market Rush', units: 18 }],
  },
  {
    name: 'RISING RIVER', inflow: [3, 3, 3],
    surges: [
      { at: 8, dur: 6, channel: 0, extra: 4, name: 'Millrace Rush', units: 24 },
      { at: 20, dur: 6, channel: 2, extra: 4, name: 'Lowfield Swell', units: 24 },
    ],
  },
  {
    name: 'BLACKWATER SURGE', inflow: [4, 4, 4],
    surges: [
      { at: 6, dur: 8, channel: 1, extra: 5, name: 'Blackwater Surge', units: 40 },
      { at: 18, dur: 8, channel: 0, extra: 5, name: 'North Torrent', units: 40 },
    ],
  },
  {
    name: 'THE LONG DOWNPOUR', inflow: [5, 5, 5],
    surges: [
      { at: 5, dur: 8, channel: 2, extra: 6, name: 'South Deluge', units: 48 },
      { at: 15, dur: 8, channel: 1, extra: 6, name: 'Blackwater Surge', units: 48 },
      { at: 24, dur: 5, channel: 0, extra: 6, name: 'Millrace Rush', units: 30 },
    ],
  },
  {
    name: 'CRESTFALL', inflow: [6, 6, 6],
    surges: [
      { at: 4, dur: 8, channel: 0, extra: 7, name: 'Crest Breaker', units: 56 },
      { at: 13, dur: 8, channel: 2, extra: 7, name: 'Lowfield Swell', units: 56 },
      { at: 22, dur: 6, channel: 1, extra: 7, name: 'Blackwater Surge', units: 42 },
    ],
  },
  {
    name: 'THE DELUGE', inflow: [7, 7, 7],
    surges: [
      { at: 3, dur: 9, channel: 1, extra: 8, name: 'THE DELUGE', units: 72 },
      { at: 12, dur: 9, channel: 0, extra: 8, name: 'Crest Breaker', units: 72 },
      { at: 21, dur: 8, channel: 2, extra: 8, name: 'Final Torrent', units: 64 },
    ],
  },
];

// Upgrades bought between storms (and any time funds allow).
export const UPGRADES = [
  {
    id: 'levee', name: 'REINFORCE LEVEE', base: 80, step: 40, max: 3,
    desc: 'Districts take 25% less flood per level.',
  },
  {
    id: 'dredge', name: 'DREDGE CHANNEL', base: 60, step: 30, max: 3,
    desc: '+25 reservoir capacity, +25% divert funds per level.',
  },
  {
    id: 'pump', name: 'EXTRA PUMP', base: 120, step: 60, max: 3,
    desc: 'Pumps drain +4 units/s per level.',
  },
];
export function upgradePrice(u, level) {
  return u.base + u.step * level;
}

// Buttons shared by render + input (same rects, one source of truth).
export const BTN = {
  start: { x: 490, y: 520, w: 300, h: 64 },
  nextStorm: { x: 490, y: 560, w: 300, h: 56 },
  playAgain: { x: 490, y: 540, w: 300, h: 60 },
  tryAgain: { x: 490, y: 540, w: 300, h: 60 },
  pump: { x: W - RIGHT_W + 12, y: 560, w: 172, h: 44 },
  pause: { x: W - 116, y: 12, w: 100, h: 40 },
};
export const UPGRADE_CARDS = [
  { x: 290, y: 300, w: 220, h: 150 },
  { x: 530, y: 300, w: 220, h: 150 },
  { x: 770, y: 300, w: 220, h: 150 },
];
// Bottom-bar gate chips + upgrade chips (drawn by render, hit-tested by input).
export function gateChipRect(i) {
  return { x: 206 + i * 92, y: 664, w: 84, h: 48 };
}
export function upgradeChipRect(i) {
  return { x: 800 + i * 148, y: 664, w: 140, h: 48 };
}
