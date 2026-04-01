// casino-sounds.ts — Synthesized casino sound effects via Web Audio API
// No external files needed. All sounds are generated programmatically.

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;

function getCtx(): AudioContext | null {
  return ctx;
}

function createNoiseBuffer(duration: number): AudioBuffer {
  const c = getCtx()!;
  const sampleRate = c.sampleRate;
  const length = Math.floor(sampleRate * duration);
  const buffer = c.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = "sine",
  gain = 0.3,
  startTime?: number,
  freqEnd?: number,
): OscillatorNode | null {
  const c = getCtx();
  if (!c || !masterGain) return null;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime ?? c.currentTime);
  if (freqEnd !== undefined) {
    osc.frequency.linearRampToValueAtTime(freqEnd, (startTime ?? c.currentTime) + duration);
  }
  g.gain.setValueAtTime(gain, startTime ?? c.currentTime);
  g.gain.linearRampToValueAtTime(0, (startTime ?? c.currentTime) + duration);
  osc.connect(g);
  g.connect(masterGain);
  osc.start(startTime ?? c.currentTime);
  osc.stop((startTime ?? c.currentTime) + duration);
  return osc;
}

function playNoiseBurst(
  duration: number,
  gain: number,
  startTime?: number,
  filterFreq?: number,
  filterType?: BiquadFilterType,
): void {
  const c = getCtx();
  if (!c || !masterGain) return;
  const buffer = createNoiseBuffer(duration);
  const src = c.createBufferSource();
  src.buffer = buffer;
  const g = c.createGain();
  const t = startTime ?? c.currentTime;
  g.gain.setValueAtTime(gain, t);
  g.gain.linearRampToValueAtTime(0, t + duration);

  if (filterFreq !== undefined) {
    const filter = c.createBiquadFilter();
    filter.type = filterType ?? "bandpass";
    filter.frequency.setValueAtTime(filterFreq, t);
    src.connect(filter);
    filter.connect(g);
  } else {
    src.connect(g);
  }
  g.connect(masterGain);
  src.start(t);
  src.stop(t + duration);
}

export const casinoSounds = {
  mute: false,

  init() {
    if (ctx) return;
    try {
      ctx = new AudioContext();
      masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.3, ctx.currentTime);
      masterGain.connect(ctx.destination);
      // Load mute state
      this.mute = localStorage.getItem("casino-mute") === "1";
    } catch {
      // AudioContext not supported
    }
  },

  setMute(m: boolean) {
    this.mute = m;
    localStorage.setItem("casino-mute", m ? "1" : "0");
  },

  // Short click/tick (50ms, 800Hz square wave)
  click() {
    if (this.mute || !getCtx()) return;
    playTone(800, 0.05, "square", 0.2);
  },

  // Slot reel spinning (5 rapid ticks)
  spin() {
    if (this.mute || !getCtx()) return;
    const c = getCtx()!;
    for (let i = 0; i < 5; i++) {
      playTone(600, 0.04, "square", 0.15, c.currentTime + i * 0.04);
    }
  },

  // Coin toss (metallic ping, triangle sweep up)
  coinFlip() {
    if (this.mute || !getCtx()) return;
    playTone(1200, 0.15, "triangle", 0.25, undefined, 2400);
  },

  // Ascending 3-note chime C5-E5-G5
  win() {
    if (this.mute || !getCtx()) return;
    const c = getCtx()!;
    const t = c.currentTime;
    playTone(523, 0.1, "sine", 0.25, t);
    playTone(659, 0.1, "sine", 0.25, t + 0.1);
    playTone(784, 0.15, "sine", 0.3, t + 0.2);
  },

  // Descending tone (400Hz -> 150Hz)
  loss() {
    if (this.mute || !getCtx()) return;
    playTone(400, 0.3, "sine", 0.2, undefined, 150);
  },

  // 5-note ascending fanfare with crescendo
  bigWin() {
    if (this.mute || !getCtx()) return;
    const c = getCtx()!;
    const t = c.currentTime;
    const notes = [523, 587, 659, 784, 1047]; // C5 D5 E5 G5 C6
    notes.forEach((freq, i) => {
      playTone(freq, 0.09, "sine", 0.15 + i * 0.04, t + i * 0.09);
    });
  },

  // Alternating high tones siren (1.5s)
  jackpot() {
    if (this.mute || !getCtx()) return;
    const c = getCtx()!;
    const t = c.currentTime;
    for (let i = 0; i < 8; i++) {
      const freq = i % 2 === 0 ? 1000 : 1500;
      const g = c.createGain();
      const osc = c.createOscillator();
      osc.type = "square";
      osc.frequency.setValueAtTime(freq, t + i * 0.185);
      g.gain.setValueAtTime(0.12, t + i * 0.185);
      g.gain.linearRampToValueAtTime(0, t + i * 0.185 + 0.17);
      osc.connect(g);
      g.connect(masterGain!);
      osc.start(t + i * 0.185);
      osc.stop(t + i * 0.185 + 0.17);
    }
  },

  // Heartbeat bass thump (2x low pulse)
  double() {
    if (this.mute || !getCtx()) return;
    const c = getCtx()!;
    const t = c.currentTime;
    playTone(60, 0.1, "sine", 0.3, t);
    playTone(60, 0.1, "sine", 0.3, t + 0.2);
  },

  // Magic sparkle (high freq sweep with tremolo)
  special() {
    if (this.mute || !getCtx()) return;
    const c = getCtx()!;
    const t = c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    const trem = c.createOscillator();
    const tremGain = c.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(2000, t);
    osc.frequency.linearRampToValueAtTime(4000, t + 0.3);

    // Tremolo
    trem.type = "sine";
    trem.frequency.setValueAtTime(20, t);
    tremGain.gain.setValueAtTime(0.1, t);
    trem.connect(tremGain);
    tremGain.connect(g.gain);

    g.gain.setValueAtTime(0.2, t);
    g.gain.linearRampToValueAtTime(0, t + 0.3);
    osc.connect(g);
    g.connect(masterGain!);
    osc.start(t);
    osc.stop(t + 0.3);
    trem.start(t);
    trem.stop(t + 0.3);
  },

  // Level-up arpeggio (4 ascending notes)
  questComplete() {
    if (this.mute || !getCtx()) return;
    const c = getCtx()!;
    const t = c.currentTime;
    const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      playTone(freq, 0.1, "sine", 0.2, t + i * 0.1);
    });
  },

  // Triumphant chord (C4+E4+G4 simultaneous, 800ms decay)
  achievement() {
    if (this.mute || !getCtx()) return;
    const c = getCtx()!;
    const t = c.currentTime;
    [262, 330, 392].forEach(freq => {
      playTone(freq, 0.8, "sine", 0.2, t);
    });
  },

  // Comic splat (white noise burst + low thud)
  poop() {
    if (this.mute || !getCtx()) return;
    const c = getCtx()!;
    const t = c.currentTime;
    playNoiseBurst(0.1, 0.2, t);
    playTone(80, 0.1, "sine", 0.25, t + 0.05);
  },

  // Chomp sound (2 quick low tones)
  feed() {
    if (this.mute || !getCtx()) return;
    const c = getCtx()!;
    const t = c.currentTime;
    playTone(200, 0.05, "sine", 0.2, t);
    playTone(200, 0.05, "sine", 0.2, t + 0.1);
  },

  // Quick footstep patter (4 rapid soft ticks)
  walk() {
    if (this.mute || !getCtx()) return;
    const c = getCtx()!;
    const t = c.currentTime;
    for (let i = 0; i < 4; i++) {
      playNoiseBurst(0.03, 0.1, t + i * 0.07, 3000, "highpass");
    }
  },

  // Dramatic rising tension (low to high sweep)
  allIn() {
    if (this.mute || !getCtx()) return;
    playTone(100, 0.5, "sawtooth", 0.15, undefined, 800);
  },

  // Scratching sound (filtered noise)
  scratch() {
    if (this.mute || !getCtx()) return;
    playNoiseBurst(0.3, 0.15, undefined, 1000, "bandpass");
  },

  // Card reveal (quick ascending ping)
  reveal() {
    if (this.mute || !getCtx()) return;
    playTone(1000, 0.1, "sine", 0.2, undefined, 2000);
  },

  // Buzzer (low sawtooth)
  error() {
    if (this.mute || !getCtx()) return;
    playTone(150, 0.2, "sawtooth", 0.15);
  },

  // Cash register cha-ching (2 high pings)
  points() {
    if (this.mute || !getCtx()) return;
    const c = getCtx()!;
    const t = c.currentTime;
    playTone(2000, 0.05, "sine", 0.15, t);
    playTone(2500, 0.08, "sine", 0.2, t + 0.07);
  },

  // UI toggle (quick blip)
  toggle() {
    if (this.mute || !getCtx()) return;
    playTone(1000, 0.05, "sine", 0.1);
  },
};
