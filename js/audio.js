/**
 * His Majesty - Royal Audio Synthesizer
 * Uses Web Audio API to create authentic ancient Egyptian harp, sistrum,
 * ceremonial drums, and regal fanfare without external audio files.
 */

class SoundSystem {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        this.isMusicPlaying = false;
        this.musicTimer = null;
        this.volume = 0.7;
        
        // Egyptian Pentatonic / Modal Scale: D, F, G, A, C, D (Dorian / Maqam Bayati feel)
        this.scale = [293.66, 329.63, 349.23, 392.00, 440.00, 466.16, 523.25, 587.33, 659.25, 698.46, 783.99];
        this.noteIndex = 0;
    }

    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted) {
            this.stopMusic();
        } else {
            this.startMusic();
        }
        return this.isMuted;
    }

    // Play a delicate ancient harp / lyre pluck
    playHarp(freq, duration = 1.2, gainLevel = 0.25) {
        if (this.isMuted || !this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            // Plucked string harmonic spectrum
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now);

            // Resonant lowpass to simulate acoustic wooden body
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(freq * 3.5, now);
            filter.frequency.exponentialRampToValueAtTime(freq * 0.8, now + duration);

            // Pluck envelope: sharp attack, exponential decay
            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(gainLevel * this.volume, now + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + duration);
        } catch (e) {
            // Audio error catch
        }
    }

    // Ceremonial Sistrum / Rattle Shimmer
    playSistrum(duration = 0.4) {
        if (this.isMuted || !this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const bufferSize = this.ctx.sampleRate * duration;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const bandpass = this.ctx.createBiquadFilter();
            bandpass.type = 'bandpass';
            bandpass.frequency.setValueAtTime(5500, now);
            bandpass.Q.setValueAtTime(3.0, now);

            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0.18 * this.volume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

            noise.connect(bandpass);
            bandpass.connect(gain);
            gain.connect(this.ctx.destination);

            noise.start(now);
        } catch (e) {}
    }

    // Footstep on Sandstone
    playFootstep() {
        if (this.isMuted || !this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            osc.type = 'sine';
            const f = 90 + Math.random() * 20;
            osc.frequency.setValueAtTime(f, now);
            osc.frequency.exponentialRampToValueAtTime(30, now + 0.08);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(160, now);

            gain.gain.setValueAtTime(0.1 * this.volume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.08);
        } catch (e) {}
    }

    // Divine Blessing Scepter Chime (Golden harp glissando + heavenly resonance)
    playBlessing() {
        if (this.isMuted || !this.ctx) return;
        const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.51];
        notes.forEach((freq, idx) => {
            setTimeout(() => {
                this.playHarp(freq, 1.5, 0.22);
            }, idx * 60);
        });
        this.playSistrum(0.5);
    }

    // Tribute / Treasure Collected (Crisp golden coin ring)
    playTribute() {
        if (this.isMuted || !this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(1046.50, now); // C6
            osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6

            gain.gain.setValueAtTime(0.18 * this.volume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.45);
        } catch (e) {}
    }

    // Prostration / Reverent Bow Hum
    playProstration() {
        if (this.isMuted || !this.ctx) return;
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(146.83, now); // D3
            osc.frequency.linearRampToValueAtTime(110.00, now + 0.35); // A2

            gain.gain.setValueAtTime(0.08 * this.volume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.4);
        } catch (e) {}
    }

    // Royal Fanfare (Trumpet-like brass burst for coronation / milestones)
    playFanfare() {
        if (this.isMuted || !this.ctx) return;
        const chords = [
            { f: 293.66, t: 0 },
            { f: 440.00, t: 0.15 },
            { f: 587.33, t: 0.3 },
            { f: 880.00, t: 0.5 }
        ];
        chords.forEach(c => {
            setTimeout(() => {
                try {
                    const now = this.ctx.currentTime;
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'sawtooth';
                    osc.frequency.setValueAtTime(c.f, now);

                    const filter = this.ctx.createBiquadFilter();
                    filter.type = 'lowpass';
                    filter.frequency.setValueAtTime(c.f * 2.2, now);

                    gain.gain.setValueAtTime(0.18 * this.volume, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

                    osc.connect(filter);
                    filter.connect(gain);
                    gain.connect(this.ctx.destination);

                    osc.start(now);
                    osc.stop(now + 0.6);
                } catch (e) {}
            }, c.t * 1000);
        });
    }

    // Ambient Egyptian Music Generator
    startMusic() {
        if (this.isMusicPlaying || this.isMuted) return;
        this.init();
        this.isMusicPlaying = true;
        this.scheduleMelody();
    }

    stopMusic() {
        this.isMusicPlaying = false;
        if (this.musicTimer) {
            clearTimeout(this.musicTimer);
            this.musicTimer = null;
        }
    }

    scheduleMelody() {
        if (!this.isMusicPlaying || this.isMuted) return;

        // Pick a melodic note in the Egyptian scale
        const melodyPattern = [0, 2, 3, 4, 3, 2, 4, 6, 5, 4, 3, 1, 0];
        const noteIdx = melodyPattern[this.noteIndex % melodyPattern.length];
        this.noteIndex++;

        const freq = this.scale[noteIdx % this.scale.length];
        this.playHarp(freq, 1.8, 0.16);

        // Occasional sistrum accent
        if (Math.random() < 0.35) {
            setTimeout(() => this.playSistrum(0.3), 200);
        }

        // Timing interval between 450ms and 750ms
        const nextDelay = 550 + Math.sin(this.noteIndex) * 150;
        this.musicTimer = setTimeout(() => this.scheduleMelody(), nextDelay);
    }
}

window.soundSystem = new SoundSystem();
