import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, ScannedFile } from '../types/types';
import FileListItem from '../components/ui/FileListItem';
import FileActionMenuModal from '../components/ui/FileActionMenuModal';
import RenameModal from '../components/viewer/RenameModal';
import { deleteFile, renameFile, shareFile } from '../services/FileScanner';
import {
  getFavorites,
  removeFavorite,
  updateFavoriteFile,
} from '../services/FavoritesService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// --- Formatting Helpers ---

const formatBytes = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const formatDate = (epochMs: number): string => {
  if (!epochMs) return 'Recently';
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
  if (!epochMs) return '';
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

const FavoriteScreen = () => {
  const navigation = useNavigation<NavigationProp>();

  const [favorites, setFavorites] = useState<ScannedFile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // 3-dots Menu & Rename state
  const [selectedFileForMenu, setSelectedFileForMenu] = useState<ScannedFile | null>(null);
  const [menuAnchorPosition, setMenuAnchorPosition] = useState<{ top: number; right: number } | null>(null);
  const [isMenuVisible, setIsMenuVisible] = useState<boolean>(false);
  const [isRenameVisible, setIsRenameVisible] = useState<boolean>(false);
  const [isRenaming, setIsRenaming] = useState<boolean>(false);

  const loadFavorites = useCallback(async (isPullRefresh = false) => {
    if (isPullRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const items = await getFavorites();
      setFavorites(items);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [loadFavorites])
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

  const handleMorePress = (file: ScannedFile, position?: { pageX: number; pageY: number }) => {
    setSelectedFileForMenu(file);
    if (position) {
      setMenuAnchorPosition({ top: position.pageY, right: 24 });
    } else {
      setMenuAnchorPosition(null);
    }
    setIsMenuVisible(true);
  };

  const handleMenuUnfavorite = async () => {
    if (!selectedFileForMenu) return;
    const targetFile = selectedFileForMenu;
    try {
      await removeFavorite(targetFile.uri);
      // Immediately update local state
      setFavorites((prev) => prev.filter((f) => f.uri !== targetFile.uri && f.id !== targetFile.id));
    } catch (err: any) {
      console.error('Unfavorite error:', err);
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
              setFavorites((prev) => prev.filter((f) => f.uri !== targetFile.uri && f.id !== targetFile.id));
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
      await updateFavoriteFile(oldUri, updated);
      setIsRenameVisible(false);
      loadFavorites();
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

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Image
          source={require('../../Assets/home/Empty Folder.png')}
          style={styles.emptyImage}
        />
        <Text style={styles.emptyTitle}>No Favorites Yet!</Text>
        <Text style={styles.emptySubtitle}>
          Open any document and tap the favorite heart icon to access it quickly here.
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {loading && favorites.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#ED1C24" />
          <Text style={styles.loadingText}>Loading favorites…</Text>
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.uri || item.id}
          renderItem={renderItem}
          contentContainerStyle={
            favorites.length === 0 ? styles.emptyListContent : styles.listContent
          }
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadFavorites(true)}
              colors={['#ED1C24']}
              tintColor="#ED1C24"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* 3-Dots Action Menu Modal */}
      <FileActionMenuModal
        visible={isMenuVisible}
        anchorPosition={menuAnchorPosition}
        isFavorite={true}
        onClose={() => setIsMenuVisible(false)}
        onToggleFavorite={handleMenuUnfavorite}
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
    backgroundColor: '#F5F6F8',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyImage: {
    width: 120,
    height: 120,
    marginBottom: 16,
    opacity: 0.6,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
});

export default FavoriteScreen;
