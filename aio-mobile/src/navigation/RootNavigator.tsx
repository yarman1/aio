// navigation/RootNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';
import { useAppSelector } from '../store/hooks';

const RootStack = createNativeStackNavigator();

export default function RootNavigator() {
  const isLogged = useAppSelector((s) => s.auth.isLoggedIn);

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {isLogged ? (
          // once logged in, you get the app stack
          <RootStack.Screen name="App" component={AppNavigator} />
        ) : (
          // otherwise you see auth screens
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
