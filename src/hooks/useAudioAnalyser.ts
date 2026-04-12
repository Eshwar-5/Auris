// src/hooks/useAudioAnalyser.ts
// Polls AudioEngine AnalyserNode at 60fps and pushes data to Zustand store

import { useEffect, useRef } from 'react';
import { AudioEngine } from '@/audio/AudioEngine';
import { useAudioStore } from '@/store/audioSlice';
import { useUiStore } from '@/store/uiSlice';

export function useAudioAnalyser(): void {
  const rafRef = useRef<number>(0);
  const { setAmplitude, setFftData } = useAudioStore.getState();
  const isInitialized = useUiStore((s) => s.isInitialized);

  useEffect(() => {
    if (!isInitialized) return;

    const engine = AudioEngine.instance;

    const tick = () => {
      const amplitude = engine.getAmplitude();
      const fftData = engine.getFrequencyData();

      setAmplitude(amplitude);
      setFftData(fftData);

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isInitialized, setAmplitude, setFftData]);
}
