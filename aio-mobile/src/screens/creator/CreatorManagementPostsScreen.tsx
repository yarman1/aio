import React, { useCallback, useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import {
  useGetMyCreatorQuery,
  useGetCreatorCategoriesQuery,
  useSearchByCreatorPostsQuery,
  useCreatePostMutation,
} from '../../services/baseAPI';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { PostType } from '../../services/baseAPI';

type PostsNavProp = NativeStackNavigationProp<
  AppStackParamList,
  'CreatorManagement'
>;

export default function CreatorManagementPostsScreen() {
  const navigation = useNavigation<PostsNavProp>();

  const { data: creator, isLoading: loadingCreator } = useGetMyCreatorQuery();
  const {
    data: categories,
    isLoading: loadingCategories,
    error: categoriesError,
  } = useGetCreatorCategoriesQuery();

  const [inputValue, setInputValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(
    undefined,
  );
  const [selectedType, setSelectedType] = useState<string | undefined>(
    undefined,
  );
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [allPosts, setAllPosts] = useState<any[]>([]);

  useEffect(() => {
    setPage(1);
    setAllPosts([]);
  }, [searchTerm, selectedCategory, selectedType]);

  const {
    data: postsData,
    isLoading: loadingPosts,
    refetch: refetchPosts,
  } = useSearchByCreatorPostsQuery(
    {
      page,
      limit,
      type: selectedType,
      categoryId: selectedCategory,
      name: searchTerm || undefined,
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

  const [newType, setNewType] = useState<PostType>('TEXT');
  const [newName, setNewName] = useState('');
  const [newCategoryId, setNewCategoryId] = useState<number | null>(null);
  const [createPost, { isLoading: creatingPost }] = useCreatePostMutation();

  useFocusEffect(
    useCallback(() => {
      if (creator) {
        setPage(1);
      }
      return () => {};
    }, [creator]),
  );

  const handleCreatePost = async () => {
    if (!newName.trim() || newCategoryId === null) {
      return Alert.alert('Validation', 'Name and category are required.');
    }
    try {
      const post = await createPost({
        type: newType,
        name: newName.trim(),
        categoryId: newCategoryId,
      }).unwrap();
      setNewName('');
      setNewCategoryId(null);

      setPage(1);
      setAllPosts([]);
      refetchPosts();

      navigation.navigate('PostManagementDetail', {
        postId: post.id,
      });
    } catch (err: any) {
      Alert.alert('Error', err.data?.message || 'Could not create post.');
    }
  };

  if (loadingCreator) {
    return <ActivityIndicator style={styles.center} size="large" />;
  }
  if (!creator) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.heading}>
          You must create/verify your Creator account first.
        </Text>
      </SafeAreaView>
    );
  }

  type SinglePost = (typeof allPosts)[number];

  const renderPost = ({ item }: { item: SinglePost }) => (
    <Pressable
      style={styles.postListItem}
      onPress={() =>
        navigation.navigate('PostManagementDetail', {
          postId: item.id,
        })
      }
    >
      <Text style={styles.postName}>{item.name}</Text>
      <Text style={styles.postDetail}>
        {item.type} · {item.status} · {item.category.name}
      </Text>
    </Pressable>
  );

  const STATUS_BAR_HEIGHT =
    Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 44;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="dark-content"
      />
      <View style={{ height: STATUS_BAR_HEIGHT, backgroundColor: '#fff' }} />

      <FlatList
        data={allPosts}
        keyExtractor={(p) => p.id.toString()}
        renderItem={renderPost}
        onEndReached={() => {
          if (postsData && postsData.posts.length === limit) {
            setPage((prev) => prev + 1);
          }
        }}
        onEndReachedThreshold={0.5}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
        ListEmptyComponent={() => {
          const anyFilter =
            searchTerm !== '' ||
            selectedCategory !== undefined ||
            selectedType !== undefined;
          return anyFilter ? (
            <Text style={styles.noResults}>No posts found</Text>
          ) : null;
        }}
        ListFooterComponent={() =>
          loadingPosts ? <ActivityIndicator style={styles.indicator} /> : null
        }
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            <Text style={styles.sectionTitle}>Create a New Post</Text>

            <Text style={styles.label}>Type</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={newType}
                onValueChange={(v) => setNewType(v as PostType)}
              >
                <Picker.Item label="Text" value="TEXT" />
                <Picker.Item label="Poll" value="POLL" />
                <Picker.Item label="Video" value="VIDEO" />
                <Picker.Item label="Audio" value="AUDIO" />
              </Picker>
            </View>

            <Text style={[styles.label, { marginTop: 12 }]}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Post name"
              value={newName}
              onChangeText={setNewName}
            />

            <Text style={[styles.label, { marginTop: 12 }]}>Category</Text>
            {loadingCategories ? (
              <ActivityIndicator size="small" style={{ marginVertical: 8 }} />
            ) : (
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={newCategoryId}
                  onValueChange={(v) => setNewCategoryId(v as number)}
                >
                  <Picker.Item label="Select category…" value={null} />
                  {categories?.map((c) => (
                    <Picker.Item key={c.id} label={c.name} value={c.id} />
                  ))}
                </Picker>
              </View>
            )}

            <Pressable
              style={[
                styles.button,
                (!newName.trim() || newCategoryId === null || creatingPost) &&
                  styles.buttonDisabled,
              ]}
              onPress={handleCreatePost}
              disabled={
                !newName.trim() || newCategoryId === null || creatingPost
              }
            >
              {creatingPost ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Create Post</Text>
              )}
            </Pressable>

            <View style={styles.sectionSeparator} />
            <Text style={styles.sectionTitle}>Existing Posts</Text>

            <View style={styles.filters}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search posts…"
                value={inputValue}
                onChangeText={setInputValue}
                onSubmitEditing={() => {
                  setSearchTerm(inputValue);
                  setPage(1);
                }}
                returnKeyType="search"
              />

              {loadingCategories ? (
                <ActivityIndicator />
              ) : categoriesError ? (
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
                    <Picker.Item
                      key={c.id}
                      label={c.name}
                      value={c.id.toString()}
                    />
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
          </View>
        }
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  safe: { flex: 1, backgroundColor: '#fff' },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    margin: 16,
    textAlign: 'center',
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionSeparator: {
    height: 1,
    backgroundColor: '#EEE',
    marginVertical: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 6,
    backgroundColor: '#FAFAFA',
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 6,
    padding: 8,
    backgroundColor: '#FAFAFA',
    fontSize: 14,
    marginTop: 4,
  },
  button: {
    marginTop: 16,
    paddingVertical: 14,
    backgroundColor: '#28A745',
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  filters: {
    marginTop: 12,
    marginBottom: 16,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 6,
    padding: 8,
    backgroundColor: '#FAFAFA',
    fontSize: 14,
    marginBottom: 8,
  },
  picker: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 6,
    backgroundColor: '#FAFAFA',
    marginBottom: 8,
  },
  listContent: {
    paddingBottom: 60,
  },
  postListItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  postName: {
    fontSize: 16,
    fontWeight: '600',
  },
  postDetail: {
    fontSize: 14,
    color: '#555',
    marginTop: 4,
  },
  itemSeparator: {
    height: 1,
    backgroundColor: '#EEE',
  },
  noResults: {
    textAlign: 'center',
    marginVertical: 16,
    color: '#555',
  },
  error: {
    color: '#dc3545',
    marginVertical: 8,
    textAlign: 'center',
  },
  indicator: {
    marginVertical: 16,
  },
});
