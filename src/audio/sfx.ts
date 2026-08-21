// Zero-asset SFX via Web Audio: tiny synthesized blips. Mute persists in localStorage.
// ponytail: synth beeps, not sampled audio — swap for CC0 samples in a later pass if wanted.
type Kind = "attack" | "hit" | "coin" | "hurt" | "deny" | "boss" | "victory" | "ui";

let ctx: AudioContext | null = null;
let muted = localStorage.getItem("tq_muted") === "1";

function ac(): AudioContext | null {
  if (muted) return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function isMuted(): boolean {
  return muted;
}
export function toggleMuted(): boolean {
  muted = !muted;
  localStorage.setItem("tq_muted", muted ? "1" : "0");
  return muted;
}
// Call on a user gesture so the browser allows audio.
export function unlockAudio(): void {
  const c = ac();
  if (c && c.state === "suspended") void c.resume();
}

function tone(c: AudioContext, opts: { freq: number; to?: number; dur: number; type?: OscillatorType; gain?: number; delay?: number }) {
  const t0 = c.currentTime + (opts.delay ?? 0);
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = opts.type ?? "square";
  osc.frequency.setValueAtTime(opts.freq, t0);
  if (opts.to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.to), t0 + opts.dur);
  const peak = opts.gain ?? 0.12;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + opts.dur + 0.02);
}

export function play(kind: Kind): void {
  const c = ac();
  if (!c) return;
  switch (kind) {
    case "attack": tone(c, { freq: 520, to: 220, dur: 0.09, type: "square", gain: 0.08 }); break;
    case "hit": tone(c, { freq: 180, to: 60, dur: 0.12, type: "sawtooth", gain: 0.14 }); break;
    case "coin": tone(c, { freq: 880, dur: 0.07, type: "square", gain: 0.1 }); tone(c, { freq: 1320, dur: 0.09, type: "square", gain: 0.1, delay: 0.06 }); break;
    case "hurt": tone(c, { freq: 300, to: 90, dur: 0.22, type: "sawtooth", gain: 0.16 }); break;
    case "deny": tone(c, { freq: 140, to: 90, dur: 0.16, type: "square", gain: 0.1 }); break;
    case "boss": tone(c, { freq: 90, to: 40, dur: 0.7, type: "sawtooth", gain: 0.2 }); break;
    case "victory":
      [523, 659, 784, 1047].forEach((f, i) => tone(c, { freq: f, dur: 0.18, type: "square", gain: 0.1, delay: i * 0.12 }));
      break;
    case "ui": tone(c, { freq: 660, dur: 0.05, type: "triangle", gain: 0.07 }); break;
  }
}
