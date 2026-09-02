import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/types';
import FileListHeader from '../components/FileListHeader';
import FileListItem from '../components/ui/FileListItem';

type Props = NativeStackScreenProps<RootStackParamList, 'FileList'>;

const FileListScreen = ({ route }: Props) => {
  const { fileType } = route.params;

  const files = [
    {
      id: 1,
      name: 'Q3_Financial_Report.pdf',
      size: '2.4 MB',
      date: 'Today',
      time: '10:23 AM',
      icon: require('../../Assets/home/pdf.png'),
    },
    {
      id: 2,
      name: 'Project_Document.docx',
      size: '1.8 MB',
      date: 'Yesterday',
      time: '04:20 PM',
      icon: require('../../Assets/home/word.png'),
    },
    {
      id: 3,
      name: 'Q3_Financial_Report.pdf',
      size: '2.4 MB',
      date: 'Today',
      time: '10:23 AM',
      icon: require('../../Assets/home/pdf.png'),
    },
    {
      id: 4,
      name: 'Project_Document.docx',
      size: '1.8 MB',
      date: 'Yesterday',
      time: '04:20 PM',
      icon: require('../../Assets/home/word.png'),
    },
  ];

  return (
    <View style={styles.container}>
      <FileListHeader title={fileType} />
      <View style={styles.container}>
        {files.map(file => (
          <FileListItem
            key={file.id}
            {...file}
            onPress={() => console.log(file.name)}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default FileListScreen;
