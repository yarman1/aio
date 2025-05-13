// navigation/AppNavigator.tsx
import React from 'react';
import {
  createNativeStackNavigator,
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import MainTabs from './MainTabs';
import ProfileScreen from '../screens/app/ProfileScreen';

export type AppStackParamList = {
  MainTabs: undefined;
  Profile: undefined;
};

export type AppStackNavigationProp = NativeStackNavigationProp<
  AppStackParamList,
  'MainTabs'
>;

const AppStack = createNativeStackNavigator<AppStackParamList>();

export default function AppNavigator() {
  return (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
      {/* your bottom-tabs go here */}
      <AppStack.Screen name="MainTabs" component={MainTabs} />
      {/* any screen you don’t want the tab bar on */}
      <AppStack.Screen name="Profile" component={ProfileScreen} />
    </AppStack.Navigator>
  );
}
