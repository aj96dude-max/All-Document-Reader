import { NativeModules, PermissionsAndroid, Platform, Alert } from 'react-native';
import type { ScannedFile } from '../types/types';

const { FileScannerModule } = NativeModules;

/**
 * Request the appropriate storage permission based on Android version:
 * - Android 11+ (API 30+): MANAGE_EXTERNAL_STORAGE (all-files access)
 * - Android 10 and below:  READ_EXTERNAL_STORAGE
 */
export async function requestStoragePermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }

  // Android 11+ (API 30+): use MANAGE_EXTERNAL_STORAGE for full filesystem access
  if (Platform.Version >= 30) {
    try {
      const isGranted: boolean = await FileScannerModule.isAllFilesAccessGranted();
      if (isGranted) {
        return true;
      }

      // Show an explanation dialog before opening the settings screen
      return new Promise<boolean>((resolve) => {
        Alert.alert(
          'All Files Access Required',
          'This app needs access to all files on your device to scan for documents. ' +
          'Please enable "Allow access to manage all files" on the next screen.',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => resolve(false),
            },
            {
              text: 'Open Settings',
              onPress: async () => {
                try {
                  await FileScannerModule.requestAllFilesAccess();
                  // The user has been taken to Settings. We can't know the result
                  // right away, but the next scan attempt will re-check.
                  // For now, re-check after a short delay to give user time to toggle.
                  resolve(true);
                } catch {
                  resolve(false);
                }
              },
            },
          ],
          { cancelable: false },
        );
      });
    } catch {
      // Fall through to legacy permission request
    }
  }

  // Android ≤ 29 (Android 10 and below): request both READ and WRITE external storage
  if (Platform.Version <= 29) {
    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      ]);
      const isReadGranted =
        granted[PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE] ===
        PermissionsAndroid.RESULTS.GRANTED;
      const isWriteGranted =
        granted[PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE] ===
        PermissionsAndroid.RESULTS.GRANTED;
      return isReadGranted && isWriteGranted;
    } catch {
      return false;
    }
  }

  // Android 30 to 32: READ_EXTERNAL_STORAGE
  if (Platform.Version <= 32) {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        {
          title: 'Storage Permission Required',
          message: 'This app needs access to your storage to find documents.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      return false;
    }
  }

  return true;
}

/**
 * Scan the device for documents of a given type using the native FileScannerModule.
 * @param fileType - one of: 'all', 'pdf', 'word', 'excel', 'ppt', 'txt', 'epub', 'rtf'
 */
export async function scanFiles(fileType: string): Promise<ScannedFile[]> {
  if (!FileScannerModule) {
    throw new Error('FileScannerModule is not available. Ensure the native module is linked.');
  }

  const hasPermission = await requestStoragePermission();
  if (!hasPermission) {
    throw new Error('Storage permission was denied.');
  }

  const results: ScannedFile[] = await FileScannerModule.scanFiles(fileType);
  try {
    const { getTrashFiles } = require('./TrashService');
    const trashFiles = await getTrashFiles();
    if (trashFiles && trashFiles.length > 0) {
      const trashUriSet = new Set(trashFiles.map((t: any) => t.uri));
      const trashIdSet = new Set(trashFiles.map((t: any) => t.id));
      return results.filter(
        (f) => !trashUriSet.has(f.uri) && !trashIdSet.has(f.id)
      );
    }
  } catch (e) {
    console.warn('Could not filter trash files from scan results:', e);
  }
  return results;
}

/**
 * Delete a file on storage via the native module.
 * @param uri - file URI or content URI
 */
export async function deleteFile(uri: string): Promise<boolean> {
  if (!FileScannerModule?.deleteFile) {
    throw new Error('FileScannerModule.deleteFile is not available.');
  }
  await requestStoragePermission();
  return await FileScannerModule.deleteFile(uri);
}

/**
 * Rename a file on storage via the native module.
 * @param uri - file URI or content URI
 * @param newName - target file name (with or without extension)
 */
export async function renameFile(uri: string, newName: string): Promise<ScannedFile> {
  if (!FileScannerModule?.renameFile) {
    throw new Error('FileScannerModule.renameFile is not available.');
  }
  await requestStoragePermission();
  return await FileScannerModule.renameFile(uri, newName);
}

/**
 * Share a file as an attachment via native Intent and FileProvider.
 * @param uri - file URI or content URI
 * @param mimeType - file MIME type
 * @param title - file title
 */
export async function shareFile(
  uri: string,
  mimeType?: string,
  title?: string
): Promise<boolean> {
  if (!FileScannerModule?.shareFile) {
    throw new Error('FileScannerModule.shareFile is not available.');
  }
  return await FileScannerModule.shareFile(uri, mimeType || '', title || '');
}

/**
 * Toggle native Keep Screen On (FLAG_KEEP_SCREEN_ON) on the Android window.
 */
export async function setKeepScreenOn(enable: boolean): Promise<boolean> {
  if (Platform.OS !== 'android' || !FileScannerModule?.setKeepScreenOn) {
    return false;
  }
  try {
    return await FileScannerModule.setKeepScreenOn(enable);
  } catch (error) {
    console.error('Error setting keep screen on:', error);
    return false;
  }
}

/**
 * Check if Keep Screen On is currently active on the Android window.
 */
export async function isKeepScreenOn(): Promise<boolean> {
  if (Platform.OS !== 'android' || !FileScannerModule?.isKeepScreenOn) {
    return false;
  }
  try {
    return await FileScannerModule.isKeepScreenOn();
  } catch (error) {
    console.error('Error checking keep screen on:', error);
    return false;
  }
}



