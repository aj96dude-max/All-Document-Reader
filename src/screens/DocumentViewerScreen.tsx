import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import Pdf from 'react-native-pdf';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/types';

type Props = NativeStackScreenProps<RootStackParamList, 'FileViewer'>;

const DocumentViewerScreen = ({ route, navigation }: Props) => {
  const insets = useSafeAreaInsets();
  const { file } = route.params;

  const ext = (file.extension || '').toLowerCase();
  const mime = (file.mimeType || '').toLowerCase();

  const isPdf = ext === 'pdf' || mime === 'application/pdf';
  const isText = ext === 'txt' || mime === 'text/plain';

  // State for text files
  const [textContent, setTextContent] = useState<string>('');
  const [loadingText, setLoadingText] = useState<boolean>(isText);
  const [textError, setTextError] = useState<string | null>(null);

  // State for PDF error / loading
  const [pdfError, setPdfError] = useState<string | null>(null);

  useEffect(() => {
    if (isText) {
      let isMounted = true;
      const loadText = async () => {
        try {
          setLoadingText(true);
          setTextError(null);
          const path = decodeURIComponent(file.uri.replace(/^file:\/\//, ''));
          const data = await ReactNativeBlobUtil.fs.readFile(path, 'utf8');
          if (isMounted) {
            setTextContent(data);
          }
        } catch (err: any) {
          if (isMounted) {
            setTextError(err?.message || 'Failed to read text file');
          }
        } finally {
          if (isMounted) {
            setLoadingText(false);
          }
        }
      };
      loadText();
      return () => {
        isMounted = false;
      };
    }
  }, [file.uri, isText]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top Navigation Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Image
            source={require('../../Assets/icons/chevron_backward.png')}
            style={styles.backIcon}
          />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {file.name}
        </Text>
      </View>

      {/* Main Content Area */}
      <View style={styles.content}>
        {isPdf && (
          <View style={styles.viewerContainer}>
            {pdfError ? (
              <View style={styles.centerContainer}>
                <Text style={styles.errorText}>{pdfError}</Text>
              </View>
            ) : (
              <Pdf
                source={{ uri: file.uri, cache: true }}
                style={styles.pdf}
                renderActivityIndicator={() => (
                  <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#ED1C24" />
                    <Text style={styles.loadingText}>Loading PDF...</Text>
                  </View>
                )}
                onError={(error) => {
                  console.error('PDF error:', error);
                  setPdfError('Failed to load PDF document');
                }}
                onLoadComplete={(numberOfPages) => {
                  console.log(`PDF loaded with ${numberOfPages} pages`);
                }}
              />
            )}
          </View>
        )}

        {isText && (
          <View style={styles.viewerContainer}>
            {loadingText ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#ED1C24" />
                <Text style={styles.loadingText}>Loading text file...</Text>
              </View>
            ) : textError ? (
              <View style={styles.centerContainer}>
                <Text style={styles.errorText}>{textError}</Text>
              </View>
            ) : (
              <ScrollView style={styles.textScroll} contentContainerStyle={styles.textContent}>
                <Text style={styles.textBody} selectable>
                  {textContent}
                </Text>
              </ScrollView>
            )}
          </View>
        )}

        {!isPdf && !isText && (
          <View style={styles.centerContainer}>
            <Text style={styles.placeholder}>
              Viewing {ext ? ext.toUpperCase() : 'this'} file format is not supported yet.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  backIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  content: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
  viewerContainer: {
    flex: 1,
  },
  pdf: {
    flex: 1,
    width: '100%',
    backgroundColor: '#F7F7F7',
  },
  textScroll: {
    flex: 1,
  },
  textContent: {
    padding: 16,
  },
  textBody: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333333',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666666',
  },
  placeholder: {
    fontSize: 15,
    color: '#888888',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#ED1C24',
    textAlign: 'center',
  },
});

export default DocumentViewerScreen;
