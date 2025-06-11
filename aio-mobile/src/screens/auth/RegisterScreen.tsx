import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  TextInput,
  Text,
  KeyboardAvoidingView,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setCredentials, updateErrorMessage } from '../../slices/authSlice';
import { useSignUpMutation } from '../../services/baseAPI';

const RegisterScreen: React.FC = () => {
  const dispatch = useAppDispatch();

  useFocusEffect(
    useCallback(() => {
      dispatch(updateErrorMessage(''));
    }, [dispatch]),
  );

  const [email, setEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signUp, { isLoading }] = useSignUpMutation();
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

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match');
      return;
    }

    try {
      const tokens = await signUp({ email, userName, password }).unwrap();
      dispatch(setCredentials(tokens));
    } catch (err) {
      // error is handled through Redux slice
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView className="flex-1 justify-center px-6">
        <Text className="text-4xl font-bold text-center text-primary mb-8 font-sans">
          Create Account
        </Text>

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
            placeholder="Username"
            autoCapitalize="none"
            value={userName}
            onChangeText={setUserName}
          />
          <TextInput
            className="w-full bg-white border border-gray-300 p-4 rounded-xl font-sans"
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <TextInput
            className="w-full bg-white border border-gray-300 p-4 rounded-xl font-sans"
            placeholder="Confirm Password"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
        </View>

        <Pressable
          onPress={handleRegister}
          disabled={isLoading}
          className={`py-4 rounded-xl ${
            isLoading ? 'bg-primary/50' : 'bg-primary'
          }`}
        >
          <Text className="text-center text-white text-lg font-medium font-sans">
            {isLoading ? 'Registering…' : 'Register'}
          </Text>
        </Pressable>

        {formattedError ? (
          <View className="bg-red-100 border border-red-200 p-4 rounded-xl mt-4">
            <Text className="text-red-800 font-sans">{formattedError}</Text>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default RegisterScreen;
