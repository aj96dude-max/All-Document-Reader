import { StyleSheet, View } from 'react-native';
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
  ];

  return (
    <View style={styles.container}>
      {tools.map(item => (
        <View key={item.id} style={styles.toolItemWrapper}>
          <Tool
            title={item.title}
            icon={item.icon}
            onPress={() => handleToolPress(item.type)}
          />
        </View>
      ))}
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
});

export default ToolsContainer;
