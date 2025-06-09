import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useResendConfirmationEmailMutation,
  useConfirmEmailMutation,
} from '../../services/baseAPI';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../navigation/AppNavigator';

const RESEND_KEY = 'lastEmailResendTs';
const COOLDOWN = 15 * 60;

export default function ConfirmEmailScreen() {
  const navigation =
    useNavigation<
      NativeStackNavigationProp<AppStackParamList, 'ConfirmEmail'>
    >();
  const [resend, { isLoading: resending, error: resendError }] =
    useResendConfirmationEmailMutation();
  const [confirm, { isLoading: confirming, error: confirmError }] =
    useConfirmEmailMutation();

  const [code, setCode] = useState('');
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    (async () => {
      const ts = await AsyncStorage.getItem(RESEND_KEY);
      if (!ts) return;
      const elapsed = Math.floor((Date.now() - +ts) / 1000);
      if (elapsed < COOLDOWN) setTimer(COOLDOWN - elapsed);
    })();
  }, []);

  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          clearInterval(id);
          AsyncStorage.removeItem(RESEND_KEY);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [timer]);

  const handleResend = async () => {
    try {
      await resend().unwrap();
      await AsyncStorage.setItem(RESEND_KEY, Date.now().toString());
      setTimer(COOLDOWN);
    } catch {}
  };

  const handleConfirm = async () => {
    try {
      await confirm({ code }).unwrap();
      navigation.replace('MainTabs');
    } catch {}
  };

  const format = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Please confirm your email</Text>

      <TouchableOpacity
        style={[styles.btn, (timer > 0 || resending) && styles.disabled]}
        disabled={timer > 0 || resending}
        onPress={handleResend}
      >
        <Text style={styles.btnText}>
          {timer > 0 ? `Resend in ${format(timer)}` : 'Send confirmation email'}
        </Text>
      </TouchableOpacity>
      {resendError && (
        <Text style={styles.error}>
          {(resendError as any).data?.message || 'Failed to send email'}
        </Text>
      )}

      <TextInput
        style={styles.input}
        placeholder="Confirmation code"
        value={code}
        onChangeText={setCode}
      />

      <TouchableOpacity
        style={[styles.btn, (timer === 0 || confirming) && styles.disabled]}
        disabled={timer === 0 || confirming}
        onPress={handleConfirm}
      >
        <Text style={styles.btnText}>
          {confirming ? 'Confirming…' : 'Confirm email'}
        </Text>
      </TouchableOpacity>
      {confirmError && (
        <Text style={styles.error}>
          {(confirmError as any).data?.message || 'Invalid or expired code'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 24 },
  btn: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 12,
  },
  btnText: { color: 'white', fontSize: 16, fontWeight: '600' },
  disabled: { backgroundColor: '#A0A0A0' },
  input: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  },
  error: { color: 'red', marginBottom: 12 },
});
