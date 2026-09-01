import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import FileListItem from '../components/ui/FileListItem';

const FavoriteScreen = () => {
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
      {files.map(file => (
        <FileListItem
          key={file.id}
          {...file}
          onPress={() => console.log(file.name)}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
});

export default FavoriteScreen;
