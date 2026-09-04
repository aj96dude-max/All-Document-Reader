import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import EmptyFolderIcon from '../../../Assets/svgicons/Empty Folder.svg';

const EmptyDocState = () => {
  return (
    <View style={styles.container}>
      <EmptyFolderIcon
        width={100}
        height={100}
        style={styles.emptyImage as any}
      />
      <Text style={styles.emptyTitle}>No Recent Documents</Text>
      <Text style={styles.emptySubtitle}>
        Documents you open will automatically appear here.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 40,
    paddingBottom: 40,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyImage: {
    width: 100,
    height: 100,
    marginBottom: 14,
    opacity: 0.6,
    resizeMode: 'contain',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default EmptyDocState;
