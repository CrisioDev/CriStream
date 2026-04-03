/**
 * CRISINO Adaptive Music Engine v2
 *
 * Professional-grade generative casino soundtrack.
 * Features: Reverb, Stereo Delay, Detuned Pads, Chord Progressions,
 * Synthesized Drums, Musical Arpeggios, Dynamic Mixing.
 */

type Intensity = "chill" | "active" | "intense";

// ── Audio Context & Master Chain ──
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let compressor: DynamicsCompressorNode | null = null;
let reverbSend: ConvolverNode | null = null;
let reverbGain: GainNode | null = null;
let delayL: DelayNode | null = null;
let delayR: DelayNode | null = null;
let delayFeedback: GainNode | null = null;
let delaySend: GainNode | null = null;
let running = false;

// Layer buses
let chillBus: GainNode | null = null;
let activeBus: GainNode | null = null;
let intenseBus: GainNode | null = null;
let stingerBus: GainNode | null = null;
let dryBus: GainNode | null = null; // bypasses reverb for transients
let padFilter: BiquadFilterNode | null = null; // shared LP filter for pad warmth
let padFilterLFO: OscillatorNode | null = null;

// Managed resources
let managedNodes: (OscillatorNode | AudioBufferSourceNode)[] = [];
let timers: any[] = [];

// State
let currentIntensity: Intensity = "chill";
let comboLevel = 0;
let chordIndex = 0;
let beatCount = 0;

// ── Musical Constants ──

// Chord progression: Cm9 → Abmaj7 → Fm9 → G7(#9)
// Each chord = array of frequencies for multiple voicings
const PROGRESSION = [
  { name: "Cm9",    low: [65.41, 77.78, 98, 116.54],   mid: [261.63, 311.13, 392, 466.16, 587.33], bass: 32.70 },
  { name: "Abmaj7", low: [51.91, 65.41, 77.78, 98],     mid: [207.65, 261.63, 311.13, 392],         bass: 51.91 },
  { name: "Fm9",    low: [43.65, 52.00, 65.41, 77.78],  mid: [174.61, 207.65, 261.63, 311.13, 392], bass: 43.65 },
  { name: "G7",     low: [49.00, 61.74, 73.42, 87.31],  mid: [196.00, 246.94, 293.66, 349.23],      bass: 49.00 },
];

// Pentatonic scales for arpeggios (Cm pentatonic across octaves)
const PENTA = {
  low:  [130.81, 155.56, 174.61, 196.00, 233.08],
  mid:  [261.63, 311.13, 349.23, 392.00, 466.16],
  high: [523.25, 622.25, 698.46, 783.99, 932.33],
};

// Arpeggio patterns (index-based)
const ARP_PATTERNS = [
  [0, 1, 2, 3, 4],              // ascending
  [4, 3, 2, 1, 0],              // descending
  [0, 2, 1, 3, 2, 4, 3],        // pendulum
  [0, 2, 4, 3, 1],              // broken
  [0, 4, 1, 3, 2],              // scattered
  [0, 1, 2, 4, 3, 2, 1, 0],    // wave
];

const BPM = 75; // Slower, more atmospheric
const BEAT_SEC = 60 / BPM;
const BAR_SEC = BEAT_SEC * 4;
const SWING = 0.12; // Swing amount: off-beats pushed 12% late (subtle groove)

// ══════════════════════════════════════════════
// MASTER CHAIN SETUP
// ══════════════════════════════════════════════

function ac(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();

    // Master compressor
    compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 12;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.005;
    compressor.release.value = 0.15;

    // Master gain
    master = ctx.createGain();
    master.gain.value = 0.30;

    // Reverb (convolution)
    reverbSend = ctx.createConvolver();
    reverbSend.buffer = createReverbIR(3.0, 2.5);
    reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.35;

    // Stereo ping-pong delay
    delaySend = ctx.createGain();
    delaySend.gain.value = 0.2;
    delayL = ctx.createDelay(1);
    delayL.delayTime.value = BEAT_SEC * 0.75; // dotted 8th
    delayR = ctx.createDelay(1);
    delayR.delayTime.value = BEAT_SEC * 0.5; // 8th note
    delayFeedback = ctx.createGain();
    delayFeedback.gain.value = 0.3;

    // Delay routing: send → delayL → delayR → feedback → delayL
    const panL = ctx.createStereoPanner();
    panL.pan.value = -0.6;
    const panR = ctx.createStereoPanner();
    panR.pan.value = 0.6;
    delaySend.connect(delayL);
    delayL.connect(panL);
    delayL.connect(delayR);
    delayR.connect(panR);
    delayR.connect(delayFeedback);
    delayFeedback.connect(delayL);
    panL.connect(compressor);
    panR.connect(compressor);

    // Reverb routing
    reverbSend.connect(reverbGain);
    reverbGain.connect(compressor);

    // Dry bus (bypasses reverb for percussive elements)
    dryBus = ctx.createGain();
    dryBus.gain.value = 1;
    dryBus.connect(compressor);

    compressor.connect(master);
    master.connect(ctx.destination);

    // Warm saturation (subtle analog-style harmonic distortion)
    const saturator = ctx.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      const x = (i / 512) - 1; // -1 to +1
      // Soft-clip tanh-like curve: adds even harmonics for warmth
      curve[i] = Math.tanh(x * 1.5) * 0.9;
    }
    saturator.curve = curve;
    saturator.oversample = "2x";

    // Shared pad lowpass filter (breathes via LFO)
    padFilter = ctx.createBiquadFilter();
    padFilter.type = "lowpass";
    padFilter.frequency.value = 800; // Start warm/dark
    padFilter.Q.value = 0.7; // Gentle resonance
    // LFO on filter cutoff for breathing movement
    padFilterLFO = ctx.createOscillator();
    const padFilterLFOG = ctx.createGain();
    padFilterLFO.type = "sine";
    padFilterLFO.frequency.value = 0.06; // Very slow: ~16s cycle
    padFilterLFOG.gain.value = 400; // Sweep 400-1200Hz
    padFilterLFO.connect(padFilterLFOG);
    padFilterLFOG.connect(padFilter.frequency);
    padFilterLFO.start();

    // Layer buses → pad filter → saturator → reverb/dry/delay
    chillBus = ctx.createGain(); chillBus.gain.value = 1;
    activeBus = ctx.createGain(); activeBus.gain.value = 0;
    intenseBus = ctx.createGain(); intenseBus.gain.value = 0;
    stingerBus = ctx.createGain(); stingerBus.gain.value = 1;

    // Pad buses go through filter + saturation
    chillBus.connect(padFilter);
    activeBus.connect(padFilter);
    padFilter.connect(saturator);
    saturator.connect(reverbSend);
    saturator.connect(dryBus);
    saturator.connect(delaySend);

    // Intense + stinger bypass the pad filter (need to stay bright)
    intenseBus.connect(reverbSend);
    intenseBus.connect(dryBus);
    intenseBus.connect(delaySend);
    stingerBus.connect(reverbSend);
    stingerBus.connect(dryBus);
    stingerBus.connect(delaySend);
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

/** Generate realistic impulse response for convolution reverb */
function createReverbIR(duration: number, decay: number): AudioBuffer {
  const c = ac();
  const sr = c.sampleRate;
  const len = Math.floor(sr * duration);
  const buf = c.createBuffer(2, len, sr);

  // Pre-delay (15ms gap before reverb starts — simulates room size)
  const preDelaySamples = Math.floor(sr * 0.015);

  // Early reflection tap times (in seconds) — simulates wall bounces
  const earlyTaps = [0.017, 0.023, 0.031, 0.041, 0.053, 0.067, 0.079, 0.091];
  const earlyGains = [0.7, 0.55, 0.5, 0.4, 0.35, 0.28, 0.22, 0.18];

  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);

    // 1. Pre-delay: silence
    for (let i = 0; i < preDelaySamples && i < len; i++) data[i] = 0;

    // 2. Early reflections: discrete taps with slight stereo offset
    for (let t = 0; t < earlyTaps.length; t++) {
      const tapOffset = ch === 1 ? 0.003 : 0; // 3ms stereo offset on R channel
      const tapSample = Math.floor(sr * (earlyTaps[t]! + tapOffset)) + preDelaySamples;
      const tapGain = earlyGains[t]!;
      // Each tap = short burst of filtered noise (3-5ms)
      const burstLen = Math.floor(sr * (0.003 + Math.random() * 0.002));
      for (let j = 0; j < burstLen && tapSample + j < len; j++) {
        data[tapSample + j] = (Math.random() * 2 - 1) * tapGain * (1 - j / burstLen);
      }
    }

    // 3. Late diffuse tail: frequency-dependent decay
    const lateStart = Math.floor(sr * 0.1) + preDelaySamples;
    for (let i = lateStart; i < len; i++) {
      const t = (i - lateStart) / (len - lateStart); // 0→1 progress
      // High frequencies decay faster (realistic air absorption)
      const hfDecay = Math.pow(1 - t, decay * 1.8);
      const lfDecay = Math.pow(1 - t, decay * 0.8);
      // Mix of frequency bands
      const noise = Math.random() * 2 - 1;
      data[i] = noise * (hfDecay * 0.6 + lfDecay * 0.4) * 0.5;
      // Allpass diffusion: feed-forward from earlier samples
      if (i > lateStart + 137) data[i] += (data[i - 137]! * 0.3);
      if (i > lateStart + 281) data[i] += (data[i - 281]! * 0.2);
      if (i > lateStart + 419) data[i] += (data[i - 419]! * 0.15);
    }
  }
  return buf;
}

// ── Sound Primitives ──

/** Detuned oscillator pair for rich pads */
function padVoice(freq: number, type: OscillatorType, gain: number, target: GainNode): OscillatorNode[] {
  const c = ac();
  const g = c.createGain();
  g.gain.value = 0;
  // Slow attack for pad feel
  g.gain.setValueAtTime(0, c.currentTime);
  g.gain.linearRampToValueAtTime(gain, c.currentTime + 2);

  // Detune pair: ±4 cents for chorus width
  const o1 = c.createOscillator();
  const o2 = c.createOscillator();
  o1.type = type; o2.type = type;
  o1.frequency.value = freq;
  o2.frequency.value = freq;
  o1.detune.value = 4;
  o2.detune.value = -4;

  // Slight stereo spread
  const panL = c.createStereoPanner();
  const panR = c.createStereoPanner();
  panL.pan.value = -0.3;
  panR.pan.value = 0.3;

  o1.connect(panL); panL.connect(g);
  o2.connect(panR); panR.connect(g);
  g.connect(target);

  o1.start(); o2.start();
  managedNodes.push(o1, o2);
  return [o1, o2];
}

/** Filtered noise with envelope */
function noiseLayer(freq: number, q: number, gain: number, target: GainNode): AudioBufferSourceNode {
  const c = ac();
  const buf = c.createBuffer(2, c.sampleRate * 4, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = c.createBufferSource();
  src.buffer = buf; src.loop = true;
  const filter = c.createBiquadFilter();
  filter.type = "bandpass"; filter.frequency.value = freq; filter.Q.value = q;
  const g = c.createGain(); g.gain.value = gain;
  src.connect(filter); filter.connect(g); g.connect(target);
  src.start();
  managedNodes.push(src);
  return src;
}

/** Synthesized kick drum */
function playKick(time: number, velocity = 0.8) {
  if (!dryBus) return;
  const c = ac();
  // Pitch-swept sine
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(150, time);
  o.frequency.exponentialRampToValueAtTime(35, time + 0.12);
  g.gain.setValueAtTime(0, time);
  g.gain.linearRampToValueAtTime(0.12 * velocity, time + 0.005);
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
  o.connect(g); g.connect(dryBus);
  o.start(time); o.stop(time + 0.3);

  // Transient click
  const click = c.createOscillator();
  const clickG = c.createGain();
  click.type = "square";
  click.frequency.value = 800;
  clickG.gain.setValueAtTime(0.05 * velocity, time);
  clickG.gain.exponentialRampToValueAtTime(0.001, time + 0.015);
  click.connect(clickG); clickG.connect(dryBus);
  click.start(time); click.stop(time + 0.02);
}

/** Synthesized hi-hat */
function playHat(time: number, open = false, velocity = 0.5) {
  if (!dryBus) return;
  const c = ac();
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * 0.1), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const hp = c.createBiquadFilter();
  hp.type = "highpass"; hp.frequency.value = open ? 5000 : 8000; hp.Q.value = 1;
  const g = c.createGain();
  const dur = open ? 0.12 : 0.04;
  g.gain.setValueAtTime(0.06 * velocity, time);
  g.gain.exponentialRampToValueAtTime(0.001, time + dur);
  // Stereo variation
  const pan = c.createStereoPanner();
  pan.pan.value = (Math.random() - 0.5) * 0.4;
  src.connect(hp); hp.connect(g); g.connect(pan); pan.connect(dryBus);
  src.start(time); src.stop(time + dur + 0.01);
}

/** Play a single note with ADSR envelope */
function playNote(freq: number, time: number, duration: number, gain: number, target: GainNode, type: OscillatorType = "sine") {
  const c = ac();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;

  // ADSR
  const attack = 0.01;
  const decay = duration * 0.3;
  const sustain = gain * 0.6;
  const release = duration * 0.4;

  g.gain.setValueAtTime(0, time);
  g.gain.linearRampToValueAtTime(gain, time + attack);
  g.gain.linearRampToValueAtTime(sustain, time + attack + decay);
  g.gain.setValueAtTime(sustain, time + duration - release);
  g.gain.linearRampToValueAtTime(0, time + duration);

  o.connect(g); g.connect(target);
  o.start(time); o.stop(time + duration + 0.01);
}

// ══════════════════════════════════════════════
// CHORD PAD ENGINE
// ══════════════════════════════════════════════

let padOscillators: OscillatorNode[] = [];

function updatePadChord() {
  if (!chillBus || !activeBus) return;
  const c = ac();
  const now = c.currentTime;
  const chord = PROGRESSION[chordIndex % PROGRESSION.length]!;

  // Crossfade existing pad voices to new frequencies
  // Low pad voices on chill bus
  const allOscs = padOscillators;
  const chillFreqs = chord.low;
  const midFreqs = chord.mid;

  // Glide all oscillators to new chord (portamento)
  for (let i = 0; i < allOscs.length; i++) {
    const targetFreq = i < chillFreqs.length ? chillFreqs[i]!
      : midFreqs[i - chillFreqs.length];
    if (targetFreq) {
      allOscs[i]!.frequency.cancelScheduledValues(now);
      allOscs[i]!.frequency.setValueAtTime(allOscs[i]!.frequency.value, now);
      allOscs[i]!.frequency.linearRampToValueAtTime(targetFreq, now + 2); // 2s glide
    }
  }
}

function buildPadLayer() {
  if (!chillBus || !activeBus) return;
  const chord = PROGRESSION[0]!;
  padOscillators = [];

  // Low voices → chill bus (warm sine pairs)
  for (const freq of chord.low) {
    const pair = padVoice(freq, "sine", 0.015, chillBus);
    padOscillators.push(...pair);
  }

  // Mid voices → active bus (triangle for brightness)
  for (const freq of chord.mid) {
    const pair = padVoice(freq, "triangle", 0.008, activeBus);
    padOscillators.push(...pair);
  }

  // Sub bass on chill (follows root)
  const sub = ac().createOscillator();
  const subG = ac().createGain();
  sub.type = "sine";
  sub.frequency.value = chord.bass;
  subG.gain.value = 0.05;
  sub.connect(subG); subG.connect(chillBus);
  sub.start();
  padOscillators.push(sub);
  managedNodes.push(sub);
}

// ══════════════════════════════════════════════
// RHYTHM ENGINE
// ══════════════════════════════════════════════

let rhythmTimer: any = null;

function startRhythm() {
  const c = ac();
  let nextBeat = c.currentTime + 0.1;

  const tick = () => {
    if (!running) return;
    const now = c.currentTime;
    if (nextBeat <= now) nextBeat = now + 0.05;

    // Schedule next 4 beats with swing
    const swingOffset = BEAT_SEC * SWING; // off-beat push
    for (let i = 0; i < 4; i++) {
      const t = nextBeat + i * BEAT_SEC;
      const tSwung = t + swingOffset; // swung 8th note position
      const beat = (beatCount + i) % 4;

      if (currentIntensity !== "chill") {
        // Kick on beats 1 and 3 (on-beat, no swing)
        if (beat === 0 || beat === 2) {
          const vel = beat === 0 ? 0.9 : 0.6;
          playKick(t, currentIntensity === "intense" ? vel : vel * 0.5);
        }
      }

      if (currentIntensity === "active") {
        // Hats with swing groove
        playHat(t, beat === 1 || beat === 3, 0.3);
        playHat(tSwung + BEAT_SEC * 0.5, false, 0.18); // swung ghost note
      }

      if (currentIntensity === "intense") {
        // Full pattern with swing on off-beats
        playHat(t, beat === 1 || beat === 3, 0.5);
        playHat(t + BEAT_SEC * 0.25, false, 0.2);
        playHat(tSwung + BEAT_SEC * 0.5, false, 0.38); // swung
        playHat(tSwung + BEAT_SEC * 0.75, false, 0.15); // swung
      }

      // Walking bass on active/intense (plays chord tones in rhythm)
      if (currentIntensity !== "chill" && stingerBus) {
        const chord = PROGRESSION[chordIndex % PROGRESSION.length]!;
        const bassNotes = [chord.bass, chord.bass * 1.5, chord.bass * 1.25, chord.bass * 1.5]; // root, 5th, ~3rd, 5th
        const bassNote = bassNotes[beat]!;
        const bassVel = beat === 0 ? 0.04 : 0.025;
        if (dryBus) playNote(bassNote, t, BEAT_SEC * 0.8, bassVel, dryBus, "triangle");
      }
    }

    beatCount += 4;

    // Chord change every 8 bars (32 beats)
    if (beatCount % 32 === 0) {
      chordIndex++;
      updatePadChord();
    }

    nextBeat += BEAT_SEC * 4;
    rhythmTimer = setTimeout(tick, (BEAT_SEC * 4 - 0.1) * 1000);
  };

  rhythmTimer = setTimeout(tick, 100);
}

// ══════════════════════════════════════════════
// ARPEGGIO ENGINE
// ══════════════════════════════════════════════

let arpTimer: any = null;

function scheduleArpeggio() {
  const playArp = () => {
    if (!running || !stingerBus) return;
    const c = ac();
    const now = c.currentTime;

    // Choose scale register based on intensity
    const scale = currentIntensity === "intense" ? PENTA.high
      : currentIntensity === "active" ? PENTA.mid : PENTA.mid;

    // Choose pattern
    const pattern = ARP_PATTERNS[Math.floor(Math.random() * ARP_PATTERNS.length)]!;
    const noteLen = currentIntensity === "intense" ? BEAT_SEC * 0.25
      : currentIntensity === "active" ? BEAT_SEC * 0.5 : BEAT_SEC;
    const gain = currentIntensity === "intense" ? 0.035
      : currentIntensity === "active" ? 0.025 : 0.018;

    // Play pattern with velocity accent on first note
    for (let i = 0; i < pattern.length; i++) {
      const noteIdx = pattern[i]! % scale.length;
      const freq = scale[noteIdx]!;
      const t = now + i * noteLen;
      const vel = i === 0 ? gain * 1.4 : gain; // accent

      // Triangle for warmth, add sub octave on intense
      playNote(freq, t, noteLen * 0.8, vel, stingerBus, "triangle");
      if (currentIntensity === "intense" && i % 2 === 0) {
        playNote(freq * 2, t, noteLen * 0.5, vel * 0.2, stingerBus, "sine"); // octave shimmer
      }
      if (currentIntensity !== "chill" && i === 0) {
        playNote(freq * 0.5, t, noteLen * 1.2, vel * 0.3, stingerBus, "sine"); // sub on accent
      }
    }

    // Schedule next
    const nextDelay = currentIntensity === "intense" ? 6000 + Math.random() * 8000
      : currentIntensity === "active" ? 12000 + Math.random() * 15000
      : 20000 + Math.random() * 30000;
    arpTimer = setTimeout(playArp, nextDelay);
  };

  arpTimer = setTimeout(playArp, 4000 + Math.random() * 8000);
}

// ══════════════════════════════════════════════
// AMBIENT BED
// ══════════════════════════════════════════════

function buildAmbientBed() {
  if (!chillBus || !activeBus || !intenseBus) return;

  // Chill: warm low-pass filtered noise (distant casino crowd)
  noiseLayer(400, 0.3, 0.005, chillBus);
  // Chill: high shimmer (very subtle)
  noiseLayer(6000, 1, 0.002, chillBus);

  // Active: mid-range presence
  noiseLayer(1000, 0.5, 0.006, activeBus);

  // Intense: broadband energy
  noiseLayer(2000, 0.3, 0.008, intenseBus);

  // Intense: sub rumble
  const c = ac();
  const rumble = c.createOscillator();
  const rumbleG = c.createGain();
  const rumbleLFO = c.createOscillator();
  const rumbleLFOG = c.createGain();
  rumble.type = "sine"; rumble.frequency.value = 25;
  rumbleG.gain.value = 0.03;
  rumbleLFO.type = "sine"; rumbleLFO.frequency.value = 0.1;
  rumbleLFOG.gain.value = 0.02;
  rumbleLFO.connect(rumbleLFOG); rumbleLFOG.connect(rumbleG.gain);
  rumble.connect(rumbleG); rumbleG.connect(intenseBus);
  rumble.start(); rumbleLFO.start();
  managedNodes.push(rumble, rumbleLFO);
}

// ══════════════════════════════════════════════
// INTENSITY CROSSFADE
// ══════════════════════════════════════════════

function setIntensity(target: Intensity, dur = 2.5) {
  if (!running || !chillBus || !activeBus || !intenseBus) return;
  if (target === currentIntensity) return;
  currentIntensity = target;

  const c = ac();
  const now = c.currentTime;

  const levels: Record<Intensity, [number, number, number]> = {
    chill:   [1.0, 0.0, 0.0],
    active:  [0.35, 1.0, 0.0],
    intense: [0.12, 0.35, 1.0],
  };

  const [cl, al, il] = levels[target];
  for (const [bus, val] of [[chillBus, cl], [activeBus, al], [intenseBus, il]] as [GainNode, number][]) {
    bus.gain.cancelScheduledValues(now);
    bus.gain.setValueAtTime(bus.gain.value, now);
    bus.gain.linearRampToValueAtTime(val, now + dur);
  }

  // Open/close pad filter based on intensity (warmth control)
  if (padFilter) {
    padFilter.frequency.cancelScheduledValues(now);
    padFilter.frequency.setValueAtTime(padFilter.frequency.value, now);
    padFilter.frequency.linearRampToValueAtTime(
      target === "intense" ? 2500 : target === "active" ? 1400 : 800, now + dur
    );
  }

  // Adjust reverb/delay sends based on intensity
  if (reverbGain) {
    reverbGain.gain.cancelScheduledValues(now);
    reverbGain.gain.setValueAtTime(reverbGain.gain.value, now);
    reverbGain.gain.linearRampToValueAtTime(
      target === "intense" ? 0.2 : target === "active" ? 0.3 : 0.4, now + dur
    );
  }
  if (delaySend) {
    delaySend.gain.cancelScheduledValues(now);
    delaySend.gain.setValueAtTime(delaySend.gain.value, now);
    delaySend.gain.linearRampToValueAtTime(
      target === "intense" ? 0.1 : target === "active" ? 0.2 : 0.25, now + dur
    );
  }
}

// ══════════════════════════════════════════════
// WIN STINGERS
// ══════════════════════════════════════════════

function playWinStinger(size: "small" | "medium" | "big") {
  if (!running || !stingerBus) return;
  const c = ac();
  const now = c.currentTime;

  if (size === "big") {
    // Triumphant fanfare: I-V-I with full harmony
    const fanfare = [
      { freq: 261.63, t: 0, dur: 0.3 },     // C4
      { freq: 329.63, t: 0.08, dur: 0.3 },   // E4
      { freq: 392.00, t: 0.16, dur: 0.3 },   // G4
      { freq: 523.25, t: 0.28, dur: 0.5 },   // C5
      { freq: 659.26, t: 0.36, dur: 0.5 },   // E5
      { freq: 783.99, t: 0.44, dur: 0.6 },   // G5
      { freq: 1046.50, t: 0.55, dur: 0.8 },  // C6 — peak
    ];
    for (const n of fanfare) {
      playNote(n.freq, now + n.t, n.dur, 0.05, stingerBus);
      playNote(n.freq * 2, now + n.t, n.dur * 0.6, 0.012, stingerBus); // harmonic
    }
    // Sparkle tail
    for (let i = 0; i < 12; i++) {
      const t = now + 0.8 + i * 0.05;
      playNote(
        1000 + Math.random() * 4000, t, 0.1,
        0.012 * (1 - i / 12), stingerBus
      );
    }
  } else if (size === "medium") {
    // Bright ascending triad
    const notes = [329.63, 392, 523.25, 659.26];
    for (let i = 0; i < notes.length; i++) {
      playNote(notes[i]!, now + i * 0.09, 0.25, 0.04, stingerBus);
    }
  } else {
    // Quick 3-note chime
    const notes = [523.25, 659.26, 783.99];
    for (let i = 0; i < notes.length; i++) {
      playNote(notes[i]!, now + i * 0.07, 0.15, 0.025, stingerBus);
    }
  }
}

function startHeartbeat(): () => void {
  if (!running || !dryBus) return () => {};
  const c = ac();
  let active = true;
  let speed = 800;

  const beat = () => {
    if (!active || !dryBus) return;
    const now = c.currentTime;

    // Lub-dub
    for (const [offset, freq, vel] of [[0, 55, 0.1], [0.12, 45, 0.07]] as [number, number, number][]) {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(freq, now + offset);
      o.frequency.exponentialRampToValueAtTime(25, now + offset + 0.18);
      g.gain.setValueAtTime(0, now + offset);
      g.gain.linearRampToValueAtTime(vel, now + offset + 0.008);
      g.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.2);
      o.connect(g); g.connect(dryBus);
      o.start(now + offset); o.stop(now + offset + 0.25);
    }

    // Gradually speed up for tension
    speed = Math.max(400, speed - 15);
    if (active) setTimeout(beat, speed);
  };

  beat();
  return () => { active = false; };
}

function dramaticPause() {
  if (!running || !master) return;
  const c = ac();
  const now = c.currentTime;
  master.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(master.gain.value, now);
  // Quick dip to near silence
  master.gain.linearRampToValueAtTime(0.03, now + 0.2);
  // Hold silence briefly
  master.gain.setValueAtTime(0.03, now + 0.8);
  // Slowly rebuild with swell
  master.gain.linearRampToValueAtTime(0.15, now + 2.0);
  master.gain.linearRampToValueAtTime(0.30, now + 3.5);
}

// ══════════════════════════════════════════════
// PUBLIC API
// ══════════════════════════════════════════════

let decayTimer: any = null;

export const casinoMusic = {
  get isPlaying() { return running; },
  get intensity() { return currentIntensity; },

  start() {
    if (running) return;
    running = true;
    currentIntensity = "chill";
    comboLevel = 0;
    chordIndex = 0;
    beatCount = 0;

    ac(); // ensure chain is built
    buildPadLayer();
    buildAmbientBed();
    startRhythm();
    scheduleArpeggio();
  },

  stop() {
    running = false;
    for (const t of timers) clearTimeout(t);
    timers = [];
    if (rhythmTimer) { clearTimeout(rhythmTimer); rhythmTimer = null; }
    if (arpTimer) { clearTimeout(arpTimer); arpTimer = null; }
    if (decayTimer) { clearTimeout(decayTimer); decayTimer = null; }
    if (padFilterLFO) try { padFilterLFO.stop(); } catch {}
    for (const n of managedNodes) try { n.stop(); } catch {}
    managedNodes = [];
    padOscillators = [];
    padFilter = null;
    padFilterLFO = null;
  },

  setVolume(v: number) {
    if (master) {
      const c = ac();
      master.gain.cancelScheduledValues(c.currentTime);
      master.gain.linearRampToValueAtTime(Math.max(0, Math.min(1, v)), c.currentTime + 0.1);
    }
  },

  setIntensity(level: Intensity) { setIntensity(level); },

  onGameResult(won: boolean, profit: number) {
    if (!running) return;

    if (won) {
      comboLevel++;
      if (profit >= 200) { playWinStinger("big"); dramaticPause(); }
      else if (profit >= 50) playWinStinger("medium");
      else playWinStinger("small");

      if (comboLevel >= 8) setIntensity("intense", 1.5);
      else if (comboLevel >= 4) setIntensity("active", 2);
      else setIntensity("active", 3);

      if (decayTimer) clearTimeout(decayTimer);
      decayTimer = setTimeout(() => {
        if (comboLevel < 4) setIntensity("chill", 6);
      }, 20000);
    } else {
      comboLevel = 0;
      if (decayTimer) clearTimeout(decayTimer);
      decayTimer = setTimeout(() => setIntensity("chill", 5), 6000);
    }
  },

  startHeartbeat,

  onAllInStart() {
    if (!running) return;
    setIntensity("intense", 0.8);
  },

  onAllInEnd(won: boolean) {
    if (!running) return;
    if (won) { playWinStinger("big"); dramaticPause(); }
    setTimeout(() => setIntensity("chill", 4), 4000);
  },
};
