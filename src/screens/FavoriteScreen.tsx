import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
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
import ConvertToPdfModal from '../components/viewer/ConvertToPdfModal';
import FilePermissionModal from '../components/ui/FilePermissionModal';
import {
  renameFile,
  shareFile,
  checkStoragePermission,
  requestStoragePermission,
} from '../services/FileScanner';
import { moveToTrash } from '../services/TrashService';
import {
  getFavorites,
  removeFavorite,
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
import { saveConvertedPdf } from '../services/DocConverterService';
import { addConvertedFile } from '../services/ConvertedFilesService';

import EmptyFolderIcon from '../../Assets/svgicons/Empty Folder.svg';
import { useTheme } from '../theme/ThemeContext';
import LottieView from 'lottie-react-native';
import { ColorPalette } from '../theme/colors';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const FavoriteScreen = () => {
  const navigation = useNavigation<NavigationProp>();

  const [favorites, setFavorites] = useState<ScannedFile[]>([]);
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

  // Manual Conversion state
  const [isConvertModalVisible, setIsConvertModalVisible] = useState<boolean>(false);
  const [convertStatus, setConvertStatus] = useState<'converting' | 'success'>('converting');

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

  // Listen for when user returns from Android Settings
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

  const handleMenuUnfavorite = async () => {
    if (!selectedFileForMenu) return;
    const targetFile = selectedFileForMenu;
    try {
      await removeFavorite(targetFile.uri);
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
              setFavorites((prev) =>
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
      await updateFavoriteFile(oldUri, updated);
      await updateRecentDocument(oldUri, updated);
      setIsRenameVisible(false);
      loadFavorites();
    } catch (err: any) {
      Alert.alert('Rename Failed', err?.message || 'Could not rename file');
    } finally {
      setIsRenaming(false);
    }
  };

  const handleMenuConvert = async () => {
    if (!selectedFileForMenu) return;
    setIsConvertModalVisible(true);
    setConvertStatus('converting');
    try {
      const startTime = Date.now();
      const targetFile = selectedFileForMenu;
      const permanentPath = await saveConvertedPdf(targetFile.uri, targetFile.name);
      
      const newName = targetFile.name.replace(/\.[^/.]+$/, '') + '.pdf';
      const convertedFile: ScannedFile = {
        ...targetFile,
        id: permanentPath,
        uri: `file://${permanentPath}`,
        name: newName,
        extension: 'pdf',
        mimeType: 'application/pdf',
      };
      
      await addConvertedFile(convertedFile);
      
      const elapsedTime = Date.now() - startTime;
      const MIN_ANIMATION_DELAY = 2000; 
      if (elapsedTime < MIN_ANIMATION_DELAY) {
        await new Promise<void>(resolve => setTimeout(resolve, MIN_ANIMATION_DELAY - elapsedTime));
      }
      
      setConvertStatus('success');
    } catch (error: any) {
      setIsConvertModalVisible(false);
      Alert.alert('Conversion Failed', error?.message || 'Could not save converted PDF');
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

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <EmptyFolderIcon
          width={120}
          height={120}
          style={styles.emptyImage as any}
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
      <StatusBar barStyle={mode === 'dark' || (mode === 'system' && colors.background === '#141414') ? 'light-content' : 'dark-content'} />

      {loading && favorites.length === 0 ? (
        <View style={styles.center}>
          <LottieView
            source={require('../../Assets/anim/loading-animation.json')}
            autoPlay
            loop
            style={{ width: 150, height: 150 }}
          />
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
        isPdf={selectedFileForMenu?.extension.toLowerCase() === 'pdf'}
        onClose={() => setIsMenuVisible(false)}
        onToggleFavorite={handleMenuUnfavorite}
        onRename={() => setIsRenameVisible(true)}
        onDelete={handleMenuDelete}
        onShare={handleMenuShare}
        onConvert={handleMenuConvert}
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

      {/* Convert To PDF Modal */}
      <ConvertToPdfModal
        visible={isConvertModalVisible}
        status={convertStatus}
        onClose={() => setIsConvertModalVisible(false)}
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

const getStyles = (colors: ColorPalette, _mode: 'light' | 'dark' | 'system') => StyleSheet.create({
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

export default FavoriteScreen;
