// src/components/AudioSourceSelector.tsx
// Bottom bar tabs: Demo | Upload | Mic — with file decode and mic capture

import { useRef, useState } from 'react';
import { AudioEngine } from '@/audio/AudioEngine';
import { useAudioStore } from '@/store/audioSlice';
import { useUiStore } from '@/store/uiSlice';
import { useSceneStore } from '@/store/sceneSlice';
import { getSceneById } from '@/scenes/presets';
import { extractGenre, matchGenreToSceneId } from '@/utils/metadata';
import { saveTrack, loadTrackFile, deleteTrack } from '@/utils/storage';
import { useLibraryStore } from '@/store/librarySlice';

export function AudioSourceSelector() {
  const sourceType = useAudioStore((s) => s.sourceType);
  const setSourceType = useAudioStore((s) => s.setSourceType);
  const setIsPlaying = useAudioStore((s) => s.setIsPlaying);
  const isLoadingIR = useUiStore((s) => s.isLoadingIR);
  
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
  
  const tracks = useLibraryStore((s) => s.tracks);
  const addTrackToStore = useLibraryStore((s) => s.addTrackToStore);
  const removeTrackFromStore = useLibraryStore((s) => s.removeTrackFromStore);

  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

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
    setIsLibraryOpen(!isLibraryOpen);
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

  const playLibraryTrack = async (id: string, name: string) => {
    setIsLibraryOpen(false);
    const audioBlob = await loadTrackFile(id);
    if (!audioBlob) {
      console.error('[Auris] Failed to load track blob from DB');
      return;
    }
    // We treat the Blob as a File for engine purposes
    const asFile = new File([audioBlob], name);
    setFileName(name);
    try {
      await AudioEngine.instance.loadFile(asFile);
      setSourceType('file');
      setIsPlaying(true);
      // Wait, we should also auto-genre detect it!
      const g = await extractGenre(asFile);
      if (g) {
        const sId = matchGenreToSceneId(g);
        if (sId !== activeSceneId) {
          const scene = getSceneById(sId);
          if (scene) {
             setIsTransitioning(true);
             setActiveScene(scene.id);
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
             setTimeout(() => setIsTransitioning(false), 450);
          }
        }
      }
    } catch (e) {
      console.error('[Auris] Failed to play library track', e);
    }
  };

  const handleLibraryDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteTrack(id);
    removeTrackFromStore(id);
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

      {/* Library Popover */}
      {isLibraryOpen && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '70px',
          marginBottom: '12px',
          width: '320px',
          maxHeight: '300px',
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          overflowY: 'auto',
          boxShadow: '0 10px 40px -10px rgba(0,0,0,0.8)'
        }}>
          <h3 style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
            Local Library
          </h3>
          {tracks.length === 0 ? (
            <div style={{ fontSize: 11, color: '#64748B', padding: '12px 0', textAlign: 'center' }}>
              No songs stored yet. Upload a song to save it here!
            </div>
          ) : (
            tracks.map(t => (
              <div 
                key={t.id} 
                onClick={() => playLibraryTrack(t.id, t.filename)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px', background: 'rgba(255,255,255,0.03)',
                  borderRadius: '6px', cursor: 'pointer',
                  border: '1px solid transparent',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                  <span style={{ fontSize: 13, color: '#F8FAFC', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {t.title}
                  </span>
                  <span style={{ fontSize: 10, color: '#64748B' }}>
                    {t.genre ? `${t.genre} • ` : ''}{new Date(t.uploadedAt).toLocaleDateString()}
                  </span>
                </div>
                <button 
                  onClick={(e) => handleLibraryDelete(e, t.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#EF4444',
                    cursor: 'pointer',
                    opacity: 0.6,
                    padding: 4
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                  title="Delete from Library"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* File name or error */}
      {sourceType === 'file' && fileName && (
        <span
          style={{
            fontFamily: 'IBM Plex Mono',
            fontSize: 10,
            color: '#64748B',
            maxWidth: 120,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
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
