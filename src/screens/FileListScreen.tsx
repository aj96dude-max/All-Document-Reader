import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  Text,
  Image,
  StatusBar,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList, ScannedFile } from '../types/types';
import FileListHeader from '../components/FileListHeader';
import FileListItem from '../components/ui/FileListItem';
import FileActionMenuModal from '../components/ui/FileActionMenuModal';
import RenameModal from '../components/viewer/RenameModal';
import { scanFiles, deleteFile, renameFile, shareFile } from '../services/FileScanner';
import {
  isFavorite as checkIsFavorite,
  toggleFavorite,
  removeFavorite,
  updateFavoriteFile,
} from '../services/FavoritesService';

type Props = NativeStackScreenProps<RootStackParamList, 'FileList'>;

// --- Helpers ---

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const formatDate = (epochMs: number): string => {
  const date = new Date(epochMs);
  const now = new Date();
  if (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  ) {
    return 'Today';
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  ) {
    return 'Yesterday';
  }
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatTime = (epochMs: number): string => {
  const date = new Date(epochMs);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const getIconForExtension = (ext: string) => {
  switch ((ext || '').toLowerCase()) {
    case 'pdf':
      return require('../../Assets/home/pdf.png');
    case 'doc':
    case 'docx':
      return require('../../Assets/home/word.png');
    case 'xls':
    case 'xlsx':
      return require('../../Assets/home/excel.png');
    case 'ppt':
    case 'pptx':
      return require('../../Assets/home/ppt.png');
    case 'txt':
      return require('../../Assets/home/txt.png');
    case 'epub':
      return require('../../Assets/home/epub.png');
    case 'rtf':
      return require('../../Assets/home/rtf.png');
    default:
      return require('../../Assets/home/allfiles.png');
  }
};

const getBgColorForExtension = (ext: string): string => {
  switch ((ext || '').toLowerCase()) {
    case 'pdf':
      return '#FFE5E7';
    case 'doc':
    case 'docx':
      return '#DBEAFE';
    case 'xls':
    case 'xlsx':
      return '#D1FAE5';
    case 'ppt':
    case 'pptx':
      return '#FFEDD5';
    case 'txt':
      return '#E2E8F0';
    case 'epub':
      return '#EDE9FE';
    case 'rtf':
      return '#FCE7F3';
    default:
      return '#F3F4F6';
  }
};

const UNSUPPORTED_VIEWER_EXTENSIONS = ['ppt', 'pptx', 'doc', 'docx', 'xls', 'xlsx'];

// --- Component ---

const FileListScreen = ({ route, navigation }: Props) => {
  const { fileType } = route.params;
  const [files, setFiles] = useState<ScannedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 3-dots Menu & Rename state
  const [selectedFileForMenu, setSelectedFileForMenu] = useState<ScannedFile | null>(null);
  const [selectedFileIsFavorite, setSelectedFileIsFavorite] = useState<boolean>(false);
  const [menuAnchorPosition, setMenuAnchorPosition] = useState<{ top: number; right: number } | null>(null);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isRenameVisible, setIsRenameVisible] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await scanFiles(fileType);
      console.log(`Scanned ${result.length} ${fileType} files.`);
      setFiles(result);
    } catch (e: any) {
      console.error('Error scanning files:', e);
      setError(e.message || 'Failed to scan files.');
    } finally {
      setLoading(false);
    }
  }, [fileType]);

  useFocusEffect(
    useCallback(() => {
      loadFiles();
    }, [loadFiles])
  );

  const handleFilePress = (file: ScannedFile) => {
    if (UNSUPPORTED_VIEWER_EXTENSIONS.includes((file.extension || '').toLowerCase())) {
      Alert.alert(
        'Unsupported Format',
        `Viewing ${file.extension.toUpperCase()} files is not supported yet.`
      );
      return;
    }
    navigation.navigate('FileViewer', { file });
  };

  const handleMorePress = async (file: ScannedFile, position?: { pageX: number; pageY: number }) => {
    setSelectedFileForMenu(file);
    const isFav = await checkIsFavorite(file.uri);
    setSelectedFileIsFavorite(isFav);
    if (position) {
      setMenuAnchorPosition({ top: position.pageY, right: 24 });
    } else {
      setMenuAnchorPosition(null);
    }
    setIsMenuVisible(true);
  };

  const handleToggleFavorite = async () => {
    if (!selectedFileForMenu) return;
    try {
      const newStatus = await toggleFavorite(selectedFileForMenu);
      setSelectedFileIsFavorite(newStatus);
    } catch (err: any) {
      console.error('Toggle favorite error:', err);
    }
  };

  const handleMenuShare = async () => {
    if (!selectedFileForMenu) return;
    try {
      await shareFile(
        selectedFileForMenu.uri,
        selectedFileForMenu.mimeType,
        selectedFileForMenu.name
      );
    } catch (err: any) {
      Alert.alert('Share Failed', err?.message || 'Could not share file');
    }
  };

  const handleMenuDelete = () => {
    if (!selectedFileForMenu) return;
    const targetFile = selectedFileForMenu;
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete "${targetFile.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFile(targetFile.uri);
              await removeFavorite(targetFile.uri);
              loadFiles();
            } catch (err: any) {
              Alert.alert('Delete Failed', err?.message || 'Could not delete file');
            }
          },
        },
      ]
    );
  };

  const handleRenameSave = async (newName: string) => {
    if (!selectedFileForMenu) return;
    const trimmed = newName.trim();
    if (!trimmed) {
      Alert.alert('Invalid Name', 'Document name cannot be empty');
      return;
    }
    try {
      setIsRenaming(true);
      const oldUri = selectedFileForMenu.uri;
      const updated = await renameFile(oldUri, trimmed);
      if (selectedFileIsFavorite) {
        await updateFavoriteFile(oldUri, updated);
      }
      setIsRenameVisible(false);
      loadFiles();
    } catch (err: any) {
      Alert.alert('Rename Failed', err?.message || 'Could not rename file');
    } finally {
      setIsRenaming(false);
    }
  };

  const renderItem = ({ item }: { item: ScannedFile }) => (
    <FileListItem
      name={item.name}
      size={formatBytes(item.size)}
      date={formatDate(item.modifiedDate)}
      time={formatTime(item.modifiedDate)}
      icon={getIconForExtension(item.extension)}
      iconBgColor={getBgColorForExtension(item.extension)}
      onPress={() => handleFilePress(item)}
      onMorePress={(pos) => handleMorePress(item, pos)}
    />
  );

  const renderEmpty = () => (
    <View style={styles.center}>
      <Image
        source={require('../../Assets/home/Empty Folder.png')}
        style={styles.emptyImage}
      />
      <Text style={styles.emptyText}>No Documents Yet!</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <FileListHeader title={fileType} onBack={() => navigation.goBack()} />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#ED1C24" />
          <Text style={styles.loadingText}>Scanning device…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={files}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={
            files.length === 0 ? styles.emptyContainer : styles.listContent
          }
          ListEmptyComponent={renderEmpty}
        />
      )}

      {/* 3-Dots Action Menu Modal */}
      <FileActionMenuModal
        visible={isMenuVisible}
        anchorPosition={menuAnchorPosition}
        isFavorite={selectedFileIsFavorite}
        onClose={() => setIsMenuVisible(false)}
        onToggleFavorite={handleToggleFavorite}
        onRename={() => setIsRenameVisible(true)}
        onDelete={handleMenuDelete}
        onShare={handleMenuShare}
      />

      {/* Rename Modal */}
      <RenameModal
        visible={isRenameVisible}
        initialName={
          selectedFileForMenu
            ? selectedFileForMenu.name.replace(/\.[^/.]+$/, '') || selectedFileForMenu.name
            : ''
        }
        isRenaming={isRenaming}
        onClose={() => setIsRenameVisible(false)}
        onSave={handleRenameSave}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyImage: {
    width: 120,
    height: 120,
    marginBottom: 16,
    opacity: 0.6,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  errorText: {
    fontSize: 14,
    color: '#ED1C24',
    textAlign: 'center',
  },
});

export default FileListScreen;
