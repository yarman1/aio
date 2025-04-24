import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { AppStackNavigationProp } from '../../navigation';

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<AppStackNavigationProp>();

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* … your main content … */}

      {/* Bottom panel */}
      <View className="h-16 bg-white border-t border-gray-200 flex-row justify-center items-center">
        <Pressable
          onPress={() => navigation.navigate('Profile')}
          className="px-6 py-2 rounded-full bg-primary"
        >
          <Text className="text-white font-medium">Profile</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

export default HomeScreen;
