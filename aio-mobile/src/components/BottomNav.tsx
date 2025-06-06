import React from 'react';
import { View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Home, Search, Settings } from 'lucide-react-native';

const BottomNav: React.FC<BottomTabBarProps> = ({ navigation, state }) => {
  const currentIndex = state.index;

  const activeColor = '#3B82F6';
  const inactiveColor = '#4B5563';

  return (
    <SafeAreaView
      edges={['bottom']}
      className="bg-white border-t border-gray-200"
    >
      <View className="flex-row items-center justify-between px-8 py-2">
        <Pressable onPress={() => navigation.navigate('Home')}>
          <Home
            size={24}
            color={currentIndex === 0 ? activeColor : inactiveColor}
          />
        </Pressable>

        <Pressable onPress={() => navigation.navigate('Search')}>
          <Search
            size={24}
            color={currentIndex === 1 ? activeColor : inactiveColor}
          />
        </Pressable>

        <Pressable onPress={() => navigation.navigate('Settings')}>
          <Settings
            size={24}
            color={currentIndex === 2 ? activeColor : inactiveColor}
          />
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

export default BottomNav;
