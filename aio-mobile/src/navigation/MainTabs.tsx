// navigation/MainTabs.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/app/HomeScreen';
import SearchScreen from '../screens/app/SearchScreen';
import SettingsScreen from '../screens/app/SettingsScreen';
import MessagesScreen from '../screens/app/MessagesScreen';
import BottomNav from '../components/BottomNav';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import FollowsScreen from '../screens/app/FollowsScreen';

export type MainTabsParamList = {
  Home: undefined;
  Search: undefined;
  Settings: undefined;
  Messages: undefined;
  Follows: undefined;
};

export type MainTabsStackNavigationProp = NativeStackNavigationProp<
  MainTabsParamList,
  'Home'
>;

const Tab = createBottomTabNavigator<MainTabsParamList>();

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <BottomNav {...props} />}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="Follows" component={FollowsScreen} />
    </Tab.Navigator>
  );
}
