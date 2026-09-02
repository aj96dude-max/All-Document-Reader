import React from 'react';

import { StyleSheet, Text, View } from 'react-native';
import Pdf from 'react-native-pdf';

type DocumentViewerScreenProps = {
  name: string;
  type: string;
  uri: string;
};

const DocumentViewerScreen = ({
  route,
  navigation,
}: {
  route: any;
  navigation: any;
}) => {
  const { file } = route.params;

  const isPdf = file.type === 'application/pdf';
  const isText = file.type === 'text/plain';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {file.name}
        </Text>
      </View>

      {isPdf && <Pdf source={{ uri: file.uri }} style={styles.pdf} />}
      {isText && <Text>{file.content}</Text>}
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
});

export default DocumentViewerScreen;
