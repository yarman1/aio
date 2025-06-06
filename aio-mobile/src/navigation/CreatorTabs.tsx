import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import CreatorInfoScreen from '../screens/creator/CreatorInfoScreen';
import CreatorPlansScreen from '../screens/creator/CreatorPlansScreen';
import CreatorPostsScreen from '../screens/creator/CreatorPostsScreen';

export type CreatorTabsParamList = {
  Info: { creatorId: number };
  Plans: { creatorId: number };
  Posts: { creatorId: number };
};

const Tab = createMaterialTopTabNavigator<CreatorTabsParamList>();

export default function CreatorTabs({
  route,
}: {
  route: { params: { creatorId: number } };
}) {
  const { creatorId } = route.params;

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarIndicatorStyle: { backgroundColor: '#000' },
        tabBarLabelStyle: { fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Info"
        component={CreatorInfoScreen}
        initialParams={{ creatorId }}
      />
      <Tab.Screen
        name="Plans"
        component={CreatorPlansScreen}
        initialParams={{ creatorId }}
      />
      <Tab.Screen
        name="Posts"
        component={CreatorPostsScreen}
        initialParams={{ creatorId }}
      />
    </Tab.Navigator>
  );
}
