// src/store/uiSlice.ts
import { create } from 'zustand';

interface UiState {
  isInitialized: boolean;     // AudioContext created (post user gesture)
  isLoadingIR: boolean;       // IR generation/load in progress
  headTrackingActive: boolean;
  hapticsActive: boolean;
  hapticIntensity: number;    // 0–100
  supportsHaptics: boolean;
  supportsHeadTracking: boolean;
  showHeadphoneBanner: boolean;
  deferredPrompt: any | null; // BeforeInstallPromptEvent
  isInstallable: boolean;
  showInstallInstructions: boolean;

  setIsInitialized: (v: boolean) => void;
  setIsLoadingIR: (v: boolean) => void;
  setHeadTrackingActive: (v: boolean) => void;
  setHapticsActive: (v: boolean) => void;
  setHapticIntensity: (v: number) => void;
  setSupportsHaptics: (v: boolean) => void;
  setSupportsHeadTracking: (v: boolean) => void;
  setShowHeadphoneBanner: (v: boolean) => void;
  setDeferredPrompt: (v: any | null) => void;
  setIsInstallable: (v: boolean) => void;
  setShowInstallInstructions: (v: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  isInitialized: false,
  isLoadingIR: false,
  headTrackingActive: false,
  hapticsActive: false,
  hapticIntensity: 50,
  supportsHaptics: 'vibrate' in navigator,
  supportsHeadTracking: 'DeviceOrientationEvent' in window,
  showHeadphoneBanner: false,
  deferredPrompt: null,
  isInstallable: false,
  showInstallInstructions: false,

  setIsInitialized: (v) => set({ isInitialized: v }),
  setIsLoadingIR: (v) => set({ isLoadingIR: v }),
  setHeadTrackingActive: (v) => set({ headTrackingActive: v }),
  setHapticsActive: (v) => set({ hapticsActive: v }),
  setHapticIntensity: (v) => set({ hapticIntensity: v }),
  setSupportsHaptics: (v) => set({ supportsHaptics: v }),
  setSupportsHeadTracking: (v) => set({ supportsHeadTracking: v }),
  setShowHeadphoneBanner: (v) => set({ showHeadphoneBanner: v }),
  setDeferredPrompt: (v) => set({ deferredPrompt: v }),
  setIsInstallable: (v) => set({ isInstallable: v }),
  setShowInstallInstructions: (v) => set({ showInstallInstructions: v }),
}));
