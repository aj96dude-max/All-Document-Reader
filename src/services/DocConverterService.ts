import { NativeModules, Platform } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';

const { DocConverterModule } = NativeModules;

/**
 * Extensions that require conversion to PDF for in-app viewing.
 * These are formats the W2P OfflineDocConverter can process.
 * PDF and TXT are excluded because they already have native viewers.
 */
export const CONVERTIBLE_EXTENSIONS = [
  'docx',
  'pptx',
  'xlsx',
  'epub',
  'rtf',
  'md',
  'doc',
  'ppt',
  'xls',
  'csv',
  'tsv',
  'json',
  'xml',
  'tex',
  'jpg',
  'png',
  'webp',
  'gif',
  'bmp',
  'java',
  'kt',
  'py',
  'c',
  'cpp',
  'html',
  'js',
  'css',
  'yaml',
  'yml',
  'sh',
  'swift',
  'rb',
  'go',
  'rs',
  'php',
  'psd',
  'svg',
];

/**
 * Directory where converted PDFs are cached.
 */
const CACHE_DIR = `${ReactNativeBlobUtil.fs.dirs.CacheDir}/converted_pdfs`;

/**
 * Directory where permanently saved converted PDFs are stored.
 */
const PERMANENT_DIR = `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/ConvertedFiles`;

/**
 * Check if a file extension needs conversion (i.e., is not natively viewable as PDF/TXT).
 */
export function isConvertibleExtension(extension: string): boolean {
  return CONVERTIBLE_EXTENSIONS.includes((extension || '').toLowerCase());
}

/**
 * Generate a stable cache key for a given file URI and name.
 * Uses a simple hash to avoid filesystem-unfriendly characters in content:// URIs.
 */
function getCacheKey(uri: string, fileName: string): string {
  // Simple string hash for cache key stability
  let hash = 0;
  for (let i = 0; i < uri.length; i++) {
    const char = uri.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  const baseName = fileName
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${baseName}_${Math.abs(hash)}_v9`;
}

/**
 * Get the cached PDF path for a source file, or null if not cached.
 */
async function getCachedPdf(
  uri: string,
  fileName: string,
): Promise<string | null> {
  try {
    const key = getCacheKey(uri, fileName);
    const cachedPath = `${CACHE_DIR}/${key}.pdf`;
    const exists = await ReactNativeBlobUtil.fs.exists(cachedPath);
    return exists ? cachedPath : null;
  } catch {
    return null;
  }
}

/**
 * Convert a document to PDF using the native OfflineDocConverter.
 *
 * Uses a file-based cache so repeated opens of the same file don't
 * trigger re-conversion. The cache key is derived from the file URI.
 *
 * @param inputUri  content:// URI of the source document
 * @param fileName  display name of the file (used for cache key + output naming)
 * @returns         absolute file path to the generated (or cached) PDF
 */
export async function convertToPdf(
  inputUri: string,
  fileName: string,
): Promise<string> {
  if (Platform.OS !== 'android') {
    throw new Error('Document conversion is only available on Android.');
  }

  if (!DocConverterModule?.convertToPdf) {
    throw new Error(
      'DocConverterModule.convertToPdf is not available. Ensure the native module is linked.',
    );
  }

  // Check cache first
  const cached = await getCachedPdf(inputUri, fileName);
  if (cached) {
    return cached;
  }

  // Ensure cache directory exists
  const dirExists = await ReactNativeBlobUtil.fs.exists(CACHE_DIR);
  if (!dirExists) {
    await ReactNativeBlobUtil.fs.mkdir(CACHE_DIR);
  }

  // Generate output path
  const key = getCacheKey(inputUri, fileName);
  const outputPath = `${CACHE_DIR}/${key}.pdf`;

  // Perform conversion via native module
  const resultPath: string = await DocConverterModule.convertToPdf(
    inputUri,
    outputPath,
  );
  return resultPath;
}

/**
 * Clear all cached converted PDFs.
 * Useful for freeing storage or after app updates.
 */
export async function clearConversionCache(): Promise<void> {
  try {
    const exists = await ReactNativeBlobUtil.fs.exists(CACHE_DIR);
    if (exists) {
      await ReactNativeBlobUtil.fs.unlink(CACHE_DIR);
    }
  } catch (error) {
    console.error('Failed to clear conversion cache:', error);
  }
}

/**
 * Save a converted PDF permanently.
 * Converts the file (or uses cache) and copies it to the permanent directory.
 * @returns the absolute file path of the permanently saved PDF.
 */
export async function saveConvertedPdf(
  inputUri: string,
  fileName: string,
): Promise<string> {
  const cachedPath = await convertToPdf(inputUri, fileName);

  const dirExists = await ReactNativeBlobUtil.fs.exists(PERMANENT_DIR);
  if (!dirExists) {
    await ReactNativeBlobUtil.fs.mkdir(PERMANENT_DIR);
  }

  const key = getCacheKey(inputUri, fileName);
  const permanentPath = `${PERMANENT_DIR}/${key}.pdf`;

  const exists = await ReactNativeBlobUtil.fs.exists(permanentPath);
  if (!exists) {
    await ReactNativeBlobUtil.fs.cp(cachedPath, permanentPath);
  }

  return permanentPath;
}
