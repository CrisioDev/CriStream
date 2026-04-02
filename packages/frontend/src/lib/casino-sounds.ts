/**
 * Casino Sound Engine — Rich synthesized sounds via Web Audio API
 * Multiple layered oscillators, filters, envelopes for authentic casino feel.
 * No external files needed.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;

function ac(): AudioContext {
  if (!ctx) { ctx = new AudioContext(); master = ctx.createGain(); master.gain.value = 0.4; master.connect(ctx.destination); }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}
function mg(): GainNode { ac(); return master!; }

function osc(freq: number, type: OscillatorType, dur: number, gain: number, delay = 0, freqEnd?: number) {
  const c = ac(); const t = c.currentTime + delay;
  const o = c.createOscillator(); const g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (freqEnd) o.frequency.linearRampToValueAtTime(freqEnd, t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(mg());
  o.start(t); o.stop(t + dur);
}

function noise(dur: number, gain: number, delay = 0, filterFreq?: number) {
  const c = ac(); const t = c.currentTime + delay;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource(); src.buffer = buf;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  if (filterFreq) {
    const f = c.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = filterFreq; f.Q.value = 2;
    src.connect(f); f.connect(g);
  } else { src.connect(g); }
  g.connect(mg()); src.start(t); src.stop(t + dur);
}

function chord(freqs: number[], type: OscillatorType, dur: number, gain: number, delay = 0) {
  for (const f of freqs) osc(f, type, dur, gain / freqs.length, delay);
}

export const casinoSounds = {
  init() { ac(); },
  get mute() { return muted; },
  setMute(m: boolean) { muted = m; localStorage.setItem("casino-mute", m ? "1" : "0"); },

  // ── UI ──
  click() {
    if (muted) return;
    osc(800, "square", 0.04, 0.08);
    osc(1200, "sine", 0.03, 0.05, 0.01);
  },

  toggle() {
    if (muted) return;
    osc(1000, "sine", 0.06, 0.1);
    osc(1500, "sine", 0.04, 0.06, 0.03);
  },

  // ── Slot Machine ──
  spin() {
    if (muted) return;
    // Rapid mechanical ticker — like a reel spinning
    for (let i = 0; i < 12; i++) {
      osc(600 + Math.random() * 200, "square", 0.025, 0.06, i * 0.035);
      noise(0.015, 0.03, i * 0.035, 3000);
    }
  },

  // ── Coin Flip ──
  coinFlip() {
    if (muted) return;
    // Metallic coin toss + ring
    osc(2400, "triangle", 0.08, 0.15);
    osc(3600, "sine", 0.12, 0.08, 0.02);
    osc(1800, "triangle", 0.06, 0.06, 0.05);
    noise(0.04, 0.08, 0, 5000);
  },

  // ── Scratch Card ──
  scratch() {
    if (muted) return;
    noise(0.25, 0.12, 0, 2000);
    noise(0.15, 0.06, 0.05, 4000);
  },

  reveal() {
    if (muted) return;
    // Quick sparkle reveal
    osc(1200, "sine", 0.08, 0.12);
    osc(1800, "sine", 0.06, 0.08, 0.03);
    osc(2400, "sine", 0.05, 0.05, 0.06);
  },

  // ── Win Sounds ──
  win() {
    if (muted) return;
    // Classic casino win — ascending bright chime
    const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
    for (let i = 0; i < notes.length; i++) {
      osc(notes[i]!, "sine", 0.2 - i * 0.02, 0.15, i * 0.08);
      osc(notes[i]! * 2, "sine", 0.15, 0.04, i * 0.08); // harmonic
    }
    // Shimmer
    noise(0.1, 0.03, 0.25, 6000);
  },

  bigWin() {
    if (muted) return;
    // Triumphant fanfare with rich harmonics
    const notes = [523, 587, 659, 784, 880, 1047]; // C5 D5 E5 G5 A5 C6
    for (let i = 0; i < notes.length; i++) {
      osc(notes[i]!, "sine", 0.35 - i * 0.03, 0.12, i * 0.07);
      osc(notes[i]! * 1.5, "sine", 0.25, 0.04, i * 0.07); // fifth
      osc(notes[i]! * 2, "triangle", 0.2, 0.03, i * 0.07); // octave
    }
    // Sparkle shower
    for (let i = 0; i < 8; i++) {
      osc(2000 + Math.random() * 3000, "sine", 0.08, 0.03, 0.3 + i * 0.05);
    }
    noise(0.3, 0.04, 0.4, 8000);
  },

  // ── Loss ──
  loss() {
    if (muted) return;
    // Sad descending tones
    osc(400, "sine", 0.3, 0.12, 0, 180);
    osc(350, "triangle", 0.25, 0.06, 0.05, 120);
    osc(300, "sine", 0.2, 0.04, 0.1, 100);
  },

  // ── Jackpot! ──
  jackpot() {
    if (muted) return;
    // EPIC siren + coin rain + fanfare
    // Siren
    for (let i = 0; i < 6; i++) {
      osc(800, "sawtooth", 0.15, 0.08, i * 0.2, 1600);
      osc(1600, "sawtooth", 0.15, 0.08, i * 0.2 + 0.1, 800);
    }
    // Fanfare chord
    chord([523, 659, 784, 1047], "sine", 0.8, 0.25, 0.1);
    chord([587, 740, 880, 1175], "sine", 0.6, 0.2, 0.5);
    chord([659, 784, 988, 1319], "sine", 1.0, 0.25, 0.8);
    // Coin shower
    for (let i = 0; i < 20; i++) {
      const t = 0.2 + i * 0.08;
      osc(2000 + Math.random() * 4000, "triangle", 0.06, 0.04, t);
      noise(0.03, 0.02, t, 6000 + Math.random() * 4000);
    }
  },

  // ── Double or Nothing ──
  double() {
    if (muted) return;
    // Suspenseful heartbeat bass
    osc(55, "sine", 0.15, 0.25);
    osc(55, "sine", 0.12, 0.2, 0.2);
    osc(110, "sine", 0.08, 0.08, 0.0);
    osc(110, "sine", 0.06, 0.06, 0.2);
    // Tension riser
    osc(200, "sawtooth", 0.5, 0.04, 0, 600);
  },

  // ── All-In ──
  allIn() {
    if (muted) return;
    // Dramatic rising tension sweep
    osc(80, "sawtooth", 0.8, 0.1, 0, 500);
    osc(60, "sawtooth", 0.9, 0.06, 0, 400);
    // Timpani rolls
    for (let i = 0; i < 8; i++) {
      osc(80 + i * 10, "sine", 0.08, 0.1 + i * 0.01, i * 0.09);
    }
    // Final hit
    osc(60, "sine", 0.3, 0.2, 0.75);
    noise(0.15, 0.08, 0.75, 200);
  },

  // ── Special Event ──
  special() {
    if (muted) return;
    // Magical sparkle sweep
    osc(1500, "sine", 0.4, 0.1, 0, 4000);
    osc(2000, "sine", 0.35, 0.06, 0.05, 5000);
    // Twinkle particles
    for (let i = 0; i < 6; i++) {
      osc(3000 + Math.random() * 3000, "sine", 0.06, 0.04, i * 0.06);
    }
    noise(0.15, 0.03, 0.1, 8000);
  },

  // ── Quest Complete ──
  questComplete() {
    if (muted) return;
    // RPG level-up: quick ascending arpeggio
    const notes = [523, 659, 784, 1047, 1319]; // C5 E5 G5 C6 E6
    for (let i = 0; i < notes.length; i++) {
      osc(notes[i]!, "sine", 0.15, 0.12, i * 0.06);
      osc(notes[i]! * 2, "sine", 0.1, 0.03, i * 0.06);
    }
    // Final shimmer
    chord([1047, 1319, 1568], "sine", 0.4, 0.12, 0.3);
    noise(0.1, 0.02, 0.35, 6000);
  },

  // ── Achievement ──
  achievement() {
    if (muted) return;
    // Triumphant brass chord with drum hit
    noise(0.08, 0.15, 0, 300); // drum hit
    chord([262, 330, 392, 523], "sawtooth", 1.0, 0.15, 0.05); // C4 E4 G4 C5
    chord([330, 392, 523, 659], "sine", 0.8, 0.1, 0.3); // resolve up
    // Sparkle trail
    for (let i = 0; i < 5; i++) {
      osc(2000 + i * 500, "sine", 0.08, 0.03, 0.5 + i * 0.08);
    }
  },

  // ── Pet Sounds ──
  walk() {
    if (muted) return;
    // Quick paw patter
    for (let i = 0; i < 6; i++) {
      noise(0.025, 0.08, i * 0.06, 3000 + Math.random() * 2000);
      osc(300 + Math.random() * 100, "sine", 0.02, 0.04, i * 0.06);
    }
  },

  feed() {
    if (muted) return;
    // Chomp chomp
    for (let i = 0; i < 3; i++) {
      osc(180, "square", 0.04, 0.12, i * 0.12);
      osc(120, "sine", 0.06, 0.08, i * 0.12 + 0.02);
      noise(0.03, 0.05, i * 0.12, 1500);
    }
  },

  poop() {
    if (muted) return;
    // Comic splat
    noise(0.12, 0.15, 0, 800);
    osc(80, "sine", 0.15, 0.12, 0.02, 40);
    osc(200, "square", 0.05, 0.06);
    // Wet squish
    noise(0.08, 0.06, 0.1, 1200);
  },

  // ── Points / Cash ──
  points() {
    if (muted) return;
    // Cash register cha-ching
    osc(2200, "sine", 0.05, 0.1);
    osc(2800, "sine", 0.05, 0.1, 0.06);
    osc(3200, "triangle", 0.08, 0.06, 0.1);
    noise(0.04, 0.04, 0.05, 5000);
  },

  // ── Error ──
  error() {
    if (muted) return;
    osc(150, "sawtooth", 0.25, 0.12);
    osc(140, "square", 0.2, 0.06, 0.05);
  },

  // ── Slot Reel Stop (mechanical thunk + click) ──
  reelStop() {
    if (muted) return;
    osc(200, "square", 0.06, 0.15);
    osc(400, "triangle", 0.04, 0.08, 0.02);
    noise(0.04, 0.1, 0, 2000);
  },

  // ── Win Line (bright sparkle sweep for matching reels) ──
  winLine() {
    if (muted) return;
    const notes = [784, 988, 1175, 1568]; // G5 B5 D6 G6
    for (let i = 0; i < notes.length; i++) {
      osc(notes[i]!, "sine", 0.25, 0.1, i * 0.06);
      osc(notes[i]! * 2, "sine", 0.15, 0.03, i * 0.06);
    }
    noise(0.2, 0.04, 0.2, 8000);
  },

  // ── Typewriter tick (for visual novel) ──
  typewriterTick() {
    if (muted) return;
    osc(1400 + Math.random() * 400, "square", 0.015, 0.03);
  },

  // ── Casino Run: stage clear ──
  stageClear() {
    if (muted) return;
    osc(523, "sine", 0.12, 0.12);
    osc(659, "sine", 0.12, 0.1, 0.08);
    osc(784, "sine", 0.15, 0.12, 0.16);
    osc(1047, "sine", 0.25, 0.15, 0.24);
    noise(0.08, 0.03, 0.3, 6000);
  },

  // ── Casino Run: game over ──
  runGameOver() {
    if (muted) return;
    osc(300, "sawtooth", 0.4, 0.1, 0, 100);
    osc(250, "sine", 0.35, 0.08, 0.1, 80);
    noise(0.2, 0.06, 0.2, 400);
  },

  // ── Guild Boss hit ──
  bossHit() {
    if (muted) return;
    osc(100, "sawtooth", 0.12, 0.15);
    noise(0.08, 0.12, 0, 1000);
    osc(80, "sine", 0.15, 0.1, 0.05);
  },

  // ── Challenge complete ──
  challengeComplete() {
    if (muted) return;
    chord([523, 659, 784], "sine", 0.3, 0.15);
    chord([659, 784, 1047], "sine", 0.4, 0.15, 0.2);
    for (let i = 0; i < 6; i++) {
      osc(2000 + Math.random() * 3000, "sine", 0.06, 0.04, 0.3 + i * 0.05);
    }
  },
};
