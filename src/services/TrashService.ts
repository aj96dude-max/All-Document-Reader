import ReactNativeBlobUtil from 'react-native-blob-util';
import type { ScannedFile } from '../types/types';
import { deleteFile as nativeDeleteFile } from './FileScanner';
import { removeFavorite } from './FavoritesService';
import { removeRecentDocument } from './RecentDocumentsService';

export interface TrashedFile extends ScannedFile {
  trashedAt: number; // Epoch timestamp (ms) when moved to trash
}

const TRASH_FILE_PATH = `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/trash.json`;
export const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

/**
 * Helper to calculate remaining days before automatic deletion (1 to 30)
 */
export function getDaysRemaining(trashedAt: number): number {
  const elapsed = Date.now() - trashedAt;
  const remainingMs = THIRTY_DAYS_MS - elapsed;
  if (remainingMs <= 0) return 0;
  return Math.max(1, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
}

/**
 * Format remaining days matching UI mockup: "30 Days files", "05 Days files", "01 Days files"
 */
export function formatDaysRemaining(trashedAt: number): string {
  const days = getDaysRemaining(trashedAt);
  const formattedDays = days < 10 ? `0${days}` : `${days}`;
  return `${formattedDays} Days files`;
}

/**
 * Save trashed files array to persistent storage
 */
async function saveTrash(trashList: TrashedFile[]): Promise<void> {
  try {
    const jsonString = JSON.stringify(trashList);
    await ReactNativeBlobUtil.fs.writeFile(TRASH_FILE_PATH, jsonString, 'utf8');
  } catch (error) {
    console.error('Error saving trash:', error);
    throw error;
  }
}

/**
 * Load all trashed files and automatically permanently delete expired files (>= 30 days old)
 */
export async function getTrashFiles(): Promise<TrashedFile[]> {
  try {
    const exists = await ReactNativeBlobUtil.fs.exists(TRASH_FILE_PATH);
    if (!exists) {
      return [];
    }
    const content = await ReactNativeBlobUtil.fs.readFile(TRASH_FILE_PATH, 'utf8');
    if (!content || !content.trim()) {
      return [];
    }

    const parsed: TrashedFile[] = JSON.parse(content);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const now = Date.now();
    const activeTrash: TrashedFile[] = [];
    const expiredTrash: TrashedFile[] = [];

    for (const item of parsed) {
      if (now - item.trashedAt >= THIRTY_DAYS_MS) {
        expiredTrash.push(item);
      } else {
        activeTrash.push(item);
      }
    }

    // Auto-delete expired files permanently in background
    if (expiredTrash.length > 0) {
      for (const expired of expiredTrash) {
        try {
          await nativeDeleteFile(expired.uri);
        } catch (e) {
          console.warn('Could not auto-delete expired file:', expired.name, e);
        }
      }
      await saveTrash(activeTrash);
    }

    // Sort by trashedAt descending (most recently trashed first)
    return activeTrash.sort((a, b) => b.trashedAt - a.trashedAt);
  } catch (error) {
    console.error('Error loading trash files:', error);
    return [];
  }
}

/**
 * Check if a file is currently in trash by its URI or ID
 */
export async function isTrashFile(fileUriOrId: string): Promise<boolean> {
  if (!fileUriOrId) return false;
  try {
    const trash = await getTrashFiles();
    return trash.some((f) => f.uri === fileUriOrId || f.id === fileUriOrId);
  } catch {
    return false;
  }
}

/**
 * Move a file to Trash:
 * 1. Adds to trash.json with current epoch timestamp
 * 2. Removes from Favorites
 * 3. Removes from Recent Documents
 */
export async function moveToTrash(file: ScannedFile): Promise<void> {
  if (!file || !file.uri) return;
  try {
    const currentTrash = await getTrashFiles();
    const existsIndex = currentTrash.findIndex(
      (f) => f.uri === file.uri || f.id === file.id
    );

    const trashedItem: TrashedFile = {
      ...file,
      trashedAt: Date.now(),
    };

    if (existsIndex >= 0) {
      currentTrash[existsIndex] = trashedItem;
    } else {
      currentTrash.unshift(trashedItem);
    }

    await saveTrash(currentTrash);

    // Clean from Favorites & Recents
    await removeFavorite(file.uri);
    await removeRecentDocument(file.uri);
  } catch (error) {
    console.error('Error moving file to trash:', error);
    throw error;
  }
}

/**
 * Restore a file from Trash back to active files
 */
export async function restoreFromTrash(fileUriOrId: string): Promise<TrashedFile | null> {
  if (!fileUriOrId) return null;
  try {
    const currentTrash = await getTrashFiles();
    const target = currentTrash.find(
      (f) => f.uri === fileUriOrId || f.id === fileUriOrId
    );

    if (!target) return null;

    const remaining = currentTrash.filter(
      (f) => f.uri !== fileUriOrId && f.id !== fileUriOrId
    );
    await saveTrash(remaining);
    return target;
  } catch (error) {
    console.error('Error restoring file from trash:', error);
    throw error;
  }
}

/**
 * Delete a file permanently from storage and from trash.json
 */
export async function deletePermanently(fileUriOrId: string): Promise<boolean> {
  if (!fileUriOrId) return false;
  try {
    const currentTrash = await getTrashFiles();
    const target = currentTrash.find(
      (f) => f.uri === fileUriOrId || f.id === fileUriOrId
    );

    const remaining = currentTrash.filter(
      (f) => f.uri !== fileUriOrId && f.id !== fileUriOrId
    );
    await saveTrash(remaining);

    if (target?.uri) {
      try {
        await nativeDeleteFile(target.uri);
      } catch (e) {
        console.warn('Permanent native delete warning:', e);
      }
    }
    return true;
  } catch (error) {
    console.error('Error permanently deleting file:', error);
    throw error;
  }
}

/**
 * Permanently delete all files in Trash
 */
export async function clearAllTrash(): Promise<void> {
  try {
    const currentTrash = await getTrashFiles();
    for (const item of currentTrash) {
      try {
        await nativeDeleteFile(item.uri);
      } catch (e) {
        console.warn('Error deleting trashed file:', item.name, e);
      }
    }
    await saveTrash([]);
  } catch (error) {
    console.error('Error clearing all trash:', error);
    throw error;
  }
}
