import React from 'react';
import { ScrollView, StyleSheet, StatusBar } from 'react-native';
import ToolsContainer from '../components/home/toolsContainer';
import RecentDocuments from '../components/home/RecentDocuments';

const HomeScreen = () => {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="dark-content" />
      <ToolsContainer />
      <RecentDocuments />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6F8',
  },
  contentContainer: {
    paddingBottom: 24,
  },
});

export default HomeScreen;