// src/components/RoomPhysics.tsx
// Right panel: reverb controls (room size, damping, wet/dry)

import { useCallback } from 'react';
import { useAudioStore } from '@/store/audioSlice';
import { AudioEngine } from '@/audio/AudioEngine';

interface SliderProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  unit?: string;
  onChange: (v: number) => void;
  violet?: boolean;
}

function PhysicsSlider({ label, value, min = 0, max = 100, unit = '%', onChange, violet }: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="slider-row">
      <div className="slider-header">
        <span className="slider-label">{label}</span>
        <span className={`value-badge${violet ? ' violet' : ''}`}>
          {Math.round(value)}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={violet ? 'violet-thumb' : ''}
        style={{
          '--track-fill': violet ? 'var(--color-secondary)' : 'var(--color-primary)',
          '--track-pct': `${pct}%`,
        } as React.CSSProperties}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
      />
    </div>
  );
}

export function RoomPhysics() {
  const roomSize = useAudioStore((s) => s.roomSize);
  const damping = useAudioStore((s) => s.damping);
  const wetDry = useAudioStore((s) => s.wetDry);
  const setRoomSize = useAudioStore((s) => s.setRoomSize);
  const setDamping = useAudioStore((s) => s.setDamping);
  const setWetDry = useAudioStore((s) => s.setWetDry);

  const handleRoomSize = useCallback((v: number) => {
    setRoomSize(v);
    AudioEngine.instance.setRoomPhysics(v, useAudioStore.getState().damping);
  }, [setRoomSize]);

  const handleDamping = useCallback((v: number) => {
    setDamping(v);
    AudioEngine.instance.setRoomPhysics(useAudioStore.getState().roomSize, v);
  }, [setDamping]);

  const handleWetDry = useCallback((v: number) => {
    setWetDry(v);
    AudioEngine.instance.setWetDry(v);
  }, [setWetDry]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#8B5CF6',
            boxShadow: '0 0 8px rgba(139,92,246,0.8)',
          }}
        />
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 14,
            fontWeight: 800,
            color: 'var(--color-text)',
            letterSpacing: '0.02em',
            textTransform: 'uppercase'
          }}
        >
          Room Physics
        </h2>
      </div>

      {/* Room Material visualization */}
      <div
        className="glass"
        style={{
          padding: 16,
          background: 'var(--color-surface-recessed)',
          border: 'none',
        }}
      >
        <div className="section-label">Material Response</div>
        <div
          style={{
            display: 'flex',
            gap: 6,
            marginTop: 8,
          }}
        >
          {Array.from({ length: 12 }).map((_, i) => {
            const height = 8 + (roomSize / 100) * 24 * Math.exp(-i * 0.2 * (damping / 100 + 0.1));
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: Math.max(4, height),
                  borderRadius: 2,
                  background: `linear-gradient(to top, var(--color-secondary) ${10 + (height/32) * 90}%, transparent)`,
                  transition: 'height 0.3s ease',
                  alignSelf: 'flex-end',
                  opacity: 0.2 + (height / 32) * 0.8,
                  boxShadow: height > 24 ? '0 0 12px var(--color-secondary-dim)' : 'none'
                }}
              />
            );
          })}
        </div>
        <div
          style={{
            marginTop: 8,
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: 'var(--color-text-dim)',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span>20Hz</span>
          <span>Frequency response</span>
          <span>20kHz</span>
        </div>
      </div>

      {/* Sliders */}
      <div className="glass" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <PhysicsSlider
          label="Room Size"
          value={roomSize}
          onChange={handleRoomSize}
          violet
        />
        <PhysicsSlider
          label="Damping"
          value={damping}
          onChange={handleDamping}
          violet
        />
        <PhysicsSlider
          label="Wet / Dry Mix"
          value={wetDry}
          onChange={handleWetDry}
          violet
        />
      </div>

      {/* RT60 estimate */}
      <div
        className="glass"
        style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-surface-recessed)' }}
      >
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600 }}>
          Est. RT60
        </span>
        <span className="value-badge violet" style={{ fontSize: 12, fontWeight: 700 }}>
          {((roomSize / 100) * 4.5 * (1 - damping / 150)).toFixed(2)}s
        </span>
      </div>

      {/* Early reflections toggle */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="section-label">Reflection Timing</div>
        <div
          className="glass"
          style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12, background: 'var(--color-surface-recessed)' }}
        >
          <div
            style={{
              flex: 1,
              height: 32,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Early reflections visualization */}
            {Array.from({ length: 6 }).map((_, i) => {
              const t = (i + 1) / 7;
              const x = t * 100;
              const h = 26 * Math.exp(-i * 0.5);
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: `${x}%`,
                    bottom: 0,
                    width: 3,
                    height: h,
                    background: i === 0
                      ? 'var(--color-secondary)'
                      : 'var(--color-secondary-dim)',
                    borderRadius: 2,
                    opacity: 1 - i * 0.15
                  }}
                />
              );
            })}
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-text-dim)', fontWeight: 600, minWidth: 40 }}>
            80ms
          </span>
        </div>
      </div>
    </div>
  );
}
