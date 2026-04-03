/**
 * CRISINO Adaptive Music Engine
 *
 * 3 intensity layers that crossfade based on game state:
 * - Chill: default ambient, soft pads, occasional arpeggios
 * - Active: rhythmic elements, brighter, during active gameplay
 * - Intense: driving bass, fast arpeggios, combo chains / all-in
 *
 * Plus event-driven stingers that layer on top.
 */

type Intensity = "chill" | "active" | "intense";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let running = false;

// Layer gain nodes
let chillGain: GainNode | null = null;
let activeGain: GainNode | null = null;
let intenseGain: GainNode | null = null;
let stingerGain: GainNode | null = null;

// All managed nodes for cleanup
let allNodes: (OscillatorNode | AudioBufferSourceNode)[] = [];
let allGains: GainNode[] = [];
let arpeggioTimer: any = null;
let pulseTimer: any = null;

// Current state
let currentIntensity: Intensity = "chill";
let comboLevel = 0;

// ── Scales & Harmony ──
// Cm pentatonic: C Eb F G Bb
const PENTA_C = [130.81, 155.56, 174.61, 196.00, 233.08]; // octave 3
const PENTA_C_HIGH = PENTA_C.map(f => f * 2); // octave 4
const PENTA_C_HIGHER = PENTA_C.map(f => f * 4); // octave 5

// Chord voicings
const CM7_LOW = [65.41, 77.78, 98.00, 116.54]; // C2 Eb2 G2 Bb2
const CM7_MID = [130.81, 155.56, 196.00, 233.08]; // C3 Eb3 G3 Bb3
const CM_POWER = [65.41, 98.00, 130.81, 196.00]; // C2 G2 C3 G3

function ac(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.25; // Overall music volume
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function mg(): GainNode {
  ac();
  return master!;
}

// ── Helper: create oscillator with gain ──
function makeOsc(freq: number, type: OscillatorType, gain: number, target: GainNode): OscillatorNode {
  const c = ac();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.value = gain;
  o.connect(g);
  g.connect(target);
  allNodes.push(o);
  allGains.push(g);
  return o;
}

// ── Helper: create noise source ──
function makeNoise(filterFreq: number, filterQ: number, gain: number, target: GainNode): AudioBufferSourceNode {
  const c = ac();
  const buf = c.createBuffer(1, c.sampleRate * 4, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = filterFreq;
  filter.Q.value = filterQ;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(filter);
  filter.connect(g);
  g.connect(target);
  allNodes.push(src);
  allGains.push(g);
  return src;
}

// ── Helper: LFO on a param ──
function addLFO(param: AudioParam, rate: number, depth: number): OscillatorNode {
  const c = ac();
  const lfo = c.createOscillator();
  const lfoG = c.createGain();
  lfo.type = "sine";
  lfo.frequency.value = rate;
  lfoG.gain.value = depth;
  lfo.connect(lfoG);
  lfoG.connect(param);
  allNodes.push(lfo);
  allGains.push(lfoG);
  return lfo;
}

// ══════════════════════════════════════════════
// LAYER: CHILL
// ══════════════════════════════════════════════
function buildChillLayer() {
  const c = ac();
  chillGain = c.createGain();
  chillGain.gain.value = 1;
  chillGain.connect(mg());

  // Deep sub bass — barely audible warmth
  const sub = makeOsc(32.7, "sine", 0.06, chillGain); // C1
  const subLFO = addLFO(sub.frequency, 0.05, 2);
  sub.start(); subLFO.start();

  // Warm pad chord (Cm7, very quiet)
  for (const freq of CM7_LOW) {
    const o = makeOsc(freq, "sine", 0.015, chillGain);
    const lfo = addLFO(o.frequency, 0.08 + Math.random() * 0.05, 0.5);
    o.start(); lfo.start();
  }

  // Gentle filtered noise — distant casino ambience
  const noise = makeNoise(600, 0.3, 0.006, chillGain);
  noise.start();

  // Subtle high shimmer
  const shimmer = makeOsc(4186, "sine", 0.003, chillGain); // C8
  const shimLFO = addLFO(shimmer.frequency, 0.03, 200);
  shimmer.start(); shimLFO.start();
}

// ══════════════════════════════════════════════
// LAYER: ACTIVE
// ══════════════════════════════════════════════
function buildActiveLayer() {
  const c = ac();
  activeGain = c.createGain();
  activeGain.gain.value = 0;
  activeGain.connect(mg());

  // Brighter pad — mid voicing
  for (const freq of CM7_MID) {
    const o = makeOsc(freq, "triangle", 0.012, activeGain);
    const lfo = addLFO(o.frequency, 0.1 + Math.random() * 0.08, 1);
    o.start(); lfo.start();
  }

  // Rhythmic pulse — soft kick-like
  const pulse = makeOsc(55, "sine", 0.04, activeGain);
  pulse.start();
  // Pulse the gain rhythmically
  const pulseG = allGains[allGains.length - 1]!;
  const pulseLFO = c.createOscillator();
  const pulseLFOG = c.createGain();
  pulseLFO.type = "square";
  pulseLFO.frequency.value = 0.5; // 120 BPM feel (half-note pulse)
  pulseLFOG.gain.value = 0.03;
  pulseLFO.connect(pulseLFOG);
  pulseLFOG.connect(pulseG.gain);
  pulseLFO.start();
  allNodes.push(pulseLFO);
  allGains.push(pulseLFOG);

  // Filtered noise — more presence
  const noise = makeNoise(1200, 0.5, 0.008, activeGain);
  noise.start();

  // Walking bass hint
  const bass = makeOsc(65.41, "triangle", 0.025, activeGain); // C2
  const bassLFO = addLFO(bass.frequency, 0.25, 10); // gentle movement
  bass.start(); bassLFO.start();
}

// ══════════════════════════════════════════════
// LAYER: INTENSE
// ══════════════════════════════════════════════
function buildIntenseLayer() {
  const c = ac();
  intenseGain = c.createGain();
  intenseGain.gain.value = 0;
  intenseGain.connect(mg());

  // Driving sub bass
  const sub = makeOsc(32.7, "sawtooth", 0.04, intenseGain);
  sub.start();

  // Power chords
  for (const freq of CM_POWER) {
    const o = makeOsc(freq, "sawtooth", 0.008, intenseGain);
    o.start();
  }

  // Fast hi-hat noise
  const hat = makeNoise(8000, 2, 0.01, intenseGain);
  hat.start();
  // Gate the hi-hat rhythmically
  const hatG = allGains[allGains.length - 1]!;
  const hatLFO = c.createOscillator();
  const hatLFOG = c.createGain();
  hatLFO.type = "square";
  hatLFO.frequency.value = 2; // 16th note feel at 120bpm
  hatLFOG.gain.value = 0.008;
  hatLFO.connect(hatLFOG);
  hatLFOG.connect(hatG.gain);
  hatLFO.start();
  allNodes.push(hatLFO);
  allGains.push(hatLFOG);

  // Aggressive filtered sweep
  const sweep = makeOsc(98, "sawtooth", 0.015, intenseGain);
  const sweepFilter = c.createBiquadFilter();
  sweepFilter.type = "lowpass";
  sweepFilter.frequency.value = 400;
  sweepFilter.Q.value = 5;
  const sweepLFO = addLFO(sweepFilter.frequency, 0.15, 300);
  sweep.disconnect();
  sweep.connect(sweepFilter);
  const sg = c.createGain();
  sg.gain.value = 0.015;
  sweepFilter.connect(sg);
  sg.connect(intenseGain);
  sweep.start();
  sweepLFO.start();
  allGains.push(sg);
}

// ══════════════════════════════════════════════
// STINGER BUS
// ══════════════════════════════════════════════
function buildStingerBus() {
  stingerGain = ac().createGain();
  stingerGain.gain.value = 1;
  stingerGain.connect(mg());
}

// ══════════════════════════════════════════════
// RANDOM ARPEGGIO SCHEDULER
// ══════════════════════════════════════════════
function scheduleArpeggios() {
  const playArpeggio = () => {
    if (!running || !stingerGain) return;
    const c = ac();
    const scale = currentIntensity === "intense" ? PENTA_C_HIGHER : currentIntensity === "active" ? PENTA_C_HIGH : PENTA_C_HIGH;
    const numNotes = currentIntensity === "intense" ? 8 : currentIntensity === "active" ? 6 : 4;
    const noteLength = currentIntensity === "intense" ? 0.08 : currentIntensity === "active" ? 0.12 : 0.2;
    const gain = currentIntensity === "intense" ? 0.04 : currentIntensity === "active" ? 0.03 : 0.02;

    // Pick random pattern
    const pattern: number[] = [];
    for (let i = 0; i < numNotes; i++) {
      pattern.push(scale[Math.floor(Math.random() * scale.length)]!);
    }

    // Play pattern
    const now = c.currentTime;
    for (let i = 0; i < pattern.length; i++) {
      const t = now + i * noteLength;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(pattern[i]!, t);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(gain, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + noteLength * 0.9);
      o.connect(g);
      g.connect(stingerGain!);
      o.start(t);
      o.stop(t + noteLength);

      // Add harmonic
      const h = c.createOscillator();
      const hg = c.createGain();
      h.type = "sine";
      h.frequency.setValueAtTime(pattern[i]! * 2, t);
      hg.gain.setValueAtTime(0, t);
      hg.gain.linearRampToValueAtTime(gain * 0.2, t + 0.01);
      hg.gain.exponentialRampToValueAtTime(0.001, t + noteLength * 0.7);
      h.connect(hg);
      hg.connect(stingerGain!);
      h.start(t);
      h.stop(t + noteLength);
    }

    // Schedule next arpeggio
    const nextDelay = currentIntensity === "intense" ? 8000 + Math.random() * 12000
      : currentIntensity === "active" ? 15000 + Math.random() * 20000
      : 25000 + Math.random() * 35000;
    arpeggioTimer = setTimeout(playArpeggio, nextDelay);
  };

  // First arpeggio after 5-15 seconds
  arpeggioTimer = setTimeout(playArpeggio, 5000 + Math.random() * 10000);
}

// ══════════════════════════════════════════════
// INTENSITY TRANSITIONS
// ══════════════════════════════════════════════
function setIntensity(target: Intensity, transitionTime = 2.5) {
  if (!running || !chillGain || !activeGain || !intenseGain) return;
  if (target === currentIntensity) return;
  currentIntensity = target;

  const c = ac();
  const now = c.currentTime;
  const end = now + transitionTime;

  const targets: Record<Intensity, [number, number, number]> = {
    chill: [1, 0, 0],
    active: [0.4, 1, 0],
    intense: [0.15, 0.4, 1],
  };

  const [cg, ag, ig] = targets[target];
  chillGain.gain.cancelScheduledValues(now);
  activeGain.gain.cancelScheduledValues(now);
  intenseGain.gain.cancelScheduledValues(now);
  chillGain.gain.setValueAtTime(chillGain.gain.value, now);
  activeGain.gain.setValueAtTime(activeGain.gain.value, now);
  intenseGain.gain.setValueAtTime(intenseGain.gain.value, now);
  chillGain.gain.linearRampToValueAtTime(cg, end);
  activeGain.gain.linearRampToValueAtTime(ag, end);
  intenseGain.gain.linearRampToValueAtTime(ig, end);
}

// ══════════════════════════════════════════════
// EVENT STINGERS
// ══════════════════════════════════════════════

/** Short melodic flourish on win */
function playWinStinger(size: "small" | "medium" | "big" = "small") {
  if (!running || !stingerGain) return;
  const c = ac();
  const now = c.currentTime;
  const notes = size === "big"
    ? [261.63, 329.63, 392, 523.25, 659.26, 783.99] // C4 E4 G4 C5 E5 G5
    : size === "medium"
    ? [329.63, 392, 523.25, 659.26] // E4 G4 C5 E5
    : [523.25, 659.26, 783.99]; // C5 E5 G5

  const gain = size === "big" ? 0.06 : size === "medium" ? 0.045 : 0.03;
  const noteLen = size === "big" ? 0.12 : 0.1;

  for (let i = 0; i < notes.length; i++) {
    const t = now + i * noteLen;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.value = notes[i]!;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + noteLen * 2);
    o.connect(g);
    g.connect(stingerGain!);
    o.start(t);
    o.stop(t + noteLen * 2.5);
  }

  // Shimmer tail for big wins
  if (size === "big") {
    for (let i = 0; i < 8; i++) {
      const t = now + 0.5 + i * 0.06;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "sine";
      o.frequency.value = 1000 + Math.random() * 3000;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.015, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      o.connect(g);
      g.connect(stingerGain!);
      o.start(t);
      o.stop(t + 0.2);
    }
  }
}

/** Heartbeat bass pulse for all-in tension */
function startHeartbeat(): () => void {
  if (!running || !stingerGain) return () => {};
  const c = ac();
  let active = true;

  const beat = () => {
    if (!active || !stingerGain) return;
    const now = c.currentTime;

    // Double-thump heartbeat
    for (const offset of [0, 0.15]) {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(50, now + offset);
      o.frequency.exponentialRampToValueAtTime(30, now + offset + 0.2);
      g.gain.setValueAtTime(0, now + offset);
      g.gain.linearRampToValueAtTime(0.08, now + offset + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.2);
      o.connect(g);
      g.connect(stingerGain!);
      o.start(now + offset);
      o.stop(now + offset + 0.3);
    }

    if (active) setTimeout(beat, 800);
  };

  beat();
  return () => { active = false; };
}

/** Brief moment of near-silence after big win, then rebuild */
function dramaticPause() {
  if (!running || !master) return;
  const c = ac();
  const now = c.currentTime;
  // Quick dip
  master.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(master.gain.value, now);
  master.gain.linearRampToValueAtTime(0.05, now + 0.3);
  // Rebuild
  master.gain.linearRampToValueAtTime(0.25, now + 2.5);
}

// ══════════════════════════════════════════════
// PUBLIC API
// ══════════════════════════════════════════════

export const casinoMusic = {
  get isPlaying() { return running; },
  get intensity() { return currentIntensity; },

  /** Start the adaptive music system */
  start() {
    if (running) return;
    running = true;
    currentIntensity = "chill";
    comboLevel = 0;

    buildChillLayer();
    buildActiveLayer();
    buildIntenseLayer();
    buildStingerBus();
    scheduleArpeggios();
  },

  /** Stop all music */
  stop() {
    running = false;
    if (arpeggioTimer) { clearTimeout(arpeggioTimer); arpeggioTimer = null; }
    if (pulseTimer) { clearTimeout(pulseTimer); pulseTimer = null; }
    for (const n of allNodes) try { n.stop(); } catch {}
    allNodes = [];
    allGains = [];
    chillGain = null;
    activeGain = null;
    intenseGain = null;
    stingerGain = null;
  },

  /** Set master volume (0-1) */
  setVolume(v: number) {
    if (master) {
      const c = ac();
      master.gain.cancelScheduledValues(c.currentTime);
      master.gain.setValueAtTime(master.gain.value, c.currentTime);
      master.gain.linearRampToValueAtTime(Math.max(0, Math.min(1, v)), c.currentTime + 0.1);
    }
  },

  /** Manually set intensity */
  setIntensity(level: Intensity) {
    setIntensity(level);
  },

  /** Called on every game result — drives automatic intensity */
  onGameResult(won: boolean, profit: number) {
    if (!running) return;

    if (won) {
      comboLevel++;
      if (profit >= 200) {
        playWinStinger("big");
        dramaticPause();
      } else if (profit >= 50) {
        playWinStinger("medium");
      } else {
        playWinStinger("small");
      }

      // Auto intensity based on combo
      if (comboLevel >= 8) setIntensity("intense", 1.5);
      else if (comboLevel >= 4) setIntensity("active", 2);
      else setIntensity("active", 3);

      // Decay back to chill after inactivity
      if (pulseTimer) clearTimeout(pulseTimer);
      pulseTimer = setTimeout(() => {
        if (comboLevel < 4) setIntensity("chill", 5);
      }, 15000);
    } else {
      comboLevel = 0;
      // On loss, gradually wind down
      if (pulseTimer) clearTimeout(pulseTimer);
      pulseTimer = setTimeout(() => setIntensity("chill", 4), 5000);
    }
  },

  /** Start heartbeat for all-in, returns stop function */
  startHeartbeat,

  /** Trigger for all-in start — ramps to intense */
  onAllInStart() {
    if (!running) return;
    setIntensity("intense", 1);
  },

  /** Trigger for all-in end */
  onAllInEnd(won: boolean) {
    if (!running) return;
    if (won) {
      playWinStinger("big");
      dramaticPause();
    }
    setTimeout(() => setIntensity("chill", 3), 3000);
  },
};
