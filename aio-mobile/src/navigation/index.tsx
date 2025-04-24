import React from 'react';
import {
  createNativeStackNavigator,
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { useAppSelector } from '../store/hooks';

import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import HomeScreen from '../screens/app/HomeScreen';
import ProfileScreen from '../screens/app/ProfileScreen';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};
export type AppStackParamList = {
  Home: undefined;
  Profile: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      {/* 👉 Only Screen components here */}
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

const AppStack = createNativeStackNavigator<AppStackParamList>();
function AppNavigator() {
  return (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
      {/* 👉 Only Screen components here */}
      <AppStack.Screen name="Home" component={HomeScreen} />
      <AppStack.Screen name="Profile" component={ProfileScreen} />
    </AppStack.Navigator>
  );
}

export default function RootNavigator() {
  const isLogged = useAppSelector((s) => s.auth.isLoggedIn);
  return (
    <NavigationContainer>
      {isLogged ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

export type AuthStackNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'Login'
>;

export type AppStackNavigationProp = NativeStackNavigationProp<
  AppStackParamList,
  'Home'
>;
