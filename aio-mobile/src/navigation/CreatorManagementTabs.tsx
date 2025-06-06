import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';

import CreatorManagementSettingsScreen from '../screens/creator/CreatorManagementSettingsScreen';
import CreatorManagementPlansScreen from '../screens/creator/CreatorManagementPlansScreen';
import CreatorManagementPostsScreen from '../screens/creator/CreatorManagementPostsScreen';
import CreatorManagementRecommendationsScreen from '../screens/creator/CreatorManagementRecommendationsScreen';

export type CreatorManagementTabsParamList = {
  Settings: undefined;
  Recommendations: undefined;
  Plans: undefined;
  Posts: undefined;
};

const Tab = createMaterialTopTabNavigator<CreatorManagementTabsParamList>();

export default function CreatorManagementTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarIndicatorStyle: { backgroundColor: '#000' },
        tabBarLabelStyle: { fontWeight: '600' },
      }}
    >
      <Tab.Screen name="Settings" component={CreatorManagementSettingsScreen} />
      <Tab.Screen
        name="Recommendations"
        component={CreatorManagementRecommendationsScreen}
      ></Tab.Screen>
      <Tab.Screen name="Plans" component={CreatorManagementPlansScreen} />
      <Tab.Screen name="Posts" component={CreatorManagementPostsScreen} />
    </Tab.Navigator>
  );
}
