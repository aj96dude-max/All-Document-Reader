import React from 'react';

import { StyleSheet, Text, View } from 'react-native';
import Pdf from 'react-native-pdf';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/types';

type Props = NativeStackScreenProps<RootStackParamList, 'FileViewer'>;

const DocumentViewerScreen = ({ route }: Props) => {
  const { file } = route.params;

  const isPdf = file.mimeType === 'application/pdf';
  const isText = file.mimeType === 'text/plain';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {file.name}
        </Text>
      </View>

      {isPdf && <Pdf source={{ uri: file.uri }} style={styles.pdf} />}
      {isText && (
        <View style={styles.textContainer}>
          <Text style={styles.placeholder}>
            Text file viewer coming soon.
          </Text>
        </View>
      )}
      {!isPdf && !isText && (
        <View style={styles.textContainer}>
          <Text style={styles.placeholder}>
            This file format is not supported for viewing yet.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    height: 60,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },

  title: {
    fontSize: 18,
    fontWeight: '600',
  },

  pdf: {
    flex: 1,
    width: '100%',
  },

  textContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  placeholder: {
    fontSize: 14,
    color: '#999',
  },
});

export default DocumentViewerScreen;

