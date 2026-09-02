import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import type { ScannedFile } from '../types/types';

const { FileScannerModule } = NativeModules;

/**
 * Request storage permission for Android <= 12 (API 32).
 * Android 13+ does not require runtime permission for MediaStore document queries.
 */
export async function requestStoragePermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }

  // Android 13+ (API 33+): no runtime permission needed for document files via MediaStore
  if (Platform.Version >= 33) {
    return true;
  }

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
  return results;
}
