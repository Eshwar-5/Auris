import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { SCENES, Scene } from '@/scenes/presets';
import { useLibraryStore } from '@/store/librarySlice';
import { useUiStore } from '@/store/uiSlice';
import { useAudioStore } from '@/store/audioSlice';
import { useSceneStore } from '@/store/sceneSlice';
import { AudioEngine } from '@/audio/AudioEngine';
import { generateSyntheticIR } from '@/audio/IRLoader';
import { loadTrackFile, deleteTrack as deleteFromDB } from '@/utils/storage';

export function ProjectLibrary() {
  const isLibraryOpen = useUiStore((s) => s.isLibraryOpen);
  const setIsLibraryOpen = useUiStore((s) => s.setIsLibraryOpen);
  
  const tracks = useLibraryStore((s) => s.tracks);
  const removeTrackFromStore = useLibraryStore((s) => s.removeTrackFromStore);
  
  const activeSceneId = useSceneStore((s) => s.activeSceneId);
  const setActiveScene = useSceneStore((s) => s.setActiveScene);
  const setIsTransitioning = useSceneStore((s) => s.setIsTransitioning);
  
  const setSourceType = useAudioStore((s) => s.setSourceType);
  const setIsPlaying = useAudioStore((s) => s.setIsPlaying);
  const setAzimuth = useAudioStore((s) => s.setAzimuth);
  const setElevation = useAudioStore((s) => s.setElevation);
  const setDistance = useAudioStore((s) => s.setDistance);
  const setRoomSize = useAudioStore((s) => s.setRoomSize);
  const setDamping = useAudioStore((s) => s.setDamping);
  const setWetDry = useAudioStore((s) => s.setWetDry);
  
  const setIsLoadingIR = useUiStore((s) => s.setIsLoadingIR);
  
  const [searchQuery, setSearchQuery] = useState('');

  // Combined searchable data
  const filteredScenes = useMemo(() => 
    SCENES.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      s.tagline.toLowerCase().includes(searchQuery.toLowerCase())
    ), [searchQuery]);

  const filteredTracks = useMemo(() => 
    tracks.filter(t => 
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (t.genre && t.genre.toLowerCase().includes(searchQuery.toLowerCase()))
    ), [tracks, searchQuery]);

  const handleSelectScene = async (scene: Scene) => {
    if (scene.id === activeSceneId) {
      setIsLibraryOpen(false);
      return;
    }

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

    if (engine.ctx) {
      setIsLoadingIR(true);
      try {
        const irBuffer = await generateSyntheticIR(scene.irParams, engine.ctx);
        engine.loadIR(irBuffer);
      } catch (err) {
        console.error('[Auris] IR generation failed:', err);
      } finally {
        setIsLoadingIR(false);
      }
    }

    setTimeout(() => {
      setIsTransitioning(false);
      setIsLibraryOpen(false);
    }, 450);
  };

  const handleSelectTrack = async (id: string, name: string) => {
    const audioBlob = await loadTrackFile(id);
    if (!audioBlob) return;
    
    const asFile = new File([audioBlob], name);
    try {
      await AudioEngine.instance.loadFile(asFile);
      setSourceType('file');
      setIsPlaying(true);
      setIsLibraryOpen(false);
    } catch (e) {
      console.error('[Auris] Failed to play library track', e);
    }
  };

  const handleDeleteTrack = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteFromDB(id);
    removeTrackFromStore(id);
  };

  if (!isLibraryOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 5000,
        background: 'rgba(10, 10, 11, 0.9)',
        backdropFilter: 'blur(80px)',
        display: 'flex',
        flexDirection: 'column',
        padding: '6vh 8vw',
        overflowY: 'auto',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 48 }}>
          <div>
            <h1 style={{ 
              fontFamily: 'var(--font-display)', 
              fontSize: '48px', 
              fontWeight: 800, 
              color: 'var(--color-text)', 
              letterSpacing: '-0.02em',
              marginBottom: 8 
            }}>
              PROJECT LIBRARY
            </h1>
            <p style={{ color: 'var(--color-text-dim)', fontSize: 16, fontWeight: 500, fontFamily: 'var(--font-body)' }}>
              Manage your acoustic snapshots and custom audio monoliths.
            </p>
          </div>
          <button 
            onClick={() => setIsLibraryOpen(false)}
            className="btn-primary"
            style={{ 
              padding: '14px 28px', 
              borderRadius: 'var(--radius-xl)', 
              fontSize: 14, 
              fontWeight: 800,
              letterSpacing: '0.1em'
            }}
          >
            CLOSE
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative', marginBottom: 64, maxWidth: 600 }}>
          <input 
            type="text"
            placeholder="Search scene or track..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--color-surface-recessed)',
              border: 'none',
              borderRadius: 'var(--radius-lg)',
              padding: '20px 24px',
              color: 'var(--color-text)',
              fontFamily: 'var(--font-body)',
              fontSize: 16,
              outline: 'none',
              boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.4)'
            }}
          />
        </div>

        {/* Grid Content */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 32 }}>
          
          {/* User Tracks Section */}
          {filteredTracks.length > 0 && (
            <div style={{ gridColumn: '1 / -1' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 800, color: 'var(--color-secondary)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 24 }}>
                Uploaded Monoliths
              </h2>
            </div>
          )}
          
          {filteredTracks.map(t => (
            <motion.div
              key={t.id}
              whileHover={{ y: -4, scale: 1.02 }}
              onClick={() => handleSelectTrack(t.id, t.filename)}
              style={{
                padding: 32,
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-xl)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.03)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6, fontFamily: 'var(--font-body)' }}>
                    {t.title}
                  </h3>
                  <span style={{ fontSize: 12, color: 'var(--color-text-dim)', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
                    {t.genre ? t.genre : 'RAW AUDIO'} • {new Date(t.uploadedAt).toLocaleDateString()}
                  </span>
                </div>
                <button 
                  onClick={(e) => handleDeleteTrack(e, t.id)}
                  style={{ background: 'transparent', border: 'none', color: '#EF4444', fontSize: 18, opacity: 0.4, cursor: 'pointer' }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '0.4'}
                >
                  ✕
                </button>
              </div>
            </motion.div>
          ))}

          {/* Scenes Section */}
          <div style={{ gridColumn: '1 / -1', marginTop: 40 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 800, color: 'var(--color-primary)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 24 }}>
              Digital Echo Chambers
            </h2>
          </div>

          {filteredScenes.map(s => (
            <motion.div
              key={s.id}
              whileHover={{ y: -4, scale: 1.02 }}
              onClick={() => handleSelectScene(s)}
              style={{
                padding: 32,
                background: 'var(--color-surface-high)',
                borderRadius: 'var(--radius-xl)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                border: s.id === activeSceneId ? '2px solid var(--color-primary)' : '1px solid rgba(255,255,255,0.03)'
              }}
            >
              <div style={{ 
                height: 140, 
                borderRadius: 'var(--radius-lg)', 
                background: s.gradientMid 
                  ? `linear-gradient(135deg, ${s.gradientFrom}, ${s.gradientMid}, ${s.gradientTo})`
                  : `linear-gradient(135deg, ${s.gradientFrom}, ${s.gradientTo})`,
                marginBottom: 12 
              }} />
              <div>
                <h3 style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text)', marginBottom: 8, fontFamily: 'var(--font-display)' }}>
                  {s.name}
                </h3>
                <p style={{ fontSize: 14, color: 'var(--color-text-dim)', fontFamily: 'var(--font-body)', lineHeight: 1.5 }}>
                  {s.tagline}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
