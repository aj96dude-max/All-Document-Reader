import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import Pdf from 'react-native-pdf';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, ScannedFile } from '../types/types';
import { deleteFile, renameFile, shareFile } from '../services/FileScanner';
import {
  isFavorite as checkIsFavorite,
  toggleFavorite as toggleFavoriteStorage,
  removeFavorite,
  updateFavoriteFile,
} from '../services/FavoritesService';

import DocumentHeader from '../components/viewer/DocumentHeader';
import DocumentBottomToolbar from '../components/viewer/DocumentBottomToolbar';
import JumpToPageModal from '../components/viewer/JumpToPageModal';
import RenameModal from '../components/viewer/RenameModal';
import PageIndicator from '../components/viewer/PageIndicator';
import TextDocumentViewer from '../components/viewer/TextDocumentViewer';

type Props = NativeStackScreenProps<RootStackParamList, 'FileViewer'>;

const DocumentViewerScreen: React.FC<Props> = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { file } = route.params;

  const pdfRef = useRef<any>(null);

  // File states
  const [currentFile, setCurrentFile] = useState<ScannedFile>(file);
  const [fileName, setFileName] = useState<string>(file.name || 'Document');
  const [isFavorite, setIsFavorite] = useState<boolean>(false);

  // PDF Page states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Modal states
  const [isJumpModalVisible, setIsJumpModalVisible] = useState<boolean>(false);
  const [isRenameModalVisible, setIsRenameModalVisible] = useState<boolean>(false);
  const [isRenaming, setIsRenaming] = useState<boolean>(false);

  // Text file states
  const ext = (currentFile.extension || '').toLowerCase();
  const mime = (currentFile.mimeType || '').toLowerCase();
  const isPdf = ext === 'pdf' || mime === 'application/pdf';
  const isText = ext === 'txt' || mime === 'text/plain';

  const [textContent, setTextContent] = useState<string>('');
  const [loadingText, setLoadingText] = useState<boolean>(isText);
  const [textError, setTextError] = useState<string | null>(null);

  // Check initial favorite status
  useEffect(() => {
    let isMounted = true;
    const checkStatus = async () => {
      try {
        const fav = await checkIsFavorite(currentFile.uri);
        if (isMounted) {
          setIsFavorite(fav);
        }
      } catch (err) {
        console.error('Error checking favorite status:', err);
      }
    };
    checkStatus();
    return () => {
      isMounted = false;
    };
  }, [currentFile.uri]);

  // Load text file content
  useEffect(() => {
    if (isText) {
      let isMounted = true;
      const loadText = async () => {
        try {
          setLoadingText(true);
          setTextError(null);
          const path = decodeURIComponent(currentFile.uri.replace(/^file:\/\//, ''));
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
  }, [currentFile.uri, isText]);

  // Share handler
  const handleShare = async () => {
    try {
      await shareFile(currentFile.uri, currentFile.mimeType, fileName);
    } catch (error: any) {
      console.log('Error sharing document:', error);
      Alert.alert('Share Failed', error?.message || 'Could not share file');
    }
  };

  // Toggle favorite
  const handleToggleFavorite = async () => {
    try {
      const newStatus = await toggleFavoriteStorage(currentFile);
      setIsFavorite(newStatus);
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
    }
  };

  // Jump to Page
  const handleJumpToPage = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    pdfRef.current?.setPage(pageNumber);
  };

  // Delete document
  const handleDelete = () => {
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete "${fileName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFile(currentFile.uri);
              await removeFavorite(currentFile.uri);
              navigation.goBack();
            } catch (err: any) {
              console.error('Delete error:', err);
              Alert.alert('Delete Failed', err?.message || 'Could not delete file');
            }
          },
        },
      ]
    );
  };

  // Rename document
  const handleRenameSubmit = async (newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) {
      Alert.alert('Invalid Name', 'Document name cannot be empty');
      return;
    }
    try {
      setIsRenaming(true);
      const oldUri = currentFile.uri;
      const updated = await renameFile(oldUri, trimmed);
      if (isFavorite) {
        await updateFavoriteFile(oldUri, updated);
      }
      setCurrentFile(updated);
      setFileName(updated.name);
      setIsRenameModalVisible(false);
    } catch (err: any) {
      console.error('Rename error:', err);
      Alert.alert('Rename Failed', err?.message || 'Could not rename file');
    } finally {
      setIsRenaming(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* Top Header Component */}
      <DocumentHeader
        title={fileName}
        onBack={() => navigation.goBack()}
        onShare={handleShare}
      />

      {/* Main Content Area */}
      <View style={styles.content}>
        {isPdf && (
          <View style={styles.viewerContainer}>
            {pdfError ? (
              <View style={styles.centerContainer}>
                <Text style={styles.errorText}>{pdfError}</Text>
              </View>
            ) : (
              <>
                <Pdf
                  ref={pdfRef}
                  source={{ uri: currentFile.uri, cache: true }}
                  style={styles.pdf}
                  fitPolicy={0}
                  spacing={12}
                  showsHorizontalScrollIndicator={false}
                  showsVerticalScrollIndicator={false}
                  renderActivityIndicator={() => (
                    <View style={styles.centerContainer}>
                      <ActivityIndicator size="large" color="#111827" />
                      <Text style={styles.loadingText}>Loading PDF...</Text>
                    </View>
                  )}
                  onError={(error) => {
                    console.error('PDF error:', error);
                    setPdfError('Failed to load PDF document');
                  }}
                  onLoadComplete={(numberOfPages) => {
                    setTotalPages(numberOfPages);
                  }}
                  onPageChanged={(page, numberOfPages) => {
                    setCurrentPage(page);
                    setTotalPages(numberOfPages);
                  }}
                />

                <PageIndicator
                  currentPage={currentPage}
                  totalPages={totalPages}
                />
              </>
            )}
          </View>
        )}

        {isText && (
          <TextDocumentViewer
            content={textContent}
            loading={loadingText}
            error={textError}
          />
        )}

        {!isPdf && !isText && (
          <View style={styles.centerContainer}>
            <Text style={styles.placeholder}>
              Viewing {ext ? ext.toUpperCase() : 'this'} file format is not supported yet.
            </Text>
          </View>
        )}
      </View>

      {/* Bottom Action Toolbar Component */}
      <DocumentBottomToolbar
        isFavorite={isFavorite}
        bottomInset={insets.bottom}
        onRename={() => setIsRenameModalVisible(true)}
        onToggleFavorite={handleToggleFavorite}
        onDelete={handleDelete}
        onJumpToPage={() => setIsJumpModalVisible(true)}
      />

      {/* Jump To Page Modal Component with Search / Stepper input */}
      <JumpToPageModal
        visible={isJumpModalVisible}
        currentPage={currentPage}
        totalPages={totalPages}
        bottomInset={insets.bottom}
        onClose={() => setIsJumpModalVisible(false)}
        onJump={handleJumpToPage}
      />

      {/* Rename Modal Component */}
      <RenameModal
        visible={isRenameModalVisible}
        initialName={currentFile.name.replace(/\.[^/.]+$/, '') || currentFile.name}
        isRenaming={isRenaming}
        onClose={() => setIsRenameModalVisible(false)}
        onSave={handleRenameSubmit}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F5F7',
  },
  content: {
    flex: 1,
    backgroundColor: '#F4F5F7',
  },
  viewerContainer: {
    flex: 1,
    position: 'relative',
  },
  pdf: {
    flex: 1,
    width: '100%',
    backgroundColor: '#F4F5F7',
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
    color: '#6B7280',
    fontWeight: '500',
  },
  placeholder: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
  },
});

export default DocumentViewerScreen;
