import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ScrollView,
  StyleSheet,
  StatusBar,
  View,
  AppState,
  AppStateStatus,
} from 'react-native';
import ToolsContainer from '../components/home/toolsContainer';
import RecentDocuments from '../components/home/RecentDocuments';
import FilePermissionModal from '../components/ui/FilePermissionModal';
import {
  checkStoragePermission,
  requestStoragePermission,
} from '../services/FileScanner';
import { useTheme } from '../theme/ThemeContext';
import { ColorPalette } from '../theme/colors';

const HomeScreen = () => {
  const [isPermissionModalVisible, setIsPermissionModalVisible] = useState<boolean>(false);
  const pendingActionRef = useRef<(() => void) | null>(null);
  const { colors, mode } = useTheme();
  const styles = React.useMemo(() => getStyles(colors), [colors]);

  // Check permission once when the user opens the app / HomeScreen mounts
  useEffect(() => {
    const checkInitialPermission = async () => {
      const granted = await checkStoragePermission();
      if (!granted) {
        setIsPermissionModalVisible(true);
      }
    };
    checkInitialPermission();
  }, []);

  // Listen for when the user returns from Android Settings
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      async (nextState: AppStateStatus) => {
        if (nextState === 'active') {
          const granted = await checkStoragePermission();
          if (granted) {
            setIsPermissionModalVisible(false);
            if (pendingActionRef.current) {
              const action = pendingActionRef.current;
              pendingActionRef.current = null;
              action();
            }
          }
        }
      }
    );
    return () => subscription.remove();
  }, []);

  const requirePermission = useCallback(async (actionOnGranted?: () => void) => {
    const granted = await checkStoragePermission();
    if (granted) {
      actionOnGranted?.();
      return;
    }
    if (actionOnGranted) {
      pendingActionRef.current = actionOnGranted;
    }
    setIsPermissionModalVisible(true);
  }, []);

  const handleAllowPermission = async () => {
    const granted = await requestStoragePermission(false);
    setIsPermissionModalVisible(false);
    if (granted && pendingActionRef.current) {
      const action = pendingActionRef.current;
      pendingActionRef.current = null;
      action();
    }
  };

  const handleSkipPermission = () => {
    setIsPermissionModalVisible(false);
    pendingActionRef.current = null;
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <StatusBar barStyle={mode === 'dark' || (mode === 'system' && colors.background === '#141414') ? 'light-content' : 'dark-content'} backgroundColor={colors.background as any} />
        <ToolsContainer onRequirePermission={requirePermission} />
        <RecentDocuments onRequirePermission={requirePermission} />
      </ScrollView>

      {/* File Access Permission Modal */}
      <FilePermissionModal
        visible={isPermissionModalVisible}
        onAllow={handleAllowPermission}
        onSkip={handleSkipPermission}
      />
    </View>
  );
};

const getStyles = (colors: ColorPalette) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingBottom: 24,
  },
});

export default HomeScreen;