// Synthesized sound with the Web Audio API: short SFX (each under 0.5 s) and a low traffic hum.
// Nothing plays until the first tap or key press (browsers require it), and the context is
// suspended while the tab is hidden. Music has a channel and volume but no track in v1.
import { getSettings, onSettings, type Settings } from '../util/settings';

export type Sfx = 'coin' | 'bag' | 'stamp' | 'merge' | 'siren' | 'bell' | 'crow';

export interface Audio {
  play(sfx: Sfx): void;
  /** Traffic density 0..1 drives the ambience volume. */
  setTraffic(density: number): void;
}

const COIN_GAP_MS = 250; // at most 4 coin ticks a second
/** The same sound never starts twice within this gap (a burst of permits clearing stays one stamp). */
const SAME_SOUND_GAP_MS = 120;

export function createAudio(): Audio {
  let ac: AudioContext | null = null;
  let master: GainNode, sfx: GainNode, amb: GainNode, music: GainNode, hum: GainNode;
  let noise: AudioBuffer;
  const lastPlayed: Partial<Record<Sfx, number>> = {};
  let failed = false;
  let traffic = 0;

  const apply = (s: Settings) => {
    if (!ac) return;
    const t = ac.currentTime;
    master.gain.setTargetAtTime(s.master, t, 0.05);
    sfx.gain.setTargetAtTime(s.sfx, t, 0.05);
    amb.gain.setTargetAtTime(s.ambience, t, 0.05);
    music.gain.setTargetAtTime(s.music, t, 0.05);
  };

  const start = () => {
    if (failed) return;
    if (ac) {
      // iOS can also leave the context 'interrupted' after a call or Siri
      if (ac.state !== 'running' && ac.state !== 'closed' && document.visibilityState === 'visible') ac.resume().catch(() => undefined);
      return;
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) {
      failed = true;
      return;
    }
    try {
      ac = new Ctor();
    } catch {
      failed = true;
      return;
    }
    // a gentle limiter, so sounds that land together never clip
    const limiter = ac.createDynamicsCompressor();
    limiter.threshold.value = -12;
    limiter.ratio.value = 8;
    limiter.connect(ac.destination);
    master = ac.createGain();
    master.connect(limiter);
    sfx = ac.createGain();
    amb = ac.createGain();
    music = ac.createGain();
    for (const g of [sfx, amb, music]) g.connect(master);
    // one second of white noise, reused by every noisy sound
    noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // the traffic hum: looped noise through a low-pass, quiet
    const src = ac.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 320;
    hum = ac.createGain();
    hum.gain.value = 0;
    src.connect(lp).connect(hum).connect(amb);
    src.start();
    apply(getSettings());
    setTrafficGain();
  };
  // pointerdown alone is not a "user activation" for touch on Safari; pointerup, touchend and click are
  for (const ev of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'] as const) window.addEventListener(ev, start, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (!ac) return;
    if (document.visibilityState === 'hidden') ac.suspend().catch(() => undefined);
    else ac.resume().catch(() => undefined);
  });
  onSettings(apply);

  function setTrafficGain(): void {
    if (ac) hum.gain.setTargetAtTime(0.05 + 0.25 * traffic, ac.currentTime, 0.5);
  }

  // --- tiny synth helpers ---------------------------------------------------------------------
  const env = (g: GainNode, t: number, peak: number, attack: number, decay: number) => {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  };
  const tone = (type: OscillatorType, f0: number, f1: number, t: number, dur: number, peak: number, out: AudioNode = sfx) => {
    const o = ac!.createOscillator();
    const g = ac!.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, peak, 0.005, dur);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.05);
  };
  const hiss = (t: number, dur: number, peak: number, filter: BiquadFilterType, freq: number) => {
    const src = ac!.createBufferSource();
    src.buffer = noise;
    const f = ac!.createBiquadFilter();
    f.type = filter;
    f.frequency.value = freq;
    const g = ac!.createGain();
    env(g, t, peak, 0.005, dur);
    src.connect(f).connect(g).connect(sfx);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  };

  const sounds: Record<Sfx, (t: number) => void> = {
    coin: (t) => {
      tone('square', 1800, 2400, t, 0.06, 0.08);
      tone('sine', 2600, 2600, t + 0.05, 0.12, 0.08);
    },
    bag: (t) => {
      hiss(t, 0.06, 0.3, 'bandpass', 1800);
      tone('sine', 700, 260, t, 0.16, 0.25);
      tone('square', 1400, 1900, t + 0.12, 0.08, 0.06);
    },
    stamp: (t) => {
      tone('sine', 140, 55, t, 0.18, 0.5);
      hiss(t, 0.04, 0.25, 'lowpass', 900);
    },
    merge: (t) => {
      hiss(t, 0.35, 0.3, 'lowpass', 240);
      tone('triangle', 520, 1040, t + 0.15, 0.3, 0.12);
      tone('sine', 1560, 1560, t + 0.3, 0.18, 0.08);
    },
    siren: (t) => {
      // two short tones, low and not shrill
      tone('sine', 620, 620, t, 0.18, 0.14);
      tone('sine', 820, 820, t + 0.2, 0.2, 0.14);
    },
    bell: (t) => {
      for (const k of [0, 0.14]) {
        tone('sine', 2250, 2200, t + k, 0.22, 0.07);
        tone('sine', 3150, 3100, t + k, 0.16, 0.04);
      }
    },
    crow: (t) => {
      for (const k of [0, 0.24]) {
        const o = ac!.createOscillator();
        const bp = ac!.createBiquadFilter();
        const g = ac!.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(560, t + k);
        o.frequency.exponentialRampToValueAtTime(380, t + k + 0.18);
        bp.type = 'bandpass';
        bp.frequency.value = 1100;
        bp.Q.value = 2;
        env(g, t + k, 0.09, 0.01, 0.18);
        o.connect(bp).connect(g).connect(sfx);
        o.start(t + k);
        o.stop(t + k + 0.25);
      }
    },
  };

  return {
    play(name) {
      if (!ac || ac.state !== 'running') return;
      const now = performance.now();
      if (now - (lastPlayed[name] ?? -Infinity) < (name === 'coin' ? COIN_GAP_MS : SAME_SOUND_GAP_MS)) return;
      lastPlayed[name] = now;
      sounds[name](ac.currentTime + 0.01);
    },
    setTraffic(density) {
      const d = Math.min(1, Math.max(0, density));
      if (Math.abs(d - traffic) < 0.02) return;
      traffic = d;
      setTrafficGain();
    },
  };
}
