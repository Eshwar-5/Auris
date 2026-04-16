// src/components/RoomVisualizer.tsx
// 360° Canvas room with draggable source, amplitude pulse, and FFT beat glow

import { useRef, useEffect, useCallback, useState } from 'react';
import { useAudioStore } from '@/store/audioSlice';
import { useSceneStore } from '@/store/sceneSlice';
import { AudioEngine } from '@/audio/AudioEngine';
import { canvasDragToAzimuthDistance, azimuthDistanceToCanvasOffset } from '@/audio/PannerController';

const CANVAS_SIZE = 420;
const CENTER = CANVAS_SIZE / 2;
const MAX_RADIUS = CANVAS_SIZE * 0.42;
const MAX_DISTANCE = 10;
const DPR = () => Math.min(window.devicePixelRatio || 1, 2);

function drawScene(
  ctx: CanvasRenderingContext2D,
  azimuth: number,
  distance: number,
  amplitude: number,
  fftData: Float32Array,
  gradientFrom: string,
  gradientTo: string,
  isDragging: boolean,
  dpr: number,
) {
  const w = CANVAS_SIZE;
  const h = CANVAS_SIZE;
  ctx.clearRect(0, 0, w * dpr, h * dpr);

  // --- BACKGROUND ---
  ctx.fillStyle = '#0A0A0B'; // var(--color-bg-deep)
  ctx.fillRect(0, 0, w, h);

  // Beat-reactive glow from center
  const avgAmplitude = amplitude * 3;
  if (fftData.length > 0) {
    const beatGlow = Math.min(avgAmplitude * 180, 120);
    const bgGrad = ctx.createRadialGradient(CENTER, CENTER, 0, CENTER, CENTER, MAX_RADIUS);
    bgGrad.addColorStop(0, `rgba(0,220,229,${Math.min(avgAmplitude * 0.1, 0.08)})`);
    bgGrad.addColorStop(0.5, `rgba(227,181,255,${Math.min(avgAmplitude * 0.06, 0.04)})`);
    bgGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);
    void beatGlow;
  }

  // --- ROOM RINGS ---
  const ringColors = ['rgba(91,91,94,0.3)', 'rgba(91,91,94,0.15)', 'rgba(91,91,94,0.08)'];
  [MAX_RADIUS, MAX_RADIUS * 0.67, MAX_RADIUS * 0.33].forEach((r, i) => {
    ctx.beginPath();
    ctx.arc(CENTER, CENTER, r, 0, Math.PI * 2);
    ctx.strokeStyle = ringColors[i];
    ctx.lineWidth = i === 0 ? 1.5 : 1;
    if (i > 0) {
      ctx.setLineDash([4, 6]);
    } else {
      ctx.setLineDash([]);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  });

  // --- CROSSHAIRS ---
  ctx.strokeStyle = 'rgba(91,91,94,0.2)';
  ctx.lineWidth = 0.75;
  ctx.setLineDash([4, 8]);
  ctx.beginPath();
  ctx.moveTo(CENTER, CENTER - MAX_RADIUS - 8);
  ctx.lineTo(CENTER, CENTER + MAX_RADIUS + 8);
  ctx.moveTo(CENTER - MAX_RADIUS - 8, CENTER);
  ctx.lineTo(CENTER + MAX_RADIUS + 8, CENTER);
  ctx.stroke();
  ctx.setLineDash([]);

  // --- CARDINAL LABELS ---
  const cardinals = [
    { label: 'FRONT', x: CENTER, y: CENTER - MAX_RADIUS - 16 },
    { label: 'RIGHT', x: CENTER + MAX_RADIUS + 16, y: CENTER },
    { label: 'BACK', x: CENTER, y: CENTER + MAX_RADIUS + 20 },
    { label: 'LEFT', x: CENTER - MAX_RADIUS - 16, y: CENTER },
  ];
  ctx.font = `800 10px "Space Grotesk"`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(145,144,148,0.4)';
  cardinals.forEach(({ label, x, y }) => {
    ctx.fillText(label, x, y);
  });

  // --- SOURCE POSITION ---
  const { dx, dy } = azimuthDistanceToCanvasOffset(azimuth, distance, MAX_RADIUS, MAX_DISTANCE);
  const srcX = CENTER + dx;
  const srcY = CENTER + dy;

  // Source trail / shadow
  const trailGrad = ctx.createRadialGradient(srcX, srcY, 0, srcX, srcY, 60 + amplitude * 40);
  trailGrad.addColorStop(0, 'rgba(0,220,229,0.15)');
  trailGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = trailGrad;
  ctx.beginPath();
  ctx.arc(srcX, srcY, 60 + amplitude * 40, 0, Math.PI * 2);
  ctx.fill();

  // Line from listener to source
  ctx.beginPath();
  ctx.moveTo(CENTER, CENTER);
  ctx.lineTo(srcX, srcY);
  const lineGrad = ctx.createLinearGradient(CENTER, CENTER, srcX, srcY);
  lineGrad.addColorStop(0, 'rgba(0,220,229,0.05)');
  lineGrad.addColorStop(1, `rgba(0,220,229,${0.2 + amplitude * 0.3})`);
  ctx.strokeStyle = lineGrad;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 6]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Source glow rings (amplitude-driven)
  const pulseRadius = 12 + amplitude * 20;
  for (let ring = 0; ring < 3; ring++) {
    const ringR = pulseRadius + ring * 8;
    const opacity = Math.max(0, (0.3 - ring * 0.1) * (1 + amplitude));
    ctx.beginPath();
    ctx.arc(srcX, srcY, ringR, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0,220,229,${opacity})`;
    ctx.lineWidth = 1 - ring * 0.2;
    ctx.stroke();
  }

  // Source node body
  const nodeRadius = 10 + amplitude * 6;
  const nodeGrad = ctx.createRadialGradient(srcX - 2, srcY - 2, 0, srcX, srcY, nodeRadius);
  nodeGrad.addColorStop(0, '#00FFF0');
  nodeGrad.addColorStop(0.5, '#00DCE5');
  nodeGrad.addColorStop(1, '#E3B5FF');
  ctx.beginPath();
  ctx.arc(srcX, srcY, nodeRadius, 0, Math.PI * 2);
  ctx.fillStyle = nodeGrad;
  ctx.shadowColor = 'rgba(0,220,229,0.5)';
  ctx.shadowBlur = isDragging ? 40 : 20;
  ctx.fill();
  ctx.shadowBlur = 0;

  // Source inner dot
  ctx.beginPath();
  ctx.arc(srcX, srcY, 3, 0, Math.PI * 2);
  ctx.fillStyle = '#131314'; // var(--color-bg)
  ctx.fill();

  // --- LISTENER (center) ---
  // Listener outer ring
  ctx.beginPath();
  ctx.arc(CENTER, CENTER, 14, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(241,245,249,0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Listener body
  const listenerGrad = ctx.createRadialGradient(CENTER - 1, CENTER - 1, 0, CENTER, CENTER, 8);
  listenerGrad.addColorStop(0, '#FFFFFF');
  listenerGrad.addColorStop(1, '#94A3B8');
  ctx.beginPath();
  ctx.arc(CENTER, CENTER, 7, 0, Math.PI * 2);
  ctx.fillStyle = listenerGrad;
  ctx.shadowColor = 'rgba(255,255,255,0.4)';
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.shadowBlur = 0;

  // Listener head silhouette
  ctx.beginPath();
  ctx.arc(CENTER, CENTER, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#131314';
  ctx.fill();

  // Distance label near source
  ctx.font = `600 10px "Manrope"`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,220,229,0.8)';
  ctx.fillText(`${distance.toFixed(1)}m`, srcX, srcY - nodeRadius - 12);

  // Scene gradient hint at corners
  const cornerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, CANVAS_SIZE * 0.7);
  cornerGrad.addColorStop(0, `${gradientFrom}20`);
  cornerGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = cornerGrad;
  ctx.fillRect(0, 0, w, h);
  void gradientTo;
}

export function RoomVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const isDraggingRef = useRef(false);
  const velRef = useRef({ vx: 0, vy: 0 });
  const lastPosRef = useRef({ x: 0, y: 0 });

  const [isDragging, setIsDragging] = useState(false);

  const azimuth = useAudioStore((s) => s.azimuth);
  const distance = useAudioStore((s) => s.distance);
  const elevation = useAudioStore((s) => s.elevation);
  const amplitude = useAudioStore((s) => s.amplitude);
  const fftData = useAudioStore((s) => s.fftData);
  const setAzimuth = useAudioStore((s) => s.setAzimuth);
  const setDistance = useAudioStore((s) => s.setDistance);

  const activeScene = useSceneStore((s) => s.getActiveScene());
  const gradientFrom = activeScene?.gradientFrom ?? '#090B10';
  const gradientTo = activeScene?.gradientTo ?? '#090B10';

  // Refs for RAF access
  const azimuthRef = useRef(azimuth);
  const distanceRef = useRef(distance);
  const amplitudeRef = useRef(amplitude);
  const fftRef = useRef(fftData);
  const isDraggingStateRef = useRef(isDragging);

  useEffect(() => { azimuthRef.current = azimuth; }, [azimuth]);
  useEffect(() => { distanceRef.current = distance; }, [distance]);
  useEffect(() => { amplitudeRef.current = amplitude; }, [amplitude]);
  useEffect(() => { fftRef.current = fftData; }, [fftData]);
  useEffect(() => { isDraggingStateRef.current = isDragging; }, [isDragging]);

  // Init canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = DPR();
    canvas.width = CANVAS_SIZE * dpr;
    canvas.height = CANVAS_SIZE * dpr;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
  }, []);

  // Main render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      drawScene(
        ctx,
        azimuthRef.current,
        distanceRef.current,
        amplitudeRef.current,
        fftRef.current,
        gradientFrom,
        gradientTo,
        isDraggingStateRef.current,
        DPR(),
      );
      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, [gradientFrom, gradientTo]);

  // Drag helpers
  const _isNearSource = useCallback(
    (canvasX: number, canvasY: number) => {
      const { dx, dy } = azimuthDistanceToCanvasOffset(
        azimuthRef.current, distanceRef.current, MAX_RADIUS, MAX_DISTANCE,
      );
      const srcX = CENTER + dx;
      const srcY = CENTER + dy;
      return Math.sqrt((canvasX - srcX) ** 2 + (canvasY - srcY) ** 2) < 28;
    },
    [],
  );
  void _isNearSource; // reserved for future hit-testing

  const getCanvasRelPos = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  const updateFromPos = useCallback(
    (canvasX: number, canvasY: number) => {
      const dx = canvasX - CENTER;
      const dy = canvasY - CENTER;
      const { azimuth: az, distance: dist } = canvasDragToAzimuthDistance(
        dx, dy, MAX_RADIUS, MAX_DISTANCE,
      );
      setAzimuth(az);
      setDistance(dist);
      AudioEngine.instance.setAzimuthElevation(az, elevation, dist);
    },
    [elevation, setAzimuth, setDistance],
  );



  // Mouse handlers
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const pos = getCanvasRelPos(e.clientX, e.clientY);
      // Allow drag from anywhere in the room (not just source node)
      isDraggingRef.current = true;
      setIsDragging(true);
      velRef.current = { vx: 0, vy: 0 };
      lastPosRef.current = pos;
      updateFromPos(pos.x, pos.y);
    },
    [getCanvasRelPos, updateFromPos],
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const pos = getCanvasRelPos(e.clientX, e.clientY);
      velRef.current = {
        vx: pos.x - lastPosRef.current.x,
        vy: pos.y - lastPosRef.current.y,
      };
      lastPosRef.current = pos;
      updateFromPos(pos.x, pos.y);
    };

    const onMouseUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsDragging(false);

      // Inertia: ease-out the velocity over 300ms
      let { vx, vy } = velRef.current;
      const inertia = () => {
        if (Math.abs(vx) < 0.3 && Math.abs(vy) < 0.3) return;
        const newX = lastPosRef.current.x + vx;
        const newY = lastPosRef.current.y + vy;
        lastPosRef.current = { x: newX, y: newY };
        updateFromPos(newX, newY);
        vx *= 0.82;
        vy *= 0.82;
        requestAnimationFrame(inertia);
      };
      requestAnimationFrame(inertia);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [getCanvasRelPos, updateFromPos]);

  // Touch handlers
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      const pos = getCanvasRelPos(touch.clientX, touch.clientY);
      isDraggingRef.current = true;
      setIsDragging(true);
      velRef.current = { vx: 0, vy: 0 };
      lastPosRef.current = pos;
      updateFromPos(pos.x, pos.y);
    },
    [getCanvasRelPos, updateFromPos],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current) return;
      e.preventDefault();
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_SIZE / rect.width;
      const scaleY = CANVAS_SIZE / rect.height;
      const pos = {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
      velRef.current = {
        vx: pos.x - lastPosRef.current.x,
        vy: pos.y - lastPosRef.current.y,
      };
      lastPosRef.current = pos;
      updateFromPos(pos.x, pos.y);
    };

    const onTouchEnd = () => {
      isDraggingRef.current = false;
      setIsDragging(false);
    };

    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);
    return () => {
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, [updateFromPos]);

  // Keyboard navigation
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const STEP = 5;
      let newAz = azimuthRef.current;
      if (e.key === 'ArrowRight') newAz = (newAz + STEP) % 360;
      else if (e.key === 'ArrowLeft') newAz = (newAz - STEP + 360) % 360;
      else if (e.key === 'ArrowUp') {
        const newDist = Math.max(0.3, distanceRef.current - 0.5);
        setDistance(newDist);
        AudioEngine.instance.setAzimuthElevation(newAz, elevation, newDist);
        return;
      } else if (e.key === 'ArrowDown') {
        const newDist = Math.min(MAX_DISTANCE, distanceRef.current + 0.5);
        setDistance(newDist);
        AudioEngine.instance.setAzimuthElevation(newAz, elevation, newDist);
        return;
      } else return;

      setAzimuth(newAz);
      AudioEngine.instance.setAzimuthElevation(newAz, elevation, distanceRef.current);
    },
    [elevation, setAzimuth, setDistance],
  );

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        width: '100%',
        height: '100%',
      }}
    >
      {/* Title */}
      <div
        style={{
          fontFamily: 'IBM Plex Mono',
          fontSize: 10,
          color: '#64748B',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        {isDragging ? '⟳ Positioning...' : '← Drag to position source →'}
      </div>

      {/* Canvas */}
      <div
        style={{
          position: 'relative',
          borderRadius: '50%',
          overflow: 'hidden',
          boxShadow: isDragging
            ? '0 0 40px rgba(0,229,200,0.15), 0 0 80px rgba(0,229,200,0.05)'
            : '0 0 20px rgba(0,0,0,0.5)',
          transition: 'box-shadow 0.3s ease',
          cursor: isDragging ? 'grabbing' : 'grab',
          width: CANVAS_SIZE,
          height: CANVAS_SIZE,
          maxWidth: 'min(90vw, 90vh, 420px)',
          maxHeight: 'min(90vw, 90vh, 420px)',
          flexShrink: 0,
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            borderRadius: '50%',
          }}
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
          onKeyDown={onKeyDown}
          tabIndex={0}
          role="application"
          aria-label={`3D audio room visualizer. Source at azimuth ${Math.round(azimuth)} degrees, ${distance.toFixed(1)} meters. Use arrow keys to move.`}
        />

        {/* Room name overlay */}
        {activeScene && (
          <div
            style={{
              position: 'absolute',
              bottom: 20,
              left: '50%',
              transform: 'translateX(-50%)',
              fontFamily: 'Syne',
              fontSize: 11,
              fontWeight: 600,
              color: 'rgba(241,245,249,0.5)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {activeScene.description}
          </div>
        )}
      </div>

      {/* Source-checking label (show when near canvas edges) */}
      <div
        style={{
          fontFamily: 'IBM Plex Mono',
          fontSize: 9,
          color: 'rgba(100,116,139,0.6)',
          letterSpacing: '0.08em',
        }}
      >
        ↕ Use elevation slider for vertical position
      </div>
    </div>
  );
}

