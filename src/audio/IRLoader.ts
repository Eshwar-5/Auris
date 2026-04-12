// src/audio/IRLoader.ts
// Synthetic Impulse Response generator using OfflineAudioContext

import type { IRParams } from '@/scenes/presets';

/**
 * Generate a synthetic stereo impulse response AudioBuffer from IRParams.
 * Uses exponentially-decaying white noise with IIR damping and early reflections.
 */
export async function generateSyntheticIR(
  params: IRParams,
  ctx: AudioContext,
): Promise<AudioBuffer> {
  const sampleRate = ctx.sampleRate;
  const preDelaySamples = Math.ceil((params.preDelayMs / 1000) * sampleRate);
  const decaySamples = Math.ceil(params.decayTime * sampleRate);
  const totalSamples = preDelaySamples + decaySamples;

  // Use OfflineAudioContext for IR generation
  const offlineCtx = new OfflineAudioContext(2, totalSamples, sampleRate);
  const buffer = offlineCtx.createBuffer(2, totalSamples, sampleRate);

  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);

    // Decay exponent: reaches -60dB at decayTime
    const decayRate = Math.log(0.001) / params.decayTime;

    // IIR lowpass filter state for damping
    let filterState = 0;

    // Fill pre-delay with silence
    for (let i = 0; i < preDelaySamples; i++) {
      data[i] = 0;
    }

    // Generate early reflections (discrete peaks within first 80ms)
    const erCount = Math.max(2, Math.round(params.roomSize * 10));
    for (let j = 0; j < erCount; j++) {
      const erProgress = (j + 1) / (erCount + 1);
      const erOffset = Math.floor(erProgress * 0.08 * sampleRate);
      const idx = preDelaySamples + erOffset;
      if (idx < totalSamples) {
        const sign = ch === 0 ? 1 : -1; // stereo asymmetry
        const gain = params.roomSize * 0.4 * (1 - erProgress * 0.6);
        data[idx] += sign * gain * (Math.random() * 0.4 + 0.8);
      }
    }

    // Generate reverb tail
    for (let i = preDelaySamples; i < totalSamples; i++) {
      const t = (i - preDelaySamples) / sampleRate;
      const envelope = Math.exp(decayRate * t);

      // White noise source
      const noise = (Math.random() * 2 - 1) * envelope;

      // Apply damping (IIR lowpass)
      const dampCoeff = params.damping * 0.96;
      filterState = filterState * dampCoeff + noise * (1 - dampCoeff);

      // Mix brightness (high-freq) with damped (low-freq) signal
      data[i] += noise * params.brightness + filterState * (1 - params.brightness);
    }

    // Normalize channel to peak 1.0
    let maxAbs = 0;
    for (let i = 0; i < totalSamples; i++) {
      const abs = Math.abs(data[i]);
      if (abs > maxAbs) maxAbs = abs;
    }
    if (maxAbs > 0) {
      const scale = 0.95 / maxAbs;
      for (let i = 0; i < totalSamples; i++) {
        data[i] *= scale;
      }
    }
  }

  return buffer;
}

/**
 * Load an IR from a URL (for optional CDN-hosted real IRs).
 * Falls back to synthetic if fetch fails.
 */
export async function loadIRFromURL(
  url: string,
  ctx: AudioContext,
  fallbackParams: IRParams,
): Promise<AudioBuffer> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    return await ctx.decodeAudioData(arrayBuffer);
  } catch (err) {
    console.warn('[Auris] IR load failed, using synthetic:', err);
    return generateSyntheticIR(fallbackParams, ctx);
  }
}
