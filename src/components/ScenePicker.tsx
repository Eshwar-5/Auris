// src/components/ScenePicker.tsx
// Horizontal scrollable scene card picker with animated transitions

import { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSceneStore } from '@/store/sceneSlice';
import { useAudioStore } from '@/store/audioSlice';
import { useUiStore } from '@/store/uiSlice';
import { AudioEngine } from '@/audio/AudioEngine';
import { generateSyntheticIR } from '@/audio/IRLoader';
import type { Scene } from '@/scenes/presets';

interface SceneCardProps {
  scene: Scene;
  isActive: boolean;
  onSelect: (scene: Scene) => void;
}

function SceneCard({ scene, isActive, onSelect }: SceneCardProps) {
  return (
    <motion.button
      onClick={() => onSelect(scene)}
      whileHover={{ scale: 1.04, y: -2 }}
      whileTap={{ scale: 0.97 }}
      aria-label={`Switch to ${scene.name} scene`}
      aria-pressed={isActive}
      style={{
        flexShrink: 0,
        width: 120,
        border: 'none',
        background: 'none',
        padding: 0,
        cursor: 'pointer',
        outline: 'none',
      }}
    >
      <div
        style={{
          borderRadius: 12,
          overflow: 'hidden',
          border: isActive
            ? '1.5px solid #00E5C8'
            : '1.5px solid rgba(30,45,64,0.8)',
          transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
          boxShadow: isActive
            ? '0 0 20px rgba(0,229,200,0.25), 0 0 40px rgba(0,229,200,0.08)'
            : 'none',
        }}
      >
        {/* Gradient thumbnail */}
        <div
          style={{
            height: 60,
            background: scene.gradientMid
              ? `linear-gradient(135deg, ${scene.gradientFrom}, ${scene.gradientMid}, ${scene.gradientTo})`
              : `linear-gradient(135deg, ${scene.gradientFrom}, ${scene.gradientTo})`,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Animated orbs */}
          {isActive && (
            <>
              <div
                style={{
                  position: 'absolute',
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: 'rgba(0,229,200,0.15)',
                  top: -10,
                  right: -10,
                  filter: 'blur(8px)',
                }}
                className="animate-orb"
              />
              <div
                style={{
                  position: 'absolute',
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: 'rgba(139,92,246,0.2)',
                  bottom: 5,
                  left: 10,
                  filter: 'blur(6px)',
                  animationDelay: '2s',
                }}
                className="animate-orb"
              />
            </>
          )}
          {/* Active indicator */}
          {isActive && (
            <div
              style={{
                position: 'absolute',
                top: 6,
                right: 6,
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#00E5C8',
                boxShadow: '0 0 8px rgba(0,229,200,0.9)',
              }}
              className="animate-pulse-slow"
            />
          )}
        </div>

        {/* Info */}
        <div
          style={{
            padding: '8px 10px',
            background: isActive ? 'rgba(0,229,200,0.04)' : 'rgba(13,17,26,0.95)',
            textAlign: 'left',
          }}
        >
          <div
            style={{
              fontFamily: 'Syne',
              fontSize: 11,
              fontWeight: 600,
              color: isActive ? '#00E5C8' : '#F1F5F9',
              marginBottom: 2,
              transition: 'color 0.2s',
            }}
          >
            {scene.name}
          </div>
          <div
            style={{
              fontFamily: 'IBM Plex Mono',
              fontSize: 9,
              color: '#64748B',
              lineHeight: 1.3,
            }}
          >
            {scene.tagline}
          </div>
        </div>
      </div>
    </motion.button>
  );
}

export function ScenePicker() {
  const activeSceneId = useSceneStore((s) => s.activeSceneId);
  const getAllScenes = useSceneStore((s) => s.getAllScenes);
  const setActiveScene = useSceneStore((s) => s.setActiveScene);
  const setIsTransitioning = useSceneStore((s) => s.setIsTransitioning);
  const saveCustomScene = useSceneStore((s) => s.saveCustomScene);

  const setAzimuth = useAudioStore((s) => s.setAzimuth);
  const setElevation = useAudioStore((s) => s.setElevation);
  const setDistance = useAudioStore((s) => s.setDistance);
  const setRoomSize = useAudioStore((s) => s.setRoomSize);
  const setDamping = useAudioStore((s) => s.setDamping);
  const setWetDry = useAudioStore((s) => s.setWetDry);

  const setIsLoadingIR = useUiStore((s) => s.setIsLoadingIR);

  const scenes = getAllScenes();

  const handleSelect = useCallback(
    async (scene: Scene) => {
      if (scene.id === activeSceneId) return;

      // Start transition
      setIsTransitioning(true);
      setActiveScene(scene.id);

      // Apply scene parameters
      setAzimuth(scene.azimuth);
      setElevation(scene.elevation);
      setDistance(scene.distance);
      setRoomSize(scene.roomSize);
      setDamping(scene.damping);
      setWetDry(scene.wetDry);

      // Update audio engine
      const engine = AudioEngine.instance;
      engine.setAzimuthElevation(scene.azimuth, scene.elevation, scene.distance);
      engine.setWetDry(scene.wetDry);
      engine.setCurrentIRParams(scene.irParams);

      // Generate synthetic IR for new scene
      if (engine.ctx) {
        setIsLoadingIR(true);
        try {
          const irBuffer = await generateSyntheticIR(scene.irParams, engine.ctx);
          engine.loadIR(irBuffer);
        } catch (err) {
          console.error('[Auris] IR generation failed:', err);
        } finally {
          setIsLoadingIR(false);
        }
      }

      // End transition after animation
      setTimeout(() => setIsTransitioning(false), 450);
    },
    [
      activeSceneId,
      setActiveScene,
      setAzimuth,
      setElevation,
      setDistance,
      setIsLoadingIR,
      setIsTransitioning,
      setRoomSize,
      setDamping,
      setWetDry,
    ],
  );

  const handleSaveCustom = () => {
    const state = useAudioStore.getState();
    const activeScene = scenes.find((s) => s.id === activeSceneId);
    const newScene: Scene = {
      id: `custom-${Date.now()}`,
      name: `My Scene ${scenes.filter((s) => s.id.startsWith('custom')).length + 1}`,
      description: 'Custom',
      tagline: 'My personal scene.',
      gradientFrom: '#001a2d',
      gradientTo: '#090B10',
      azimuth: state.azimuth,
      elevation: state.elevation,
      distance: state.distance,
      roomSize: state.roomSize,
      damping: state.damping,
      wetDry: state.wetDry,
      irParams: activeScene?.irParams ?? {
        decayTime: 1,
        preDelayMs: 15,
        roomSize: 0.5,
        damping: 0.4,
        brightness: 0.5,
      },
    };
    saveCustomScene(newScene);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 2px',
        }}
      >
        <span className="section-label" style={{ marginBottom: 0 }}>Scenes</span>
        <button
          className="btn-ghost"
          onClick={handleSaveCustom}
          aria-label="Save current settings as custom scene"
          style={{ padding: '4px 10px', fontSize: 11 }}
        >
          + Save
        </button>
      </div>

      {/* Scroll container */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          overflowX: 'auto',
          paddingBottom: 8,
          scrollbarWidth: 'thin',
        }}
        role="listbox"
        aria-label="Scene presets"
      >
        <AnimatePresence>
          {scenes.map((scene) => (
            <SceneCard
              key={scene.id}
              scene={scene}
              isActive={scene.id === activeSceneId}
              onSelect={handleSelect}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
