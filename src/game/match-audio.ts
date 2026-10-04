/** Short synthesized cues, enabled only after a user gesture. */
export class MatchAudio {
  private context: AudioContext | null = null;
  private enabled = false;
  async toggle(): Promise<boolean> {
    this.context ??= new AudioContext();
    await this.context.resume();
    this.enabled = !this.enabled;
    return this.enabled;
  }
  cue(kind: 'shot' | 'plant' | 'defuse' | 'detonation' | 'round') {
    if (!this.enabled || !this.context || this.context.state !== 'running') return;
    const frequencies = { shot: 110, plant: 660, defuse: 880, detonation: 55, round: 440 };
    const oscillator = this.context.createOscillator(), gain = this.context.createGain();
    const now = this.context.currentTime, duration = kind === 'detonation' ? .5 : .12;
    oscillator.type = kind === 'shot' || kind === 'detonation' ? 'sawtooth' : 'sine';
    oscillator.frequency.setValueAtTime(frequencies[kind], now);
    oscillator.frequency.exponentialRampToValueAtTime(frequencies[kind] * .4, now + duration);
    gain.gain.setValueAtTime(.035, now);
    gain.gain.exponentialRampToValueAtTime(.001, now + duration);
    oscillator.connect(gain); gain.connect(this.context.destination);
    oscillator.start(now); oscillator.stop(now + duration);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
  destroy() { void this.context?.close(); this.context = null; this.enabled = false; }
}
