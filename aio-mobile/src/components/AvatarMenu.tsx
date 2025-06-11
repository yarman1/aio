import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  Image,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logout } from '../slices/authSlice';
import { useLogOutMutation, baseAPI } from '../services/baseAPI';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions, useNavigation } from '@react-navigation/native';
import type { AppStackNavigationProp } from '../navigation/AppNavigator';

const STATUS_BAR_HEIGHT =
  Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0;

export function AvatarMenu({
  topOffset = STATUS_BAR_HEIGHT + 10,
}: {
  topOffset?: number;
}) {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<AppStackNavigationProp>();
  const [logoutMutation, { isLoading }] = useLogOutMutation();
  const [visible, setVisible] = useState(false);
  const user = useAppSelector((s) => s.auth.user);

  const handleLogout = async () => {
    setVisible(false);
    dispatch(logout());
    logoutMutation();
    dispatch(baseAPI.util.resetApiState());

    if (Platform.OS === 'android') {
      await AsyncStorage.clear().catch(() => {});
    } else {
      window.localStorage.clear();
    }

    navigation.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: 'Auth' }] }),
    );
  };

  const handleSettings = () => {
    setVisible(false);
    navigation.navigate('Settings');
  };

  return (
    <>
      <Pressable
        onPress={() => setVisible(true)}
        style={[styles.avatarWrapper, { top: topOffset }]}
      >
        {user?.avatarUrl ? (
          <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
        ) : (
          <Text style={styles.avatarText}>
            {user?.userName?.[0]?.toUpperCase() || 'U'}
          </Text>
        )}
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        // only android supports these props; web ignores them
        {...(Platform.OS === 'android' ? { statusBarTranslucent: true } : {})}
        onRequestClose={() => setVisible(false)}
      >
        <View style={StyleSheet.absoluteFill}>
          <Pressable
            style={[StyleSheet.absoluteFill, styles.backdrop]}
            onPress={() => setVisible(false)}
          />
          <View style={styles.sheet}>
            <SafeAreaView edges={['bottom']} style={styles.sheetInner}>
              <View style={styles.header}>
                {user?.avatarUrl ? (
                  <Image
                    source={{ uri: user.avatarUrl }}
                    style={styles.largeAvatar}
                  />
                ) : (
                  <Text style={styles.largeAvatarText}>
                    {user?.userName?.[0]?.toUpperCase() || 'U'}
                  </Text>
                )}
                <Text style={styles.username}>
                  {user?.userName || 'Username'}
                </Text>
              </View>

              <Pressable onPress={handleSettings} style={styles.menuItem}>
                <Text style={styles.menuText}>Settings</Text>
              </Pressable>
              <Pressable
                onPress={handleLogout}
                disabled={isLoading}
                style={styles.menuItem}
              >
                <Text style={[styles.menuText, styles.logoutText]}>Logout</Text>
              </Pressable>
            </SafeAreaView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  avatarWrapper: {
    position: 'absolute',
    right: 16,
    zIndex: 30,
    height: 56,
    width: 56,
    borderRadius: 28,
    backgroundColor: '#E5E5E5',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatar: { width: '100%', height: '100%' },
  avatarText: { fontSize: 20, fontWeight: 'bold', color: '#444' },

  backdrop: { backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  sheetInner: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  header: { alignItems: 'center', marginBottom: 16 },
  largeAvatar: { height: 80, width: 80, borderRadius: 40, marginBottom: 8 },
  largeAvatarText: { fontSize: 32, fontWeight: 'bold', color: '#444' },
  username: { fontSize: 18, fontWeight: '600' },

  menuItem: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#EEE' },
  menuText: { fontSize: 16 },
  logoutText: { color: '#E53935' },
});
