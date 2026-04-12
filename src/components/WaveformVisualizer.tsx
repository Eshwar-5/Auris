// src/components/WaveformVisualizer.tsx
// Canvas-based frequency spectrum analyzer in the bottom bar

import { useRef, useEffect } from 'react';
import { useAudioStore } from '@/store/audioSlice';
import { useUiStore } from '@/store/uiSlice';

interface Props {
  width?: number;
  height?: number;
}

export function WaveformVisualizer({ width = 300, height = 48 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fftData = useAudioStore((s) => s.fftData);
  const isInitialized = useUiStore((s) => s.isInitialized);
  const isPlaying = useAudioStore((s) => s.isPlaying);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
  }, [width, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    if (!isInitialized || !isPlaying || !fftData.length) {
      // Draw flat idle line
      ctx.strokeStyle = 'rgba(30, 45, 64, 0.8)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      return;
    }

    // Draw spectrum bars - show first 200 bins (most musical content 0-4kHz)
    const binCount = Math.min(fftData.length, 200);
    const barWidth = width / binCount;
    const gap = barWidth > 2 ? 1 : 0;

    for (let i = 0; i < binCount; i++) {
      const db = fftData[i]; // -Infinity to 0 dB
      const normalized = Math.max(0, (db + 96) / 96); // 0-1
      const h = normalized * height;

      // Gradient: cyan at low, violet at high
      const progress = i / binCount;
      const r = Math.round(0 + progress * 139);
      const g = Math.round(229 - progress * 137);
      const b = Math.round(200 - progress * 46);
      ctx.fillStyle = `rgba(${r},${g},${b},${0.7 + normalized * 0.3})`;

      ctx.fillRect(
        i * barWidth + gap / 2,
        height - h,
        barWidth - gap,
        h,
      );
    }

    // Top glow line
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, 'rgba(0,229,200,0.4)');
    gradient.addColorStop(1, 'rgba(139,92,246,0.4)');
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < binCount; i++) {
      const db = fftData[i];
      const normalized = Math.max(0, (db + 96) / 96);
      const y = height - normalized * height;
      if (i === 0) ctx.moveTo(0, y);
      else ctx.lineTo(i * barWidth, y);
    }
    ctx.stroke();
  }, [fftData, isInitialized, isPlaying, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, display: 'block' }}
      aria-label="Audio frequency spectrum visualizer"
    />
  );
}
