import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

const EmptyDocState = () => {
  return (
    <View style={styles.container}>
      <Image source={require('../../../Assets/home/Empty Folder.png')} />
      <Text>No Recent Documents Found</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
export default EmptyDocState;
