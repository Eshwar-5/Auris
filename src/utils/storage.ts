// src/utils/storage.ts
import localforage from 'localforage';

// Configure a dedicated store for Auris Audio library
localforage.config({
  name: 'AurisApp',
  storeName: 'audio_library',
  description: 'Stores user-uploaded audio files for local playback without a backend'
});

export interface StoredTrack {
  id: string; // Unique universally generated ID (e.g., date-based)
  filename: string;
  title: string;
  artist: string;
  genre: string | null;
  uploadedAt: number;
}

const METADATA_KEY = 'library_metadata';

/**
 * Retrieves the list of saved tracks' metadata.
 */
export async function getLibraryMetadata(): Promise<StoredTrack[]> {
  try {
    const data = await localforage.getItem<StoredTrack[]>(METADATA_KEY);
    return data || [];
  } catch (err) {
    console.error('[Auris Storage] Failed to get metadata', err);
    return [];
  }
}

/**
 * Saves a new track (metadata + raw File Blob).
 */
export async function saveTrack(file: File, metadata: Omit<StoredTrack, 'id' | 'uploadedAt'>): Promise<StoredTrack> {
  const id = `track_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const newTrack: StoredTrack = {
    ...metadata,
    id,
    uploadedAt: Date.now(),
  };

  try {
    // Save the raw file blob keyed by its unique ID
    await localforage.setItem(id, file);

    // Update metadata registry
    const existing = await getLibraryMetadata();
    const updated = [newTrack, ...existing];
    await localforage.setItem(METADATA_KEY, updated);

    return newTrack;
  } catch (err) {
    console.error('[Auris Storage] Failed to save track', err);
    throw err;
  }
}

/**
 * Loads the raw audio Blob for playback based on track ID.
 */
export async function loadTrackFile(id: string): Promise<File | Blob | null> {
  try {
    return await localforage.getItem<File | Blob>(id);
  } catch (err) {
    console.error(`[Auris Storage] Failed to load track file ${id}`, err);
    return null;
  }
}

/**
 * Deletes a track buffer and its metadata entry from IndexedDB.
 */
export async function deleteTrack(id: string): Promise<void> {
  try {
    await localforage.removeItem(id);
    
    // Update registry
    const existing = await getLibraryMetadata();
    const updated = existing.filter((t) => t.id !== id);
    await localforage.setItem(METADATA_KEY, updated);
  } catch (err) {
    console.error(`[Auris Storage] Failed to delete track ${id}`, err);
    throw err;
  }
}
