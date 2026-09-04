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
          tabBarIcon: ({ size, focused }) => (
            <Image
              source={
                focused
                  ? require('../Assets/tabs/home-active.png')
                  : require('../Assets/tabs/home.png')
              }
              style={{ width: size, height: size }}
            />
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
          tabBarIcon: ({ size, focused }) => (
            <Image
              source={
                focused
                  ? require('../Assets/tabs/favorite-active.png')
                  : require('../Assets/tabs/favorite.png')
              }
              style={{ width: size, height: size }}
            />
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
          tabBarIcon: ({ size, focused }) => (
            <Image
              source={
                focused
                  ? require('../Assets/tabs/settings-active.png')
                  : require('../Assets/tabs/settings.png')
              }
              style={{ width: size, height: size }}
            />
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
