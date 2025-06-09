import React from 'react';
import {
  createNativeStackNavigator,
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import MainTabs from './MainTabs';
import ConfirmEmailScreen from '../screens/app/ConfirmEmailScreen';
import EmailConfirmationBanner from '../components/EmailConfirmationBanner';

import { SafeAreaView, StyleSheet } from 'react-native';
import { useAppSelector } from '../store/hooks';
import ChangeUsernameScreen from '../screens/app/ChangeUsernameScreen';
import CreatorTabs from './CreatorTabs';
import PlansReturn from '../screens/PlansReturn';
import PostDetailScreen from '../screens/creator/PostDetailScreen';
import CreatorManagementTabs from './CreatorManagementTabs';
import CreatorReturn from '../screens/CreatorReturn';
import CreatorEditPlanScreen from '../screens/creator/CreatorEditPlanScreen';
import PostManagementDetailScreen from '../screens/creator/PostManagementDetailScreen';
import ChangePasswordScreen from '../screens/app/ChangePasswordScreen';

export type AppStackParamList = {
  MainTabs: undefined;
  ChangeUsername: undefined;
  ChangePassword: undefined;
  Settings: undefined;
  ConfirmEmail: undefined;
  Creator: { creatorId: number };
  CreatorManagement: undefined;
  PostDetail: { creatorId: number; postId: number };
  PlansReturn: { creatorId: number };
  CreatorReturn: undefined;
  EditPlan: { planId: number };
  PostManagementDetail: { postId: number };
};

export type AppStackNavigationProp =
  NativeStackNavigationProp<AppStackParamList>;

const AppStack = createNativeStackNavigator<AppStackParamList>();

export default function AppNavigator() {
  const user = useAppSelector((s) => s.auth.user);

  return (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
      <AppStack.Screen name="MainTabs">
        {() => (
          <SafeAreaView style={styles.container}>
            {!user?.isEmailConfirmed && <EmailConfirmationBanner />}
            <MainTabs />
          </SafeAreaView>
        )}
      </AppStack.Screen>
      <AppStack.Screen name="ConfirmEmail" component={ConfirmEmailScreen} />
      <AppStack.Screen name="ChangeUsername" component={ChangeUsernameScreen} />
      <AppStack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
      ></AppStack.Screen>
      <AppStack.Screen name="PlansReturn" component={PlansReturn} />
      <AppStack.Screen
        name="Creator"
        component={CreatorTabs}
        options={{ headerShown: true, title: '' }}
      />
      <AppStack.Screen
        name="CreatorManagement"
        component={CreatorManagementTabs}
        options={{ headerShown: true, title: 'Your Creator Dashboard' }}
      />
      <AppStack.Screen name="PostDetail" component={PostDetailScreen} />
      <AppStack.Screen
        name="CreatorReturn"
        component={CreatorReturn}
      ></AppStack.Screen>
      <AppStack.Screen
        name="EditPlan"
        component={CreatorEditPlanScreen}
        options={{ title: 'Edit Plan' }}
      ></AppStack.Screen>
      <AppStack.Screen
        name="PostManagementDetail"
        component={PostManagementDetailScreen}
      />
    </AppStack.Navigator>
  );
}

const styles = StyleSheet.create({ container: { flex: 1 } });
