/**
 * Web Audio API Sound Synthesizer for MOBA sound effects & announcer
 */
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.initialized = true;
    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
  }

  ensureContext() {
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freq, type, duration, gainStart = 0.3, gainEnd = 0.001) {
    if (!this.enabled || !this.ctx) return;
    this.ensureContext();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gain.gain.setValueAtTime(gainStart, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(gainEnd, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playNoise(duration, filterFreq = 1000, gainStart = 0.2) {
    if (!this.enabled || !this.ctx) return;
    this.ensureContext();
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainStart, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start();
  }

  playAttackSound() {
    this.playNoise(0.12, 2500, 0.25);
    this.playTone(220, 'sawtooth', 0.1, 0.15);
  }

  playHitSound() {
    this.playNoise(0.15, 1200, 0.35);
    this.playTone(110, 'triangle', 0.15, 0.3);
  }

  playCritSound() {
    this.playNoise(0.25, 4000, 0.45);
    this.playTone(440, 'sawtooth', 0.2, 0.4);
    setTimeout(() => this.playTone(880, 'square', 0.15, 0.3), 50);
  }

  playArthurS1() {
    // Holy dash & sword glow charge
    this.playTone(330, 'sine', 0.25, 0.3);
    setTimeout(() => this.playTone(495, 'triangle', 0.3, 0.35), 80);
    setTimeout(() => this.playTone(660, 'sine', 0.35, 0.4), 160);
  }

  playArthurS2() {
    // Holy sword spinning whoosh
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        this.playNoise(0.12, 1800, 0.15);
        this.playTone(350 + i * 40, 'sine', 0.1, 0.15);
      }, i * 200);
    }
  }

  playArthurS3() {
    // Thunderous leap slam ult
    this.playTone(150, 'sawtooth', 0.4, 0.5);
    this.playNoise(0.6, 800, 0.6);
    setTimeout(() => {
      this.playTone(80, 'triangle', 0.8, 0.8);
      this.playNoise(0.8, 500, 0.8);
    }, 200);
  }

  playArrowSound() {
    this.playTone(800, 'sine', 0.1, 0.2);
    this.playNoise(0.1, 3000, 0.2);
  }

  playHouyiS2() {
    // Solar beam strike
    this.playTone(600, 'triangle', 0.4, 0.3);
    setTimeout(() => {
      this.playNoise(0.35, 1500, 0.5);
      this.playTone(180, 'sawtooth', 0.35, 0.4);
    }, 150);
  }

  playHouyiS3() {
    // Phoenix ult launch & fly
    this.playTone(440, 'sawtooth', 0.5, 0.4);
    this.playTone(880, 'sine', 0.6, 0.4);
    this.playNoise(0.4, 2500, 0.35);
  }

  playDajiS1() {
    // Soul wave
    this.playTone(520, 'sine', 0.3, 0.35);
    this.playNoise(0.2, 1600, 0.25);
  }

  playDajiS2() {
    // Charm heart
    this.playTone(700, 'sine', 0.2, 0.3);
    setTimeout(() => this.playTone(900, 'sine', 0.25, 0.35), 80);
    setTimeout(() => this.playTone(1100, 'sine', 0.3, 0.4), 160);
  }

  playDajiS3() {
    // Multi fox orbs
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        this.playTone(600 + i * 80, 'triangle', 0.15, 0.25);
        this.playNoise(0.08, 2200, 0.2);
      }, i * 90);
    }
  }

  playTowerLaser() {
    this.playTone(750, 'sawtooth', 0.25, 0.35);
    this.playNoise(0.2, 2000, 0.3);
  }

  playGold() {
    this.playTone(987.77, 'sine', 0.1, 0.25);
    setTimeout(() => this.playTone(1318.51, 'sine', 0.2, 0.3), 70);
  }

  playLevelUp() {
    const notes = [440, 554, 659, 880];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 'triangle', 0.25, 0.35), i * 90);
    });
  }

  playRecall() {
    this.playTone(392, 'sine', 0.4, 0.25);
    setTimeout(() => this.playTone(523.25, 'sine', 0.5, 0.3), 200);
    setTimeout(() => this.playTone(659.25, 'sine', 0.6, 0.35), 400);
  }

  playAnnouncer(type) {
    if (!this.enabled) return;
    this.ensureContext();
    if (type === 'FIRST_BLOOD') {
      this.playTone(300, 'sawtooth', 0.3, 0.5);
      setTimeout(() => this.playTone(450, 'sawtooth', 0.4, 0.5), 150);
      setTimeout(() => this.playTone(600, 'triangle', 0.6, 0.6), 350);
    } else if (type === 'DOUBLE_KILL') {
      this.playTone(400, 'sawtooth', 0.2, 0.5);
      setTimeout(() => this.playTone(600, 'sawtooth', 0.4, 0.6), 120);
    } else if (type === 'TRIPLE_KILL') {
      this.playTone(450, 'sawtooth', 0.2, 0.5);
      setTimeout(() => this.playTone(650, 'sawtooth', 0.2, 0.55), 100);
      setTimeout(() => this.playTone(900, 'triangle', 0.5, 0.65), 220);
    } else if (type === 'GODLIKE' || type === 'LEGENDARY') {
      [400, 500, 650, 850, 1100].forEach((f, idx) => {
        setTimeout(() => this.playTone(f, 'square', 0.25, 0.45), idx * 80);
      });
    } else if (type === 'VICTORY') {
      [523, 659, 783, 1046].forEach((f, idx) => {
        setTimeout(() => this.playTone(f, 'triangle', 0.6, 0.6), idx * 150);
      });
    } else if (type === 'DEFEAT') {
      [400, 350, 300, 220].forEach((f, idx) => {
        setTimeout(() => this.playTone(f, 'sawtooth', 0.6, 0.6), idx * 180);
      });
    }
  }
}

const Sound = new SoundEngine();
