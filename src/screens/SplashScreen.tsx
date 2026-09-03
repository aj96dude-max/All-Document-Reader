import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  Animated,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/types';

const { width } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

const SplashScreen: React.FC<Props> = ({ navigation }) => {
  const iconFadeAnim = useRef(new Animated.Value(0)).current;
  const iconScaleAnim = useRef(new Animated.Value(0.85)).current;
  const textFadeAnim = useRef(new Animated.Value(0)).current;
  const textSlideAnim = useRef(new Animated.Value(15)).current;

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(iconFadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.spring(iconScaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start(() => {
      Animated.parallel([
        Animated.timing(textFadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(textSlideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    });

    // Auto navigate to main tabs after splash display
    const timer = setTimeout(() => {
      navigation.replace('MainTabs');
    }, 2500);

    return () => clearTimeout(timer);
  }, [iconFadeAnim, iconScaleAnim, textFadeAnim, textSlideAnim, navigation]);

  const handleSkip = () => {
    navigation.replace('MainTabs');
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={handleSkip}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" />

      {/* Decorative Background Watermarks */}
      {/* Top-Left PDF Watermark */}
      <View style={[styles.watermarkCard, styles.watermarkTopLeft]}>
        <View style={styles.watermarkHeader}>
          <Text style={styles.watermarkTag}>PDF</Text>
        </View>
        <View style={[styles.watermarkLine, { width: '85%' }]} />
        <View style={[styles.watermarkLine, { width: '70%' }]} />
        <View style={[styles.watermarkLine, { width: '55%' }]} />
      </View>

      {/* Top-Right PPT Watermark */}
      <View style={[styles.watermarkCard, styles.watermarkTopRight]}>
        <View style={styles.watermarkHeader}>
          <Text style={styles.watermarkTag}>PPT</Text>
        </View>
        <View style={[styles.watermarkLine, { width: '80%' }]} />
        <View style={[styles.watermarkLine, { width: '60%' }]} />
        <View style={[styles.watermarkLine, { width: '75%' }]} />
      </View>

      {/* Bottom-Right Curved Vector Graphic */}
      <Image
        source={require('../../Assets/splash/vector_12.png')}
        style={styles.bottomCurveVector}
        resizeMode="contain"
      />

      {/* Bottom-Right DOC Watermark (Inside Blue Wave) */}
      <View style={[styles.watermarkCard, styles.watermarkBottomRight]}>
        <View style={styles.watermarkHeader}>
          <Text style={[styles.watermarkTag, styles.watermarkTagDoc]}>DOC</Text>
        </View>
        <View style={[styles.watermarkLine, styles.watermarkLineDoc, { width: '80%' }]} />
        <View style={[styles.watermarkLine, styles.watermarkLineDoc, { width: '65%' }]} />
        <View style={[styles.watermarkLine, styles.watermarkLineDoc, { width: '75%' }]} />
      </View>

      {/* Center Content */}
      <View style={styles.centerContent}>
        <Animated.View
          style={[
            styles.iconWrapper,
            {
              opacity: iconFadeAnim,
              transform: [{ scale: iconScaleAnim }],
            },
          ]}
        >
          <Image
            source={require('../../Assets/icons/app_icon.png')}
            style={styles.appIcon}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: textFadeAnim,
              transform: [{ translateY: textSlideAnim }],
            },
          ]}
        >
          <Text style={styles.title}>All Document’s Reader</Text>
          <Text style={styles.subtitle}>Everything you need in one app</Text>
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
};

const curveWidth = width * 0.96;
const curveHeight = curveWidth * (306 / 412);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FB',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  bottomCurveVector: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: curveWidth,
    height: curveHeight,
    opacity: 0.95,
  },
  // Watermark Badges
  watermarkCard: {
    position: 'absolute',
    width: 110,
    height: 125,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 12,
    shadowColor: '#94A3B8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 1,
  },
  watermarkTopLeft: {
    top: 40,
    left: -20,
    transform: [{ rotate: '-18deg' }],
    opacity: 0.45,
  },
  watermarkTopRight: {
    top: 60,
    right: -15,
    transform: [{ rotate: '16deg' }],
    opacity: 0.45,
  },
  watermarkBottomRight: {
    bottom: 30,
    right: -10,
    transform: [{ rotate: '-12deg' }],
    opacity: 0.4,
    backgroundColor: '#E0EDFF',
    borderColor: '#BDD7FF',
  },
  watermarkHeader: {
    marginBottom: 10,
  },
  watermarkTag: {
    fontSize: 16,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  watermarkTagDoc: {
    color: '#7EA6DE',
  },
  watermarkLine: {
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    marginBottom: 6,
  },
  watermarkLineDoc: {
    backgroundColor: '#9EC2F3',
  },
  // Center Content
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    zIndex: 10,
    marginTop: -20,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  appIcon: {
    width: 175,
    height: 175,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: '#4B5563',
    textAlign: 'center',
    letterSpacing: 0.1,
  },
});

export default SplashScreen;
