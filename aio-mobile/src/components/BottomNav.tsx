import React from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import {
  Home as HomeNative,
  Search as SearchNative,
  Settings as SettingsNative,
} from 'lucide-react-native';
import {
  Home as HomeWeb,
  Search as SearchWeb,
  Settings as SettingsWeb,
} from 'lucide-react';

const HomeIcon = Platform.OS === 'web' ? HomeWeb : HomeNative;
const SearchIcon = Platform.OS === 'web' ? SearchWeb : SearchNative;
const SettingsIcon = Platform.OS === 'web' ? SettingsWeb : SettingsNative;

const BottomNav: React.FC<BottomTabBarProps> = ({ navigation, state }) => {
  const currentIndex = state.index;

  const Container = Platform.OS === 'android' ? SafeAreaView : View;
  const containerProps =
    Platform.OS === 'android'
      ? { edges: ['bottom'] as const, style: styles.container }
      : { style: styles.container };

  return (
    <Container {...containerProps}>
      <View style={styles.row}>
        <Pressable onPress={() => navigation.navigate('Home')}>
          <HomeIcon
            size={24}
            color={
              currentIndex === 0 ? styles.active.color : styles.inactive.color
            }
          />
        </Pressable>

        <Pressable onPress={() => navigation.navigate('Search')}>
          <SearchIcon
            size={24}
            color={
              currentIndex === 1 ? styles.active.color : styles.inactive.color
            }
          />
        </Pressable>

        <Pressable onPress={() => navigation.navigate('Settings')}>
          <SettingsIcon
            size={24}
            color={
              currentIndex === 2 ? styles.active.color : styles.inactive.color
            }
          />
        </Pressable>
      </View>
    </Container>
  );
};

const styles = StyleSheet.create({
  active: { color: '#3B82F6' },
  inactive: { color: '#4B5563' },

  container: {
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingVertical: 8,
  },
});

export default BottomNav;
