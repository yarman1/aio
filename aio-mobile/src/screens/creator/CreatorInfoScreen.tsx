import React from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  ActivityIndicator,
  Alert,
  StatusBar,
  StyleSheet,
  Platform,
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import {
  useGetCreatorPublicQuery,
  useFollowCreatorMutation,
  useUnfollowCreatorMutation,
} from '../../services/baseAPI';
import { CreatorTabsParamList } from '../../navigation/CreatorTabs';

const STATUS_BAR_HEIGHT =
  Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 44;

type InfoRouteProp = RouteProp<CreatorTabsParamList, 'Info'>;

export default function CreatorInfoScreen() {
  const route = useRoute<InfoRouteProp>();
  const { creatorId } = route.params;

  const {
    data: creator,
    isLoading,
    isError,
  } = useGetCreatorPublicQuery(creatorId, {
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  });

  const [follow] = useFollowCreatorMutation();
  const [unfollow] = useUnfollowCreatorMutation();

  const handleFollow = async () => {
    try {
      await follow(creatorId).unwrap();
    } catch {
      Alert.alert('Error', 'Could not follow creator.');
    }
  };

  const handleUnfollow = async () => {
    try {
      await unfollow(creatorId).unwrap();
    } catch {
      Alert.alert('Error', 'Could not unfollow creator.');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }
  if (isError || !creator) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Failed to load creator info.</Text>
      </View>
    );
  }

  const canToggleFollow = !creator.isSubscribed;

  return (
    <>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="dark-content"
      />
      <View style={{ height: STATUS_BAR_HEIGHT, backgroundColor: '#fff' }} />

      <View style={styles.container}>
        <View style={styles.header}>
          {creator.avatarUrl ? (
            <Image source={{ uri: creator.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.initial}>
                {creator.creatorUsername[0].toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={styles.username}>{creator.creatorUsername}</Text>
          {creator.isStripeAccountVerified && (
            <Text style={styles.verified}>✓ Verified</Text>
          )}
        </View>

        <Text style={styles.description}>{creator.description}</Text>

        {creator.isSubscribed ? (
          <Text style={styles.subscribedNotice}>
            You’re subscribed (and automatically following)
          </Text>
        ) : canToggleFollow ? (
          creator.isFollowed ? (
            <Pressable style={styles.unfollowBtn} onPress={handleUnfollow}>
              <Text style={styles.unfollowText}>Unfollow</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.followBtn} onPress={handleFollow}>
              <Text style={styles.followText}>Follow</Text>
            </Pressable>
          )
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },

  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 8,
  },
  avatarPlaceholder: {
    backgroundColor: '#DDD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initial: { fontSize: 36, color: '#666' },

  username: { fontSize: 24, fontWeight: '600' },
  verified: { marginTop: 4, color: '#4CAF50' },

  description: { fontSize: 16, color: '#444', marginBottom: 24 },

  subscribedNotice: {
    padding: 12,
    backgroundColor: '#eef',
    borderRadius: 8,
    textAlign: 'center',
  },

  followBtn: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
  },
  followText: { color: '#fff', textAlign: 'center', fontWeight: '600' },

  unfollowBtn: {
    borderColor: '#888',
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 8,
  },
  unfollowText: { color: '#444', textAlign: 'center', fontWeight: '600' },

  error: { color: 'red' },
});
