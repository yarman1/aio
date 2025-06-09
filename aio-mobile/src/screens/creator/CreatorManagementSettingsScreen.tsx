import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
} from 'react-native';
import {
  useGetMyCreatorQuery,
  useCreateCreatorMutation,
  useUpdateCreatorUsernameMutation,
  useUpdateCreatorDescriptionMutation,
  useUpdateCreatorAvatarMutation,
  useUpdateStripeAccountMutation,
  useGetStripeDashboardQuery,
  useGetCredentialsQuery,
  useCreateCredentialMutation,
  useRevokeCredentialMutation,
} from '../../services/baseAPI';

import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as Clipboard from 'expo-clipboard';

export default function CreatorManagementSettingsScreen() {
  const {
    data: creator,
    isLoading: loadingCreator,
    refetch: refetchCreator,
  } = useGetMyCreatorQuery(undefined, {
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  });

  const [createCreator, { isLoading: creatingCreator }] =
    useCreateCreatorMutation();
  const [updUsername, { isLoading: savingUsername }] =
    useUpdateCreatorUsernameMutation();
  const [updDescription, { isLoading: savingDesc }] =
    useUpdateCreatorDescriptionMutation();
  const [updAvatar] = useUpdateCreatorAvatarMutation();
  const [updateStripeAccount, { isLoading: loadingAcctUpd }] =
    useUpdateStripeAccountMutation();
  const { data: dashData, isLoading: loadingDash } =
    useGetStripeDashboardQuery();

  const {
    data: credentials,
    isLoading: loadingCreds,
    refetch: refetchCreds,
  } = useGetCredentialsQuery(undefined);
  const [createCred, { isLoading: creatingCred }] =
    useCreateCredentialMutation();
  const [revokeCred, { isLoading: revokingCred }] =
    useRevokeCredentialMutation();

  const [username, setUsername] = useState('');
  const [description, setDescription] = useState('');

  const [showCredModal, setShowCredModal] = useState(false);
  const [newClientId, setNewClientId] = useState('');
  const [newClientSecret, setNewClientSecret] = useState('');

  useEffect(() => {
    refetchCreator();
    if (creator) {
      setUsername(creator.creatorUsername);
      setDescription(creator.description);
    }
  }, [creator, refetchCreator]);

  const handleChangeAvatar = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const { uri } = res.assets[0];
      const info = await FileSystem.getInfoAsync(uri);
      if (!info.exists) return Alert.alert('Error', 'Image not accessible.');

      const fd = new FormData();
      fd.append('avatar', {
        uri,
        name: 'avatar.jpg',
        type: 'image/jpeg',
      } as any);

      await updAvatar(fd).unwrap();
      Alert.alert('Success', 'Avatar updated.');
    } catch (err: any) {
      console.warn(err);
      Alert.alert('Upload failed', err.message || 'Please try again.');
    }
  };

  const handleSaveUsername = async () => {
    if (!username.trim()) {
      return Alert.alert('Validation', 'Username cannot be empty.');
    }
    try {
      await updUsername({ creatorUsername: username.trim() }).unwrap();
      Alert.alert('Success', 'Username updated.');
    } catch (err: any) {
      Alert.alert('Error', err.data?.message || 'Could not update username.');
    }
  };

  const handleSaveDescription = async () => {
    try {
      await updDescription({ description }).unwrap();
      Alert.alert('Success', 'Description updated.');
    } catch (err: any) {
      Alert.alert(
        'Error',
        err.data?.message || 'Could not update description.',
      );
    }
  };

  const handleOnboarding = async () => {
    try {
      await createCreator({
        creatorUsername: username.trim(),
      }).unwrap();
      Alert.alert('Success', 'Creator is created. Verify via Stripe.');
    } catch (err: any) {
      Alert.alert(
        'Error',
        err.data?.message || 'Could not start Stripe onboarding.',
      );
    }
  };

  const handleAccountUpdate = async () => {
    try {
      const { url } = await updateStripeAccount().unwrap();
      await Linking.openURL(url);
    } catch (err: any) {
      Alert.alert(
        'Error',
        err.data?.message || 'Could not open Stripe account update.',
      );
    }
  };

  const handleOpenDashboard = async () => {
    if (dashData?.url) {
      await Linking.openURL(dashData.url);
    } else {
      Alert.alert('Error', 'Could not load Stripe dashboard.');
    }
  };

  const handleCreateCredential = async () => {
    try {
      const { clientId, clientSecret } = await createCred().unwrap();
      setNewClientId(clientId);
      setNewClientSecret(clientSecret);
      setShowCredModal(true);
      refetchCreds();
    } catch (err: any) {
      Alert.alert(
        'Error',
        err.data?.message || 'Could not create API credential.',
      );
    }
  };

  const handleRevokeCredential = async (clientId: string) => {
    try {
      await revokeCred({ clientId }).unwrap();
      Alert.alert('Success', 'Credential revoked.');
      refetchCreds();
    } catch (err: any) {
      Alert.alert('Error', err.data?.message || 'Could not revoke key.');
    }
  };

  if (loadingCreator) {
    return <ActivityIndicator style={styles.center} size="large" />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="dark-content"
      />
      <View
        style={[
          styles.statusBarShim,
          { height: Platform.OS === 'android' ? StatusBar.currentHeight : 44 },
        ]}
      />

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.heading}>
          {creator ? 'Manage Your Creator Account' : 'Create Creator Account'}
        </Text>

        {creator && (
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Stripe Status:</Text>
            {creator.isStripeAccountVerified ? (
              <Text style={[styles.infoValue, styles.verified]}>
                Verified ✅
              </Text>
            ) : (
              <Text style={[styles.infoValue, styles.notVerified]}>
                Not Verified ❌
              </Text>
            )}
          </View>
        )}

        {!creator ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Creator username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
            <Pressable
              style={[
                styles.button,
                (!username.trim() || creatingCreator) && styles.buttonDisabled,
              ]}
              onPress={handleOnboarding}
              disabled={creatingCreator || !username.trim()}
            >
              {creatingCreator ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Create & Verify</Text>
              )}
            </Pressable>
          </>
        ) : (
          <>
            <Pressable onPress={handleChangeAvatar} style={styles.avatarBtn}>
              {creator.avatarUrl ? (
                <Image
                  source={{ uri: creator.avatarUrl }}
                  style={styles.avatar}
                />
              ) : (
                <Text style={styles.avatarPlaceholder}>
                  {creator.creatorUsername[0].toUpperCase()}
                </Text>
              )}
            </Pressable>

            <Text style={styles.label}>Username</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
              <Pressable
                style={[
                  styles.smallBtn,
                  (savingUsername || !username.trim()) && styles.buttonDisabled,
                ]}
                onPress={handleSaveUsername}
                disabled={savingUsername || !username.trim()}
              >
                {savingUsername ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.smallBtnText}>Save</Text>
                )}
              </Pressable>
            </View>

            <Text style={styles.label}>Description</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={description}
                onChangeText={setDescription}
                multiline
              />
              <Pressable
                style={[styles.smallBtn, savingDesc && styles.buttonDisabled]}
                onPress={handleSaveDescription}
                disabled={savingDesc}
              >
                {savingDesc ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.smallBtnText}>Save</Text>
                )}
              </Pressable>
            </View>

            <View style={styles.divider} />
            {creator.isStripeAccountVerified ? (
              <>
                <Pressable
                  style={[
                    styles.button,
                    loadingAcctUpd && styles.buttonDisabled,
                  ]}
                  onPress={handleAccountUpdate}
                  disabled={loadingAcctUpd}
                >
                  {loadingAcctUpd ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Update Stripe Info</Text>
                  )}
                </Pressable>

                <Pressable
                  style={[
                    styles.button,
                    { backgroundColor: '#444' },
                    loadingDash && styles.buttonDisabled,
                  ]}
                  onPress={handleOpenDashboard}
                  disabled={loadingDash}
                >
                  {loadingDash ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Open Stripe Dashboard</Text>
                  )}
                </Pressable>
              </>
            ) : (
              <Pressable
                style={[
                  styles.button,
                  creatingCreator && styles.buttonDisabled,
                ]}
                onPress={handleAccountUpdate}
                disabled={creatingCreator}
              >
                {creatingCreator ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Verify via Stripe</Text>
                )}
              </Pressable>
            )}

            <View style={styles.divider} />
            <Text style={styles.subHeading}>API Credentials</Text>

            <Pressable
              style={[
                styles.button,
                (creatingCred || loadingCreds) && styles.buttonDisabled,
              ]}
              onPress={handleCreateCredential}
              disabled={creatingCred || loadingCreds}
            >
              {creatingCred ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Create New API Key</Text>
              )}
            </Pressable>

            {loadingCreds ? (
              <ActivityIndicator style={{ marginTop: 12 }} />
            ) : credentials && credentials.length > 0 ? (
              credentials.map((item) => (
                <View key={item.clientId} style={styles.credentialRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.credentialId}>{item.clientId}</Text>
                    <Text style={styles.credentialDate}>
                      Created: {new Date(item.createdAt).toLocaleString()}
                    </Text>
                  </View>
                  <Pressable
                    style={[
                      styles.revokeBtn,
                      revokingCred && styles.buttonDisabled,
                    ]}
                    onPress={() => handleRevokeCredential(item.clientId)}
                    disabled={revokingCred}
                  >
                    {revokingCred ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.revokeText}>Revoke</Text>
                    )}
                  </Pressable>
                </View>
              ))
            ) : (
              <Text
                style={{ fontStyle: 'italic', color: '#555', marginTop: 12 }}
              >
                No active credentials
              </Text>
            )}
          </>
        )}
      </ScrollView>
      <Modal
        visible={showCredModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCredModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.subHeading}>New API Credentials</Text>
            <Text style={styles.modalLabel}>Client ID:</Text>
            <Text selectable style={styles.modalCode}>
              {newClientId}
            </Text>
            <Pressable
              style={styles.copyBtn}
              onPress={() => Clipboard.setStringAsync(newClientId)}
            >
              <Text style={styles.copyText}>Copy Client ID</Text>
            </Pressable>

            <Text style={[styles.modalLabel, { marginTop: 12 }]}>
              Client Secret:
            </Text>
            <Text selectable style={styles.modalCode}>
              {newClientSecret}
            </Text>
            <Pressable
              style={styles.copyBtn}
              onPress={() => Clipboard.setStringAsync(newClientSecret)}
            >
              <Text style={styles.copyText}>Copy Client Secret</Text>
            </Pressable>

            <Pressable
              style={[styles.button, { marginTop: 20 }]}
              onPress={() => setShowCredModal(false)}
            >
              <Text style={styles.buttonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  safe: { flex: 1, backgroundColor: '#fff' },
  statusBarShim: { width: '100%', backgroundColor: '#fff' },
  container: {
    padding: 16,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  subHeading: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '600',
  },

  infoBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 6,
    color: '#333',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  verified: { color: 'green' },
  notVerified: { color: 'red' },

  avatarBtn: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EEE',
    textAlign: 'center',
    lineHeight: 80,
    fontSize: 32,
    color: '#888',
  },

  label: {
    marginTop: 12,
    marginBottom: 4,
    fontWeight: '600',
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 8,
    padding: 8,
    backgroundColor: '#FAFAFA',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  smallBtn: {
    marginLeft: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  smallBtnText: {
    color: '#fff',
    fontWeight: '600',
  },

  button: {
    marginTop: 16,
    backgroundColor: '#28A745',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },

  divider: {
    height: 1,
    backgroundColor: '#EEE',
    marginVertical: 20,
  },

  credentialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: '#EEE',
  },
  credentialId: {
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Menlo',
    fontSize: 14,
  },
  credentialDate: {
    fontSize: 12,
    color: '#666',
  },
  revokeBtn: {
    marginLeft: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#DC3545',
    borderRadius: 6,
  },
  revokeText: {
    color: '#fff',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalBox: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    width: '85%',
    alignItems: 'center',
  },
  modalLabel: {
    fontWeight: '600',
    fontSize: 14,
    alignSelf: 'flex-start',
  },
  modalCode: {
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Menlo',
    fontSize: 14,
    color: '#333',
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  copyBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#007AFF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 6,
  },
  copyText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
});
