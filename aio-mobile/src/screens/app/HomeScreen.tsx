import React, { useState } from 'react';
import { View, Text, Pressable, Modal, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch } from '../../store/hooks';
import { logout } from '../../slices/authSlice';
import { useLogOutMutation } from '../../services/baseAPI';

const HomeScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const [logOut, { isLoading }] = useLogOutMutation();
  const [menuVisible, setMenuVisible] = useState(false);

  const handleLogout = () => {
    setMenuVisible(false);
    dispatch(logout());
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* top-right avatar */}
      <SafeAreaView
        edges={['top']}
        className="absolute inset-x-0 top-0 items-end pr-4 z-30"
      >
        <Pressable
          onPress={() => setMenuVisible(true)}
          className="h-14 w-14 rounded-full bg-gray-200 items-center justify-center mt-5"
        >
          <Text className="text-lg font-bold text-gray-700">U</Text>
        </Pressable>
      </SafeAreaView>

      {/* main content */}
      <View className="flex-1 items-center justify-center">
        <Text className="text-2xl font-bold">Welcome to Aio!</Text>
      </View>

      {/* modal */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        presentationStyle="overFullScreen"
        statusBarTranslucent
        onRequestClose={() => setMenuVisible(false)}
      >
        {/* darken status bar + app */}
        <StatusBar
          translucent
          backgroundColor="rgba(0,0,0,0.6)"
          barStyle="light-content"
        />

        {/* full screen wrapper */}
        <View className="absolute inset-0">
          {/* 1) this Pressable covers everything */}
          <Pressable
            onPress={() => setMenuVisible(false)}
            className="absolute inset-0 bg-black/60 z-10"
          />

          {/* 2) your sheet lives here, only at the bottom */}
          <View className="absolute bottom-0 inset-x-0 z-20">
            <SafeAreaView
              edges={['bottom']}
              className="bg-white rounded-t-3xl px-4 pt-3 pb-6"
            >
              {/* header */}
              <View className="items-center mb-4">
                <View className="h-20 w-20 rounded-full bg-gray-200 items-center justify-center mb-2">
                  <Text className="text-3xl font-bold text-gray-700">U</Text>
                </View>
                <Text className="text-lg font-semibold">Username</Text>
              </View>

              {/* menu items */}
              <Pressable
                onPress={() => {
                  /* navigate to Settings… */
                  setMenuVisible(false);
                }}
                className="py-3 border-t border-gray-100"
              >
                <Text className="text-base">Settings</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setMenuVisible(false);
                  dispatch(logout());
                }}
                disabled={isLoading}
                className="py-3 border-t border-gray-100"
              >
                <Text className="text-base text-red-600">Logout</Text>
              </Pressable>
            </SafeAreaView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default HomeScreen;
