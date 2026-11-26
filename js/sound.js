import { MUSIC_FILE } from './assets.js';
// Nybyggerne – syntetiske lydeffekter (Web Audio, ingen lydfiler)
let ac = null, master = null, sfx = null, amb = null, noiseBuf = null, ambientStarted = false, birdTimer = null;
let muted = false;
try { muted = localStorage.getItem('nyb-muted') === '1'; } catch (e) {}

function ctx() {
  if (!ac) {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(ac.destination);
    sfx = ac.createGain(); sfx.gain.value = 1; sfx.connect(master);
    amb = ac.createGain(); amb.gain.value = 0; amb.connect(master);
    const len = ac.sampleRate * 2;
    noiseBuf = ac.createBuffer(1, len, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
const rnd = (a, b) => a + Math.random() * (b - a);

function burst(t, o) {
  const { freq = 1000, q = 1, dur = 0.1, vol = 0.3, type = 'bandpass', attack = 0.003, sweepTo, out = sfx } = o;
  const src = ac.createBufferSource(); src.buffer = noiseBuf;
  const f = ac.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(out);
  src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.05);
}
function tone(t, o) {
  const { freq, dur = 0.3, vol = 0.2, type = 'sine', attack = 0.01, slideTo, vibrato = 0, lp, out = sfx } = o;
  const osc = ac.createOscillator(); osc.type = type; osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  if (vibrato) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = 5.5; lg.gain.value = vibrato; l.connect(lg).connect(osc.frequency); l.start(t); l.stop(t + dur + 0.1); }
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node = osc;
  if (lp) { const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; node = node.connect(f); }
  node.connect(g).connect(out);
  osc.start(t); osc.stop(t + dur + 0.05);
}
const knock = (t, freq, vol) => { burst(t, { freq, q: 6, dur: 0.07, vol }); tone(t, { freq: freq / 6, dur: 0.09, vol: vol * 0.5, attack: 0.002 }); };
const horn = (t, freq, dur, vol = 0.1) => { tone(t, { freq, dur, vol, type: 'sawtooth', attack: 0.06, lp: 1100, vibrato: 2.5 }); tone(t, { freq: freq / 2, dur, vol: vol * 0.6, type: 'triangle', attack: 0.06 }); };
const bell = (t, freq, vol = 0.12, dur = 1.4) => { tone(t, { freq, dur, vol, attack: 0.003 }); tone(t, { freq: freq * 2.76, dur: dur * 0.5, vol: vol * 0.35, attack: 0.003 }); tone(t, { freq: freq * 5.4, dur: dur * 0.25, vol: vol * 0.15, attack: 0.003 }); };

const SFX = {
  dice: t => {
    [[0.27, 0.6], [0.31, 0.35], [0.8, 0.45], [0.85, 0.25], [1.18, 0.3], [1.32, 0.2], [1.4, 0.12]].forEach(([dt, v]) => knock(t + dt + rnd(0, 0.02), rnd(1300, 2300), v));
    burst(t, { type: 'highpass', freq: 1500, dur: 0.18, vol: 0.06, sweepTo: 4000 });
  },
  road: t => { knock(t + 0.28, 700, 0.5); knock(t + 0.4, 560, 0.35); },
  build: t => { [0.28, 0.42, 0.56].forEach((dt, i) => knock(t + dt, 950 - i * 60, 0.45)); tone(t + 0.62, { freq: 110, dur: 0.18, vol: 0.25, attack: 0.003 }); },
  city: t => { SFX.build(t); bell(t + 0.75, 523, 0.1); bell(t + 0.95, 784, 0.08); },
  robber: t => {
    burst(t, { type: 'bandpass', freq: 300, q: 1.5, dur: 0.7, vol: 0.28, sweepTo: 1400 });
    tone(t, { freq: 98, dur: 0.9, vol: 0.12, type: 'sawtooth', lp: 380, slideTo: 73 });
    tone(t + 0.05, { freq: 147, dur: 0.8, vol: 0.06, type: 'sawtooth', lp: 380, slideTo: 104 });
  },
  chime: t => { [659, 784, 988].forEach((f, i) => bell(t + i * 0.11, f, 0.07, 0.8)); },
  coins: t => { for (let k = 0; k < 6; k++) { const f = rnd(2400, 3800); tone(t + k * 0.055 + rnd(0, 0.02), { freq: f, dur: 0.22, vol: 0.06, attack: 0.002 }); tone(t + k * 0.055, { freq: f * 1.5, dur: 0.12, vol: 0.025, attack: 0.002 }); } },
  card: t => { burst(t, { type: 'highpass', freq: 2200, dur: 0.11, vol: 0.22, sweepTo: 6500 }); burst(t + 0.09, { type: 'bandpass', freq: 3000, q: 0.8, dur: 0.07, vol: 0.12 }); },
  paper: t => { burst(t, { type: 'bandpass', freq: 1800, q: 0.6, dur: 0.25, vol: 0.12, sweepTo: 4200 }); },
  horn: t => { horn(t, 196, 0.42); horn(t + 0.36, 294, 0.75); },
  steal: t => { burst(t, { type: 'bandpass', freq: 500, q: 2, dur: 0.35, vol: 0.25, sweepTo: 3500 }); },
  fanfare: t => { [[262, 0], [330, 0.17], [392, 0.34], [523, 0.51]].forEach(([f, dt], i) => horn(t + dt, f, i === 3 ? 1.3 : 0.3, 0.11)); bell(t + 0.51, 1046, 0.08, 2); },
  badge: t => { bell(t, 880, 0.1); bell(t + 0.15, 1320, 0.08); },
  error: t => { tone(t, { freq: 150, dur: 0.18, vol: 0.18, slideTo: 95, attack: 0.004 }); },
  click: t => { burst(t, { type: 'highpass', freq: 3500, dur: 0.03, vol: 0.06 }); },
  discard: t => { SFX.card(t); SFX.card(t + 0.12); },
  tick: t => { knock(t, 1600, 0.22); },
  timeout: t => { bell(t, 220, 0.16, 2.2); bell(t + 0.02, 330, 0.08, 1.6); },
};

function startAmbient() {
  if (ambientStarted) return;
  ambientStarted = true;
  // Pejs: dyb, blød brummen + knitren og små knald
  const src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
  const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 180;
  const g = ac.createGain(); g.gain.value = 0.09;
  const lfo = ac.createOscillator(); lfo.frequency.value = 0.23;
  const lg = ac.createGain(); lg.gain.value = 0.03;
  lfo.connect(lg).connect(g.gain);
  src.connect(f).connect(g).connect(amb);
  src.start(); lfo.start();
  amb.gain.setValueAtTime(0.0001, ac.currentTime);
  amb.gain.exponentialRampToValueAtTime(1, ac.currentTime + 3);
  const crackle = () => {
    if (!muted && ac.state === 'running') {
      const t = ac.currentTime;
      const n = Math.random() < 0.15 ? 3 + Math.floor(Math.random() * 4) : 1;
      for (let k = 0; k < n; k++) burst(t + k * rnd(0.01, 0.05), { type: 'bandpass', freq: rnd(1800, 5200), q: rnd(0.8, 3), dur: rnd(0.008, 0.03), vol: rnd(0.02, Math.random() < 0.1 ? 0.12 : 0.05), out: amb });
      if (Math.random() < 0.04) burst(t, { type: 'lowpass', freq: 600, dur: 0.12, vol: 0.08, out: amb });
    }
    birdTimer = setTimeout(crackle, rnd(40, 320));
  };
  birdTimer = setTimeout(crackle, 500);
}

// Baggrundsmusik: "The Old Tower Inn" (assets/audio). Starter ved første klik (browsere kræver det)
// og følger lyd-knappen. Ret MUSIC_VOLUME for at gøre den højere eller lavere.
const MUSIC_VOLUME = 0.3;
let music = null;
function startMusic() {
  if (!music) { music = new Audio(MUSIC_FILE); music.loop = true; music.volume = MUSIC_VOLUME; }
  if (!muted && music.paused) music.play().catch(() => {});
}

export const Sound = {
  get muted() { return muted; },
  unlock() { try { ctx(); startAmbient(); } catch (e) {} startMusic(); },
  setMuted(m) {
    muted = m;
    if (music) { if (m) music.pause(); else music.play().catch(() => {}); }
    try { localStorage.setItem('nyb-muted', m ? '1' : '0'); } catch (e) {}
    if (master) master.gain.setTargetAtTime(m ? 0 : 0.9, ac.currentTime, 0.05);
  },
  play(name, delay = 0) {
    if (muted || !SFX[name]) return;
    try { ctx(); SFX[name](ac.currentTime + 0.01 + delay); } catch (e) {}
  },
};
