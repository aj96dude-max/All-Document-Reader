import React, { useRef, useState } from 'react';
import Onboarding1SVG from '../../Assets/onboarding/onboarding_1.svg';
import Onboarding2SVG from '../../Assets/onboarding/onboarding_2.svg';
import Onboarding3SVG from '../../Assets/onboarding/onboarding_3.svg';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Animated,
  Dimensions,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/types';
import { saveAppSettings } from '../services/SettingsService';

const { width, height } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

const slides = [
  {
    id: '1',
    title: 'Your Document Hub',
    subtitle:
      'Access every document format from a single, beautifully designed workspace.',
    ImageComponent: Onboarding1SVG,
  },
  {
    id: '2',
    title: 'Read Without Limits',
    subtitle:
      'Experience seamless navigation, crystal clear viewing, and powerful reading tools for every document.',
    ImageComponent: Onboarding2SVG,
  },
  {
    id: '3',
    title: 'Stay Organized',
    subtitle:
      'Manage your files efficiently, access favorites instantly, and share documents whenever you need.',
    ImageComponent: Onboarding3SVG,
  },
];

const OnboardingScreen: React.FC<Props> = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const slidesRef = useRef<FlatList>(null);

  const viewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const scrollTo = async () => {
    if (currentIndex < slides.length - 1) {
      slidesRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      await saveAppSettings({ hasViewedOnboarding: true });
      navigation.replace('MainTabs');
    }
  };

  const skip = async () => {
    await saveAppSettings({ hasViewedOnboarding: true });
    navigation.replace('MainTabs');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        {currentIndex === 0 ? (
          <TouchableOpacity onPress={skip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.skipPlaceholder} />
        )}
      </View>

      <View style={{ flex: 3 }}>
        <FlatList
          data={slides}
          renderItem={({ item }) => (
            <View style={styles.slide}>
              <View style={styles.image}>
                <item.ImageComponent width="75%" height="75%" />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.subtitle}>{item.subtitle}</Text>
              </View>
            </View>
          )}
          horizontal
          showsHorizontalScrollIndicator={false}
          pagingEnabled
          bounces={false}
          keyExtractor={item => item.id}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false },
          )}
          scrollEventThrottle={32}
          onViewableItemsChanged={viewableItemsChanged}
          viewabilityConfig={viewConfig}
          ref={slidesRef}
        />
      </View>

      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={scrollTo}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>
            {currentIndex === slides.length - 1 ? "Let's Get Started" : 'Next'}
          </Text>
        </TouchableOpacity>

        <View style={styles.paginator}>
          {slides.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];

            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 32, 8],
              extrapolate: 'clamp',
            });

            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });

            const backgroundColor = scrollX.interpolate({
              inputRange,
              outputRange: ['#FCA5A5', '#EF4444', '#FCA5A5'],
              extrapolate: 'clamp',
            });

            return (
              <Animated.View
                style={[
                  styles.dot,
                  {
                    width: dotWidth,
                    opacity,
                    backgroundColor,
                  },
                ]}
                key={i.toString()}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    marginTop: 40,
  },
  skipButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  skipText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  skipPlaceholder: {
    height: 36,
  },
  slide: {
    width,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  image: {
    width: '100%',
    height: height * 0.45,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 50,
    paddingBottom: 0,
  },
  textContainer: {
    flex: 1,
    alignItems: 'center',
    marginTop: 20,
  },
  title: {
    fontWeight: '800',
    fontSize: 24,
    marginBottom: 16,
    color: '#000000',
    textAlign: 'center',
  },
  subtitle: {
    fontWeight: '400',
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  bottomContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  button: {
    backgroundColor: '#EF4444',
    width: '100%',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  paginator: {
    flexDirection: 'row',
    height: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
});

export default OnboardingScreen;
