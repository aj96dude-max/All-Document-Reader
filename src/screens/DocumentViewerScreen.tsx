import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  Share,
  StatusBar,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
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

  const pdfRef = useRef<any>(null);

  // File states
  const [fileName, setFileName] = useState<string>(file.name || 'Document');
  const [isFavorite, setIsFavorite] = useState<boolean>(false);

  // PDF Page states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // Jump to Page Modal state
  const [isJumpModalVisible, setIsJumpModalVisible] = useState<boolean>(false);
  const [jumpPageInput, setJumpPageInput] = useState<string>('1');

  // Rename Modal state
  const [isRenameModalVisible, setIsRenameModalVisible] = useState<boolean>(false);
  const [renameInput, setRenameInput] = useState<string>(file.name || '');

  // Text file states
  const ext = (file.extension || '').toLowerCase();
  const mime = (file.mimeType || '').toLowerCase();
  const isPdf = ext === 'pdf' || mime === 'application/pdf';
  const isText = ext === 'txt' || mime === 'text/plain';

  const [textContent, setTextContent] = useState<string>('');
  const [loadingText, setLoadingText] = useState<boolean>(isText);
  const [textError, setTextError] = useState<string | null>(null);

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

  // Share handler
  const handleShare = async () => {
    try {
      await Share.share({
        title: fileName,
        message: `Sharing ${fileName}`,
        url: file.uri,
      });
    } catch (error: any) {
      console.log('Error sharing document:', error);
    }
  };

  // Toggle favorite
  const handleToggleFavorite = () => {
    setIsFavorite((prev) => !prev);
  };

  // Open Jump Modal
  const openJumpModal = () => {
    setJumpPageInput(String(currentPage));
    setIsJumpModalVisible(true);
  };

  // Step page number in Jump Modal
  const handlePageStep = (delta: number) => {
    const currentNum = parseInt(jumpPageInput, 10) || currentPage;
    const nextNum = Math.min(Math.max(currentNum + delta, 1), Math.max(totalPages, 1));
    setJumpPageInput(String(nextNum));
  };

  // Confirm Jump to Page
  const handleJumpSubmit = () => {
    const targetPage = parseInt(jumpPageInput, 10);
    if (!isNaN(targetPage) && targetPage >= 1 && targetPage <= totalPages) {
      setCurrentPage(targetPage);
      pdfRef.current?.setPage(targetPage);
      setIsJumpModalVisible(false);
    } else {
      Alert.alert('Invalid Page', `Please enter a page number between 1 and ${totalPages}`);
    }
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
              if (file.uri.startsWith('file://')) {
                const path = decodeURIComponent(file.uri.replace(/^file:\/\//, ''));
                await ReactNativeBlobUtil.fs.unlink(path);
              }
            } catch (err) {
              console.log('Could not unlink file:', err);
            }
            navigation.goBack();
          },
        },
      ]
    );
  };

  // Rename document
  const handleRenameSubmit = () => {
    const trimmed = renameInput.trim();
    if (!trimmed) {
      Alert.alert('Invalid Name', 'Document name cannot be empty');
      return;
    }
    setFileName(trimmed);
    setIsRenameModalVisible(false);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* Top Navigation Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <Image
            source={require('../../Assets/icons/chevron_backward.png')}
            style={styles.headerBackIcon}
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
          {fileName}
        </Text>

        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={handleShare}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <Image
            source={require('../../Assets/icons/share.png')}
            style={styles.headerShareIcon}
          />
        </TouchableOpacity>
      </View>

      {/* Main Content / Viewer Area */}
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
                  source={{ uri: file.uri, cache: true }}
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

                {/* Page Indicator floating badge / bar */}
                <View style={styles.pageIndicatorContainer}>
                  <Text style={styles.pageIndicatorText}>
                    Page {currentPage} of {totalPages}
                  </Text>
                </View>
              </>
            )}
          </View>
        )}

        {isText && (
          <View style={styles.viewerContainer}>
            {loadingText ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#111827" />
                <Text style={styles.loadingText}>Loading text file...</Text>
              </View>
            ) : textError ? (
              <View style={styles.centerContainer}>
                <Text style={styles.errorText}>{textError}</Text>
              </View>
            ) : (
              <ScrollView style={styles.textScroll} contentContainerStyle={styles.textContent}>
                <View style={styles.paperCard}>
                  <Text style={styles.textBody} selectable>
                    {textContent}
                  </Text>
                </View>
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

      {/* Bottom Action Toolbar */}
      <View
        style={[
          styles.bottomToolbar,
          { paddingBottom: Math.max(insets.bottom, 12) },
        ]}
      >
        <TouchableOpacity
          style={styles.toolbarItem}
          onPress={() => {
            setRenameInput(fileName);
            setIsRenameModalVisible(true);
          }}
          activeOpacity={0.7}
        >
          <Image
            source={require('../../Assets/icons/border_color.png')}
            style={styles.toolbarIcon}
          />
          <Text style={styles.toolbarLabel}>Rename</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolbarItem}
          onPress={handleToggleFavorite}
          activeOpacity={0.7}
        >
          <Image
            source={require('../../Assets/icons/heart_minus.png')}
            style={styles.toolbarIcon}
          />
          <Text style={styles.toolbarLabel}>
            {isFavorite ? 'Unfavorite' : 'Favorite'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolbarItem}
          onPress={handleDelete}
          activeOpacity={0.7}
        >
          <Image
            source={require('../../Assets/icons/delete_forever.png')}
            style={styles.toolbarIcon}
          />
          <Text style={styles.toolbarLabel}>Delete</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolbarItem}
          onPress={openJumpModal}
          activeOpacity={0.7}
        >
          <Image
            source={require('../../Assets/icons/search.png')}
            style={styles.toolbarIcon}
          />
          <Text style={styles.toolbarLabel}>Jump to</Text>
        </TouchableOpacity>
      </View>

      {/* Jump To Page Modal (Matching UI design) */}
      <Modal
        visible={isJumpModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsJumpModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsJumpModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View
                style={[
                  styles.jumpModalContainer,
                  { paddingBottom: Math.max(insets.bottom, 24) },
                ]}
              >
                {/* Drag / Top Indicator Bar */}
                <View style={styles.modalHandle} />

                {/* Modal Header Row */}
                <View style={styles.jumpHeaderRow}>
                  <View style={styles.jumpHeaderSpacer} />
                  <Text style={styles.jumpHeaderTitle}>
                    Enter Page {currentPage} of {totalPages}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setIsJumpModalVisible(false)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    activeOpacity={0.7}
                    style={styles.jumpCloseBtn}
                  >
                    <Image
                      source={require('../../Assets/icons/cancel.png')}
                      style={styles.jumpCloseIcon}
                    />
                  </TouchableOpacity>
                </View>

                {/* Page Number Stepper Box */}
                <View style={styles.pageStepperBox}>
                  <TouchableOpacity
                    onPress={() => handlePageStep(-1)}
                    style={styles.stepArrowBtn}
                    activeOpacity={0.6}
                  >
                    <Image
                      source={require('../../Assets/icons/arrow_drop_down.png')}
                      style={styles.stepArrowIcon}
                    />
                  </TouchableOpacity>

                  <TextInput
                    style={styles.pageNumberInput}
                    value={jumpPageInput}
                    onChangeText={setJumpPageInput}
                    keyboardType="number-pad"
                    selectTextOnFocus
                    maxLength={5}
                  />

                  <TouchableOpacity
                    onPress={() => handlePageStep(1)}
                    style={styles.stepArrowBtn}
                    activeOpacity={0.6}
                  >
                    <Image
                      source={require('../../Assets/icons/arrow_drop_down (1).png')}
                      style={styles.stepArrowIcon}
                    />
                  </TouchableOpacity>
                </View>

                {/* Go Button */}
                <TouchableOpacity
                  style={styles.goButton}
                  onPress={handleJumpSubmit}
                  activeOpacity={0.8}
                >
                  <Text style={styles.goButtonText}>Go</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Rename Modal */}
      <Modal
        visible={isRenameModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsRenameModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={() => setIsRenameModalVisible(false)}>
            <View style={styles.modalOverlayContent}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.renameDialog}>
                  <Text style={styles.renameDialogTitle}>Rename Document</Text>
                  <TextInput
                    style={styles.renameTextInput}
                    value={renameInput}
                    onChangeText={setRenameInput}
                    autoFocus
                    selectTextOnFocus
                    placeholder="Document Name"
                    placeholderTextColor="#9CA3AF"
                  />
                  <View style={styles.dialogActionsRow}>
                    <TouchableOpacity
                      style={styles.dialogCancelBtn}
                      onPress={() => setIsRenameModalVisible(false)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.dialogCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.dialogSaveBtn}
                      onPress={handleRenameSubmit}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.dialogSaveText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F5F7',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#F4F5F7',
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBackIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
    tintColor: '#111827',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  headerShareIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
    tintColor: '#111827',
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
  textScroll: {
    flex: 1,
    backgroundColor: '#F4F5F7',
  },
  textContent: {
    padding: 16,
  },
  paperCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 20,
    minHeight: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  textBody: {
    fontSize: 15,
    lineHeight: 22,
    color: '#1F2937',
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
  bottomToolbar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 10,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  toolbarItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  toolbarIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
    tintColor: '#1F2937',
    marginBottom: 4,
  },
  toolbarLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1F2937',
  },
  // Jump to Page Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  jumpModalContainer: {
    backgroundColor: '#F4F5F7',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  modalHandle: {
    width: 64,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 16,
  },
  jumpHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  jumpHeaderSpacer: {
    width: 28,
  },
  jumpHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    flex: 1,
  },
  jumpCloseBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jumpCloseIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  pageStepperBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  stepArrowBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepArrowIcon: {
    width: 14,
    height: 14,
    resizeMode: 'contain',
  },
  pageNumberInput: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    minWidth: 60,
    paddingVertical: 0,
  },
  goButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 13,
    paddingHorizontal: 64,
    alignSelf: 'center',
    marginTop: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  goButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  // Rename Dialog Styles
  modalOverlayContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  renameDialog: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  renameDialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  renameTextInput: {
    height: 48,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    marginBottom: 20,
  },
  dialogActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  dialogCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  dialogCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  dialogSaveBtn: {
    backgroundColor: '#111827',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  dialogSaveText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default DocumentViewerScreen;

