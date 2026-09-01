import React from 'react';
import { Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const App = () => {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{flex: 1}}>
        <Text>Hello, World!</Text>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default App;
