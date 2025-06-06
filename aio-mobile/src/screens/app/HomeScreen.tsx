import React from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  Pressable,
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Platform,
} from 'react-native';
import { useGetFollowedCreatorsQuery } from '../../services/baseAPI';
import { useNavigation } from '@react-navigation/native';
import type { AppStackNavigationProp } from '../../navigation/AppNavigator';
import { AvatarMenu } from '../../components/AvatarMenu';

const STATUS_BAR_HEIGHT =
  Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 44;
const AVATAR_TOP_OFFSET = STATUS_BAR_HEIGHT + 10;

export default function HomeScreen() {
  const navigation = useNavigation<AppStackNavigationProp>();
  const { data, isLoading, isError, refetch } = useGetFollowedCreatorsQuery();

  const renderItem = ({ item }: any) => (
    <Pressable
      style={styles.card}
      onPress={() => navigation.navigate('Creator', { creatorId: item.id })}
    >
      {item.avatarUrl ? (
        <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Text style={styles.initial}>
            {item.creatorUsername[0].toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.username}>{item.creatorUsername}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
      {item.isStripeAccountVerified && <Text style={styles.verified}>✓</Text>}
    </Pressable>
  );

  return (
    <>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="dark-content"
      />
      <View style={{ height: STATUS_BAR_HEIGHT, backgroundColor: '#fff' }} />

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 20 }} />
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.error}>Failed to load followed creators.</Text>
          <Pressable onPress={refetch}>
            <Text style={styles.retry}>Tap to retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(c) => c.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingTop: AVATAR_TOP_OFFSET + 16 }}
          ListHeaderComponent={() => (
            <Text style={styles.sectionTitle}>Following creators</Text>
          )}
          ListEmptyComponent={() => (
            <Text style={styles.noResults}>
              You’re not following any creators yet.
            </Text>
          )}
        />
      )}

      <AvatarMenu topOffset={AVATAR_TOP_OFFSET} />
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    paddingHorizontal: 16,
    marginBottom: 8,
  },

  card: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderColor: '#EEE',
    alignItems: 'center',
  },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: {
    backgroundColor: '#DDD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { fontSize: 18, color: '#666' },

  info: { flex: 1, marginLeft: 12 },
  username: { fontSize: 16, fontWeight: '600' },
  description: { color: '#666', marginTop: 4 },

  verified: { color: '#4CAF50', fontSize: 18 },

  noResults: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
  },

  error: { textAlign: 'center', color: 'red' },
  retry: {
    marginTop: 8,
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
});
