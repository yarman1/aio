import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  ActivityIndicator,
  Image,
  Pressable,
  StatusBar,
  StyleSheet,
  Platform,
} from 'react-native';
import {
  useSearchCreatorsQuery,
  useGetMyCreatorQuery,
} from '../../services/baseAPI';
import { useNavigation } from '@react-navigation/native';
import type { AppStackNavigationProp } from '../../navigation/AppNavigator';

const STATUS_BAR_HEIGHT =
  Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 44;

export default function SearchScreen() {
  const navigation = useNavigation<AppStackNavigationProp>();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;
  const [allCreators, setAllCreators] = useState<any[]>([]);

  const { data, isFetching, isError, refetch } = useSearchCreatorsQuery(
    { name: searchTerm, page, limit },
    {
      skip: searchTerm.length === 0,
      refetchOnMountOrArgChange: true,
    },
  );

  const {
    data: myCreator,
    isLoading: loadingMyCreator,
    isError: myCreatorError,
  } = useGetMyCreatorQuery();

  useEffect(() => {
    if (data?.creators) {
      setAllCreators((prev) => {
        if (page === 1) return data.creators;
        const newItems = data.creators.filter(
          (newItem) => !prev.some((p) => p.id === newItem.id),
        );
        return [...prev, ...newItems];
      });
    }
  }, [data, page]);

  const handleSearchSubmit = () => {
    setPage(1);
    setAllCreators([]);
    refetch();
  };

  const renderItem = ({ item }: any) => (
    <Pressable
      style={styles.card}
      onPress={() => {
        if (
          myCreator &&
          !loadingMyCreator &&
          !myCreatorError &&
          item.id === myCreator.id
        ) {
          navigation.navigate('CreatorManagement');
        } else {
          navigation.navigate('Creator', { creatorId: item.id });
        }
      }}
    >
      {item.avatarUrl ? (
        <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Text style={styles.initial}>
            {item.creatorUsername[0]?.toUpperCase()}
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

      <View style={styles.searchContainer}>
        <TextInput
          value={searchTerm}
          onChangeText={(text) => {
            setSearchTerm(text);
            setPage(1);
            setAllCreators([]);
          }}
          placeholder="Search creators..."
          style={styles.searchInput}
          onSubmitEditing={handleSearchSubmit}
          returnKeyType="search"
        />
      </View>

      {isFetching && page === 1 ? (
        <ActivityIndicator style={{ marginTop: 20 }} />
      ) : isError ? (
        <Text style={styles.error}>Failed to load creators</Text>
      ) : (
        <FlatList
          data={allCreators}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          onEndReached={() => {
            if (data && data.creators.length === limit) {
              setPage((prev) => prev + 1);
            }
          }}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            searchTerm.length > 0 ? (
              <Text style={styles.noResults}>No creators found</Text>
            ) : null
          }
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  searchInput: {
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  card: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderColor: '#EEE',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    backgroundColor: '#DDD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontSize: 18,
    color: '#666',
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
  },
  description: {
    color: '#666',
    marginTop: 4,
  },
  verified: {
    color: '#4CAF50',
    fontSize: 18,
  },
  noResults: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
  },
  error: {
    textAlign: 'center',
    marginTop: 20,
    color: 'red',
  },
});
