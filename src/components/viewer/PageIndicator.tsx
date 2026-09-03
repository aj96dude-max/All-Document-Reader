import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface PageIndicatorProps {
  currentPage: number;
  totalPages: number;
}

const PageIndicator: React.FC<PageIndicatorProps> = ({ currentPage, totalPages }) => {
  return (
    <View style={styles.pageIndicatorContainer}>
      <Text style={styles.pageIndicatorText}>
        Page {currentPage} of {totalPages}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  pageIndicatorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  pageIndicatorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
});

export default PageIndicator;
