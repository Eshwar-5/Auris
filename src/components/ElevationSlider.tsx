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
            width: 4,
            height: '100%',
            borderRadius: 999,
            background: '#1E2D40',
            overflow: 'hidden',
          }}
        >
          {/* Fill */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              width: '100%',
              height: `${elPercent}%`,
              background: '#00E5C8',
              borderRadius: 999,
              opacity: 0.7,
            }}
          />
        </div>

        {/* Labels */}
        <span
          style={{
            position: 'absolute',
            top: 0,
            right: -2,
            fontSize: 9,
            color: '#64748B',
            fontFamily: 'IBM Plex Mono',
          }}
        >
          +90°
        </span>
        <span
          style={{
            position: 'absolute',
            bottom: 0,
            right: -2,
            fontSize: 9,
            color: '#64748B',
            fontFamily: 'IBM Plex Mono',
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
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: '#00E5C8',
            boxShadow: isDragging
              ? '0 0 20px rgba(0,229,200,0.9)'
              : '0 0 10px rgba(0,229,200,0.5)',
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
      <div className="value-badge" style={{ fontSize: 10 }}>
        {elevation > 0 ? '+' : ''}{elevation}°
      </div>
    </div>
  );
}
