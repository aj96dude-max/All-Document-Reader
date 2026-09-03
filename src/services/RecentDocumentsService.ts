import ReactNativeBlobUtil from 'react-native-blob-util';
import type { ScannedFile } from '../types/types';

const RECENTS_FILE_PATH = `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/recent_documents.json`;
const MAX_RECENTS_COUNT = 50;

/**
 * Load all recent documents from persistent storage
 */
export async function getRecentDocuments(): Promise<ScannedFile[]> {
  try {
    const exists = await ReactNativeBlobUtil.fs.exists(RECENTS_FILE_PATH);
    if (!exists) {
      return [];
    }
    const content = await ReactNativeBlobUtil.fs.readFile(RECENTS_FILE_PATH, 'utf8');
    if (!content || !content.trim()) {
      return [];
    }
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (error) {
    console.error('Error loading recent documents:', error);
    return [];
  }
}

/**
 * Save recents array to persistent storage
 */
async function saveRecentDocuments(recents: ScannedFile[]): Promise<void> {
  try {
    const jsonString = JSON.stringify(recents);
    await ReactNativeBlobUtil.fs.writeFile(RECENTS_FILE_PATH, jsonString, 'utf8');
  } catch (error) {
    console.error('Error saving recent documents:', error);
    throw error;
  }
}

/**
 * Add or bump a file to the top of recent documents
 */
export async function addRecentDocument(file: ScannedFile): Promise<void> {
  if (!file || !file.uri) return;
  try {
    const recents = await getRecentDocuments();
    // Remove if existing
    const filtered = recents.filter(
      (f) => f.uri !== file.uri && f.id !== file.id
    );
    // Add to the front
    filtered.unshift(file);
    // Trim to max limit
    const trimmed = filtered.slice(0, MAX_RECENTS_COUNT);
    await saveRecentDocuments(trimmed);
  } catch (error) {
    console.error('Error adding recent document:', error);
  }
}

/**
 * Remove a file from recent documents by URI or id
 */
export async function removeRecentDocument(fileUriOrId: string): Promise<void> {
  if (!fileUriOrId) return;
  try {
    const recents = await getRecentDocuments();
    const updated = recents.filter(
      (f) => f.uri !== fileUriOrId && f.id !== fileUriOrId
    );
    await saveRecentDocuments(updated);
  } catch (error) {
    console.error('Error removing recent document:', error);
  }
}

/**
 * Update a recent document entry (e.g. after renaming)
 */
export async function updateRecentDocument(
  oldUri: string,
  updatedFile: ScannedFile
): Promise<void> {
  try {
    const recents = await getRecentDocuments();
    const index = recents.findIndex(
      (f) => f.uri === oldUri || f.id === updatedFile.id
    );
    if (index >= 0) {
      recents[index] = updatedFile;
      await saveRecentDocuments(recents);
    }
  } catch (error) {
    console.error('Error updating recent document:', error);
  }
}

/**
 * Clear all recent documents
 */
export async function clearRecentDocuments(): Promise<void> {
  try {
    await saveRecentDocuments([]);
  } catch (error) {
    console.error('Error clearing recent documents:', error);
  }
}
