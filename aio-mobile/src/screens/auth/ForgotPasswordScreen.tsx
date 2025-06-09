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
import { useRequestRecoveryMobileMutation } from '../../services/baseAPI';
import { useNavigation } from '@react-navigation/native';
import type { AuthStackNavigationProp } from '../../navigation/AuthNavigator';

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<AuthStackNavigationProp>();
  const [email, setEmail] = useState('');
  const [requestRecovery, { isLoading }] = useRequestRecoveryMobileMutation();

  const handleRequest = async () => {
    if (!email.trim()) {
      return Alert.alert('Validation', 'Please enter your email address.');
    }
    try {
      await requestRecovery({ email: email.trim().toLowerCase() }).unwrap();
      Alert.alert(
        'Success',
        'A password reset code has been sent to your email.',
        [{ text: 'OK', onPress: () => navigation.navigate('ResetPassword') }],
      );
    } catch (err: any) {
      let errMsg = 'Failed to send recovery code.';
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
        <Text style={styles.header}>Forgot Password</Text>
        <Text style={styles.subHeader}>
          Enter the email associated with your account. We’ll send you a code to
          reset your password.
        </Text>

        <View style={styles.form}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <Pressable
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleRequest}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Request Code</Text>
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
