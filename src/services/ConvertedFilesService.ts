import ReactNativeBlobUtil from 'react-native-blob-util';
import type { ScannedFile } from '../types/types';

const CONVERTED_FILES_PATH = `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/converted_files.json`;

/**
 * Load all converted files from persistent storage
 */
export async function getConvertedFiles(): Promise<ScannedFile[]> {
  try {
    const exists = await ReactNativeBlobUtil.fs.exists(CONVERTED_FILES_PATH);
    if (!exists) {
      return [];
    }
    const content = await ReactNativeBlobUtil.fs.readFile(CONVERTED_FILES_PATH, 'utf8');
    if (!content || !content.trim()) {
      return [];
    }
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (error) {
    console.error('Error loading converted files:', error);
    return [];
  }
}

/**
 * Save converted files array to persistent storage
 */
async function saveConvertedFiles(files: ScannedFile[]): Promise<void> {
  try {
    const jsonString = JSON.stringify(files);
    await ReactNativeBlobUtil.fs.writeFile(CONVERTED_FILES_PATH, jsonString, 'utf8');
  } catch (error) {
    console.error('Error saving converted files:', error);
    throw error;
  }
}

/**
 * Check if a file is already in the converted list
 */
export async function isFileConverted(fileUriOrId: string): Promise<boolean> {
  if (!fileUriOrId) return false;
  try {
    const files = await getConvertedFiles();
    return files.some(
      (f) => f.uri === fileUriOrId || f.id === fileUriOrId
    );
  } catch (error) {
    console.error('Error checking converted status:', error);
    return false;
  }
}

/**
 * Add a file to converted files list
 */
export async function addConvertedFile(file: ScannedFile): Promise<void> {
  if (!file || !file.uri) return;
  try {
    const files = await getConvertedFiles();
    const existsIndex = files.findIndex(
      (f) => f.uri === file.uri || f.id === file.id
    );
    if (existsIndex === -1) {
      files.unshift(file);
      await saveConvertedFiles(files);
    } else {
      // If it exists, move it to the top
      files.splice(existsIndex, 1);
      files.unshift(file);
      await saveConvertedFiles(files);
    }
  } catch (error) {
    console.error('Error adding converted file:', error);
  }
}

/**
 * Remove a file from converted list by URI or id
 */
export async function removeConvertedFile(fileUriOrId: string): Promise<void> {
  if (!fileUriOrId) return;
  try {
    const files = await getConvertedFiles();
    const updated = files.filter(
      (f) => f.uri !== fileUriOrId && f.id !== fileUriOrId
    );
    await saveConvertedFiles(updated);
  } catch (error) {
    console.error('Error removing converted file:', error);
  }
}

/**
 * Update a converted file entry (e.g., after renaming)
 */
export async function updateConvertedFile(
  oldUri: string,
  updatedFile: ScannedFile
): Promise<void> {
  try {
    const files = await getConvertedFiles();
    const index = files.findIndex(
      (f) => f.uri === oldUri || f.id === updatedFile.id
    );
    if (index >= 0) {
      files[index] = updatedFile;
      await saveConvertedFiles(files);
    }
  } catch (error) {
    console.error('Error updating converted file:', error);
  }
}
