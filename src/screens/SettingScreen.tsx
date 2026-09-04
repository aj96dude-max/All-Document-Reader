import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import SettingItem from '../components/settings/SettingItem';
import { RootStackParamList } from '../types/types';
import {
  getAppSettings,
  saveAppSettings,
  openPrivacyPolicy,
  shareApp,
  rateApp,
} from '../services/SettingsService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SettingScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [keepScreenOn, setKeepScreenOn] = useState<boolean>(true);

  // Load saved settings
  const loadSettings = useCallback(async () => {
    try {
      const settings = await getAppSettings();
      setKeepScreenOn(settings.keepScreenOn);
    } catch (e) {
      console.error('Error loading settings:', e);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings])
  );

  const handleToggleKeepScreenOn = async (val: boolean) => {
    setKeepScreenOn(val);
    try {
      await saveAppSettings({ keepScreenOn: val });
    } catch (error) {
      console.error('Error updating Keep Screen On setting:', error);
    }
  };

  const handleTrashPress = () => {
    navigation.navigate('Trash');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <SettingItem
          icon={require('../../Assets/icons/wb_incandescent.png')}
          title="Keep Screen On"
          type="switch"
          value={keepScreenOn}
          onValueChange={handleToggleKeepScreenOn}
        />

        <SettingItem
          icon={require('../../Assets/icons/delete_forever.png')}
          title="Trash"
          type="link"
          onPress={handleTrashPress}
        />

        <SettingItem
          icon={require('../../Assets/icons/security.png')}
          title="Privacy Policy"
          type="link"
          onPress={openPrivacyPolicy}
        />

        <SettingItem
          icon={require('../../Assets/icons/share.png')}
          title="Share with Friends"
          type="link"
          onPress={shareApp}
        />

        <SettingItem
          icon={require('../../Assets/icons/family_star.png')}
          title="Rate Us"
          type="link"
          onPress={rateApp}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6F8',
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
});

export default SettingScreen;