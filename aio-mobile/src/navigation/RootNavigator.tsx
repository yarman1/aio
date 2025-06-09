import React from 'react';
import { LinkingOptions, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';
import { useAppSelector } from '../store/hooks';
import * as Linking from 'expo-linking';

const RootStack = createNativeStackNavigator();

const prefix = Linking.createURL('/');

const linking: LinkingOptions<any> = {
  prefixes: [prefix],
  config: {
    screens: {
      Auth: {},
      App: {
        screens: {
          PlansReturn: 'subscriptions/success/:creatorId',
          CreatorReturn: 'creator/dashboard/return',
        },
      },
    },
  },
};

export default function RootNavigator() {
  const isLogged = useAppSelector((s) => s.auth.isLoggedIn);

  return (
    <NavigationContainer linking={linking}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {isLogged ? (
          <RootStack.Screen name="App" component={AppNavigator} />
        ) : (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
