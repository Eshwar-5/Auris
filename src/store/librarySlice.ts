// src/store/librarySlice.ts
import { create } from 'zustand';
import { getLibraryMetadata, StoredTrack } from '@/utils/storage';

export interface LibrarySlice {
  tracks: StoredTrack[];
  isLibraryLoading: boolean;
  loadLibrary: () => Promise<void>;
  addTrackToStore: (track: StoredTrack) => void;
  removeTrackFromStore: (id: string) => void;
}

export const useLibraryStore = create<LibrarySlice>()((set) => ({
  tracks: [],
  isLibraryLoading: true,
  
  loadLibrary: async () => {
    set({ isLibraryLoading: true });
    const tracks = await getLibraryMetadata();
    set({ tracks, isLibraryLoading: false });
  },

  addTrackToStore: (track) => {
    set((state) => ({
      tracks: [track, ...state.tracks],
    }));
  },

  removeTrackFromStore: (id) => {
    set((state) => ({
      tracks: state.tracks.filter((t) => t.id !== id),
    }));
  },
}));
