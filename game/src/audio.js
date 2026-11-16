// FLOODWORKS — sound: synthesized WebAudio, no audio files.
// One job: every blip, gurgle, alarm and stinger. Silent until the first
// user gesture creates the context; M toggles mute.

let ctx = null;
let muted = false;

export function setMuted(m) {
  muted = m;
}
export function isMuted() {
  return muted;
}

function audio() {
  if (muted) return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq, dur, type, vol, when, slideTo) {
  const c = audio();
  if (!c) return;
  try {
    const t0 = c.currentTime + (when || 0);
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.12, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(c.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  } catch {
    // Sound is garnish: never let it break the game.
  }
}

function noiseBurst(dur, vol, freq) {
  const c = audio();
  if (!c) return;
  try {
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = freq || 900;
    const g = c.createGain();
    g.gain.value = vol || 0.08;
    src.connect(f).connect(g).connect(c.destination);
    src.start();
  } catch {
    // Sound is garnish.
  }
}

/** Click blip: gate toggled, button pressed. */
export function sfxClick() {
  tone(660, 0.07, 'square', 0.06);
}

/** Water gurgle: a gate opens and water diverts. */
export function sfxGurgle() {
  tone(320, 0.35, 'sine', 0.1, 0, 140);
  noiseBurst(0.3, 0.05, 700);
}

/** Coin-ish chime: an upgrade is bought. */
export function sfxBuy() {
  tone(880, 0.1, 'sine', 0.1);
  tone(1318, 0.16, 'sine', 0.1, 0.09);
}

/** Two-tone alarm: a district is near flooding. */
export function sfxAlarm() {
  tone(520, 0.16, 'square', 0.07);
  tone(392, 0.16, 'square', 0.07, 0.18);
}

/** Surge warning swell. */
export function sfxSurge() {
  tone(220, 0.5, 'sawtooth', 0.06, 0, 440);
}

/** Storm-clear fanfare. */
export function sfxClear() {
  tone(523, 0.12, 'sine', 0.1);
  tone(659, 0.12, 'sine', 0.1, 0.1);
  tone(784, 0.22, 'sine', 0.12, 0.2);
}

/** Win stinger: city saved. */
export function sfxWin() {
  [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.3, 'sine', 0.12, i * 0.13));
}

/** Lose stinger: a district flooded. */
export function sfxLose() {
  tone(330, 0.4, 'sawtooth', 0.08, 0, 165);
  tone(220, 0.6, 'sawtooth', 0.08, 0.3, 110);
}
