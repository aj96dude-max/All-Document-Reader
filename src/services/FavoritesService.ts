import ReactNativeBlobUtil from 'react-native-blob-util';
import type { ScannedFile } from '../types/types';

const FAVORITES_FILE_PATH = `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/favorites.json`;

/**
 * Load all favorited files from persistent storage
 */
export async function getFavorites(): Promise<ScannedFile[]> {
  try {
    const exists = await ReactNativeBlobUtil.fs.exists(FAVORITES_FILE_PATH);
    if (!exists) {
      return [];
    }
    const content = await ReactNativeBlobUtil.fs.readFile(FAVORITES_FILE_PATH, 'utf8');
    if (!content || !content.trim()) {
      return [];
    }
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (error) {
    console.error('Error loading favorites:', error);
    return [];
  }
}

/**
 * Save favorites array to persistent storage
 */
async function saveFavorites(favorites: ScannedFile[]): Promise<void> {
  try {
    const jsonString = JSON.stringify(favorites);
    await ReactNativeBlobUtil.fs.writeFile(FAVORITES_FILE_PATH, jsonString, 'utf8');
  } catch (error) {
    console.error('Error saving favorites:', error);
    throw error;
  }
}

/**
 * Check if a file is in favorites by URI or id
 */
export async function isFavorite(fileUriOrId: string): Promise<boolean> {
  if (!fileUriOrId) return false;
  try {
    const favorites = await getFavorites();
    return favorites.some(
      (f) => f.uri === fileUriOrId || f.id === fileUriOrId
    );
  } catch (error) {
    console.error('Error checking favorite status:', error);
    return false;
  }
}

/**
 * Add a file to favorites
 */
export async function addFavorite(file: ScannedFile): Promise<void> {
  if (!file || !file.uri) return;
  try {
    const favorites = await getFavorites();
    const existsIndex = favorites.findIndex(
      (f) => f.uri === file.uri || f.id === file.id
    );
    if (existsIndex === -1) {
      favorites.unshift(file);
      await saveFavorites(favorites);
    }
  } catch (error) {
    console.error('Error adding favorite:', error);
  }
}

/**
 * Remove a file from favorites by URI or id
 */
export async function removeFavorite(fileUriOrId: string): Promise<void> {
  if (!fileUriOrId) return;
  try {
    const favorites = await getFavorites();
    const updated = favorites.filter(
      (f) => f.uri !== fileUriOrId && f.id !== fileUriOrId
    );
    await saveFavorites(updated);
  } catch (error) {
    console.error('Error removing favorite:', error);
  }
}

/**
 * Toggle favorite status of a file.
 * Returns true if the file is now a favorite, false if removed.
 */
export async function toggleFavorite(file: ScannedFile): Promise<boolean> {
  if (!file || !file.uri) return false;
  try {
    const favorites = await getFavorites();
    const existsIndex = favorites.findIndex(
      (f) => f.uri === file.uri || f.id === file.id
    );
    if (existsIndex >= 0) {
      favorites.splice(existsIndex, 1);
      await saveFavorites(favorites);
      return false;
    } else {
      favorites.unshift(file);
      await saveFavorites(favorites);
      return true;
    }
  } catch (error) {
    console.error('Error toggling favorite:', error);
    return false;
  }
}

/**
 * Update a favorited file entry (e.g., after renaming)
 */
export async function updateFavoriteFile(
  oldUri: string,
  updatedFile: ScannedFile
): Promise<void> {
  try {
    const favorites = await getFavorites();
    const index = favorites.findIndex(
      (f) => f.uri === oldUri || f.id === updatedFile.id
    );
    if (index >= 0) {
      favorites[index] = updatedFile;
      await saveFavorites(favorites);
    }
  } catch (error) {
    console.error('Error updating favorite file:', error);
  }
}
