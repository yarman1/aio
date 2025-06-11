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
import { useUpdateUserInfoMutation } from '../../services/baseAPI';

export default function ChangeUsernameScreen() {
  const navigation = useNavigation<AppStackNavigationProp>();
  const currentUser = useAppSelector((s) => s.auth.user);
  const [username, setUsername] = useState(currentUser?.userName ?? '');
  const [updateUserInfo, { isLoading }] = useUpdateUserInfoMutation();

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
    if (!username.trim()) {
      return Alert.alert('Validation', 'Username cannot be empty.');
    }
    try {
      await updateUserInfo({ userName: username.trim() }).unwrap();
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('Settings');
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', err.data?.message || 'Failed to update username.');
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
        <Text style={styles.header}>Change Username</Text>

        <View style={styles.form}>
          <Text style={styles.label}>New username</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Enter your username"
          />
        </View>

        <Pressable
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator />
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
