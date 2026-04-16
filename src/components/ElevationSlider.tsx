// src/components/ElevationSlider.tsx
// Vertical slider for controlling elevation (-90° to +90°)

import { useState, useCallback } from 'react';
import { useAudioStore } from '@/store/audioSlice';
import { AudioEngine } from '@/audio/AudioEngine';

export function ElevationSlider() {
  const elevation = useAudioStore((s) => s.elevation);
  const azimuth = useAudioStore((s) => s.azimuth);
  const distance = useAudioStore((s) => s.distance);
  const setElevation = useAudioStore((s) => s.setElevation);
  const [isDragging, setIsDragging] = useState(false);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Number(e.target.value);
      setElevation(val);
      AudioEngine.instance.setAzimuthElevation(azimuth, val, distance);
    },
    [azimuth, distance, setElevation],
  );

  const elPercent = ((elevation + 90) / 180) * 100;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        userSelect: 'none',
      }}
    >
      <span className="section-label" style={{ marginBottom: 0 }}>Elevation</span>

      {/* Vertical slider container */}
      <div
        style={{
          position: 'relative',
          height: 140,
          width: 48,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Track background */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 6,
            height: '100%',
            borderRadius: 999,
            background: 'var(--color-surface-recessed)',
            overflow: 'hidden',
            boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.4)'
          }}
        >
          {/* Fill */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              width: '100%',
              height: `${elPercent}%`,
              background: 'linear-gradient(to top, var(--color-primary), var(--color-secondary))',
              borderRadius: 999,
              opacity: 0.8,
            }}
          />
        </div>

        {/* Labels */}
        <span
          style={{
            position: 'absolute',
            top: 0,
            right: -6,
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--color-text-dim)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          +90°
        </span>
        <span
          style={{
            position: 'absolute',
            bottom: 0,
            right: -6,
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--color-text-dim)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          −90°
        </span>

        {/* Thumb */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: `calc(${elPercent}% - 8px)`,
            transform: 'translateX(-50%)',
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: 'var(--color-surface-high)',
            border: '2px solid var(--color-primary)',
            boxShadow: isDragging
              ? '0 0 24px var(--color-primary-dim), 0 0 12px rgba(0,220,229,0.4)'
              : '0 4px 12px rgba(0,0,0,0.5)',
            transition: isDragging ? 'none' : 'bottom 0.1s ease, box-shadow 0.15s',
            zIndex: 2,
          }}
        />

        {/* Invisible native input for accessibility */}
        <input
          type="range"
          min={-90}
          max={90}
          step={1}
          value={elevation}
          onChange={handleChange}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => setIsDragging(false)}
          aria-label="Sound source elevation angle"
          aria-valuemin={-90}
          aria-valuemax={90}
          aria-valuenow={elevation}
          style={{
            position: 'absolute',
            width: 140,
            height: 48,
            opacity: 0,
            cursor: 'pointer',
            writingMode: 'vertical-lr' as const,
            transform: 'rotate(180deg)',
            direction: 'rtl',
            zIndex: 3,
          }}
        />
      </div>

      {/* Value badge */}
      <div className="value-badge" style={{ fontSize: 11, fontWeight: 700 }}>
        {elevation > 0 ? '+' : ''}{elevation}°
      </div>
    </div>
  );
}
