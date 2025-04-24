import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  TextInput,
  Text,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { AuthStackNavigationProp } from '../../navigation';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setCredentials, updateErrorMessage } from '../../slices/authSlice';
import { useSignInMutation } from '../../services/baseAPI';

const LoginScreen: React.FC = () => {
  const authNav = useNavigation<AuthStackNavigationProp>();
  const dispatch = useAppDispatch();

  useFocusEffect(
    useCallback(() => {
      dispatch(updateErrorMessage(''));
    }, [dispatch]),
  );

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signIn, { isLoading }] = useSignInMutation();
  const errorMessage = useAppSelector((s) => s.auth.errorMessage);

  const formattedError = useMemo(() => {
    if (!errorMessage) return '';
    return errorMessage
      .split('\n')
      .map((line) => {
        const trimmed = line.trim();
        return trimmed
          ? trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()
          : '';
      })
      .join('\n');
  }, [errorMessage]);

  const handleLogin = async () => {
    try {
      const tokens = await signIn({ email, password }).unwrap();
      dispatch(setCredentials(tokens));
    } catch {
      // we let the error block render the formattedError
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-center px-6"
      >
        {/* Title */}
        <Text className="text-4xl font-bold text-center text-primary mb-8 font-sans">
          aio
        </Text>

        {/* Inputs */}
        <View className="space-y-4 mb-6">
          <TextInput
            className="w-full bg-white border border-gray-300 p-4 rounded-xl font-sans"
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            className="w-full bg-white border border-gray-300 p-4 rounded-xl font-sans"
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        {/* Login Button */}
        <Pressable
          onPress={handleLogin}
          disabled={isLoading}
          className={`py-4 rounded-xl ${
            isLoading ? 'bg-primary/50' : 'bg-primary'
          }`}
        >
          <Text className="text-center text-white text-lg font-medium font-sans">
            {isLoading ? 'Logging in…' : 'Log In'}
          </Text>
        </Pressable>

        {/* Error Block */}
        {formattedError ? (
          <View className="bg-red-100 border border-red-200 p-4 rounded-xl mt-4">
            <Text className="text-red-800 font-sans">{formattedError}</Text>
          </View>
        ) : null}

        {/* Register Link */}
        <View className="mt-6 flex-row justify-center">
          <Text className="text-gray-600 font-sans">
            Don’t have an account?{' '}
          </Text>
          <Pressable onPress={() => authNav.navigate('Register')}>
            <Text className="text-primary font-medium font-sans">Register</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen;
