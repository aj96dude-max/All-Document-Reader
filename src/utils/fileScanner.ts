import RNFS from 'react-native-fs';

export type FileData = {
  name: string;
  path: string;
  size: number;
  type: string;
  mtime?: Date;
};

const getExtension = (filename: string) => {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
};

const isValidType = (ext: string, requestedType: string) => {
  if (requestedType === 'all') {
    return ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'epub', 'rtf'].includes(ext);
  }
  
  if (requestedType === 'word') {
    return ['doc', 'docx'].includes(ext);
  }
  
  if (requestedType === 'excel') {
    return ['xls', 'xlsx'].includes(ext);
  }
  
  if (requestedType === 'ppt') {
    return ['ppt', 'pptx'].includes(ext);
  }

  return ext === requestedType;
};

const scanDirectory = async (dirPath: string, requestedType: string): Promise<FileData[]> => {
  let results: FileData[] = [];
  try {
    const items = await RNFS.readDir(dirPath);
    for (const item of items) {
      if (item.isDirectory()) {
        // Skip hidden folders or system folders to avoid deep recursive loops and permission issues
        if (!item.name.startsWith('.') && item.name !== 'Android') {
          try {
            const subResults = await scanDirectory(item.path, requestedType);
            results = results.concat(subResults);
          } catch (e) {
            // Ignore errors for unreadable directories
          }
        }
      } else {
        const ext = getExtension(item.name);
        if (isValidType(ext, requestedType)) {
          results.push({
            name: item.name,
            path: item.path,
            size: item.size,
            type: ext,
            mtime: item.mtime,
          });
        }
      }
    }
  } catch (err) {
    console.log('Error reading directory: ', dirPath, err);
  }
  return results;
};

export const scanDeviceFiles = async (fileType: string): Promise<FileData[]> => {
  // Common paths to scan on Android
  const dirsToScan = [
    RNFS.DownloadDirectoryPath,
    RNFS.DocumentDirectoryPath,
    RNFS.ExternalStorageDirectoryPath,
  ];

  let allFiles: FileData[] = [];
  // Use a Set to avoid duplicates if the paths overlap
  const seenPaths = new Set<string>();

  for (const dir of dirsToScan) {
    if (dir) {
      const files = await scanDirectory(dir, fileType);
      for (const file of files) {
        if (!seenPaths.has(file.path)) {
          seenPaths.add(file.path);
          allFiles.push(file);
        }
      }
    }
  }
  
  return allFiles;
};
