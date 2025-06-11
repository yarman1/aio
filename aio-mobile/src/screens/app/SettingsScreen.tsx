import React from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  StatusBar,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSelector } from '../../store/hooks';
import { useNavigation } from '@react-navigation/native';
import type { AppStackNavigationProp } from '../../navigation/AppNavigator';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import {
  useUpdateAvatarMutation,
  useIsCreatorExistQuery,
} from '../../services/baseAPI';

export default function SettingsScreen() {
  const navigation = useNavigation<AppStackNavigationProp>();
  const user = useAppSelector((s) => s.auth.user);
  const [updateAvatar] = useUpdateAvatarMutation();

  const { data: creatorExists, isLoading: loadingExist } =
    useIsCreatorExistQuery();

  const handleChangeAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const { uri } = result.assets[0];
      const info =
        Platform.OS === 'web'
          ? { exists: true }
          : await FileSystem.getInfoAsync(uri);

      if (!info.exists) {
        return Alert.alert('Error', 'Image file is not accessible.');
      }

      const formData = new FormData();
      formData.append('avatar', {
        uri,
        name: 'avatar.jpg',
        type: 'image/jpeg',
      } as any);

      await updateAvatar(formData).unwrap();
      Alert.alert('Success', 'Avatar updated.');
    } catch (err: any) {
      console.error(err);
      Alert.alert('Upload Error', err.message || 'Could not upload avatar.');
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
              Platform.OS === 'android'
                ? StatusBar.currentHeight
                : /* approx iOS */ 44,
          },
        ]}
      />

      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
        </SafeAreaView>

        <View style={styles.profileSection}>
          <Pressable onPress={handleChangeAvatar} style={styles.largeAvatarBtn}>
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
          </Pressable>
          <Text style={styles.username}>{user?.userName || 'Username'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          {!user?.isEmailConfirmed && (
            <Pressable
              onPress={() => navigation.navigate('ConfirmEmail')}
              style={styles.confirmBtn}
            >
              <Text style={styles.confirmBtnText}>Confirm Email</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.options}>
          <Pressable
            onPress={() => navigation.navigate('ChangeUsername')}
            style={styles.optionItem}
          >
            <Text style={styles.optionText}>Change Username</Text>
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate('ChangePassword')}
            style={styles.optionItem}
          >
            <Text style={styles.optionText}>Change Password</Text>
          </Pressable>
          <Pressable onPress={handleChangeAvatar} style={styles.optionItem}>
            <Text style={styles.optionText}>Change Avatar</Text>
          </Pressable>

          {/* — Creator Account CTA — */}
          <View style={styles.creatorSection}>
            {!user?.isEmailConfirmed ? (
              <Text style={styles.disabledText}>
                Confirm your email to become a creator
              </Text>
            ) : loadingExist ? (
              <ActivityIndicator style={{ marginVertical: 16 }} />
            ) : creatorExists?.result ? (
              <Pressable
                style={styles.optionItem}
                onPress={() => navigation.navigate('CreatorManagement')}
              >
                <Text style={styles.optionText}>Go to Creator Dashboard</Text>
              </Pressable>
            ) : (
              <Pressable
                style={styles.optionItem}
                onPress={() => navigation.navigate('CreatorManagement')}
              >
                <Text style={styles.optionText}>Create Creator Account</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  statusBarPlaceholder: {
    width: '100%',
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderColor: '#E5E5E5',
  },
  largeAvatarBtn: {
    height: 96,
    width: 96,
    borderRadius: 48,
    backgroundColor: '#E5E5E5',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  largeAvatar: {
    width: '100%',
    height: '100%',
  },
  largeAvatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#555',
  },
  username: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  confirmBtn: {
    backgroundColor: '#FFF4E5',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#D87F01',
  },
  options: {
    marginTop: 8,
  },
  optionItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: '#E5E5E5',
  },
  optionText: {
    fontSize: 16,
  },
  creatorSection: {
    marginTop: 24,
    borderTopWidth: 1,
    borderColor: '#E5E5E5',
    paddingTop: 16,
  },
  disabledText: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
  },
});
