// src/hooks/useHaptics.ts
// Vibration API haptic sync with sub-bass frequency extraction

import { useEffect, useRef } from 'react';
import { useAudioStore } from '@/store/audioSlice';
import { useUiStore } from '@/store/uiSlice';
import { getSubBassEnergy } from '@/audio/PannerController';
import { AudioEngine } from '@/audio/AudioEngine';

const HAPTIC_INTERVAL_MS = 60; // ~16fps for haptics (more than enough)

export function useHaptics(): void {
  const rafRef = useRef<number>(0);
  const lastHapticAt = useRef(0);

  const hapticsActive = useUiStore((s) => s.hapticsActive);
  const hapticIntensity = useUiStore((s) => s.hapticIntensity);
  const isPlaying = useAudioStore((s) => s.isPlaying);

  useEffect(() => {
    if (!hapticsActive || !isPlaying || !('vibrate' in navigator)) return;

    const tick = () => {
      const now = performance.now();
      if (now - lastHapticAt.current >= HAPTIC_INTERVAL_MS) {
        const fftData = AudioEngine.instance.getFrequencyData();
        const sampleRate = AudioEngine.instance.sampleRate;
        const energy = getSubBassEnergy(fftData, sampleRate);

        if (energy > 0.15) {
          const intensity = (hapticIntensity / 100) * energy;
          const duration = Math.max(10, Math.round(intensity * 60));
          try {
            navigator.vibrate(duration);
          } catch { /* unsupported */ }
        }
        lastHapticAt.current = now;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      navigator.vibrate(0); // stop any ongoing vibration
    };
  }, [hapticsActive, hapticIntensity, isPlaying]);
}
