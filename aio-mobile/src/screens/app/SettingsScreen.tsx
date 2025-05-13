import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SettingsScreen: React.FC = () => {
  return (
    <SafeAreaView className="flex-1 bg-background items-center justify-center">
      <Text className="text-xl font-semibold">Settings screen</Text>
    </SafeAreaView>
  );
};

export default SettingsScreen;
