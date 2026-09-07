import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  Modal,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  openPrivacyPolicy,
  shareApp,
  rateApp,
} from '../services/SettingsService';

import AppIcon from '../../Assets/svgicons/App Icon.svg';
import SecurityIcon from '../../Assets/svgicons/security.svg';
import ShareIcon from '../../Assets/svgicons/share.svg';
import FamilyStarIcon from '../../Assets/svgicons/family_star.svg';
import { useTheme } from '../theme/ThemeContext';
import { ColorPalette } from '../theme/colors';

interface SideMenuProps {
  visible: boolean;
  onClose: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.76, 320);

const SideMenu: React.FC<SideMenuProps> = ({ visible, onClose }) => {
  const insets = useSafeAreaInsets();
  const animValue = useRef(new Animated.Value(0)).current;
  const { colors, mode } = useTheme();
  const styles = React.useMemo(() => getStyles(colors, mode), [colors, mode]);

  useEffect(() => {
    if (visible) {
      Animated.timing(animValue, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      animValue.setValue(0);
    }
  }, [visible, animValue]);

  const handleDismiss = (callback?: () => void) => {
    Animated.timing(animValue, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      onClose();
      if (callback) {
        callback();
      }
    });
  };

  if (!visible) return null;

  const translateX = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-DRAWER_WIDTH, 0],
  });

  const backdropOpacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.45],
  });

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={() => handleDismiss()}
    >
      <View style={styles.overlayContainer}>
        {/* Dark Dimmed Backdrop */}
        <TouchableWithoutFeedback onPress={() => handleDismiss()}>
          <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
        </TouchableWithoutFeedback>

        {/* Sliding Drawer Container */}
        <Animated.View
          style={[
            styles.drawer,
            {
              width: DRAWER_WIDTH,
              paddingTop: Math.max(insets.top, 24) + 16,
              paddingBottom: Math.max(insets.bottom, 20),
              transform: [{ translateX }],
            },
          ]}
        >
          {/* Header Illustration */}
          <View style={styles.headerSection}>
            <AppIcon
              width={120}
              height={120}
            />
            <Text style={styles.appTitle}>All Document Reader</Text>
          </View>

          {/* Divider Line */}
          <View style={styles.divider} />

          {/* Menu Items List */}
          <View style={styles.menuList}>
            {/* 1. Privacy Policy */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleDismiss(openPrivacyPolicy)}
              activeOpacity={0.7}
            >
              <SecurityIcon
                width={24}
                height={24}
                style={styles.menuIcon as any}
              />
              <Text style={styles.menuText}>Privacy Policy</Text>
            </TouchableOpacity>

            {/* 2. Share with Friends */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleDismiss(shareApp)}
              activeOpacity={0.7}
            >
              <ShareIcon
                width={24}
                height={24}
                style={styles.menuIcon as any}
              />
              <Text style={styles.menuText}>Share with Friends</Text>
            </TouchableOpacity>

            {/* 3. Rate Us */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleDismiss(rateApp)}
              activeOpacity={0.7}
            >
              <FamilyStarIcon
                width={24}
                height={24}
                style={styles.menuIcon as any}
              />
              <Text style={styles.menuText}>Rate Us</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const getStyles = (colors: ColorPalette, mode: 'light' | 'dark' | 'system') => StyleSheet.create({
  overlayContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#000000',
  },
  drawer: {
    height: '100%',
    backgroundColor: colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
  },
  headerSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  appIcon: {
    width: 120,
    height: 120,
  },
  appTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginTop: 14,
  },
  divider: {
    height: 1.5,
    backgroundColor: mode === 'dark' ? colors.border : '#111827',
    width: '100%',
  },
  menuList: {
    paddingTop: 20,
    paddingHorizontal: 22,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
  },
  menuIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
    tintColor: colors.icon,
    marginRight: 18,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
});

export default SideMenu;
