import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, PermissionsAndroid, ActivityIndicator, Alert, Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/types';
import FileListHeader from '../components/FileListHeader';
import FileListItem from '../components/ui/FileListItem';
import { scanDeviceFiles, FileData } from '../utils/fileScanner';

type Props = NativeStackScreenProps<RootStackParamList, 'FileList'>;

const formatBytes = (bytes: number, decimals = 2) => {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const formatDate = (date?: Date) => {
  if (!date) return 'Unknown';
  const today = new Date();
  if (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  ) {
    return 'Today';
  }
  return date.toLocaleDateString();
};

const formatTime = (date?: Date) => {
  if (!date) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const getIconForType = (type: string) => {
  switch (type) {
    case 'pdf': return require('../../Assets/home/pdf.png');
    case 'doc':
    case 'docx': return require('../../Assets/home/word.png');
    case 'xls':
    case 'xlsx': return require('../../Assets/home/excel.png');
    case 'ppt':
    case 'pptx': return require('../../Assets/home/ppt.png');
    case 'txt': return require('../../Assets/home/txt.png');
    case 'epub': return require('../../Assets/home/epub.png');
    case 'rtf': return require('../../Assets/home/rtf.png');
    default: return require('../../Assets/home/allfiles.png');
  }
};

const getMimeType = (ext: string) => {
  switch (ext) {
    case 'pdf': return 'application/pdf';
    case 'txt': return 'text/plain';
    // add more if needed
    default: return '*/*';
  }
};

const FileListScreen = ({ route, navigation }: Props) => {
  const { fileType } = route.params;
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const requestPermissionAndScan = async () => {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          {
            title: 'Storage Permission Required',
            message: 'App needs access to your storage to read documents',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          const scannedFiles = await scanDeviceFiles(fileType);
          setFiles(scannedFiles);
        } else {
          Alert.alert('Permission Denied', 'Storage permission is required to scan files.');
        }
      } catch (err) {
        console.warn(err);
      } finally {
        setLoading(false);
      }
    };

    requestPermissionAndScan();
  }, [fileType]);

  const handleFilePress = (file: FileData) => {
    const skipTypes = ['ppt', 'pptx', 'doc', 'docx'];
    if (skipTypes.includes(file.type)) {
      Alert.alert('Unsupported', 'This file type cannot be opened currently.');
      return;
    }

    navigation.navigate('FileViewer', {
      file: {
        name: file.name,
        type: getMimeType(file.type),
        uri: 'file://' + file.path,
      },
    });
  };

  return (
    <View style={styles.container}>
      <FileListHeader title={fileType.toUpperCase()} />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#ED1C24" />
          <Text style={{ marginTop: 10 }}>Scanning device...</Text>
        </View>
      ) : (
        <FlatList
          data={files}
          keyExtractor={(item) => item.path}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
          renderItem={({ item }) => (
            <FileListItem
              name={item.name}
              size={formatBytes(item.size)}
              date={formatDate(item.mtime)}
              time={formatTime(item.mtime)}
              icon={getIconForType(item.type)}
              onPress={() => handleFilePress(item)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text>No files found.</Text>
            </View>
          }
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
  },
});

export default FileListScreen;
