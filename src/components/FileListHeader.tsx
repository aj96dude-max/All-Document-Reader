import { Image } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type prop = {
  title: string;
  style?: string;
};

const FileListHeader = ({ title }: prop) => {
  const insets = useSafeAreaInsets();

  const getHeaderTitle = (fileType: string): string => {
    switch (fileType.toLowerCase()) {
      case 'all':
        return 'All Files';
      case 'pdf':
        return 'PDF Files';
      case 'word':
        return 'Word Documents';
      case 'excel':
        return 'Excel Files';
      case 'ppt':
        return 'PowerPoint Files';
      case 'txt':
        return 'Text Files';
      case 'epub':
        return 'EPUB Files';
      case 'rtf':
        return 'RTF Files';
      default:
        return 'Files';
    }
  };

  const headerTitle = getHeaderTitle(title);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Image
        source={require('../../Assets/icons/chevron_backward.png')}
        style={styles.icon}
      />
      <Text style={styles.title}>{headerTitle}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginTop: 30,
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 30,
  },
  icon: {
    width: 24,
    height: 24,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    paddingLeft: 50,
  },
});

export default FileListHeader;
