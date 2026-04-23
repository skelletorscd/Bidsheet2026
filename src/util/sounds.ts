// Web Audio synth — every celebration sound is generated in code so we
// don't ship any audio files. Each function expects a primed AudioContext
// (call resume() after a user gesture before the first play).

export type SoundName =
  | "moonwalk"
  | "rocket"
  | "tnt"
  | "jackpot"
  | "stamp"
  | "lightning"
  | "trophy"
  | "confetti"
  | "disco"
  | "boxingKo"
  | "clawMachine"
  | "lionsRoar";

let ctx: AudioContext | null = null;
let muted = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      (window as unknown as { AudioContext?: typeof AudioContext })
        .AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") {
    void ctx.resume();
  }
  return ctx;
}

export function setSoundMuted(next: boolean): void {
  muted = next;
}

export function isSoundMuted(): boolean {
  return muted;
}

/** Browsers require a user gesture before first audio playback. Wire this
 * to any click handler so the AudioContext is allowed to run. */
export function primeAudio(): void {
  getCtx();
}

export function playSound(name: SoundName): void {
  if (muted) return;
  const c = getCtx();
  if (!c) return;
  try {
    const fn = SOUNDS[name];
    fn(c);
  } catch {
    // Browser may block; silent fail.
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────

function masterGain(c: AudioContext, level: number): GainNode {
  const g = c.createGain();
  g.gain.value = level * 0.6; // global volume cap
  g.connect(c.destination);
  return g;
}

function envBeep(
  c: AudioContext,
  out: AudioNode,
  freq: number,
  start: number,
  duration: number,
  type: OscillatorType = "sine",
  peak = 0.4,
): void {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(peak, start + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(g);
  g.connect(out);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

function noiseBurst(
  c: AudioContext,
  out: AudioNode,
  start: number,
  duration: number,
  filterType: BiquadFilterType,
  filterFreq: number,
  peak = 0.4,
  filterFreqEnd?: number,
): void {
  const buf = c.createBuffer(
    1,
    Math.max(1, Math.floor(c.sampleRate * duration)),
    c.sampleRate,
  );
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.setValueAtTime(filterFreq, start);
  if (filterFreqEnd != null) {
    filter.frequency.exponentialRampToValueAtTime(
      filterFreqEnd,
      start + duration,
    );
  }
  filter.Q.value = 1;
  const g = c.createGain();
  g.gain.setValueAtTime(peak, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  src.connect(filter);
  filter.connect(g);
  g.connect(out);
  src.start(start);
  src.stop(start + duration);
}

// ─── Sound definitions ──────────────────────────────────────────────────

const SOUNDS: Record<SoundName, (c: AudioContext) => void> = {
  // Funky-bass groove + a vinyl scratch on top.
  moonwalk(c) {
    const now = c.currentTime;
    const out = masterGain(c, 0.7);
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 700;
    lp.connect(out);
    const pattern = [110, 110, 87.31, 110, 146.83]; // A2 A2 F2 A2 D3
    pattern.forEach((f, i) => {
      envBeep(c, lp, f, now + i * 0.18, 0.16, "sawtooth", 0.35);
    });
    // Hi-hat shimmer
    for (let i = 0; i < 6; i++) {
      noiseBurst(c, out, now + i * 0.15, 0.05, "highpass", 4500, 0.18);
    }
  },

  // Whoosh → ascending engine pitch.
  rocket(c) {
    const now = c.currentTime;
    const out = masterGain(c, 0.7);
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(70, now);
    osc.frequency.exponentialRampToValueAtTime(900, now + 1.4);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.35, now + 0.15);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
    osc.connect(g);
    g.connect(out);
    osc.start(now);
    osc.stop(now + 1.5);
    // Whoosh
    noiseBurst(c, out, now, 1.4, "bandpass", 350, 0.5, 4000);
  },

  // Sub-bass thump + glassy crackle burst.
  tnt(c) {
    const now = c.currentTime;
    const out = masterGain(c, 1.0);
    // Low boom
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(20, now + 0.55);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.9, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
    osc.connect(g);
    g.connect(out);
    osc.start(now);
    osc.stop(now + 0.6);
    // Crackle
    noiseBurst(c, out, now + 0.005, 0.6, "highpass", 1200, 0.7);
    // Glass shatter shimmer
    for (let i = 0; i < 8; i++) {
      noiseBurst(
        c,
        out,
        now + 0.08 + i * 0.04,
        0.08,
        "bandpass",
        3000 + Math.random() * 4000,
        0.18,
      );
    }
  },

  // Bell coins falling, then ascending C major arpeggio.
  jackpot(c) {
    const now = c.currentTime;
    const out = masterGain(c, 0.7);
    // Coin pings
    [880, 1320, 1760, 1100, 1500].forEach((f, i) => {
      envBeep(c, out, f, now + i * 0.06, 0.18, "sine", 0.3);
    });
    // Win jingle: C5 E5 G5 C6
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      envBeep(
        c,
        out,
        f,
        now + 0.45 + i * 0.13,
        0.22,
        "triangle",
        0.4,
      );
    });
  },

  // Big leather thud.
  stamp(c) {
    const now = c.currentTime;
    const out = masterGain(c, 1.0);
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.15);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.85, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    osc.connect(g);
    g.connect(out);
    osc.start(now);
    osc.stop(now + 0.2);
    // Wood smack
    noiseBurst(c, out, now, 0.06, "bandpass", 800, 0.5);
  },

  // Crack of thunder + electric zap.
  lightning(c) {
    const now = c.currentTime;
    const out = masterGain(c, 1.0);
    // Sharp electric zap
    for (let i = 0; i < 4; i++) {
      const f = 2000 - i * 400;
      envBeep(c, out, f, now + i * 0.02, 0.05, "square", 0.3);
    }
    // Thunder rumble
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(80, now + 0.1);
    osc.frequency.exponentialRampToValueAtTime(30, now + 1.0);
    g.gain.setValueAtTime(0.0001, now + 0.1);
    g.gain.exponentialRampToValueAtTime(0.7, now + 0.13);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.0);
    osc.connect(g);
    g.connect(out);
    osc.start(now + 0.1);
    osc.stop(now + 1.1);
    // Rumble noise
    noiseBurst(c, out, now + 0.1, 0.9, "lowpass", 200, 0.5);
  },

  // Triumphant 5-note fanfare (think Olympic medal).
  trophy(c) {
    const now = c.currentTime;
    const out = masterGain(c, 0.8);
    // Brass-like fanfare: G4 C5 E5 G5 C6
    const notes = [
      { f: 392, t: 0.0, d: 0.18 },
      { f: 523.25, t: 0.18, d: 0.18 },
      { f: 659.25, t: 0.36, d: 0.22 },
      { f: 783.99, t: 0.58, d: 0.22 },
      { f: 1046.5, t: 0.8, d: 0.55 },
    ];
    for (const n of notes) {
      // Fundamental + octave for a richer tone
      envBeep(c, out, n.f, now + n.t, n.d, "triangle", 0.4);
      envBeep(c, out, n.f * 2, now + n.t, n.d * 0.5, "sine", 0.15);
    }
  },

  // Cork pop + crowd cheer (white-noise crowd whoosh).
  confetti(c) {
    const now = c.currentTime;
    const out = masterGain(c, 0.8);
    // Pop
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(900, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.9, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc.connect(g);
    g.connect(out);
    osc.start(now);
    osc.stop(now + 0.15);
    // Crowd cheer
    noiseBurst(c, out, now + 0.05, 1.2, "bandpass", 1800, 0.45, 1500);
    // Sparkle bells trailing
    [1500, 2000, 2500, 1800, 2200].forEach((f, i) => {
      envBeep(c, out, f, now + 0.2 + i * 0.08, 0.2, "sine", 0.18);
    });
  },

  // Funky disco bass + hi-hat + sparkle bells.
  disco(c) {
    const now = c.currentTime;
    const out = masterGain(c, 0.7);
    // Bass groove (1-and-3 pattern)
    [82.41, 0, 110, 0, 82.41, 0, 146.83, 0].forEach((f, i) => {
      if (f === 0) return;
      envBeep(c, out, f, now + i * 0.13, 0.11, "sawtooth", 0.35);
    });
    // Hi-hat
    for (let i = 0; i < 8; i++) {
      noiseBurst(
        c,
        out,
        now + i * 0.13 + 0.06,
        0.05,
        "highpass",
        6000,
        0.2,
      );
    }
    // Sparkle bells
    [2093, 2637, 3136].forEach((f, i) => {
      envBeep(c, out, f, now + 0.4 + i * 0.15, 0.18, "sine", 0.18);
    });
  },

  // Claw-machine motor whirr + clicks + rubber ducky squeak.
  clawMachine(c) {
    const now = c.currentTime;
    const out = masterGain(c, 0.7);
    // Motor whirr (low sustained sawtooth with vibrato)
    const motor = c.createOscillator();
    const mGain = c.createGain();
    motor.type = "sawtooth";
    motor.frequency.setValueAtTime(85, now);
    motor.frequency.linearRampToValueAtTime(90, now + 1.4);
    motor.frequency.linearRampToValueAtTime(85, now + 2.6);
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 600;
    mGain.gain.setValueAtTime(0.0001, now);
    mGain.gain.linearRampToValueAtTime(0.18, now + 0.2);
    mGain.gain.linearRampToValueAtTime(0.18, now + 2.4);
    mGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.7);
    motor.connect(lp);
    lp.connect(mGain);
    mGain.connect(out);
    motor.start(now);
    motor.stop(now + 2.8);
    // Mechanical clicks at irregular intervals
    [0.4, 0.8, 1.2, 1.55].forEach((t) => {
      noiseBurst(c, out, now + t, 0.03, "highpass", 3000, 0.3);
    });
    // Rubber ducky squeak — quick rising pitch chirp
    const duck = c.createOscillator();
    const dGain = c.createGain();
    duck.type = "square";
    duck.frequency.setValueAtTime(700, now + 1.8);
    duck.frequency.exponentialRampToValueAtTime(1500, now + 2.0);
    duck.frequency.exponentialRampToValueAtTime(900, now + 2.15);
    dGain.gain.setValueAtTime(0.0001, now + 1.8);
    dGain.gain.exponentialRampToValueAtTime(0.4, now + 1.82);
    dGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.2);
    duck.connect(dGain);
    dGain.connect(out);
    duck.start(now + 1.8);
    duck.stop(now + 2.25);
    // Second squeak
    const duck2 = c.createOscillator();
    const d2Gain = c.createGain();
    duck2.type = "square";
    duck2.frequency.setValueAtTime(800, now + 2.3);
    duck2.frequency.exponentialRampToValueAtTime(1300, now + 2.42);
    d2Gain.gain.setValueAtTime(0.0001, now + 2.3);
    d2Gain.gain.exponentialRampToValueAtTime(0.35, now + 2.32);
    d2Gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);
    duck2.connect(d2Gain);
    d2Gain.connect(out);
    duck2.start(now + 2.3);
    duck2.stop(now + 2.55);
  },

  // Lion roar — low rumbling growl that builds, then a guttural snarl.
  lionsRoar(c) {
    const now = c.currentTime;
    const out = masterGain(c, 1.0);
    // Body of the roar — low sawtooth with descending pitch + vibrato
    const osc = c.createOscillator();
    const lfo = c.createOscillator();
    const lfoGain = c.createGain();
    const g = c.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(85, now);
    osc.frequency.linearRampToValueAtTime(140, now + 0.4);
    osc.frequency.linearRampToValueAtTime(60, now + 1.6);
    lfo.frequency.value = 18; // throaty growl modulation
    lfoGain.gain.value = 18;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.55, now + 0.25);
    g.gain.linearRampToValueAtTime(0.6, now + 1.2);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.7);
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(800, now);
    lp.frequency.linearRampToValueAtTime(1400, now + 1.2);
    osc.connect(lp);
    lp.connect(g);
    g.connect(out);
    osc.start(now);
    osc.stop(now + 1.75);
    lfo.start(now);
    lfo.stop(now + 1.75);
    // Breathy noise on top for the snarl
    noiseBurst(c, out, now + 0.05, 1.5, "bandpass", 600, 0.45, 1800);
    // Final guttural cap
    noiseBurst(c, out, now + 1.55, 0.25, "lowpass", 300, 0.4);
  },

  // Boxing bell ding ding + KO punch thud + cheer.
  boxingKo(c) {
    const now = c.currentTime;
    const out = masterGain(c, 0.85);
    // Two bell rings
    for (let r = 0; r < 2; r++) {
      [1320, 1760, 2200, 2640].forEach((f) => {
        const start = now + r * 0.18;
        envBeep(c, out, f, start, 0.45, "sine", 0.22);
      });
    }
    // KO punch (delayed, sub-bass thud)
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, now + 0.55);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.75);
    g.gain.setValueAtTime(0.0001, now + 0.55);
    g.gain.exponentialRampToValueAtTime(0.9, now + 0.56);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.78);
    osc.connect(g);
    g.connect(out);
    osc.start(now + 0.55);
    osc.stop(now + 0.8);
    // Punch crack
    noiseBurst(c, out, now + 0.55, 0.12, "bandpass", 500, 0.6);
    // Cheer trailing
    noiseBurst(c, out, now + 0.7, 0.9, "bandpass", 1800, 0.35, 1200);
  },
};
