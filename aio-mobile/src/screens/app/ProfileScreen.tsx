import React from 'react';
import { Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppDispatch } from '../../store/hooks';
import { logout } from '../../slices/authSlice';
import { useLogOutMutation } from '../../services/baseAPI';

const ProfileScreen: React.FC = () => {
  const dispatch = useAppDispatch();

  const [logOut, { isLoading }] = useLogOutMutation();

  const handleLogout = async () => {
    //await logOut().unwrap();
    dispatch(logout());
  };

  return (
    <SafeAreaView className="flex-1 bg-background items-center justify-center px-6">
      <Text className="text-xl font-bold mb-4">Profile</Text>
      <Pressable
        onPress={handleLogout}
        disabled={isLoading}
        className="w-full py-3 bg-red-600 rounded-xl"
      >
        <Text className="text-center text-white font-medium">Logout</Text>
      </Pressable>
    </SafeAreaView>
  );
};

export default ProfileScreen;
