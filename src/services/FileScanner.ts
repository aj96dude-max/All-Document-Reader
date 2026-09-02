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

  // Android ≤ 12 (API ≤ 32): use READ_EXTERNAL_STORAGE
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
  return results;
}
