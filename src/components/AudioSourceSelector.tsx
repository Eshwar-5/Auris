// src/components/AudioSourceSelector.tsx
// Bottom bar tabs: Demo | Upload | Mic — with file decode and mic capture

import { useRef, useState } from 'react';
import { AudioEngine } from '@/audio/AudioEngine';
import { useAudioStore } from '@/store/audioSlice';
import { useUiStore } from '@/store/uiSlice';
import { useSceneStore } from '@/store/sceneSlice';
import { getSceneById } from '@/scenes/presets';
import { extractGenre, matchGenreToSceneId } from '@/utils/metadata';
import { saveTrack } from '@/utils/storage';
import { useLibraryStore } from '@/store/librarySlice';

export function AudioSourceSelector() {
  const sourceType = useAudioStore((s) => s.sourceType);
  const setSourceType = useAudioStore((s) => s.setSourceType);
  const setIsPlaying = useAudioStore((s) => s.setIsPlaying);
  const isLoadingIR = useUiStore((s) => s.isLoadingIR);
  const setIsLibraryOpen = useUiStore((s) => s.setIsLibraryOpen);
  
  const activeSceneId = useSceneStore((s) => s.activeSceneId);
  const setActiveScene = useSceneStore((s) => s.setActiveScene);
  const setIsTransitioning = useSceneStore((s) => s.setIsTransitioning);

  const setAzimuth = useAudioStore((s) => s.setAzimuth);
  const setElevation = useAudioStore((s) => s.setElevation);
  const setDistance = useAudioStore((s) => s.setDistance);
  const setRoomSize = useAudioStore((s) => s.setRoomSize);
  const setDamping = useAudioStore((s) => s.setDamping);
  const setWetDry = useAudioStore((s) => s.setWetDry);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>('');
  const [micError, setMicError] = useState<string>('');
  
  const addTrackToStore = useLibraryStore((s) => s.addTrackToStore);

  const handleDemo = () => {
    setMicError('');
    AudioEngine.instance.loadDemo();
    setSourceType('demo');
    setIsPlaying(true);
  };

  const handleFileClick = () => {
    setIsLibraryOpen(false);
    fileInputRef.current?.click();
  };

  const handleLibraryClick = () => {
    setIsLibraryOpen(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setMicError('');
    
    try {
      // 1. Decode and load audio
      await AudioEngine.instance.loadFile(file);
      setSourceType('file');
      setIsPlaying(true);

      let finalGenre = null;
      // 2. Try Automatic Genre Detection
      const genre = await extractGenre(file);
      if (genre) {
        finalGenre = genre;
        console.log(`[Auris] Detected ID3 Genre: "${genre}"`);
        const matchedSceneId = matchGenreToSceneId(genre);
        
        if (matchedSceneId !== activeSceneId) {
          const scene = getSceneById(matchedSceneId);
          if (scene) {
             console.log(`[Auris] Auto-switching to scene: "${scene.name}"`);
             setIsTransitioning(true);
             setActiveScene(scene.id);
             
             // Apply parameters
             setAzimuth(scene.azimuth);
             setElevation(scene.elevation);
             setDistance(scene.distance);
             setRoomSize(scene.roomSize);
             setDamping(scene.damping);
             setWetDry(scene.wetDry);

             const engine = AudioEngine.instance;
             engine.setAzimuthElevation(scene.azimuth, scene.elevation, scene.distance);
             engine.setWetDry(scene.wetDry);
             engine.setCurrentIRParams(scene.irParams);

             // Since the sliders changed, the Engine's debounce will handle IR regeneration!
             setTimeout(() => setIsTransitioning(false), 450);
          }
        }
      }

      // 3. Save to Library
      try {
        const title = file.name.replace(/\.[^/.]+$/, ""); // strip extension
        const newTrack = await saveTrack(file, {
          filename: file.name,
          title,
          artist: 'Unknown Artist',
          genre: finalGenre,
        });
        addTrackToStore(newTrack);
      } catch (err) {
        console.warn('[Auris] Failed to save track to library:', err);
      }

    } catch (err) {
      console.error('[Auris] File decode error:', err);
    }
    
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const handleMic = async () => {
    setMicError('');
    try {
      await AudioEngine.instance.loadMic();
      setSourceType('mic');
      setIsPlaying(true);
    } catch (err) {
      setMicError('Microphone access denied.');
      console.error('[Auris] Mic error:', err);
    }
  };

  const tabs = [
    { id: 'demo', label: 'Demo', icon: '♪', action: handleDemo },
    { id: 'library', label: 'Library', icon: '☰', action: handleLibraryClick },
    { id: 'file', label: 'Upload', icon: '↑', action: handleFileClick },
    { id: 'mic', label: 'Mic', icon: '◉', action: handleMic },
  ] as const;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".mp3,.wav,.flac,.ogg,.m4a,.aac"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        aria-label="Upload audio file"
      />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4 }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-pill${sourceType === tab.id ? ' active' : ''}`}
            onClick={tab.action}
            disabled={isLoadingIR}
            aria-label={`Use ${tab.label} as audio source`}
            aria-pressed={sourceType === tab.id}
          >
            <span style={{ marginRight: 4, fontSize: 10 }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* File name or error */}
      {sourceType === 'file' && fileName && (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--color-primary)',
            maxWidth: 160,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontWeight: 500,
          }}
          title={fileName}
        >
          {fileName}
        </span>
      )}
      {micError && (
        <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#EF4444' }}>
          {micError}
        </span>
      )}
    </div>
  );
}
