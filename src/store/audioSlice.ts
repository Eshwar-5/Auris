// src/store/audioSlice.ts
import { create } from 'zustand';

export type SourceType = 'demo' | 'file' | 'mic' | 'none';

interface AudioState {
  isPlaying: boolean;
  azimuth: number;       // 0–360 degrees
  elevation: number;     // -90 to +90 degrees
  distance: number;      // 0.1 to 10 units
  roomSize: number;      // 0–100 percent
  damping: number;       // 0–100 percent
  wetDry: number;        // 0–100 percent (wet mix)
  amplitude: number;     // 0–1 live RMS
  fftData: Float32Array; // live frequency data
  sourceType: SourceType;

  setIsPlaying: (v: boolean) => void;
  setAzimuth: (v: number) => void;
  setElevation: (v: number) => void;
  setDistance: (v: number) => void;
  setRoomSize: (v: number) => void;
  setDamping: (v: number) => void;
  setWetDry: (v: number) => void;
  setAmplitude: (v: number) => void;
  setFftData: (v: Float32Array) => void;
  setSourceType: (v: SourceType) => void;
}

export const useAudioStore = create<AudioState>((set) => ({
  isPlaying: false,
  azimuth: 45,
  elevation: 0,
  distance: 2.5,
  roomSize: 50,
  damping: 40,
  wetDry: 35,
  amplitude: 0,
  fftData: new Float32Array(1024),
  sourceType: 'none',

  setIsPlaying: (v) => set({ isPlaying: v }),
  setAzimuth: (v) => set({ azimuth: v }),
  setElevation: (v) => set({ elevation: v }),
  setDistance: (v) => set({ distance: v }),
  setRoomSize: (v) => set({ roomSize: v }),
  setDamping: (v) => set({ damping: v }),
  setWetDry: (v) => set({ wetDry: v }),
  setAmplitude: (v) => set({ amplitude: v }),
  setFftData: (v) => set({ fftData: v }),
  setSourceType: (v) => set({ sourceType: v }),
}));
