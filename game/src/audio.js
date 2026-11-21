// Shadow Lantern — sound, all synthesized with WebAudio (no files).
// Footstep ticks tell you where you are loud; a two-tone sting marks the
// alarm; a chime marks the artifact; a short fanfare marks the escape.

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  ensure() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        this.ctx = null;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  tone(freq, dur, type = 'sine', vol = 0.08, when = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  footstep() {
    this.tone(180, 0.07, 'triangle', 0.05);
  }

  guardStep() {
    this.tone(120, 0.08, 'triangle', 0.03);
  }

  // The alarm sting: two rising tones.
  alarm() {
    this.tone(440, 0.16, 'square', 0.06);
    this.tone(660, 0.22, 'square', 0.06, 0.14);
  }

  suspicious() {
    this.tone(330, 0.12, 'sine', 0.05);
  }

  pickup() {
    this.tone(523, 0.12, 'sine', 0.08);
    this.tone(659, 0.12, 'sine', 0.08, 0.09);
    this.tone(784, 0.2, 'sine', 0.08, 0.18);
  }

  caught() {
    this.tone(110, 0.4, 'sawtooth', 0.09);
    this.tone(82, 0.5, 'sawtooth', 0.09, 0.1);
  }

  win() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, 'sine', 0.08, i * 0.12));
  }
}
