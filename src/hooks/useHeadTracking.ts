// src/hooks/useHeadTracking.ts
// DeviceOrientation-based head tracking hook (mobile), desktop stub

import { useEffect, useRef, useCallback } from 'react';
import { AudioEngine } from '@/audio/AudioEngine';
import { deviceOrientationToForward } from '@/audio/PannerController';
import { useUiStore } from '@/store/uiSlice';

export function useHeadTracking(): { calibrate: () => void } {
  const baselineAlpha = useRef<number | null>(null);
  const lastUpdateAt = useRef(0);
  const headTrackingActive = useUiStore((s) => s.headTrackingActive);
  const setSupportsHeadTracking = useUiStore((s) => s.setSupportsHeadTracking);

  const calibrate = useCallback(() => {
    // Will be set on the next deviceorientation event
    baselineAlpha.current = null;
  }, []);

  useEffect(() => {
    if (!('DeviceOrientationEvent' in window)) {
      setSupportsHeadTracking(false);
      return;
    }

    if (!headTrackingActive) return;

    const handler = (e: DeviceOrientationEvent) => {
      const { alpha, beta, gamma } = e;
      if (alpha === null || beta === null || gamma === null) return;

      // Set baseline on first event (or after calibrate())
      if (baselineAlpha.current === null) {
        baselineAlpha.current = alpha;
      }

      // Gate updates to max 60fps to avoid blocking audio thread
      const now = performance.now();
      if (now - lastUpdateAt.current < 16) return;
      lastUpdateAt.current = now;

      const { forwardX, forwardZ } = deviceOrientationToForward(
        alpha, beta, gamma, baselineAlpha.current,
      );

      AudioEngine.instance.setListenerOrientation(forwardX, forwardZ);
    };

    window.addEventListener('deviceorientation', handler, { passive: true });
    return () => window.removeEventListener('deviceorientation', handler);
  }, [headTrackingActive, setSupportsHeadTracking]);

  return { calibrate };
}
