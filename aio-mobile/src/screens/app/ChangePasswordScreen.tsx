import React, { useState, useEffect } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import type { AppStackNavigationProp } from '../../navigation/AppNavigator';
import { useAppSelector } from '../../store/hooks';
import { useUpdatePasswordMutation } from '../../services/baseAPI';

export default function ChangePasswordScreen() {
  const navigation = useNavigation<AppStackNavigationProp>();
  const currentUser = useAppSelector((s) => s.auth.user);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [updatePassword, { isLoading }] = useUpdatePasswordMutation();

  useEffect(() => {
    if (!currentUser) {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('Settings');
      }
    }
  }, [currentUser, navigation]);

  const handleSave = async () => {
    if (!oldPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      return Alert.alert('Validation', 'All fields are required.');
    }
    if (newPassword !== confirmPassword) {
      return Alert.alert(
        'Validation',
        'New password and confirmation do not match.',
      );
    }
    if (oldPassword === newPassword) {
      return Alert.alert(
        'Validation',
        'New password must differ from old password.',
      );
    }

    try {
      await updatePassword({
        oldPassword: oldPassword.trim(),
        newPassword: newPassword.trim(),
      }).unwrap();

      Alert.alert('Success', 'Password updated successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      let combinedMessage = 'Failed to update password.';

      if (err?.data) {
        const data = err.data as any;

        if (Array.isArray(data.message)) {
          combinedMessage = data.message.join('\n');
        } else if (typeof data.message === 'string') {
          combinedMessage = data.message;
        } else if (typeof data.error === 'string') {
          combinedMessage = data.error;
        }
      }

      Alert.alert('Error', combinedMessage);
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
          { height: Platform.OS === 'android' ? StatusBar.currentHeight : 44 },
        ]}
      />
      <SafeAreaView style={styles.container} edges={['top']}>
        <Text style={styles.header}>Change Password</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Old Password</Text>
          <TextInput
            style={styles.input}
            value={oldPassword}
            onChangeText={setOldPassword}
            secureTextEntry
            placeholder="Enter current password"
          />

          <Text style={[styles.label, { marginTop: 16 }]}>New Password</Text>
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            placeholder="Enter new password"
          />

          <Text style={[styles.label, { marginTop: 16 }]}>
            Confirm New Password
          </Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            placeholder="Repeat new password"
          />
        </View>

        <Pressable
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Save</Text>
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
    fontSize: 24,
    fontWeight: '700',
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
    backgroundColor: '#007AFF',
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
