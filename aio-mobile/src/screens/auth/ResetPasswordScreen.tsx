import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useResetPasswordMutation } from '../../services/baseAPI';
import { useNavigation } from '@react-navigation/native';
import type { AuthStackNavigationProp } from '../../navigation/AuthNavigator';

export default function ResetPasswordScreen() {
  const navigation = useNavigation<AuthStackNavigationProp>();
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetPassword, { isLoading }] = useResetPasswordMutation();

  const handleReset = async () => {
    if (!token.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      return Alert.alert('Validation', 'All fields are required.');
    }
    if (newPassword !== confirmPassword) {
      return Alert.alert(
        'Validation',
        'New password and confirmation do not match.',
      );
    }

    try {
      await resetPassword({
        token: token.trim(),
        newPassword: newPassword.trim(),
      }).unwrap();

      Alert.alert('Success', 'Password has been reset.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (err: any) {
      let errMsg = 'Failed to reset password.';
      if (err?.data) {
        const data = err.data as any;
        if (Array.isArray(data.message)) {
          errMsg = data.message.join('\n');
        } else if (typeof data.message === 'string') {
          errMsg = data.message;
        } else if (data.error) {
          errMsg = data.error;
        }
      }
      Alert.alert('Error', errMsg);
    }
  };

  return (
    <>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="dark-content"
      />
      <View
        style={[
          styles.statusBarPlaceholder,
          {
            height:
              Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 44,
          },
        ]}
      />
      <SafeAreaView style={styles.container} edges={['top']}>
        <Text style={styles.header}>Reset Password</Text>
        <Text style={styles.subHeader}>
          Enter the code you received by email and choose a new password.
        </Text>

        <View style={styles.form}>
          <Text style={styles.label}>Reset Code</Text>
          <TextInput
            style={styles.input}
            placeholder="ABC123"
            autoCapitalize="characters"
            autoCorrect={false}
            value={token}
            onChangeText={setToken}
          />

          <Text style={[styles.label, { marginTop: 16 }]}>New Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />

          <Text style={[styles.label, { marginTop: 16 }]}>
            Confirm New Password
          </Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
        </View>

        <Pressable
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleReset}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Submit</Text>
          )}
        </Pressable>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  statusBarPlaceholder: { width: '100%', backgroundColor: '#fff' },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
  },
  subHeader: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  form: {
    marginBottom: 32,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#374ffa',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
