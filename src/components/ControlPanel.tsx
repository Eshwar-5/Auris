// src/components/ControlPanel.tsx
// Left panel: source position controls — azimuth, elevation, distance

import { useCallback } from 'react';
import { useAudioStore } from '@/store/audioSlice';
import { useSceneStore } from '@/store/sceneSlice';
import { AudioEngine } from '@/audio/AudioEngine';
import { ElevationSlider } from './ElevationSlider';

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  onChange: (v: number) => void;
}

function SliderRow({ label, value, min, max, step = 1, unit, onChange }: SliderRowProps) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="slider-row">
      <div className="slider-header">
        <span className="slider-label">{label}</span>
        <span className="value-badge">
          {typeof value === 'number' && value % 1 !== 0 ? value.toFixed(1) : Math.round(value)}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          '--track-fill': '#00E5C8',
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

export function ControlPanel() {
  const azimuth = useAudioStore((s) => s.azimuth);
  const elevation = useAudioStore((s) => s.elevation);
  const distance = useAudioStore((s) => s.distance);
  const setAzimuth = useAudioStore((s) => s.setAzimuth);
  const setDistance = useAudioStore((s) => s.setDistance);
  const activeScene = useSceneStore((s) => s.getActiveScene());

  const updateSpatial = useCallback(
    (az: number, el: number, dist: number) => {
      AudioEngine.instance.setAzimuthElevation(az, el, dist);
    },
    [],
  );

  const handleAzimuth = (v: number) => {
    setAzimuth(v);
    updateSpatial(v, elevation, distance);
  };

  const handleDistance = (v: number) => {
    setDistance(v);
    updateSpatial(azimuth, elevation, v);
  };

  // Azimuth compass labels
  const compassDir = (az: number) => {
    if (az < 22.5 || az >= 337.5) return 'N (Front)';
    if (az < 67.5) return 'NE';
    if (az < 112.5) return 'E (Right)';
    if (az < 157.5) return 'SE';
    if (az < 202.5) return 'S (Back)';
    if (az < 247.5) return 'SW';
    if (az < 292.5) return 'W (Left)';
    return 'NW';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#00E5C8',
            boxShadow: '0 0 8px rgba(0,229,200,0.8)',
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
          Source Position
        </h2>
      </div>

      {/* Active scene badge */}
      {activeScene && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            borderRadius: 8,
            background: 'rgba(0,229,200,0.05)',
            border: '1px solid rgba(0,229,200,0.12)',
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: `linear-gradient(135deg, ${activeScene.gradientFrom}, ${activeScene.gradientMid ?? activeScene.gradientTo})`,
              flexShrink: 0,
            }}
          />
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#F1F5F9', fontFamily: 'Syne' }}>
              {activeScene.name}
            </div>
            <div style={{ fontSize: 10, color: '#64748B', fontFamily: 'IBM Plex Mono' }}>
              {activeScene.description}
            </div>
          </div>
        </div>
      )}

      {/* Compass ring */}
      <div className="glass" style={{ padding: 16 }}>
        <div className="section-label">Azimuth — {compassDir(azimuth)}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Mini compass */}
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              border: '1px solid #1E2D40',
              position: 'relative',
              flexShrink: 0,
            }}
          >
            {/* Cardinal points */}
            {['N', 'E', 'S', 'W'].map((dir, i) => {
              const positions = [
                { top: 1, left: '50%', transform: 'translateX(-50%)' },
                { right: 2, top: '50%', transform: 'translateY(-50%)' },
                { bottom: 1, left: '50%', transform: 'translateX(-50%)' },
                { left: 2, top: '50%', transform: 'translateY(-50%)' },
              ];
              return (
                <span
                  key={dir}
                  style={{
                    position: 'absolute',
                    fontSize: 7,
                    color: '#64748B',
                    fontFamily: 'IBM Plex Mono',
                    lineHeight: 1,
                    ...positions[i],
                  }}
                >
                  {dir}
                </span>
              );
            })}
            {/* Arrow */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: 2,
                height: 18,
                background: '#00E5C8',
                borderRadius: 1,
                transformOrigin: 'bottom center',
                transform: `translate(-50%, -100%) rotate(${azimuth}deg)`,
                transition: 'transform 0.05s linear',
                boxShadow: '0 0 6px rgba(0,229,200,0.7)',
              }}
            />
            {/* Center dot */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#090B10',
                border: '1px solid #00E5C8',
                transform: 'translate(-50%,-50%)',
              }}
            />
          </div>

          <div style={{ flex: 1 }}>
            <SliderRow
              label=""
              value={azimuth}
              min={0}
              max={360}
              unit="°"
              onChange={handleAzimuth}
            />
          </div>
        </div>
      </div>

      {/* Distance & Elevation */}
      <div className="glass" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <SliderRow
          label="Distance"
          value={distance}
          min={0.3}
          max={10}
          step={0.1}
          unit="m"
          onChange={handleDistance}
        />
      </div>

      {/* Elevation */}
      <div className="glass" style={{ padding: 16, display: 'flex', justifyContent: 'center' }}>
        <ElevationSlider />
      </div>

      {/* Coordinate readout */}
      <div
        className="glass"
        style={{
          padding: 12,
          fontFamily: 'IBM Plex Mono',
          fontSize: 10,
          color: '#64748B',
          lineHeight: 1.8,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>az / el / dist</span>
          <span style={{ color: '#00E5C8' }}>
            {Math.round(azimuth)}° / {elevation > 0 ? '+' : ''}{elevation}° / {distance.toFixed(1)}m
          </span>
        </div>
      </div>
    </div>
  );
}
