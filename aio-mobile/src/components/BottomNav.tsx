// components/BottomNav.tsx
import React from 'react';
import { View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import {
  Home,
  Search,
  Plus,
  MessageCircle,
  Bookmark,
  Newspaper,
  Settings,
  LayoutGrid,
} from 'lucide-react-native';

const BottomNav: React.FC<BottomTabBarProps> = ({ navigation, state }) => {
  const currentIndex = state.index;

  // Hex values from your Tailwind config:
  const activeColor = '#3B82F6'; // e.g. blue-500
  const inactiveColor = '#4B5563'; // e.g. gray-700
  const plusBg = '#3B82F6'; // same blue-500 for center button

  return (
    <SafeAreaView
      edges={['bottom']}
      className="bg-white border-t border-gray-200"
    >
      <View className="flex-row items-center justify-between px-8 py-2">
        {/* Home */}
        <Pressable onPress={() => navigation.navigate('Home')}>
          <Home
            size={24}
            color={currentIndex === 0 ? activeColor : inactiveColor}
          />
        </Pressable>

        {/* CreatorMode (center “big” button) */}
        <Pressable onPress={() => navigation.navigate('Search')}>
          <Search
            size={24}
            color={currentIndex === 1 ? activeColor : inactiveColor}
          />
        </Pressable>

        {/* Search */}
        <Pressable onPress={() => navigation.navigate('Settings')}>
          <Settings
            size={24}
            color={currentIndex === 2 ? activeColor : inactiveColor}
          />
        </Pressable>

        {/* Messages */}
        <Pressable onPress={() => navigation.navigate('Messages')}>
          <MessageCircle
            size={24}
            color={currentIndex === 3 ? activeColor : inactiveColor}
          />
        </Pressable>

        {/* Subscriptions */}
        <Pressable onPress={() => navigation.navigate('Follows')}>
          <LayoutGrid
            size={24}
            color={currentIndex === 4 ? activeColor : inactiveColor}
          />
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

export default BottomNav;
