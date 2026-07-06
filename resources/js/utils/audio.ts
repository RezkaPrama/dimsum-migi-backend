/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Plays an elegant, modern restaurant chime for new orders.
 */
export function playNewOrderChime() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Chime 1 (High bell)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now); // A5
    osc1.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.2, now + 0.05);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    // Chime 2 (Sweet third)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1109, now + 0.08); // C#6
    gain2.gain.setValueAtTime(0, now + 0.08);
    gain2.gain.linearRampToValueAtTime(0.15, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 1.0);
    osc2.start(now + 0.08);
    osc2.stop(now + 1.5);
  } catch (error) {
    console.warn('Audio play failed:', error);
  }
}

/**
 * Plays a click/tear sound for paper ripping.
 */
export function playPaperTearSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const bufferSize = ctx.sampleRate * 0.15; // 0.15s duration
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    // Fill buffer with white noise with exponential decay
    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 6) * 0.3;
    }
    
    const noiseNode = ctx.createBufferSource();
    noiseNode.buffer = buffer;
    
    // Add bandpass filter to sound crunchy like paper tearing
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1000, now);
    filter.Q.setValueAtTime(1.5, now);
    
    noiseNode.connect(filter);
    filter.connect(ctx.destination);
    
    noiseNode.start(now);
    noiseNode.stop(now + 0.2);
  } catch (e) {
    console.warn('Tear audio failed:', e);
  }
}

/**
 * Synthesizes a realistic thermal stepper motor "zippp-zippp" sound during printing.
 * Uses low frequency modulation to sound mechanical.
 */
export function playPrinterStepperSound(durationMs: number) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const duration = durationMs / 1000;

    // We will create several burst intervals of stepper sounds
    const stepCount = Math.floor(durationMs / 180);
    for (let i = 0; i < stepCount; i++) {
      const startSec = now + (i * 0.18);
      const stepDuration = 0.12;

      // Noise source for the friction/paper slide
      const bufferSize = ctx.sampleRate * stepDuration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let j = 0; j < bufferSize; j++) {
        data[j] = (Math.random() * 2 - 1) * 0.05;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      // Low mechanical squeak (oscillator)
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, startSec);
      osc.frequency.exponentialRampToValueAtTime(120, startSec + stepDuration);

      // Mix gain
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, startSec);
      gain.gain.linearRampToValueAtTime(0.08, startSec + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startSec + stepDuration);

      // Low-pass filter to sound muffled inside the printer
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1800, startSec);

      noise.connect(filter);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(startSec);
      noise.stop(startSec + stepDuration);
      osc.start(startSec);
      osc.stop(startSec + stepDuration);
    }
  } catch (e) {
    console.warn('Printer audio failed:', e);
  }
}
