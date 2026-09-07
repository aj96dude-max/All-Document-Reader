import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/colors';

interface PageIndicatorProps {
  currentPage: number;
  totalPages: number;
}

const PageIndicator: React.FC<PageIndicatorProps> = ({ currentPage, totalPages }) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);
  return (
    <View style={styles.pageIndicatorContainer}>
      <Text style={styles.pageIndicatorText}>
        Page {currentPage} of {totalPages}
      </Text>
    </View>
  );
};

const getStyles = (colors: ColorPalette) => StyleSheet.create({
  pageIndicatorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  pageIndicatorText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
});

export default PageIndicator;
