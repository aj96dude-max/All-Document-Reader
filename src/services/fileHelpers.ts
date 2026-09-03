import { ImageSourcePropType } from 'react-native';

export const UNSUPPORTED_VIEWER_EXTENSIONS = [
  'ppt',
  'pptx',
  'doc',
  'docx',
  'xls',
  'xlsx',
];

export const formatBytes = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const formatDate = (epochMs: number): string => {
  if (!epochMs) return 'Recently';
  const date = new Date(epochMs);
  const now = new Date();
  if (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  ) {
    return 'Today';
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  ) {
    return 'Yesterday';
  }
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const formatTime = (epochMs: number): string => {
  if (!epochMs) return '';
  const date = new Date(epochMs);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const getIconForExtension = (ext: string): ImageSourcePropType => {
  switch ((ext || '').toLowerCase()) {
    case 'pdf':
      return require('../../Assets/home/pdf.png');
    case 'doc':
    case 'docx':
      return require('../../Assets/home/word.png');
    case 'xls':
    case 'xlsx':
      return require('../../Assets/home/excel.png');
    case 'ppt':
    case 'pptx':
      return require('../../Assets/home/ppt.png');
    case 'txt':
      return require('../../Assets/home/txt.png');
    case 'epub':
      return require('../../Assets/home/epub.png');
    case 'rtf':
      return require('../../Assets/home/rtf.png');
    default:
      return require('../../Assets/home/allfiles.png');
  }
};

export const getBgColorForExtension = (ext: string): string => {
  switch ((ext || '').toLowerCase()) {
    case 'pdf':
      return '#FFE5E7';
    case 'doc':
    case 'docx':
      return '#DBEAFE';
    case 'xls':
    case 'xlsx':
      return '#D1FAE5';
    case 'ppt':
    case 'pptx':
      return '#FFEDD5';
    case 'txt':
      return '#E2E8F0';
    case 'epub':
      return '#EDE9FE';
    case 'rtf':
      return '#FCE7F3';
    default:
      return '#F3F4F6';
  }
};
