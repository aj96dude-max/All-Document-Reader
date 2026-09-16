import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import Tool from './tool';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/types';

import AllFilesIcon from '../../../Assets/svgicons/All.svg';
import PdfIcon from '../../../Assets/svgicons/pdf.svg';
import WordIcon from '../../../Assets/svgicons/docx.svg';
import ExcelIcon from '../../../Assets/svgicons/xlsx.svg';
import PptIcon from '../../../Assets/svgicons/pptx.svg';
import TxtIcon from '../../../Assets/svgicons/txtx.svg';
import EpubIcon from '../../../Assets/svgicons/epub.svg';
import RtfIcon from '../../../Assets/svgicons/rtf.svg';
import HtmlIcon from '../../../Assets/svgicons/html.svg';
import MdIcon from '../../../Assets/svgicons/md.svg';
import OdfIcon from '../../../Assets/svgicons/odf.svg';
import CsvIcon from '../../../Assets/svgicons/csv.svg';
import ImageIcon from '../../../Assets/svgicons/image.svg';
import PsdIcon from '../../../Assets/svgicons/psd.svg';

import { checkStoragePermission } from '../../services/FileScanner';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type ToolsContainerProps = {
  onRequirePermission?: (onGranted: () => void) => void;
};

const ToolsContainer: React.FC<ToolsContainerProps> = ({ onRequirePermission }) => {
  const navigation = useNavigation<NavigationProp>();

  const handleToolPress = async (fileType: string) => {
    const proceed = () => {
      navigation.navigate('FileList', { fileType });
    };

    if (onRequirePermission) {
      onRequirePermission(proceed);
      return;
    }

    const granted = await checkStoragePermission();
    if (granted) {
      proceed();
    }
  };

  const tools = [
    {
      id: 1,
      title: 'All Files',
      type: 'all',
      icon: AllFilesIcon,
    },
    {
      id: 2,
      title: 'PDF',
      type: 'pdf',
      icon: PdfIcon,
    },
    {
      id: 3,
      title: 'Word',
      type: 'word',
      icon: WordIcon,
    },
    {
      id: 4,
      title: 'Excel',
      type: 'excel',
      icon: ExcelIcon,
    },
    {
      id: 5,
      title: 'PPT',
      type: 'ppt',
      icon: PptIcon,
    },
    {
      id: 6,
      title: 'TXT',
      type: 'txt',
      icon: TxtIcon,
    },
    {
      id: 7,
      title: 'EPUB',
      type: 'epub',
      icon: EpubIcon,
    },
    {
      id: 8,
      title: 'RTF',
      type: 'rtf',
      icon: RtfIcon,
    },
    {
      id: 9,
      title: 'Images',
      type: 'image',
      icon: ImageIcon,
    },
    {
      id: 10,
      title: 'PSD',
      type: 'psd',
      icon: PsdIcon,
    },
    {
      id: 11,
      title: 'SVG',
      type: 'svg',
      icon: ImageIcon,
    },
    {
      id: 12,
      title: 'ODS',
      type: 'ods',
      icon: OdfIcon,
    },
    {
      id: 13,
      title: 'EML',
      type: 'eml',
      icon: TxtIcon,
    },
    {
      id: 14,
      title: 'CBZ',
      type: 'cbz',
      icon: EpubIcon,
    },
    {
      id: 15,
      title: 'CSV',
      type: 'csv',
      icon: CsvIcon,
    },
    {
      id: 16,
      title: 'HTML',
      type: 'html',
      icon: HtmlIcon,
    },
    {
      id: 17,
      title: 'Markdown',
      type: 'md',
      icon: MdIcon,
    },
    {
      id: 18,
      title: 'ODT',
      type: 'odt',
      icon: OdfIcon,
    },
    {
      id: 19,
      title: 'Code',
      type: 'code',
      icon: TxtIcon,
    },
    {
      id: 20,
      title: 'Markup',
      type: 'markup',
      icon: TxtIcon,
    },
    {
      id: 21,
      title: 'ODP',
      type: 'odp',
      icon: OdfIcon,
    },
  ];

  const [showAllTools, setShowAllTools] = useState(false);
  const displayedTools = showAllTools ? tools : tools.slice(0, 7);

  return (
    <View style={styles.container}>
      {displayedTools.map(item => (
        <View key={item.id} style={styles.toolItemWrapper}>
          <Tool
            title={item.title}
            icon={item.icon}
            onPress={() => handleToolPress(item.type)}
          />
        </View>
      ))}
      <View style={styles.toolItemWrapper}>
        <TouchableOpacity style={styles.showMoreButton} onPress={() => setShowAllTools(!showAllTools)}>
          <Text style={styles.showMoreText}>{showAllTools ? 'Show Less' : 'Show More'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 25,
    paddingHorizontal: 6,
    rowGap: 20,
  },
  toolItemWrapper: {
    width: '25%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  showMoreButton: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  showMoreText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#4F46E5',
    textAlign: 'center',
  },
});

export default ToolsContainer;
