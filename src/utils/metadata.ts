// src/utils/metadata.ts
import jsmediatags from 'jsmediatags';

export function extractGenre(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      jsmediatags.read(file, {
        onSuccess: (tag) => {
          if (tag.tags && tag.tags.genre) {
            resolve(tag.tags.genre.trim());
          } else {
            resolve(null);
          }
        },
        onError: (error) => {
          console.warn('[Auris] ID3 extraction failed or no metadata found:', error.info);
          resolve(null);
        },
      });
    } catch (e) {
      console.warn('[Auris] Sync ID3 extraction exception:', e);
      resolve(null);
    }
  });
}

/**
 * Matches a raw text genre string from an ID3 tag to one of the 
 * Auris curated acoustic scenes.
 */
export function matchGenreToSceneId(genreStr: string): string {
  const g = genreStr.toLowerCase();

  // Electronic / EDM / DJ
  if (/(electronic|edm|house|techno|trance|dubstep|drum '?n'? bass|dance|dj)/i.test(g)) {
    return 'edm-club';
  }
  
  // Hip Hop / Rap / Trap / Drill
  if (/(hip hop|rap|trap|drill|lo-fi|gangsta)/i.test(g)) {
    return 'hip-hop-studio';
  }
  
  // Rock / Metal / Alternative / Punk
  if (/(rock|metal|alternative|punk|progressive|garage|indie(?! pop)|sufi rock)/i.test(g)) {
    return 'rock-arena';
  }
  
  // Pop / Synthpop / K-pop / Indi-Pop
  if (/(pop|synthpop|k-pop|indi-pop|bubblegum)/i.test(g)) {
    return 'pop-room';
  }
  
  // Bollywood / Filmi
  if (/(bollywood|filmi|indian film)/i.test(g)) {
    return 'bollywood-cinema';
  }
  
  // World / Regional
  if (/(latin|salsa|reggaetón|african|afrobeat|indian|raga|world)/i.test(g)) {
    return 'world-stage';
  }
  
  // Jazz
  if (/(jazz|bebop|fusion|swing|acid)/i.test(g)) {
    return 'tokyo-jazz';
  }
  
  // Blues
  if (/(blues)/i.test(g)) {
    return 'blues-lounge';
  }
  
  // R&B / Soul
  if (/(r&b|r and b|soul|motown)/i.test(g)) {
    return 'rnb-lounge';
  }
  
  // Country
  if (/(country|nashville|bluegrass|outlaw)/i.test(g)) {
    return 'country-hall';
  }
  
  // Folk / Traditional
  if (/(folk|celtic|americana)/i.test(g)) {
    return 'folk-acoustic';
  }

  // Fallback if no matching regex (use the closest generic warm room)
  return 'studio-session';
}
