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
          '--track-fill': violet ? '#8B5CF6' : '#00E5C8',
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
            fontFamily: 'Syne',
            fontSize: 13,
            fontWeight: 600,
            color: '#F1F5F9',
            letterSpacing: '0.05em',
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
          background: 'rgba(139,92,246,0.04)',
          borderColor: 'rgba(139,92,246,0.15)',
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
                  background: `rgba(139,92,246,${0.3 + (height / 32) * 0.6})`,
                  transition: 'height 0.3s ease',
                  alignSelf: 'flex-end',
                }}
              />
            );
          })}
        </div>
        <div
          style={{
            marginTop: 6,
            fontFamily: 'IBM Plex Mono',
            fontSize: 9,
            color: '#64748B',
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
        style={{ padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: '#64748B' }}>
          Est. RT60
        </span>
        <span className="value-badge violet" style={{ fontSize: 11 }}>
          {((roomSize / 100) * 4.5 * (1 - damping / 150)).toFixed(2)}s
        </span>
      </div>

      {/* Early reflections toggle */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="section-label">Reflection Timing</div>
        <div
          className="glass"
          style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 8 }}
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
                      ? '#8B5CF6'
                      : `rgba(139,92,246,${0.6 - i * 0.08})`,
                    borderRadius: 2,
                  }}
                />
              );
            })}
          </div>
          <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#64748B', minWidth: 32 }}>
            80ms
          </span>
        </div>
      </div>
    </div>
  );
}
