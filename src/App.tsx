import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import HomeScreen from './screens/HomeScreen';
import FavoriteScreen from './screens/FavoriteScreen';
import SettingScreen from './screens/SettingScreen';
import FileListScreen from './screens/FileListScreen';
import DocumentViewerScreen from './screens/DocumentViewerScreen';
import { RootStackParamList } from './types/types';
import { Image } from 'react-native';
import CustomHeader from './components/CustomHeader';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator<RootStackParamList>();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: "#ED1C24",
        tabBarInactiveTintColor: "#A7A7A7",
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          header: () => (<CustomHeader title='All Document Reader' />),
          tabBarIcon: ({ size, focused }) => (
            <Image
              source={ focused ? require('../Assets/tabs/home-active.png') : require('../Assets/tabs/home.png')}
              style={{ width: size, height: size }}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Favorite"
        component={FavoriteScreen}
        options={{
          header: () => (<CustomHeader title='All Document Reader' />),
          tabBarIcon: ({ size, focused }) => (
            <Image
              source={ focused ? require('../Assets/tabs/favorite-active.png') : require('../Assets/tabs/favorite.png')}
              style={{ width: size, height: size }}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Setting"
        component={SettingScreen}
        options={{
          header: () => (<CustomHeader title='Settings' />),
          tabBarIcon: ({ size, focused }) => (
            <Image
              source={ focused ? require('../Assets/tabs/settings-active.png') : require('../Assets/tabs/settings.png')}
              style={{ width: size, height: size }}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen 
          name="FileList" 
          component={FileListScreen} 
          options={({ route }: any) => ({
            headerShown: false,
          })}
        />
        <Stack.Screen
          name="FileViewer"
          component={DocumentViewerScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;

