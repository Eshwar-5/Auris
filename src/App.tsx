// src/App.tsx
// Auris — Main application shell

import { useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { AudioEngine } from '@/audio/AudioEngine';
import { generateSyntheticIR } from '@/audio/IRLoader';

import { useUiStore } from '@/store/uiSlice';
import { useAudioStore } from '@/store/audioSlice';
import { useSceneStore } from '@/store/sceneSlice';
import { useLibraryStore } from '@/store/librarySlice';

import { useAudioAnalyser } from '@/hooks/useAudioAnalyser';
import { useHeadTracking } from '@/hooks/useHeadTracking';
import { useHaptics } from '@/hooks/useHaptics';

import { ControlPanel } from '@/components/ControlPanel';
import { RoomVisualizer } from '@/components/RoomVisualizer';
import { RoomPhysics } from '@/components/RoomPhysics';
import { ScenePicker } from '@/components/ScenePicker';
import { WaveformVisualizer } from '@/components/WaveformVisualizer';
import { AudioSourceSelector } from '@/components/AudioSourceSelector';
import { ProjectLibrary } from '@/components/ProjectLibrary';

// ─── INSTALL INSTRUCTIONS MODAL ──────────────────────────────────────────────
function InstallInstructionsModal() {
  const show = useUiStore((s) => s.showInstallInstructions);
  const setShow = useUiStore((s) => s.setShowInstallInstructions);

  if (!show) return null;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  return (
    <div 
      className="modal-overlay" 
      onClick={() => setShow(false)}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(8px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24
      }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--color-bg-deep)',
          border: 'none',
          borderRadius: 'var(--radius-lg)',
          padding: 32,
          maxWidth: 400,
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
        }}
      >
        <h3 style={{ color: '#00E5C8', fontSize: 20, marginBottom: 16, fontFamily: 'Syne' }}>
          Install Auris App
        </h3>
        
        <p style={{ color: '#94A3B8', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
          {isIOS ? (
            <>
              1. Tap the <strong>Share</strong> button (square with arrow) at the bottom of Safari.<br/>
              2. Scroll down and tap <strong>"Add to Home Screen"</strong>.<br/>
              3. Tap <strong>Add</strong> to finalize.
            </>
          ) : (
            <>
              1. Tap the <strong>three dots</strong> (menu) in the browser bar.<br/>
              2. Tap <strong>"Install app"</strong> or <strong>"Add to Home Screen"</strong>.<br/>
              3. Confirm the installation.
            </>
          )}
        </p>

        <button 
          onClick={() => setShow(false)}
          className="btn-primary"
          style={{ width: '100%', padding: '12px 0' }}
        >
          Got it
        </button>
      </motion.div>
    </div>
  );
}

// ─── SPLASH SCREEN ────────────────────────────────────────────────────────────
function SplashScreen({ onBegin }: { onBegin: () => void }) {
  const deferredPrompt = useUiStore((s) => s.deferredPrompt);
  const setIsInstallable = useUiStore((s) => s.setIsInstallable);
  const setShowInstructions = useUiStore((s) => s.setShowInstallInstructions);

  // Show if not in standalone (installed) mode
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstallable(false);
      }
    } else {
      setShowInstructions(true);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--color-bg-deep)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        overflow: 'hidden',
      }}
    >
      {/* Animated background orbs */}
      {[
        { size: 400, color: 'rgba(0,229,200,0.06)', top: '10%', left: '60%', delay: '0s' },
        { size: 300, color: 'rgba(139,92,246,0.08)', top: '60%', left: '20%', delay: '3s' },
        { size: 200, color: 'rgba(0,229,200,0.04)', top: '40%', left: '80%', delay: '6s' },
      ].map((orb, i) => (
        <div
          key={i}
          className="animate-orb"
          style={{
            position: 'absolute',
            width: orb.size,
            height: orb.size,
            borderRadius: '50%',
            background: orb.color,
            top: orb.top,
            left: orb.left,
            filter: 'blur(60px)',
            transform: 'translate(-50%, -50%)',
            animationDelay: orb.delay,
          }}
        />
      ))}

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.7, ease: 'easeOut' }}
        style={{ textAlign: 'center', zIndex: 1, padding: '0 24px' }}
      >
        {/* Logo mark */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            border: '1px solid rgba(0,229,200,0.3)',
            margin: '0 auto 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 40px rgba(0,229,200,0.15)',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 8,
              borderRadius: '50%',
              border: '1px solid rgba(0,229,200,0.15)',
            }}
          />
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="4" fill="#00E5C8" />
            <path
              d="M16 4 A12 12 0 0 1 28 16"
              stroke="#00E5C8"
              strokeWidth="1.5"
              fill="none"
              opacity="0.6"
            />
            <path
              d="M16 4 A12 12 0 0 0 4 16"
              stroke="#8B5CF6"
              strokeWidth="1.5"
              fill="none"
              opacity="0.6"
            />
            <circle cx="28" cy="16" r="3" fill="#00E5C8" opacity="0.8" />
            <circle cx="4" cy="16" r="3" fill="#8B5CF6" opacity="0.8" />
          </svg>
        </div>

        {/* Title */}
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(56px, 10vw, 80px)',
            fontWeight: 800,
            color: 'var(--color-text)',
            letterSpacing: '-0.02em',
            lineHeight: 1,
            marginBottom: 12,
          }}
        >
          AURIS
        </h1>

        {/* Tagline */}
        <p
          style={{
            fontFamily: 'IBM Plex Mono',
            fontSize: 14,
            color: '#64748B',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            marginBottom: 48,
          }}
        >
          Step Inside The Sound
        </p>

        {/* Feature pills */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: 56,
          }}
        >
          {['HRTF Binaural', '3D Positioning', 'Room Physics', 'Real-time'].map((feat) => (
            <span
              key={feat}
              style={{
                padding: '4px 14px',
                borderRadius: 999,
                border: '1px solid rgba(30,45,64,0.8)',
                fontFamily: 'IBM Plex Mono',
                fontSize: 11,
                color: '#64748B',
                background: 'rgba(13,17,26,0.6)',
              }}
            >
              {feat}
            </span>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={onBegin}
            className="btn-primary"
            style={{
              padding: '16px 48px',
              fontSize: 16,
              letterSpacing: '0.05em',
            }}
            aria-label="Begin the Auris audio experience"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="currentColor"
              style={{ marginRight: 4 }}
            >
              <path d="M6 3.5L14 9L6 14.5V3.5Z" />
            </svg>
            Begin Experience
          </motion.button>

          {!isStandalone && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleInstall}
              style={{
                padding: '16px 32px',
                fontSize: 14,
                fontFamily: 'IBM Plex Mono',
                fontWeight: 500,
                color: 'var(--color-text-muted)',
                background: 'var(--color-surface)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
              </svg>
              Install App
            </motion.button>
          )}
        </div>

        <p
          style={{
            marginTop: 20,
            fontFamily: 'IBM Plex Mono',
            fontSize: 11,
            color: 'rgba(100,116,139,0.6)',
            letterSpacing: '0.05em',
          }}
        >
          🎧 Use headphones for the full experience
        </p>
      </motion.div>
    </motion.div>
  );
}

// ─── BOTTOM BAR ───────────────────────────────────────────────────────────────
function BottomBar() {
  const isPlaying = useAudioStore((s) => s.isPlaying);
  const setIsPlaying = useAudioStore((s) => s.setIsPlaying);
  const sourceType = useAudioStore((s) => s.sourceType);
  const hapticsActive = useUiStore((s) => s.hapticsActive);
  const supportsHaptics = useUiStore((s) => s.supportsHaptics);
  const headTrackingActive = useUiStore((s) => s.headTrackingActive);
  const supportsHeadTracking = useUiStore((s) => s.supportsHeadTracking);
  const hapticIntensity = useUiStore((s) => s.hapticIntensity);
  const setHapticsActive = useUiStore((s) => s.setHapticsActive);
  const setHeadTrackingActive = useUiStore((s) => s.setHeadTrackingActive);
  const setHapticIntensity = useUiStore((s) => s.setHapticIntensity);
  const deferredPrompt = useUiStore((s) => s.deferredPrompt);
  const setIsInstallable = useUiStore((s) => s.setIsInstallable);
  const setShowInstructions = useUiStore((s) => s.setShowInstallInstructions);

  const { calibrate } = useHeadTracking();

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstallable(false);
      }
    } else {
      setShowInstructions(true);
    }
  };

  const togglePlay = async () => {
    const engine = AudioEngine.instance;
    if (sourceType === 'none') {
      engine.loadDemo();
      setIsPlaying(true);
    } else {
      await engine.togglePlay();
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="bottom-bar">
      {/* Play/Pause */}
      <button
        className="play-btn"
        onClick={togglePlay}
        aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
      >
        {isPlaying ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--color-bg-deep)">
            <rect x="6" y="5" width="4" height="14" rx="2" />
            <rect x="14" y="5" width="4" height="14" rx="2" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--color-bg-deep)">
            <path d="M7 5L19 12L7 19V5Z" />
          </svg>
        )}
      </button>

      {/* Source selector */}
      <AudioSourceSelector />

      {/* Divider */}
      <div style={{ width: 1, height: 32, background: 'var(--color-text-dim)', flexShrink: 0, opacity: 0.2 }} />

      {/* Waveform */}
      <div style={{ flex: 1, minWidth: 80, maxWidth: 360 }}>
        <WaveformVisualizer width={300} height={44} />
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 32, background: 'var(--color-text-dim)', flexShrink: 0, opacity: 0.2 }} />

      {/* Progressive enhancement toggles */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {/* Haptics toggle */}
        {supportsHaptics && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              className={`btn-icon${hapticsActive ? ' active' : ''}`}
              onClick={() => setHapticsActive(!hapticsActive)}
              aria-label={hapticsActive ? 'Disable haptic sync' : 'Enable haptic sync'}
              aria-pressed={hapticsActive}
              title="Haptic Sync"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <path d="M7 1C4.79 1 3 2.79 3 5v1.5h8V5C11 2.79 9.21 1 7 1ZM3 8v1c0 2.21 1.79 4 4 4s4-1.79 4-4V8H3Z" />
              </svg>
            </button>
            {hapticsActive && (
              <input
                type="range"
                min={0}
                max={100}
                value={hapticIntensity}
                onChange={(e) => setHapticIntensity(Number(e.target.value))}
                aria-label="Haptic intensity"
                style={{
                  width: 80,
                  '--track-fill': 'var(--color-primary)',
                  '--track-pct': `${hapticIntensity}%`,
                } as React.CSSProperties}
              />
            )}
          </div>
        )}

        {/* Head tracking toggle */}
        {supportsHeadTracking && (
          <button
            className={`btn-icon${headTrackingActive ? ' active' : ''}`}
            onClick={() => {
              setHeadTrackingActive(!headTrackingActive);
              if (!headTrackingActive) calibrate();
            }}
            aria-label={headTrackingActive ? 'Disable head tracking' : 'Enable head tracking'}
            aria-pressed={headTrackingActive}
            title="Head Tracking"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <path d="M7 1a3 3 0 100 6A3 3 0 007 1ZM2 10.5C2 8.57 4.24 7 7 7s5 1.57 5 3.5V13H2v-2.5Z" />
            </svg>
          </button>
        )}

        {/* Install Button in Bar */}
        {!isStandalone && (
          <button
            className={`btn-icon`}
            onClick={handleInstall}
            aria-label="Install App"
            title="Install App"
            style={{ color: '#00E5C8' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── BLOOM FLASH OVERLAY ──────────────────────────────────────────────────────
function BloomOverlay() {
  const isTransitioning = useSceneStore((s) => s.isTransitioning);

  return (
    <AnimatePresence>
      {isTransitioning && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'radial-gradient(ellipse at center, rgba(0,229,200,0.06) 0%, transparent 70%)',
            pointerEvents: 'none',
            zIndex: 50,
          }}
        />
      )}
    </AnimatePresence>
  );
}

// ─── HEADPHONE BANNER ─────────────────────────────────────────────────────────
function HeadphoneBanner() {
  const show = useUiStore((s) => s.showHeadphoneBanner);
  if (!show) return null;
  return (
    <div className="headphone-banner" role="status" aria-live="polite">
      🎧 Connect headphones for the full spatial experience
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const isInitialized = useUiStore((s) => s.isInitialized);
  const setIsInitialized = useUiStore((s) => s.setIsInitialized);
  const setIsLoadingIR = useUiStore((s) => s.setIsLoadingIR);
  const setShowHeadphoneBanner = useUiStore((s) => s.setShowHeadphoneBanner);

  const setAzimuth = useAudioStore((s) => s.setAzimuth);
  const setElevation = useAudioStore((s) => s.setElevation);
  const setDistance = useAudioStore((s) => s.setDistance);
  const setRoomSize = useAudioStore((s) => s.setRoomSize);
  const setDamping = useAudioStore((s) => s.setDamping);
  const setWetDry = useAudioStore((s) => s.setWetDry);
  const setIsPlaying = useAudioStore((s) => s.setIsPlaying);
  const setSourceType = useAudioStore((s) => s.setSourceType);
  const getActiveScene = useSceneStore((s) => s.getActiveScene);
  const loadLibrary = useLibraryStore((s) => s.loadLibrary);

  const setIsInstallable = useUiStore((s) => s.setIsInstallable);
  const setDeferredPrompt = useUiStore((s) => s.setDeferredPrompt);

  // Poll analyser & haptics (only active after init)
  useAudioAnalyser();
  useHaptics();

  // 1. PWA Install Logic
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI state to show our custom button
      setIsInstallable(true);
      console.log('[Auris PWA] Install prompt ready');
    };

    const handleAppInstalled = () => {
      // Clear the deferredPrompt so it can be garbage collected
      setDeferredPrompt(null);
      setIsInstallable(false);
      console.log('[Auris PWA] App installed successfully');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check if already in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
       setIsInstallable(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [setDeferredPrompt, setIsInstallable]);

  // Load Library from IndexedDB
  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  // Check for output device (headphone detection hint)
  useEffect(() => {
    const checkOutput = async () => {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioOutputs = devices.filter((d) => d.kind === 'audiooutput');
        const hasHeadphones = audioOutputs.some(
          (d) => /headphone|earphone|headset/i.test(d.label),
        );
        if (!hasHeadphones && audioOutputs.length > 0) {
          setShowHeadphoneBanner(true);
          setTimeout(() => setShowHeadphoneBanner(false), 6000);
        }
      } catch { /* permission denied or unsupported */ }
    };
    if (isInitialized) checkOutput();
  }, [isInitialized, setShowHeadphoneBanner]);

  const handleBegin = useCallback(async () => {
    // Initialize AudioContext (user gesture)
    const engine = AudioEngine.instance;
    engine.init();

    // Load default scene
    const scene = getActiveScene();
    if (scene) {
      setAzimuth(scene.azimuth);
      setElevation(scene.elevation);
      setDistance(scene.distance);
      setRoomSize(scene.roomSize);
      setDamping(scene.damping);
      setWetDry(scene.wetDry);
      engine.setAzimuthElevation(scene.azimuth, scene.elevation, scene.distance);
      engine.setWetDry(scene.wetDry);
      engine.setCurrentIRParams(scene.irParams);

      // Generate initial IR
      setIsLoadingIR(true);
      try {
        const ir = await generateSyntheticIR(scene.irParams, engine.ctx!);
        engine.loadIR(ir);
      } catch (err) {
        console.error('[Auris] Initial IR failed:', err);
      } finally {
        setIsLoadingIR(false);
      }
    }

    // Start demo
    engine.loadDemo();
    setSourceType('demo');
    setIsPlaying(true);

    setIsInitialized(true);
  }, [
    getActiveScene,
    setAzimuth, setDamping, setDistance, setElevation,
    setIsInitialized, setIsLoadingIR, setIsPlaying,
    setRoomSize, setSourceType, setWetDry,
  ]);

  return (
    <>
      <AnimatePresence>
        {!isInitialized && <SplashScreen onBegin={handleBegin} />}
        <ProjectLibrary />
      </AnimatePresence>

      {isInitialized && (
        <motion.div
          className="app-shell"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          {/* Scene picker at top of center/left */}
          <div
            style={{
              padding: '16px 24px',
              flexShrink: 0,
            }}
          >
            <ScenePicker />
          </div>

          {/* Main three-panel layout */}
          <div className="main-panels">
            {/* Left — Source controls */}
            <div className="side-panel left-panel">
              <ControlPanel />
            </div>

            {/* Center — Room Visualizer */}
            <div className="center-panel">
              <RoomVisualizer />
            </div>

            {/* Right — Room Physics */}
            <div className="side-panel right-panel">
              <RoomPhysics />
            </div>
          </div>

          {/* Bottom bar */}
          <BottomBar />
        </motion.div>
      )}

      {/* Global overlays */}
      <BloomOverlay />
      <InstallInstructionsModal />
      <HeadphoneBanner />
    </>
  );
}
