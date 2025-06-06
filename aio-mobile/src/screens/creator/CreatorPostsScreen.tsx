import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';
import {
  useRoute,
  RouteProp,
  useNavigation,
  useFocusEffect,
} from '@react-navigation/native';
import { CreatorTabsParamList } from '../../navigation/CreatorTabs';
import {
  useGetCreatorCategoriesPublicQuery,
  useSearchCreatorPostsQuery,
} from '../../services/baseAPI';
import { Picker } from '@react-native-picker/picker';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
type AppNavProp = NativeStackNavigationProp<AppStackParamList>;

type PostsRoute = RouteProp<CreatorTabsParamList, 'Posts'>;

export default function CreatorPostsScreen() {
  const { creatorId } = useRoute<PostsRoute>().params;

  const navigation = useNavigation<AppNavProp>();

  const [page, setPage] = useState(1);
  const limit = 10;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(
    undefined,
  );
  const [selectedType, setSelectedType] = useState<string | undefined>(
    undefined,
  );
  const [allPosts, setAllPosts] = useState<any[]>([]);

  useEffect(() => {
    setPage(1);
    setAllPosts([]);
  }, [searchTerm, selectedCategory, selectedType]);

  const {
    data: categories,
    isFetching: catsLoading,
    isError: catsError,
  } = useGetCreatorCategoriesPublicQuery(creatorId);

  const {
    data: postsData,
    isFetching: postsLoading,
    isError: postsError,
    refetch,
  } = useSearchCreatorPostsQuery(
    {
      creatorId,
      page,
      limit,
      name: searchTerm || undefined,
      categoryId: selectedCategory,
      type: selectedType,
    },
    {
      refetchOnMountOrArgChange: true,
      refetchOnFocus: true,
    },
  );

  useEffect(() => {
    if (postsData?.posts) {
      setAllPosts((prev) => {
        const newItems = postsData.posts.filter(
          (newItem) => !prev.some((p) => p.id === newItem.id),
        );
        return page === 1 ? postsData.posts : [...prev, ...newItems];
      });
    }
  }, [postsData, page]);

  useFocusEffect(
    useCallback(() => {
      setPage(1);
      refetch();
    }, [refetch]),
  );

  type SinglePost = (typeof allPosts)[number];

  const renderPost = ({ item }: { item: SinglePost }) => (
    <Pressable
      style={styles.card}
      onPress={() =>
        navigation.navigate('PostDetail', {
          creatorId,
          postId: item.id,
        })
      }
      disabled={!item.hasAccess}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.postTitle}>{item.name}</Text>
        <Text style={styles.postDesc}>{item.description}</Text>
        <View style={styles.meta}>
          <Text style={styles.category}>{item.category.name}</Text>
          <Text style={styles.type}>{item.type}</Text>
        </View>
      </View>
      <Text
        style={[
          styles.accessBadge,
          item.hasAccess ? styles.open : styles.locked,
        ]}
      >
        {item.hasAccess ? '✓' : '🔒'}
      </Text>
    </Pressable>
  );

  const STATUS_BAR_HEIGHT =
    Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 44;

  return (
    <>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="dark-content"
      />
      <View style={{ height: STATUS_BAR_HEIGHT, backgroundColor: '#fff' }} />

      <View style={styles.filters}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search posts…"
          value={searchTerm}
          onChangeText={setSearchTerm}
          onSubmitEditing={() => setPage(1)}
          returnKeyType="search"
        />

        {catsLoading ? (
          <ActivityIndicator />
        ) : catsError ? (
          <Text style={styles.error}>Failed to load categories</Text>
        ) : (
          <Picker<string>
            selectedValue={
              selectedCategory !== undefined
                ? selectedCategory.toString()
                : 'ALL'
            }
            onValueChange={(val) => {
              const normalized = val === 'ALL' ? undefined : Number(val);
              setSelectedCategory(normalized);
              setPage(1);
            }}
            style={styles.picker}
          >
            <Picker.Item label="All categories" value="ALL" />
            {categories!.map((c) => (
              <Picker.Item key={c.id} label={c.name} value={c.id.toString()} />
            ))}
          </Picker>
        )}

        <Picker<string>
          selectedValue={selectedType ?? 'ALL'}
          onValueChange={(val) => {
            const normalized = val === 'ALL' ? undefined : val;
            setSelectedType(normalized);
            setPage(1);
          }}
          style={styles.picker}
        >
          <Picker.Item label="All types" value="ALL" />
          <Picker.Item label="Text" value="TEXT" />
          <Picker.Item label="Poll" value="POLL" />
          <Picker.Item label="Video" value="VIDEO" />
          <Picker.Item label="Audio" value="AUDIO" />
        </Picker>
      </View>

      {postsLoading && page === 1 ? (
        <ActivityIndicator style={styles.indicator} />
      ) : postsError ? (
        <Text style={styles.error}>Failed to load posts</Text>
      ) : (
        <FlatList
          data={allPosts}
          keyExtractor={(p) => p.id.toString()}
          renderItem={renderPost}
          onEndReached={() => {
            if (postsData && postsData.posts.length === limit) {
              setPage((p) => p + 1);
            }
          }}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={() => {
            const anyFilter =
              searchTerm !== '' ||
              selectedCategory !== undefined ||
              selectedType !== undefined;
            return anyFilter ? (
              <Text style={styles.noResults}>No posts found</Text>
            ) : null;
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  filters: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  searchInput: {
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  picker: {
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    marginBottom: 8,
  },
  card: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderColor: '#EEE',
    alignItems: 'center',
  },
  postTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  postDesc: {
    color: '#666',
    marginTop: 4,
  },
  meta: {
    flexDirection: 'row',
    marginTop: 6,
  },
  category: {
    color: '#444',
    marginRight: 16,
  },
  type: {
    color: '#444',
  },
  accessBadge: {
    fontSize: 18,
    marginLeft: 12,
  },
  open: {
    color: '#4CAF50',
  },
  locked: {
    color: '#F44336',
  },
  indicator: {
    marginTop: 20,
  },
  error: {
    textAlign: 'center',
    marginTop: 20,
    color: 'red',
  },
  noResults: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
  },
});
