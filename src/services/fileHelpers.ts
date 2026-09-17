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

import PdfCircleIcon from '../../Assets/svgicons/pdf_circle.svg';
import WordCircleIcon from '../../Assets/svgicons/word_circle.svg';
import ExcelCircleIcon from '../../Assets/svgicons/xlsx_circle.svg';
import PptCircleIcon from '../../Assets/svgicons/pptx_circle.svg';
import TxtIcon from '../../Assets/svgicons/txtx.svg';
import EpubIcon from '../../Assets/svgicons/epub.svg';
import RtfIcon from '../../Assets/svgicons/rtf.svg';
import AllFilesIcon from '../../Assets/svgicons/All.svg';
import React from 'react';
import { SvgProps } from 'react-native-svg';

export const getIconForExtension = (ext: string): React.FC<SvgProps> => {
  switch ((ext || '').toLowerCase()) {
    case 'pdf':
      return PdfCircleIcon;
    case 'doc':
    case 'docx':
      return WordCircleIcon;
    case 'xls':
    case 'xlsx':
      return ExcelCircleIcon;
    case 'ppt':
    case 'pptx':
      return PptCircleIcon;
    case 'txt':
      return TxtIcon;
    case 'epub':
      return EpubIcon;
    case 'rtf':
      return RtfIcon;
    default:
      return AllFilesIcon;
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
