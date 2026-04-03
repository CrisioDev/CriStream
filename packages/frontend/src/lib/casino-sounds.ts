/**
 * CRISINO SFX Engine v2
 *
 * Professional synthesized casino sounds with:
 * - SFX reverb bus (short room reverb for space)
 * - Layered sounds (body + transient + tail)
 * - Sub-bass impacts on big events
 * - Proper ADSR envelopes
 * - Metallic resonance on coin sounds
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfxReverb: ConvolverNode | null = null;
let sfxReverbGain: GainNode | null = null;
let sfxDry: GainNode | null = null;
let muted = false;

function ac(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.45;

    // SFX reverb (short room — 0.6s)
    sfxReverb = ctx.createConvolver();
    sfxReverb.buffer = createSfxReverbIR(0.6);
    sfxReverbGain = ctx.createGain();
    sfxReverbGain.gain.value = 0.25;
    sfxReverb.connect(sfxReverbGain);
    sfxReverbGain.connect(master);

    // Dry path
    sfxDry = ctx.createGain();
    sfxDry.gain.value = 1;
    sfxDry.connect(master);

    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function createSfxReverbIR(duration: number): AudioBuffer {
  const c = ac();
  const len = Math.floor(c.sampleRate * duration);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    const preDelay = Math.floor(c.sampleRate * 0.008);
    for (let i = 0; i < preDelay; i++) data[i] = 0;
    for (let i = preDelay; i < len; i++) {
      const t = (i - preDelay) / (len - preDelay);
      // Fast HF decay, slower LF
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3) * 0.4;
      if (i > preDelay + 97) data[i] += data[i - 97]! * 0.15;
    }
  }
  return buf;
}

// ── Core: route through reverb + dry ──
function sfx(): GainNode { ac(); return sfxDry!; }
function wet(): ConvolverNode { ac(); return sfxReverb!; }

// ── Primitives with reverb routing ──

/** Oscillator → dry + reverb send */
function tone(freq: number, type: OscillatorType, dur: number, gain: number, delay = 0, freqEnd?: number, reverbAmt = 0.3) {
  const c = ac(); const t = c.currentTime + delay;
  const o = c.createOscillator(); const g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (freqEnd) o.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.003); // fast attack
  g.gain.setValueAtTime(gain, t + dur * 0.6);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g);
  // Split to dry + reverb
  const dryG = c.createGain(); dryG.gain.value = 1 - reverbAmt;
  const wetG = c.createGain(); wetG.gain.value = reverbAmt;
  g.connect(dryG); dryG.connect(sfx());
  g.connect(wetG); wetG.connect(wet());
  o.start(t); o.stop(t + dur + 0.01);
}

/** Noise burst → dry + reverb */
function noiseBurst(dur: number, gain: number, delay = 0, filterFreq?: number, filterType: BiquadFilterType = "bandpass", reverbAmt = 0.2) {
  const c = ac(); const t = c.currentTime + delay;
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource(); src.buffer = buf;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  let node: AudioNode = src;
  if (filterFreq) {
    const f = c.createBiquadFilter(); f.type = filterType; f.frequency.value = filterFreq; f.Q.value = 1.5;
    src.connect(f); node = f;
  }
  node.connect(g);
  const dryG = c.createGain(); dryG.gain.value = 1 - reverbAmt;
  const wetG = c.createGain(); wetG.gain.value = reverbAmt;
  g.connect(dryG); dryG.connect(sfx());
  g.connect(wetG); wetG.connect(wet());
  src.start(t); src.stop(t + dur + 0.01);
}

/** Sub-bass impact (sine pitch drop) */
function subImpact(gain = 0.15, delay = 0) {
  tone(80, "sine", 0.25, gain, delay, 25, 0);
  noiseBurst(0.06, gain * 0.4, delay, 200, "lowpass", 0);
}

/** Metallic ring (detuned high partials) */
function metalRing(baseFreq: number, gain: number, dur: number, delay = 0) {
  const partials = [1, 1.34, 1.67, 2.01, 2.83]; // inharmonic = metallic
  for (const p of partials) {
    tone(baseFreq * p, "sine", dur * (1 / p), gain / partials.length, delay, undefined, 0.4);
  }
}

/** Chord with reverb */
function chordWet(freqs: number[], type: OscillatorType, dur: number, gain: number, delay = 0, reverb = 0.5) {
  for (const f of freqs) tone(f, type, dur, gain / freqs.length, delay, undefined, reverb);
}

// ══════════════════════════════════════════════
// PUBLIC API
// ══════════════════════════════════════════════

export const casinoSounds = {
  init() { ac(); },
  get mute() { return muted; },
  setMute(m: boolean) { muted = m; localStorage.setItem("casino-mute", m ? "1" : "0"); },

  // ── UI ──
  click() {
    if (muted) return;
    tone(1200, "sine", 0.03, 0.06, 0, undefined, 0.1);
    tone(1800, "sine", 0.02, 0.03, 0.008, undefined, 0.1);
  },

  toggle() {
    if (muted) return;
    tone(1000, "sine", 0.06, 0.08);
    tone(1500, "sine", 0.04, 0.05, 0.025);
  },

  // ── Whoosh (tab switch, UI transitions) ──
  whoosh() {
    if (muted) return;
    noiseBurst(0.15, 0.06, 0, 3000, "bandpass", 0.3);
    tone(400, "sine", 0.1, 0.02, 0, 1200, 0.2);
  },

  // ── Slot Machine ──
  spin() {
    if (muted) return;
    for (let i = 0; i < 10; i++) {
      tone(500 + Math.random() * 300, "square", 0.02, 0.04, i * 0.035, undefined, 0.15);
      noiseBurst(0.012, 0.025, i * 0.035, 4000, "highpass", 0.1);
    }
  },

  reelStop() {
    if (muted) return;
    // Mechanical thunk with body
    subImpact(0.06);
    tone(250, "square", 0.04, 0.1, 0, undefined, 0.2);
    metalRing(800, 0.04, 0.08, 0.01);
    noiseBurst(0.03, 0.08, 0, 2500, "bandpass", 0.15);
  },

  winLine() {
    if (muted) return;
    // Bright ascending with reverb tail
    const notes = [784, 988, 1175, 1568];
    for (let i = 0; i < notes.length; i++) {
      tone(notes[i]!, "sine", 0.3, 0.08, i * 0.06, undefined, 0.5);
      tone(notes[i]! * 2, "sine", 0.2, 0.02, i * 0.06, undefined, 0.6); // shimmer
    }
    noiseBurst(0.25, 0.03, 0.2, 8000, "highpass", 0.5); // sparkle tail
  },

  // ── Coin Flip ──
  coinFlip() {
    if (muted) return;
    // Metallic coin with proper ring
    metalRing(2400, 0.08, 0.15);
    tone(3600, "sine", 0.1, 0.04, 0.02, undefined, 0.3);
    noiseBurst(0.03, 0.06, 0, 6000, "highpass", 0.2);
    // Spinning whoosh
    tone(800, "sine", 0.08, 0.02, 0.01, 2000, 0.15);
  },

  // ── Scratch Card ──
  scratch() {
    if (muted) return;
    noiseBurst(0.2, 0.1, 0, 2500, "bandpass", 0.15);
    noiseBurst(0.12, 0.04, 0.04, 5000, "bandpass", 0.1);
  },

  reveal() {
    if (muted) return;
    // Sparkle reveal with shimmer
    tone(1200, "sine", 0.1, 0.1, 0, undefined, 0.4);
    tone(1800, "sine", 0.08, 0.06, 0.025, undefined, 0.4);
    tone(2400, "sine", 0.06, 0.04, 0.05, undefined, 0.5);
    metalRing(3000, 0.02, 0.06, 0.06);
  },

  // ── Win (small) ──
  win() {
    if (muted) return;
    const notes = [523, 659, 784, 1047];
    for (let i = 0; i < notes.length; i++) {
      tone(notes[i]!, "sine", 0.25, 0.1, i * 0.07, undefined, 0.4);
      tone(notes[i]! * 2, "sine", 0.15, 0.025, i * 0.07, undefined, 0.5);
    }
    // Subtle sub thump on landing
    subImpact(0.04, 0.28);
    noiseBurst(0.12, 0.025, 0.28, 7000, "highpass", 0.5);
  },

  // ── Big Win ──
  bigWin() {
    if (muted) return;
    // Fanfare with sub bass + rich harmonics
    const notes = [523, 587, 659, 784, 880, 1047];
    for (let i = 0; i < notes.length; i++) {
      tone(notes[i]!, "sine", 0.4, 0.09, i * 0.065, undefined, 0.45);
      tone(notes[i]! * 1.5, "sine", 0.3, 0.03, i * 0.065, undefined, 0.5); // 5th
      tone(notes[i]! * 2, "triangle", 0.25, 0.02, i * 0.065, undefined, 0.5); // octave
    }
    // Sub impact
    subImpact(0.12, 0.1);
    // Sparkle shower with reverb
    for (let i = 0; i < 10; i++) {
      const t = 0.3 + i * 0.045;
      tone(2000 + Math.random() * 3000, "sine", 0.1, 0.025, t, undefined, 0.6);
      noiseBurst(0.04, 0.012, t, 8000 + Math.random() * 4000, "highpass", 0.5);
    }
  },

  // ── Loss ──
  loss() {
    if (muted) return;
    // Sad descending with weight
    tone(400, "sine", 0.35, 0.09, 0, 150, 0.35);
    tone(350, "triangle", 0.3, 0.04, 0.04, 100, 0.3);
    tone(300, "sine", 0.25, 0.03, 0.08, 80, 0.25);
    // Low thud
    tone(60, "sine", 0.2, 0.06, 0.1, 30, 0);
  },

  // ── Jackpot ──
  jackpot() {
    if (muted) return;
    // MASSIVE sub impact
    subImpact(0.2);
    // Siren
    for (let i = 0; i < 5; i++) {
      tone(800, "sawtooth", 0.15, 0.05, i * 0.2, 1600, 0.3);
      tone(1600, "sawtooth", 0.15, 0.05, i * 0.2 + 0.1, 800, 0.3);
    }
    // Fanfare chords with reverb
    chordWet([523, 659, 784, 1047], "sine", 0.8, 0.2, 0.1, 0.6);
    chordWet([587, 740, 880, 1175], "sine", 0.6, 0.15, 0.5, 0.6);
    chordWet([659, 784, 988, 1319], "sine", 1.0, 0.2, 0.8, 0.7);
    // Coin rain
    for (let i = 0; i < 20; i++) {
      const t = 0.2 + i * 0.07;
      metalRing(2000 + Math.random() * 4000, 0.02, 0.05, t);
    }
  },

  // ── Double or Nothing ──
  double() {
    if (muted) return;
    subImpact(0.1);
    tone(55, "sine", 0.12, 0.15, 0.15, undefined, 0);
    tone(200, "sawtooth", 0.5, 0.03, 0, 600, 0.25);
  },

  // ── All-In ──
  allIn() {
    if (muted) return;
    // Rising tension with filtered sweep
    tone(60, "sawtooth", 0.9, 0.06, 0, 400, 0.2);
    tone(50, "sawtooth", 1.0, 0.04, 0, 350, 0.15);
    // Timpani hits
    for (let i = 0; i < 8; i++) {
      subImpact(0.04 + i * 0.008, i * 0.09);
    }
    // Final slam
    subImpact(0.15, 0.75);
    noiseBurst(0.12, 0.06, 0.75, 300, "lowpass", 0.1);
  },

  // ── Special Event ──
  special() {
    if (muted) return;
    tone(1500, "sine", 0.4, 0.07, 0, 4000, 0.5);
    tone(2000, "sine", 0.35, 0.04, 0.04, 5000, 0.6);
    for (let i = 0; i < 6; i++) {
      tone(3000 + Math.random() * 3000, "sine", 0.08, 0.03, i * 0.05, undefined, 0.5);
    }
    noiseBurst(0.15, 0.02, 0.1, 8000, "highpass", 0.5);
  },

  // ── Quest Complete ──
  questComplete() {
    if (muted) return;
    const notes = [523, 659, 784, 1047, 1319];
    for (let i = 0; i < notes.length; i++) {
      tone(notes[i]!, "sine", 0.18, 0.1, i * 0.055, undefined, 0.45);
      tone(notes[i]! * 2, "sine", 0.12, 0.025, i * 0.055, undefined, 0.5);
    }
    chordWet([1047, 1319, 1568], "sine", 0.5, 0.1, 0.28, 0.6);
    subImpact(0.04, 0.28);
  },

  // ── Achievement ──
  achievement() {
    if (muted) return;
    subImpact(0.1);
    noiseBurst(0.06, 0.1, 0, 400, "lowpass", 0.15); // drum
    chordWet([262, 330, 392, 523], "sawtooth", 1.0, 0.1, 0.04, 0.55);
    chordWet([330, 392, 523, 659], "sine", 0.8, 0.08, 0.3, 0.6);
    for (let i = 0; i < 6; i++) {
      tone(2000 + i * 400, "sine", 0.1, 0.025, 0.5 + i * 0.07, undefined, 0.5);
    }
  },

  // ── Points / Cash ──
  points() {
    if (muted) return;
    metalRing(2200, 0.06, 0.04);
    metalRing(2800, 0.06, 0.04, 0.05);
    tone(3200, "triangle", 0.06, 0.04, 0.09, undefined, 0.3);
  },

  // ── Pet Sounds ──
  walk() {
    if (muted) return;
    for (let i = 0; i < 6; i++) {
      noiseBurst(0.02, 0.06, i * 0.06, 3000 + Math.random() * 2000, "bandpass", 0.15);
      tone(300 + Math.random() * 100, "sine", 0.018, 0.03, i * 0.06, undefined, 0.1);
    }
  },

  feed() {
    if (muted) return;
    for (let i = 0; i < 3; i++) {
      tone(180, "square", 0.035, 0.08, i * 0.11, undefined, 0.1);
      tone(120, "sine", 0.05, 0.06, i * 0.11 + 0.015, undefined, 0.05);
      noiseBurst(0.025, 0.04, i * 0.11, 1500, "bandpass", 0.1);
    }
  },

  poop() {
    if (muted) return;
    noiseBurst(0.1, 0.1, 0, 800, "bandpass", 0.1);
    tone(80, "sine", 0.12, 0.08, 0.015, 35, 0);
    noiseBurst(0.06, 0.04, 0.08, 1200, "bandpass", 0.1);
  },

  // ── Error ──
  error() {
    if (muted) return;
    tone(150, "sawtooth", 0.2, 0.08, 0, undefined, 0.2);
    tone(140, "square", 0.15, 0.04, 0.04, undefined, 0.15);
  },

  // ── Typewriter (visual novel) ──
  typewriterTick() {
    if (muted) return;
    tone(1400 + Math.random() * 400, "square", 0.012, 0.02, 0, undefined, 0.05);
  },

  // ── Casino Run ──
  stageClear() {
    if (muted) return;
    const notes = [523, 659, 784, 1047];
    for (let i = 0; i < notes.length; i++) {
      tone(notes[i]!, "sine", 0.15, 0.1, i * 0.07, undefined, 0.45);
    }
    subImpact(0.05, 0.28);
    noiseBurst(0.1, 0.025, 0.28, 6000, "highpass", 0.4);
  },

  runGameOver() {
    if (muted) return;
    tone(300, "sawtooth", 0.4, 0.07, 0, 80, 0.3);
    tone(250, "sine", 0.35, 0.05, 0.08, 60, 0.25);
    subImpact(0.08, 0.15);
  },

  // ── Guild Boss ──
  bossHit() {
    if (muted) return;
    subImpact(0.1);
    noiseBurst(0.06, 0.08, 0, 1200, "bandpass", 0.2);
    tone(80, "sine", 0.12, 0.07, 0.03, undefined, 0.1);
  },

  // ── Challenge complete ──
  challengeComplete() {
    if (muted) return;
    subImpact(0.06);
    chordWet([523, 659, 784], "sine", 0.35, 0.12, 0, 0.5);
    chordWet([659, 784, 1047], "sine", 0.45, 0.12, 0.18, 0.55);
    for (let i = 0; i < 6; i++) {
      tone(2000 + Math.random() * 3000, "sine", 0.08, 0.03, 0.3 + i * 0.04, undefined, 0.5);
    }
  },

  // ── Impact (for screen shake moments) ──
  impact() {
    if (muted) return;
    subImpact(0.18);
    noiseBurst(0.08, 0.12, 0, 500, "lowpass", 0.1);
  },

  // ── Count Up (for animated points) ──
  countTick() {
    if (muted) return;
    tone(1800 + Math.random() * 200, "sine", 0.01, 0.02, 0, undefined, 0);
  },

  // ── Legacy stubs (ambient replaced by casino-music.ts) ──
  startAmbient() {},
  stopAmbient() {},
  get isAmbientPlaying() { return false; },
};
