import { Image, TouchableOpacity, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ChevronBackwardIcon from '../../Assets/svgicons/chevron_backward.svg';

type prop = {
  title: string;
  style?: string;
  onBack?: () => void;
};

const FileListHeader = ({ title, onBack }: prop) => {
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
      <TouchableOpacity
        onPress={onBack}
        style={styles.backButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <ChevronBackwardIcon
          width={24}
          height={24}
          style={styles.icon as any}
        />
      </TouchableOpacity>
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
  backButton: {
    padding: 4,
    marginRight: 10,
  },
  icon: {
    width: 24,
    height: 24,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default FileListHeader;
