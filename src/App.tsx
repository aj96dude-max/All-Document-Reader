import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import SplashScreen from './screens/SplashScreen';
import HomeScreen from './screens/HomeScreen';
import FavoriteScreen from './screens/FavoriteScreen';
import SettingScreen from './screens/SettingScreen';
import FileListScreen from './screens/FileListScreen';
import DocumentViewerScreen from './screens/DocumentViewerScreen';
import TrashScreen from './screens/TrashScreen';
import SideMenu from './components/SideMenu';
import { RootStackParamList } from './types/types';
import { Image } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import CustomHeader from './components/CustomHeader';
import { initSettings } from './services/SettingsService';

import HomeIcon from '../Assets/svgicons/home.svg';
import HomeActiveIcon from '../Assets/svgicons/home_active.svg';
import FavoriteIcon from '../Assets/svgicons/favorite.svg';
import FavoriteActiveIcon from '../Assets/svgicons/favorite_active.svg';
import SettingsIcon from '../Assets/svgicons/settings.svg';
import SettingsActiveIcon from '../Assets/svgicons/settings_active.svg';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<RootStackParamList>();

type MainTabsProps = {
  onOpenSideMenu: () => void;
};

const MainTabs: React.FC<MainTabsProps> = ({ onOpenSideMenu }) => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#ED1C24',
        tabBarInactiveTintColor: '#A7A7A7',
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          header: () => (
            <CustomHeader
              title="All Document Reader"
              onMenuPress={onOpenSideMenu}
            />
          ),
          tabBarIcon: ({ size, focused, color }) => (
            focused ? (
              <HomeActiveIcon width={size} height={size} color={color} />
            ) : (
              <HomeIcon width={size} height={size} color={color} />
            )
          ),
        }}
      />
      <Tab.Screen
        name="Favorite"
        component={FavoriteScreen}
        options={{
          header: () => (
            <CustomHeader
              title="All Document Reader"
              onMenuPress={onOpenSideMenu}
            />
          ),
          tabBarIcon: ({ size, focused, color }) => (
            focused ? (
              <FavoriteActiveIcon width={size} height={size} color={color} />
            ) : (
              <FavoriteIcon width={size} height={size} color={color} />
            )
          ),
        }}
      />
      <Tab.Screen
        name="Setting"
        component={SettingScreen}
        options={{
          header: () => (
            <CustomHeader
              title="All Document Reader"
              onMenuPress={onOpenSideMenu}
            />
          ),
          tabBarIcon: ({ size, focused, color }) => (
            focused ? (
              <SettingsActiveIcon width={size} height={size} color={color} />
            ) : (
              <SettingsIcon width={size} height={size} color={color} />
            )
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const App = () => {
  const [isSideMenuVisible, setIsSideMenuVisible] = useState(false);

  useEffect(() => {
    initSettings();
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="MainTabs">
            {() => <MainTabs onOpenSideMenu={() => setIsSideMenuVisible(true)} />}
          </Stack.Screen>
          <Stack.Screen
            name="FileList"
            component={FileListScreen}
            options={() => ({
              headerShown: false,
            })}
          />
          <Stack.Screen
            name="FileViewer"
            component={DocumentViewerScreen}
          />
          <Stack.Screen
            name="Trash"
            component={TrashScreen}
          />
        </Stack.Navigator>

        {/* Side Menu Drawer Component */}
        <SideMenu
          visible={isSideMenuVisible}
          onClose={() => setIsSideMenuVisible(false)}
        />
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

export default App;
