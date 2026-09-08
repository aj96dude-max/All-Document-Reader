import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StatusBar,
  AppState,
  AppStateStatus,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, ScannedFile } from '../types/types';
import FileListItem from '../components/ui/FileListItem';
import FileActionMenuModal from '../components/ui/FileActionMenuModal';
import RenameModal from '../components/viewer/RenameModal';
import FilePermissionModal from '../components/ui/FilePermissionModal';
import {
  renameFile,
  shareFile,
  checkStoragePermission,
  requestStoragePermission,
} from '../services/FileScanner';
import { moveToTrash } from '../services/TrashService';
import {
  getConvertedFiles,
  removeConvertedFile,
  updateConvertedFile,
} from '../services/ConvertedFilesService';
import {
  addRecentDocument,
  updateRecentDocument,
} from '../services/RecentDocumentsService';
import {
  formatBytes,
  formatDate,
  formatTime,
  getIconForExtension,
} from '../services/fileHelpers';
import { toggleFavorite } from '../services/FavoritesService';

import EmptyFolderIcon from '../../Assets/svgicons/Empty Folder.svg';
import { useTheme } from '../theme/ThemeContext';
import { ColorPalette } from '../theme/colors';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ConvertedFilesScreen = () => {
  const navigation = useNavigation<NavigationProp>();

  const [files, setFiles] = useState<ScannedFile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const { colors, mode } = useTheme();
  const styles = React.useMemo(() => getStyles(colors, mode), [colors, mode]);

  // Permission state
  const [isPermissionModalVisible, setIsPermissionModalVisible] = useState<boolean>(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  // 3-dots Menu & Rename state
  const [selectedFileForMenu, setSelectedFileForMenu] = useState<ScannedFile | null>(null);
  const [menuAnchorPosition, setMenuAnchorPosition] = useState<{ top: number; right: number } | null>(null);
  const [isMenuVisible, setIsMenuVisible] = useState<boolean>(false);
  const [isRenameVisible, setIsRenameVisible] = useState<boolean>(false);
  const [isRenaming, setIsRenaming] = useState<boolean>(false);

  const loadFiles = useCallback(async (isPullRefresh = false) => {
    if (isPullRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const items = await getConvertedFiles();
      setFiles(items);
    } catch (error) {
      console.error('Error loading converted files:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFiles();
    }, [loadFiles])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      async (nextState: AppStateStatus) => {
        if (nextState === 'active') {
          const granted = await checkStoragePermission();
          if (granted) {
            setIsPermissionModalVisible(false);
            if (pendingActionRef.current) {
              const action = pendingActionRef.current;
              pendingActionRef.current = null;
              action();
            }
          }
        }
      }
    );
    return () => subscription.remove();
  }, []);

  const handleFilePress = async (file: ScannedFile) => {
    const proceed = async () => {
      await addRecentDocument(file);
      navigation.navigate('FileViewer', { file });
    };

    const granted = await checkStoragePermission();
    if (!granted) {
      pendingActionRef.current = proceed;
      setIsPermissionModalVisible(true);
      return;
    }

    await proceed();
  };

  const handleAllowPermission = async () => {
    const granted = await requestStoragePermission(false);
    setIsPermissionModalVisible(false);
    if (granted && pendingActionRef.current) {
      const action = pendingActionRef.current;
      pendingActionRef.current = null;
      action();
    }
  };

  const handleSkipPermission = () => {
    setIsPermissionModalVisible(false);
    pendingActionRef.current = null;
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
      'Move to Trash',
      `Move "${targetFile.name}" to Trash? It will be automatically deleted after 30 days.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Move to Trash',
          style: 'destructive',
          onPress: async () => {
            try {
              await moveToTrash(targetFile);
              await removeConvertedFile(targetFile.uri);
              setFiles((prev) =>
                prev.filter((f) => f.uri !== targetFile.uri && f.id !== targetFile.id)
              );
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Could not move file to trash');
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
      await updateConvertedFile(oldUri, updated);
      await updateRecentDocument(oldUri, updated);
      setIsRenameVisible(false);
      loadFiles();
    } catch (err: any) {
      Alert.alert('Rename Failed', err?.message || 'Could not rename file');
    } finally {
      setIsRenaming(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!selectedFileForMenu) return;
    await toggleFavorite(selectedFileForMenu);
    setIsMenuVisible(false);
  };

  const renderItem = ({ item }: { item: ScannedFile }) => (
    <FileListItem
      name={item.name}
      size={formatBytes(item.size)}
      date={formatDate(item.modifiedDate)}
      time={formatTime(item.modifiedDate)}
      icon={getIconForExtension(item.extension)}
      onPress={() => handleFilePress(item)}
      onMorePress={(pos) => handleMorePress(item, pos)}
    />
  );

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <EmptyFolderIcon
          width={120}
          height={120}
          style={styles.emptyImage as any}
        />
        <Text style={styles.emptyTitle}>No Converted Files Yet!</Text>
        <Text style={styles.emptySubtitle}>
          Open any document and tap the Convert to PDF button to save it here.
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={mode === 'dark' || (mode === 'system' && colors.background === '#141414') ? 'light-content' : 'dark-content'} />

      {loading && files.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#ED1C24" />
          <Text style={styles.loadingText}>Loading converted files…</Text>
        </View>
      ) : (
        <FlatList
          data={files}
          keyExtractor={(item) => item.uri || item.id}
          renderItem={renderItem}
          contentContainerStyle={
            files.length === 0 ? styles.emptyListContent : styles.listContent
          }
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadFiles(true)}
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
        isFavorite={false} // Would need async check if we wanted to show correct state, but simple for now
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

      {/* File Access Permission Modal */}
      <FilePermissionModal
        visible={isPermissionModalVisible}
        onAllow={handleAllowPermission}
        onSkip={handleSkipPermission}
      />
    </View>
  );
};

const getStyles = (colors: ColorPalette, mode: 'light' | 'dark' | 'system') => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    color: colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});

export default ConvertedFilesScreen;
