// Sound for the game, synthesised with Web Audio (no audio files to load):
// short effects for right/wrong answers and stamps, plus a soft koto-like
// background melody on a Japanese pentatonic scale (miyako-bushi).

let ctx = null;
let master = null;
let musicGain = null;
let musicTimer = null;
let musicOn = false;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.7;
  master.connect(ctx.destination);
  // Gentle echo shared by everything, for a bit of space
  const delay = ctx.createDelay(1);
  delay.delayTime.value = 0.28;
  const fb = ctx.createGain();
  fb.gain.value = 0.28;
  delay.connect(fb).connect(delay);
  delay.connect(master);
  master.echo = delay;
  musicGain = ctx.createGain();
  musicGain.gain.value = 0;
  musicGain.connect(master);
  musicGain.connect(delay);
  return ctx;
}

/** Call from a click: browsers only allow sound after the player interacts. */
export function unlockAudio() {
  const c = ensure();
  if (c && c.state === 'suspended') c.resume();
}

function pluck(freq, when, { dur = 1.2, vol = 0.25, out = master, type = 'triangle' } = {}) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(vol, when + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  o.connect(g).connect(out);
  o.start(when);
  o.stop(when + dur + 0.05);
}

function drum(when, { freq = 90, vol = 0.8, dur = 0.5 } = {}) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(freq * 2, when);
  o.frequency.exponentialRampToValueAtTime(freq, when + 0.12);
  g.gain.setValueAtTime(vol, when);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  o.connect(g).connect(master);
  o.start(when);
  o.stop(when + dur);
}

const note = (n) => 440 * Math.pow(2, (n - 69) / 12);

export const sfx = {
  correct() {
    if (!ensure()) return;
    const t = ctx.currentTime;
    pluck(note(76), t, { dur: 0.6, vol: 0.3 });
    pluck(note(83), t + 0.09, { dur: 0.9, vol: 0.3 });
  },
  wrong() {
    if (!ensure()) return;
    const t = ctx.currentTime;
    pluck(note(52), t, { dur: 0.4, vol: 0.25, type: 'square' });
    pluck(note(51), t + 0.12, { dur: 0.5, vol: 0.2, type: 'square' });
  },
  stamp() {
    if (!ensure()) return;
    const t = ctx.currentTime;
    drum(t, { freq: 70, vol: 1 });
    drum(t + 0.18, { freq: 110, vol: 0.5, dur: 0.3 });
  },
  levelUp() {
    if (!ensure()) return;
    const t = ctx.currentTime;
    [69, 72, 74, 76, 81].forEach((n, i) => pluck(note(n), t + i * 0.09, { dur: 0.9, vol: 0.25 }));
  },
  tap() {
    if (!ensure()) return;
    pluck(note(88), ctx.currentTime, { dur: 0.15, vol: 0.12, type: 'sine' });
  },
};

// Miyako-bushi scale on D: D Eb G A Bb
const SCALE = [62, 63, 67, 69, 70, 74, 75, 79];

export function setMusic(on) {
  musicOn = on;
  if (!ensure()) return;
  const t = ctx.currentTime;
  musicGain.gain.cancelScheduledValues(t);
  musicGain.gain.linearRampToValueAtTime(on ? 0.35 : 0, t + 1.2);
  if (on && !musicTimer) {
    let step = 0;
    let idx = 3;
    musicTimer = setInterval(() => {
      if (!musicOn) return;
      const now = ctx.currentTime + 0.05;
      // wandering melody with rests, a low drone every bar
      if (step % 8 === 0) pluck(note(50), now, { dur: 3, vol: 0.18, out: musicGain });
      if (Math.random() < 0.7) {
        idx = Math.max(0, Math.min(SCALE.length - 1, idx + Math.round((Math.random() - 0.5) * 3)));
        pluck(note(SCALE[idx]), now, { dur: 1.8, vol: 0.16, out: musicGain });
        if (Math.random() < 0.2) pluck(note(SCALE[idx] + 12), now + 0.15, { dur: 1.2, vol: 0.08, out: musicGain });
      }
      step++;
    }, 520);
  }
}

export const isMusicOn = () => musicOn;
