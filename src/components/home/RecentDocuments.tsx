import React, { useState, useCallback } from 'react';
import {
  Image,
  TouchableOpacity,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
  FlatList,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, ScannedFile } from '../../types/types';
import EmptyDocState from './EmptyDocState';
import FileListItem from '../ui/FileListItem';
import FileActionMenuModal from '../ui/FileActionMenuModal';
import RenameModal from '../viewer/RenameModal';
import ConvertToPdfModal from '../viewer/ConvertToPdfModal';
import {
  getRecentDocuments,
  addRecentDocument,
  updateRecentDocument,
} from '../../services/RecentDocumentsService';
import {
  isFavorite as checkIsFavorite,
  toggleFavorite,
  updateFavoriteFile,
} from '../../services/FavoritesService';
import { renameFile, shareFile, checkStoragePermission } from '../../services/FileScanner';
import { moveToTrash } from '../../services/TrashService';
import {
  formatBytes,
  formatDate,
  formatTime,
  getIconForExtension,
} from '../../services/fileHelpers';
import { saveConvertedPdf } from '../../services/DocConverterService';
import { addConvertedFile } from '../../services/ConvertedFilesService';

import SearchIcon from '../../../Assets/svgicons/search.svg';
import CloseIcon from '../../../Assets/svgicons/close.svg';
import { useTheme } from '../../theme/ThemeContext';
import { ColorPalette } from '../../theme/colors';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type RecentDocumentsProps = {
  onRequirePermission?: (onGranted: () => void) => void;
};

const RecentDocuments: React.FC<RecentDocumentsProps> = ({ onRequirePermission }) => {
  const navigation = useNavigation<NavigationProp>();

  const [recentFiles, setRecentFiles] = useState<ScannedFile[]>([]);
  const [isSearchActive, setIsSearchActive] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const { colors, mode } = useTheme();
  const styles = React.useMemo(() => getStyles(colors, mode), [colors, mode]);

  // 3-dots Menu & Rename state
  const [selectedFileForMenu, setSelectedFileForMenu] = useState<ScannedFile | null>(null);
  const [selectedFileIsFavorite, setSelectedFileIsFavorite] = useState<boolean>(false);
  const [menuAnchorPosition, setMenuAnchorPosition] = useState<{ top: number; right: number } | null>(null);
  const [isMenuVisible, setIsMenuVisible] = useState<boolean>(false);
  const [isRenameVisible, setIsRenameVisible] = useState<boolean>(false);
  const [isRenaming, setIsRenaming] = useState<boolean>(false);

  // Manual Conversion state
  const [isConvertModalVisible, setIsConvertModalVisible] = useState<boolean>(false);
  const [convertStatus, setConvertStatus] = useState<'converting' | 'success'>('converting');

  const loadRecents = useCallback(async () => {
    try {
      const items = await getRecentDocuments();
      setRecentFiles(items);
    } catch (error) {
      console.error('Error loading recent documents:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRecents();
    }, [loadRecents])
  );

  const handleFilePress = async (file: ScannedFile) => {
    const proceed = async () => {
      await addRecentDocument(file);
      navigation.navigate('FileViewer', { file });
    };

    if (onRequirePermission) {
      onRequirePermission(proceed);
      return;
    }

    const granted = await checkStoragePermission();
    if (granted) {
      await proceed();
    }
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
              setRecentFiles((prev) =>
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
      loadRecents();
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

  const filteredFiles = searchQuery.trim()
    ? recentFiles.filter((f) =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
      )
    : recentFiles;

  return (
    <View style={styles.container}>
      {/* Header / Search Bar */}
      {isSearchActive ? (
        <View style={styles.searchBarContainer}>
          <SearchIcon
            width={20}
            height={20}
            style={styles.searchBarIcon as any}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Doc"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus={true}
            returnKeyType="search"
          />
          <TouchableOpacity
            onPress={() => {
              setSearchQuery('');
              setIsSearchActive(false);
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.clearButton}
          >
            <CloseIcon
              width={18}
              height={18}
              style={styles.closeIcon as any}
            />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Recent Documents</Text>
          {recentFiles.length > 0 && (
            <TouchableOpacity
              onPress={() => setIsSearchActive(true)}
              style={styles.searchIconButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <SearchIcon
                width={24}
                height={24}
                style={styles.searchIcon as any}
              />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Content */}
      {recentFiles.length === 0 ? (
        <EmptyDocState />
      ) : filteredFiles.length === 0 ? (
        <View style={styles.noSearchMatchContainer}>
          <Text style={styles.noSearchMatchText}>
            No documents match "{searchQuery}"
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredFiles}
          keyExtractor={(file) => file.uri || file.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          style={styles.listContainer}
          renderItem={({ item: file }) => (
            <FileListItem
              name={file.name}
              size={formatBytes(file.size)}
              date={formatDate(file.modifiedDate)}
              time={formatTime(file.modifiedDate)}
              icon={getIconForExtension(file.extension)}
              onPress={() => handleFilePress(file)}
              onMorePress={(pos) => handleMorePress(file, pos)}
            />
          )}
        />
      )}

      {/* 3-Dots Action Menu Modal */}
      <FileActionMenuModal
        visible={isMenuVisible}
        anchorPosition={menuAnchorPosition}
        isFavorite={selectedFileIsFavorite}
        isPdf={selectedFileForMenu?.extension.toLowerCase() === 'pdf'}
        onClose={() => setIsMenuVisible(false)}
        onToggleFavorite={handleToggleFavorite}
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
    </View>
  );
};

const getStyles = (colors: ColorPalette, mode: 'light' | 'dark' | 'system') => StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 22,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  searchIconButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
    tintColor: colors.icon,
  },
  searchBarContainer: {
    height: 54,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  searchBarIcon: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
    tintColor: colors.iconInactive,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 8,
  },
  clearButton: {
    padding: 4,
  },
  closeIcon: {
    width: 18,
    height: 18,
    resizeMode: 'contain',
    tintColor: colors.iconInactive,
  },
  listContainer: {
    flex: 1,
    marginTop: 2,
  },
  noSearchMatchContainer: {
    paddingVertical: 36,
    alignItems: 'center',
  },
  noSearchMatchText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});

export default RecentDocuments;
