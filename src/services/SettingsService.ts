import { NativeModules, Platform } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';

const { FileScannerModule } = NativeModules;

const SETTINGS_FILE_PATH = `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/app_settings.json`;

export interface AppSettings {
  keepScreenOn: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  keepScreenOn: true,
};

/**
 * Apply native Keep Screen On flag using Android WindowManager
 */
export async function applyKeepScreenOn(enable: boolean): Promise<boolean> {
  if (Platform.OS === 'android' && FileScannerModule?.setKeepScreenOn) {
    try {
      const result = await FileScannerModule.setKeepScreenOn(enable);
      return Boolean(result);
    } catch (e) {
      console.warn('Could not apply keep screen on flag:', e);
      return false;
    }
  }
  return false;
}

/**
 * Check if native keep screen on is active
 */
export async function isNativeKeepScreenOn(): Promise<boolean> {
  if (Platform.OS === 'android' && FileScannerModule?.isKeepScreenOn) {
    try {
      return await FileScannerModule.isKeepScreenOn();
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Load settings from persistent storage
 */
export async function getAppSettings(): Promise<AppSettings> {
  try {
    const exists = await ReactNativeBlobUtil.fs.exists(SETTINGS_FILE_PATH);
    if (!exists) {
      return DEFAULT_SETTINGS;
    }
    const content = await ReactNativeBlobUtil.fs.readFile(SETTINGS_FILE_PATH, 'utf8');
    if (!content || !content.trim()) {
      return DEFAULT_SETTINGS;
    }
    const parsed = JSON.parse(content);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (error) {
    console.error('Error loading settings:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save settings to persistent storage and apply native side-effects
 */
export async function saveAppSettings(
  settings: Partial<AppSettings>
): Promise<AppSettings> {
  try {
    const current = await getAppSettings();
    const updated: AppSettings = { ...current, ...settings };
    const jsonString = JSON.stringify(updated);
    await ReactNativeBlobUtil.fs.writeFile(SETTINGS_FILE_PATH, jsonString, 'utf8');

    if (settings.keepScreenOn !== undefined) {
      await applyKeepScreenOn(settings.keepScreenOn);
    }

    return updated;
  } catch (error) {
    console.error('Error saving settings:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Initialize settings on app start
 */
export async function initSettings(): Promise<AppSettings> {
  const settings = await getAppSettings();
  await applyKeepScreenOn(settings.keepScreenOn);
  return settings;
}
