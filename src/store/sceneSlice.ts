// src/store/sceneSlice.ts
import { create } from 'zustand';
import { SCENES } from '@/scenes/presets';
import type { Scene } from '@/scenes/presets';

const CUSTOM_SCENES_KEY = 'auris:custom-scenes';

function loadCustomScenes(): Scene[] {
  try {
    const raw = localStorage.getItem(CUSTOM_SCENES_KEY);
    return raw ? (JSON.parse(raw) as Scene[]) : [];
  } catch {
    return [];
  }
}

function saveCustomScenes(scenes: Scene[]): void {
  try {
    localStorage.setItem(CUSTOM_SCENES_KEY, JSON.stringify(scenes));
  } catch {
    // localStorage might be full or unavailable
  }
}

interface SceneState {
  activeSceneId: string;
  builtinScenes: Scene[];
  customScenes: Scene[];
  isTransitioning: boolean;

  setActiveScene: (id: string) => void;
  setIsTransitioning: (v: boolean) => void;
  saveCustomScene: (scene: Scene) => void;
  deleteCustomScene: (id: string) => void;
  getAllScenes: () => Scene[];
  getActiveScene: () => Scene | undefined;
}

export const useSceneStore = create<SceneState>((set, get) => ({
  activeSceneId: SCENES[0].id,
  builtinScenes: SCENES,
  customScenes: loadCustomScenes(),
  isTransitioning: false,

  setActiveScene: (id) => set({ activeSceneId: id }),
  setIsTransitioning: (v) => set({ isTransitioning: v }),

  saveCustomScene: (scene) => {
    set((state) => {
      const filtered = state.customScenes.filter((s) => s.id !== scene.id);
      const next = [...filtered, scene];
      saveCustomScenes(next);
      return { customScenes: next };
    });
  },

  deleteCustomScene: (id) => {
    set((state) => {
      const next = state.customScenes.filter((s) => s.id !== id);
      saveCustomScenes(next);
      return { customScenes: next };
    });
  },

  getAllScenes: () => {
    const { builtinScenes, customScenes } = get();
    return [...builtinScenes, ...customScenes];
  },

  getActiveScene: () => {
    const { activeSceneId, builtinScenes, customScenes } = get();
    return (
      builtinScenes.find((s) => s.id === activeSceneId) ??
      customScenes.find((s) => s.id === activeSceneId)
    );
  },
}));
