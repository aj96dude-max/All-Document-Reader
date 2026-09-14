import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Alert,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import Pdf from 'react-native-pdf';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, ScannedFile } from '../types/types';
import { renameFile, shareFile } from '../services/FileScanner';
import { moveToTrash } from '../services/TrashService';
import {
  isFavorite as checkIsFavorite,
  toggleFavorite as toggleFavoriteStorage,
  updateFavoriteFile,
} from '../services/FavoritesService';
import {
  addRecentDocument,
  updateRecentDocument,
} from '../services/RecentDocumentsService';
import {
  isConvertibleExtension,
  convertToPdf,
} from '../services/DocConverterService';

import AlreadyPdfModal from '../components/ui/AlreadyPdfModal';
import ConvertToPdfModal from '../components/viewer/ConvertToPdfModal';
import DocumentHeader from '../components/viewer/DocumentHeader';
import DocumentBottomToolbar from '../components/viewer/DocumentBottomToolbar';
import JumpToPageModal from '../components/viewer/JumpToPageModal';
import RenameModal from '../components/viewer/RenameModal';
import PageIndicator from '../components/viewer/PageIndicator';
import TextDocumentViewer from '../components/viewer/TextDocumentViewer';
import { useTheme } from '../theme/ThemeContext';
import { ColorPalette } from '../theme/colors';
import { addConvertedFile } from '../services/ConvertedFilesService';
import { saveConvertedPdf } from '../services/DocConverterService';

type Props = NativeStackScreenProps<RootStackParamList, 'FileViewer'>;

const DocumentViewerScreen: React.FC<Props> = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { file } = route.params;

  const pdfRef = useRef<any>(null);

  const { colors, mode } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  // File states
  const [currentFile, setCurrentFile] = useState<ScannedFile>(file);
  const [fileName, setFileName] = useState<string>(file.name || 'Document');
  const [isFavorite, setIsFavorite] = useState<boolean>(false);

  // PDF Page states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Overlay states
  const [isOverlayVisible, setIsOverlayVisible] = useState<boolean>(true);

  // Modal states
  const [isJumpModalVisible, setIsJumpModalVisible] = useState<boolean>(false);
  const [isAlreadyPdfModalVisible, setIsAlreadyPdfModalVisible] = useState<boolean>(false);
  const [isRenameModalVisible, setIsRenameModalVisible] = useState<boolean>(false);
  const [isRenaming, setIsRenaming] = useState<boolean>(false);
  
  // Manual Conversion Modal states
  const [isConvertModalVisible, setIsConvertModalVisible] = useState<boolean>(false);
  const [convertStatus, setConvertStatus] = useState<'converting' | 'success'>('converting');

  // Text file states
  const ext = (currentFile.extension || '').toLowerCase();
  const mime = (currentFile.mimeType || '').toLowerCase();
  const isPdf = ext === 'pdf' || mime === 'application/pdf';
  const isText = ext === 'txt' || mime === 'text/plain';
  const isXlsx = ['xlsx', 'xls', 'csv', 'tsv'].includes(ext);
  const needsConversion = !isPdf && !isText && isConvertibleExtension(ext);

  const [textContent, setTextContent] = useState<string>('');
  const [loadingText, setLoadingText] = useState<boolean>(isText);
  const [textError, setTextError] = useState<string | null>(null);

  // Conversion states
  const [isConverting, setIsConverting] = useState<boolean>(needsConversion);
  const [convertedPdfPath, setConvertedPdfPath] = useState<string | null>(null);
  const [conversionError, setConversionError] = useState<string | null>(null);

  // Record into Recent Documents & Check initial favorite status
  useEffect(() => {
    let isMounted = true;
    const initFile = async () => {
      try {
        await addRecentDocument(currentFile);
        const fav = await checkIsFavorite(currentFile.uri);
        if (isMounted) {
          setIsFavorite(fav);
        }
      } catch (err) {
        console.error('Error initializing document viewer:', err);
      }
    };
    initFile();
    return () => {
      isMounted = false;
    };
  }, [currentFile]);

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

  // Convert document to PDF for in-app viewing
  useEffect(() => {
    if (needsConversion) {
      let isMounted = true;
      const runConversion = async () => {
        try {
          setIsConverting(true);
          setConversionError(null);
          const pdfPath = await convertToPdf(currentFile.uri, currentFile.name);
          if (isMounted) {
            setConvertedPdfPath(pdfPath);
          }
        } catch (err: any) {
          console.error('Document conversion error:', err);
          if (isMounted) {
            setConversionError(
              err?.message || `Failed to convert ${ext.toUpperCase()} file to PDF`
            );
          }
        } finally {
          if (isMounted) {
            setIsConverting(false);
          }
        }
      };
      runConversion();
      return () => {
        isMounted = false;
      };
    }
  }, [currentFile.uri, currentFile.name, needsConversion, ext]);

  // Determine the PDF source URI for the viewer
  const pdfSourceUri = isPdf
    ? currentFile.uri
    : convertedPdfPath
      ? `file://${convertedPdfPath}`
      : null;

  // Whether we should show the PDF viewer
  const showPdfViewer = isPdf || (needsConversion && convertedPdfPath && !conversionError);

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
      await updateRecentDocument(oldUri, updated);
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

  // Convert to PDF manually
  const handleConvertToPdf = async () => {
    setIsConvertModalVisible(true);
    setConvertStatus('converting');
    try {
      const permanentPath = await saveConvertedPdf(currentFile.uri, currentFile.name);
      
      const newName = currentFile.name.replace(/\.[^/.]+$/, '') + '.pdf';
      const convertedFile: ScannedFile = {
        ...currentFile,
        id: permanentPath,
        uri: `file://${permanentPath}`,
        name: newName,
        extension: 'pdf',
        mimeType: 'application/pdf',
      };
      
      await addConvertedFile(convertedFile);
      
      setConvertStatus('success');
    } catch (error: any) {
      setIsConvertModalVisible(false);
      Alert.alert('Conversion Failed', error?.message || 'Could not save converted PDF');
    }
  };

  const handleToolbarConvert = () => {
    if (isPdf) {
      setIsAlreadyPdfModalVisible(true);
    } else {
      handleConvertToPdf();
    }
  };

  return (
    <View style={[styles.container, { paddingTop: isOverlayVisible ? insets.top : 0 }]}>
      <StatusBar hidden={!isOverlayVisible} barStyle={mode === 'dark' || (mode === 'system' && colors.background === '#141414') ? 'light-content' : 'dark-content'} />

      {/* Top Header Component - Overlay */}
      {isOverlayVisible && (
        <View style={styles.headerWrapper}>
          <DocumentHeader
            title={fileName}
            isPdf={isPdf}
            onBack={() => navigation.goBack()}
            onShare={handleShare}
          />
        </View>
      )}

      {/* Main Content Area */}
      <View style={styles.content}>
        {/* Conversion loading state */}
        {isConverting && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#111827" />
            <Text style={styles.loadingText}>
              Converting {ext.toUpperCase()} to PDF…
            </Text>
            <Text style={styles.convertingSubtext}>
              This may take a moment for large files
            </Text>
          </View>
        )}

        {/* Conversion error state */}
        {conversionError && !isConverting && (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>{conversionError}</Text>
          </View>
        )}

        {/* PDF Viewer — for native PDFs and successfully converted documents */}
        {showPdfViewer && !isConverting && pdfSourceUri && (
          <View style={styles.viewerContainer}>
            {pdfError ? (
              <View style={styles.centerContainer}>
                <Text style={styles.errorText}>{pdfError}</Text>
              </View>
            ) : (
              <>
                <Pdf
                  ref={pdfRef}
                  source={{ uri: pdfSourceUri, cache: true }}
                  style={styles.pdf}
                  fitPolicy={isXlsx ? 2 : 0}
                  spacing={12}
                  showsHorizontalScrollIndicator={false}
                  showsVerticalScrollIndicator={false}
                  onPageSingleTap={() => setIsOverlayVisible(prev => !prev)}
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

                {/* Page Indicator always below PDF but clickable to jump */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setIsJumpModalVisible(true)}
                  style={[styles.pageIndicatorWrapper, { paddingBottom: !isOverlayVisible ? Math.max(insets.bottom, 12) : 0 }]}
                >
                  <PageIndicator
                    currentPage={currentPage}
                    totalPages={totalPages}
                  />
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* Text file viewer */}
        {isText && (
          <TouchableOpacity 
            activeOpacity={1} 
            style={styles.viewerContainer} 
            onPress={() => setIsOverlayVisible(prev => !prev)}
          >
            <TextDocumentViewer
              content={textContent}
              loading={loadingText}
              error={textError}
            />
          </TouchableOpacity>
        )}

        {/* Truly unsupported format (not PDF, not text, not convertible) */}
        {!isPdf && !isText && !needsConversion && (
          <View style={styles.centerContainer}>
            <Text style={styles.placeholder}>
              Viewing {ext ? ext.toUpperCase() : 'this'} file format is not supported yet.
            </Text>
          </View>
        )}
      </View>

      {/* Bottom Action Toolbar Component - Overlay */}
      {isOverlayVisible && (
        <View style={styles.bottomToolbarWrapper}>
          <DocumentBottomToolbar
            isFavorite={isFavorite}
            bottomInset={insets.bottom}
            onRename={() => setIsRenameModalVisible(true)}
            onConvert={handleToolbarConvert}
            onToggleFavorite={handleToggleFavorite}
            onJumpToPage={() => setIsJumpModalVisible(true)}
          />
        </View>
      )}

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

      <AlreadyPdfModal
        visible={isAlreadyPdfModalVisible}
        onClose={() => setIsAlreadyPdfModalVisible(false)}
      />

      {/* Convert To PDF Modal Component */}
      <ConvertToPdfModal
        visible={isConvertModalVisible}
        status={convertStatus}
        onClose={() => setIsConvertModalVisible(false)}
      />
    </View>
  );
};

const getStyles = (colors: ColorPalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerWrapper: {
    backgroundColor: colors.background,
    zIndex: 10,
  },
  bottomToolbarWrapper: {
    backgroundColor: colors.surfaceElevated,
    zIndex: 10,
  },
  content: {
    flex: 1,
    backgroundColor: colors.background,
  },
  viewerContainer: {
    flex: 1,
    position: 'relative',
  },
  pdf: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.background,
  },
  pageIndicatorWrapper: {
    width: '100%',
    backgroundColor: colors.background,
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
    color: colors.textSecondary,
    fontWeight: '500',
  },
  convertingSubtext: {
    marginTop: 6,
    fontSize: 12,
    color: colors.textSecondary,
  },
  placeholder: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: colors.primary,
    textAlign: 'center',
  },
});

export default DocumentViewerScreen;
