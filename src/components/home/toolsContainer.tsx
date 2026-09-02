import React from 'react';
import { StyleSheet, View } from 'react-native';
import Tool from './tool';

const ToolsContainer = () => {
  const tools = [
    {
      id: 1,
      title: 'All Files',
      icon: require('../../../Assets/home/allfiles.png'),
    },
    {
      id: 2,
      title: 'PDF',
      icon: require('../../../Assets/home/pdf.png'),
    },
    {
      id: 3,
      title: 'Word',
      icon: require('../../../Assets/home/word.png'),
    },
    {
      id: 4,
      title: 'Excel',
      icon: require('../../../Assets/home/excel.png'),
    },
    {
      id: 5,
      title: 'PPT',
      icon: require('../../../Assets/home/ppt.png'),
    },
    {
      id: 6,
      title: 'TXT',
      icon: require('../../../Assets/home/txt.png'),
    },
    {
      id: 7,
      title: 'EPUB',
      icon: require('../../../Assets/home/epub.png'),
    },
    {
      id: 8,
      title: 'RTF',
      icon: require('../../../Assets/home/rtf.png'),
    },
  ];

  const handleToolPress = (title: string) => {
    console.log('Pressed:', title);
  };

  return (
    <View style={styles.container}>
      {tools.map(item => (
        <Tool
          key={item.id}
          title={item.title}
          icon={item.icon}
          onPress={() => handleToolPress(item.title)}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 25,
    rowGap: 20,
  },
});

export default ToolsContainer;
