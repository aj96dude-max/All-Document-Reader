import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  Text,
  Image,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList, ScannedFile } from '../types/types';
import FileListHeader from '../components/FileListHeader';
import FileListItem from '../components/ui/FileListItem';
import { scanFiles } from '../services/FileScanner';

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
  switch (ext) {
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

const UNSUPPORTED_VIEWER_EXTENSIONS = ['ppt', 'pptx', 'doc', 'docx', 'xls', 'xlsx'];

// --- Component ---

const FileListScreen = ({ route, navigation }: Props) => {
  const { fileType } = route.params;
  const [files, setFiles] = useState<ScannedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    if (UNSUPPORTED_VIEWER_EXTENSIONS.includes(file.extension)) {
      Alert.alert(
        'Unsupported Format',
        `Viewing ${file.extension.toUpperCase()} files is not supported yet.`,
      );
      return;
    }
    navigation.navigate('FileViewer', { file });
  };

  const renderItem = ({ item }: { item: ScannedFile }) => (
    <FileListItem
      name={item.name}
      size={formatBytes(item.size)}
      date={formatDate(item.modifiedDate)}
      time={formatTime(item.modifiedDate)}
      icon={getIconForExtension(item.extension)}
      onPress={() => handleFilePress(item)}
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

