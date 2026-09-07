import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initSettings } from './services/SettingsService';
import { ThemeProvider } from './theme/ThemeContext';
import AppNavigator from './navigation/AppNavigator';

const App = () => {
  useEffect(() => {
    initSettings();
  }, []);

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <AppNavigator />
      </SafeAreaProvider>
    </ThemeProvider>
  );
};

export default App;
