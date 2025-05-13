import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const FollowsScreen: React.FC = () => {
  return (
    <SafeAreaView className="flex-1 bg-background items-center justify-center">
      <Text className="text-xl font-semibold">Follows</Text>
    </SafeAreaView>
  );
};

export default FollowsScreen;
