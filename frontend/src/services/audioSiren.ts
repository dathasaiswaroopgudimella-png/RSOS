/**
 * Web Audio API Emergency Siren Synthesizer
 * Generates an alternating two-tone emergency siren pulse.
 */

class EmergencyAudioSiren {
  private ctx: AudioContext | null = null;
  private osc1: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private intervalId: any = null;
  private isPlaying: boolean = false;

  private initContext() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public startSiren() {
    if (this.isPlaying) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      this.isPlaying = true;
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.setValueAtTime(0.15, this.ctx.currentTime);
      this.gainNode.connect(this.ctx.destination);

      let toggle = false;
      this.intervalId = setInterval(() => {
        if (!this.ctx || !this.isPlaying) return;
        const freq = toggle ? 960 : 770;
        toggle = !toggle;

        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        osc.connect(this.gainNode!);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.22);
      }, 250);
    } catch (e) {
      console.warn('[AUDIO_SIREN] Web Audio playback failed:', e);
    }
  }

  public stopSiren() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.gainNode) {
      try {
        this.gainNode.disconnect();
      } catch (_) {}
      this.gainNode = null;
    }
  }
}

export const emergencySiren = new EmergencyAudioSiren();
