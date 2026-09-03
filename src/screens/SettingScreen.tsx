import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  StatusBar,
  Share,
  Linking,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import SettingItem from '../components/settings/SettingItem';
import { RootStackParamList } from '../types/types';
import {
  getAppSettings,
  saveAppSettings,
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

  const handlePrivacyPolicyPress = async () => {
    const privacyUrl = 'https://policies.google.com/privacy';
    try {
      const supported = await Linking.canOpenURL(privacyUrl);
      if (supported) {
        await Linking.openURL(privacyUrl);
      } else {
        Alert.alert('Privacy Policy', 'Could not open privacy policy link.');
      }
    } catch {
      Alert.alert('Privacy Policy', 'Could not open privacy policy link.');
    }
  };

  const handleSharePress = async () => {
    try {
      await Share.share({
        title: 'All Document Reader',
        message:
          'Check out All Document Reader - Read, view, and manage all your PDF, Word, Excel, and PPT files on the go!',
      });
    } catch (error: any) {
      console.error('Share error:', error);
    }
  };

  const handleRateUsPress = async () => {
    const storeUrl = 'market://details?id=com.alldocumentreader';
    const webFallbackUrl = 'https://play.google.com/store/apps/details?id=com.alldocumentreader';
    try {
      const supported = await Linking.canOpenURL(storeUrl);
      if (supported) {
        await Linking.openURL(storeUrl);
      } else {
        await Linking.openURL(webFallbackUrl);
      }
    } catch {
      Alert.alert('Rate Us', 'Thank you for rating All Document Reader! ⭐️⭐️⭐️⭐️⭐️');
    }
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
          onPress={handlePrivacyPolicyPress}
        />

        <SettingItem
          icon={require('../../Assets/icons/share.png')}
          title="Share with Friends"
          type="link"
          onPress={handleSharePress}
        />

        <SettingItem
          icon={require('../../Assets/icons/family_star.png')}
          title="Rate Us"
          type="link"
          onPress={handleRateUsPress}
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