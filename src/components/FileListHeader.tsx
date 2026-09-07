import React from 'react';
import { Image, TouchableOpacity, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ChevronBackwardIcon from '../../Assets/svgicons/chevron_backward.svg';
import { useTheme } from '../theme/ThemeContext';
import { ColorPalette } from '../theme/colors';

type prop = {
  title: string;
  style?: string;
  onBack?: () => void;
};

const FileListHeader = ({ title, onBack }: prop) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

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
          style={[styles.icon as any, { color: colors.icon }]}
        />
      </TouchableOpacity>
      <Text style={styles.title}>{headerTitle}</Text>
    </View>
  );
};

const getStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      marginTop: 16,
      marginBottom: 16,
      alignItems: 'center',
      width: '100%',
      paddingHorizontal: 18,
      justifyContent: 'space-between',
      paddingBottom: 14,
      backgroundColor: colors.background,
    },
    backButton: {
      padding: 0,
    },
    icon: {
      width: 24,
      height: 24,
    },
    title: {
      flex: 1,
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
    },
  });

export default FileListHeader;
