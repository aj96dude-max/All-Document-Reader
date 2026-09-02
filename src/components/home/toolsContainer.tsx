import { StyleSheet, View, Alert } from 'react-native';
import Tool from './tool';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ToolsContainer = () => {
  const navigation = useNavigation<NavigationProp>();
  const tools = [
    {
      id: 1,
      title: 'All Files',
      type: 'all',
      icon: require('../../../Assets/home/allfiles.png'),
    },
    {
      id: 2,
      title: 'PDF',
      type: 'pdf',
      icon: require('../../../Assets/home/pdf.png'),
    },
    {
      id: 3,
      title: 'Word',
      type: 'word',
      icon: require('../../../Assets/home/word.png'),
    },
    {
      id: 4,
      title: 'Excel',
      type: 'excel',
      icon: require('../../../Assets/home/excel.png'),
    },
    {
      id: 5,
      title: 'PPT',
      type: 'ppt',
      icon: require('../../../Assets/home/ppt.png'),
    },
    {
      id: 6,
      title: 'TXT',
      type: 'txt',
      icon: require('../../../Assets/home/txt.png'),
    },
    {
      id: 7,
      title: 'EPUB',
      type: 'epub',
      icon: require('../../../Assets/home/epub.png'),
    },
    {
      id: 8,
      title: 'RTF',
      type: 'rtf',
      icon: require('../../../Assets/home/rtf.png'),
    },
  ];

  const handleToolPress = (title: string) => {
    console.log('Pressed:', title);
  };

  return (
    <View style={styles.container}>
      {tools.map(item => (
        <View key={item.id} style={{ width: '25%' }}>
          <Tool
            title={item.title}
            icon={item.icon}
            onPress={() => {
              navigation.navigate('FileList', { fileType: item.type });
            }}
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
    paddingHorizontal: 20,
    rowGap: 20,
  },
});

export default ToolsContainer;
