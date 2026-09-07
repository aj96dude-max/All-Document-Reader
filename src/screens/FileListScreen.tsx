import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
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
import Loading from '../components/common/Loading';
import { scanFiles, renameFile, shareFile } from '../services/FileScanner';
import { moveToTrash } from '../services/TrashService';
import {
  isFavorite as checkIsFavorite,
  toggleFavorite,
  updateFavoriteFile,
} from '../services/FavoritesService';
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
import { useTheme } from '../theme/ThemeContext';
import { ColorPalette } from '../theme/colors';

import LottieView from 'lottie-react-native';

type Props = NativeStackScreenProps<RootStackParamList, 'FileList'>;

const FileListScreen = ({ route, navigation }: Props) => {
  const { fileType } = route.params;
  const [files, setFiles] = useState<ScannedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { colors, mode } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

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

  const handleFilePress = async (file: ScannedFile) => {
    await addRecentDocument(file);
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
      if (selectedFileIsFavorite) {
        await updateFavoriteFile(oldUri, updated);
      }
      await updateRecentDocument(oldUri, updated);
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
      onPress={() => handleFilePress(item)}
      onMorePress={(pos) => handleMorePress(item, pos)}
    />
  );

  const renderEmpty = () => (
    <View style={styles.center}>
      <LottieView
        source={require('../../Assets/anim/Empety Documents Jason File.json')}
        autoPlay
        loop
        style={{ width: 150, height: 150, marginBottom: 16 }}
      />
      <Text style={styles.emptyText}>No Documents Yet!</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle={mode === 'dark' || (mode === 'system' && colors.background === '#141414') ? 'light-content' : 'dark-content'} />
      <FileListHeader title={fileType} onBack={() => navigation.goBack()} />
      {loading ? (
        <Loading message="Scanning device…" />
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={files}
          keyExtractor={(item) => item.uri || item.id}
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

const getStyles = (colors: ColorPalette) => StyleSheet.create({
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
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: 14,
    color: colors.primary,
    textAlign: 'center',
  },
});

export default FileListScreen;
