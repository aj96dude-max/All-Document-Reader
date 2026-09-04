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
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../types/types';
import TrashListItem from '../components/ui/TrashListItem';
import TrashActionMenuModal from '../components/ui/TrashActionMenuModal';
import {
  getTrashFiles,
  restoreFromTrash,
  deletePermanently,
  formatDaysRemaining,
  TrashedFile,
} from '../services/TrashService';
import {
  formatDate,
  formatTime,
  getIconForExtension,
} from '../services/fileHelpers';

import EmptyFolderIcon from '../../Assets/svgicons/Empty Folder.svg';
import ChevronBackwardIcon from '../../Assets/svgicons/chevron_backward.svg';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const TrashScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();

  const [trashFiles, setTrashFiles] = useState<TrashedFile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // 3-dots Menu state
  const [selectedFileForMenu, setSelectedFileForMenu] = useState<TrashedFile | null>(null);
  const [menuAnchorPosition, setMenuAnchorPosition] = useState<{ top: number; right: number } | null>(null);
  const [isMenuVisible, setIsMenuVisible] = useState<boolean>(false);

  const loadTrash = useCallback(async (isPullRefresh = false) => {
    if (isPullRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const items = await getTrashFiles();
      setTrashFiles(items);
    } catch (error) {
      console.error('Error loading trash files:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTrash();
    }, [loadTrash])
  );

  const handleMorePress = (file: TrashedFile, position?: { pageX: number; pageY: number }) => {
    setSelectedFileForMenu(file);
    if (position) {
      setMenuAnchorPosition({ top: position.pageY, right: 24 });
    } else {
      setMenuAnchorPosition(null);
    }
    setIsMenuVisible(true);
  };

  const handleRestore = async () => {
    if (!selectedFileForMenu) return;
    const target = selectedFileForMenu;
    try {
      await restoreFromTrash(target.uri);
      setTrashFiles((prev) => prev.filter((f) => f.uri !== target.uri && f.id !== target.id));
      Alert.alert('Restored', `"${target.name}" has been restored.`);
    } catch (err: any) {
      Alert.alert('Restore Failed', err?.message || 'Could not restore file');
    }
  };

  const handleDeletePermanently = () => {
    if (!selectedFileForMenu) return;
    const target = selectedFileForMenu;
    Alert.alert(
      'Delete Permanently',
      `Are you sure you want to permanently delete "${target.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePermanently(target.uri);
              setTrashFiles((prev) => prev.filter((f) => f.uri !== target.uri && f.id !== target.id));
            } catch (err: any) {
              Alert.alert('Delete Failed', err?.message || 'Could not delete file');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: TrashedFile }) => (
    <TrashListItem
      name={item.name}
      date={formatDate(item.trashedAt || item.modifiedDate)}
      time={formatTime(item.trashedAt || item.modifiedDate)}
      daysRemainingText={formatDaysRemaining(item.trashedAt)}
      icon={getIconForExtension(item.extension)}
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
        <Text style={styles.emptyTitle}>Trash is Empty</Text>
        <Text style={styles.emptySubtitle}>
          Files moved to Trash will appear here for 30 days before being permanently deleted.
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, 14) }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <ChevronBackwardIcon
            width={22}
            height={22}
            style={styles.backIcon as any}
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Trash</Text>

        <View style={styles.headerPlaceholder} />
      </View>

      {/* Subtitle Notice */}
      <View style={styles.noticeContainer}>
        <Text style={styles.noticeText}>
          After <Text style={styles.noticeHighlight}>30 Days files</Text> will be automatically deleted
        </Text>
      </View>

      {/* List / Loading */}
      {loading && trashFiles.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#ED1C24" />
          <Text style={styles.loadingText}>Loading trash files…</Text>
        </View>
      ) : (
        <FlatList
          data={trashFiles}
          keyExtractor={(item) => item.uri || item.id}
          renderItem={renderItem}
          contentContainerStyle={
            trashFiles.length === 0 ? styles.emptyListContent : styles.listContent
          }
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadTrash(true)}
              colors={['#ED1C24']}
              tintColor="#ED1C24"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Trash Action Menu Modal */}
      <TrashActionMenuModal
        visible={isMenuVisible}
        anchorPosition={menuAnchorPosition}
        onClose={() => setIsMenuVisible(false)}
        onRestore={handleRestore}
        onDeletePermanently={handleDeletePermanently}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6F8',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#F5F6F8',
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
    tintColor: '#1F2937',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: 36,
  },
  noticeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 4,
  },
  noticeText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  noticeHighlight: {
    color: '#ED1C24',
    fontWeight: '700',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
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

export default TrashScreen;
