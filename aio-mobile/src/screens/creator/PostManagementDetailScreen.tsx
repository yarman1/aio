import React, { useEffect, useRef, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  Switch,
  Pressable,
  StyleSheet,
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

import {
  useGetPostByCreatorQuery,
  useUpdatePostMutation,
  useActivatePostMutation,
  useDeactivatePostMutation,
  useUploadPostHeaderMutation,
  useUploadPostImageMutation,
  useDeletePostImageMutation,
  useSetPollOptionsMutation,
  useClosePollMutation,
  useInitiateMediaUploadMutation,
  useUploadMediaPreviewMutation,
  useConfirmMediaUploadMutation,
  useRefreshMediaQuery,
} from '../../services/baseAPI';

import { RouteProp, useRoute } from '@react-navigation/native';
import { AppStackParamList } from '../../navigation/AppNavigator';

import {
  RichEditor,
  RichToolbar,
  actions,
} from 'react-native-pell-rich-editor';

import { Audio } from 'expo-av';
import Slider from '@react-native-community/slider';

import { useVideoPlayer, VideoView } from 'expo-video';
import { useEventListener } from 'expo';

type PostManagementDetailRouteProp = RouteProp<
  AppStackParamList,
  'PostManagementDetail'
>;

export default function PostManagementDetailScreen() {
  const route = useRoute<PostManagementDetailRouteProp>();
  const { postId } = route.params;

  const {
    data: post,
    isLoading: loadingPost,
    refetch: refetchPost,
  } = useGetPostByCreatorQuery(postId);

  const [updatePost, { isLoading: updatingPost }] = useUpdatePostMutation();
  const [activatePost, { isLoading: activating }] = useActivatePostMutation();
  const [deactivatePost, { isLoading: deactivating }] =
    useDeactivatePostMutation();

  const [uploadHeader, { isLoading: uploadingHeader }] =
    useUploadPostHeaderMutation();

  const [uploadPostImage, { isLoading: uploadingImage }] =
    useUploadPostImageMutation();

  const [deletePostImage, { isLoading: deletingImage }] =
    useDeletePostImageMutation();

  const [setPollOptions, { isLoading: settingOptions }] =
    useSetPollOptionsMutation();
  const [closePoll, { isLoading: closingPoll }] = useClosePollMutation();

  const [initiateMediaUpload, { isLoading: initiatingMedia }] =
    useInitiateMediaUploadMutation();
  const [uploadMediaPreview, { isLoading: uploadingPreview }] =
    useUploadMediaPreviewMutation();
  const [confirmMediaUpload, { isLoading: confirmingMedia }] =
    useConfirmMediaUploadMutation();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [commentsEnabled, setCommentsEnabled] = useState(true);

  const [pollOptions, setPollOptionsState] = useState<string[]>([]);
  const [optionsInitialized, setOptionsInitialized] = useState(false);

  const richTextRef = useRef<RichEditor>(null);

  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaUploadKey, setMediaUploadKey] = useState(0); // Force re-render of video player

  const [shouldRefreshMedia, setShouldRefreshMedia] = useState(false);
  const { refetch: refreshMedia } = useRefreshMediaQuery(
    { postId },
    { skip: !shouldRefreshMedia || !post?.media },
  );

  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState({
    positionMillis: 0,
    durationMillis: 1,
  });

  const loadSound = async () => {
    if (post?.type === 'AUDIO' && post.media) {
      try {
        if (soundRef.current) {
          await soundRef.current.unloadAsync();
          soundRef.current = null;
        }

        const { sound } = await Audio.Sound.createAsync({
          uri: post.media.mediaUrl,
        });
        soundRef.current = sound;

        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            setAudioProgress({
              positionMillis: status.positionMillis || 0,
              durationMillis: status.durationMillis || 1,
            });
            setIsPlayingAudio(status.isPlaying);
          } else if (status.error) {
            if (!isUploadingMedia) {
              console.warn('Audio error, refreshing media');
              setShouldRefreshMedia(true);
              refreshMedia().then(() => {
                setShouldRefreshMedia(false);
              });
            }
          }
        });
      } catch (err) {
        console.warn('Failed to load audio:', err);
        if (!isUploadingMedia) {
          setTimeout(loadSound, 2000);
        }
      }
    }
  };

  useEffect(() => {
    loadSound();
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    };
  }, [post?.media, mediaUploadKey]);

  const togglePlayPauseAudio = async () => {
    if (!soundRef.current) return;
    const status = await soundRef.current.getStatusAsync();
    if (status.isLoaded) {
      if (status.isPlaying) {
        await soundRef.current.pauseAsync();
      } else {
        await soundRef.current.playAsync();
      }
    } else {
      await loadSound();
    }
  };

  const videoPlayer = useVideoPlayer(
    post?.media && !isUploadingMedia ? { uri: post.media.mediaUrl } : null,
    (player) => {
      player.loop = false;
    },
  );

  const [showVideoPoster, setShowVideoPoster] = useState(true);

  useEffect(() => {
    if (post?.media) {
      setShowVideoPoster(true);
    }
  }, [post?.media, mediaUploadKey]);

  useEventListener(videoPlayer, 'statusChange', ({ error }: any) => {
    if (error && !isUploadingMedia) {
      console.warn('Video error, refreshing media');
      setShouldRefreshMedia(true);
      refreshMedia().then(() => {
        setShouldRefreshMedia(false);
        setShowVideoPoster(true);
      });
    }
  });

  useEventListener(
    videoPlayer,
    'playingChange',
    ({ isPlaying, oldIsPlaying }: any) => {
      if (isPlaying && !oldIsPlaying) {
        setShowVideoPoster(false);
      }
    },
  );

  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (post) {
      setName(post.name);
      setDescription(post.description || '');
      setCommentsEnabled(post.commentsEnabled);

      if (post.type === 'POLL' && !optionsInitialized) {
        if (post.poll && post.poll.options.length > 0) {
          const existing = post.poll.options.map((opt) => opt.text);
          setPollOptionsState(existing);
        } else {
          setPollOptionsState(['', '']);
        }
        setOptionsInitialized(true);
      }
    }
  }, [post, optionsInitialized]);

  const handleSave = async () => {
    if (!name.trim()) {
      return Alert.alert('Validation', 'Name cannot be empty.');
    }
    try {
      await updatePost({
        postId,
        name: name.trim(),
        description: description.trim(),
        commentsEnabled,
      }).unwrap();
      Alert.alert('Success', 'Post updated.');
      if (isMountedRef.current) {
        refetchPost();
      }
    } catch (err: any) {
      const apiError = err.data?.message;
      let displayMsg: string;

      if (Array.isArray(apiError)) {
        const uniqueMsgs = apiError.filter(
          (v, i, a) => v && a.indexOf(v) === i,
        );
        displayMsg = uniqueMsgs.join('\n');
      } else if (typeof apiError === 'string') {
        displayMsg = apiError;
      } else {
        displayMsg = 'Could not update post.';
      }

      Alert.alert('Error', displayMsg);
    }
  };

  const handleActivate = async () => {
    try {
      await activatePost(postId).unwrap();
      Alert.alert('Success', 'Post activated.');
      if (isMountedRef.current) {
        refetchPost();
      }
    } catch (err: any) {
      Alert.alert('Error', err.data?.message || 'Could not activate.');
    }
  };

  const handleDeactivate = async () => {
    try {
      await deactivatePost(postId).unwrap();
      Alert.alert('Success', 'Post moved to draft.');
      if (isMountedRef.current) {
        refetchPost();
      }
    } catch (err: any) {
      Alert.alert('Error', err.data?.message || 'Could not deactivate.');
    }
  };

  const pickAndUploadHeader = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Permission required',
          'Permission to access your photos is required to upload a header.',
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (result.canceled) {
        return;
      }
      const uri = result.assets?.[0]?.uri;
      if (!uri) {
        return Alert.alert('Error', 'No image selected.');
      }
      const info = await FileSystem.getInfoAsync(uri);
      if (!info.exists) {
        return Alert.alert('Error', 'Image file is not accessible.');
      }
      const filename = uri.split('/').pop() || `header_${postId}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const mimeType = match ? `image/${match[1].toLowerCase()}` : 'image';

      const formData = new FormData();
      formData.append('file', {
        uri,
        name: filename,
        type: mimeType,
      } as any);

      await uploadHeader({ postId, file: formData }).unwrap();
      Alert.alert('Success', 'Header image updated.');
      if (isMountedRef.current) {
        refetchPost();
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert('Upload Error', err.message || 'Could not upload header.');
    }
  };

  const pickAndUploadImage = async (order: number) => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Permission required',
          'Permission to access your photos is required to upload images.',
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (result.canceled) {
        return;
      }
      const uri = result.assets?.[0]?.uri;
      if (!uri) {
        return Alert.alert('Error', 'No image selected.');
      }
      const info = await FileSystem.getInfoAsync(uri);
      if (!info.exists) {
        return Alert.alert('Error', 'Image file is not accessible.');
      }
      const filename = uri.split('/').pop() || `image_${postId}_${order}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const mimeType = match ? `image/${match[1].toLowerCase()}` : 'image';

      const formData = new FormData();
      formData.append('file', {
        uri,
        name: filename,
        type: mimeType,
      } as any);
      formData.append('order', order.toString());

      await uploadPostImage({ postId, file: formData }).unwrap();
      Alert.alert('Success', `Image #${order} uploaded.`);
      if (isMountedRef.current) {
        refetchPost();
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert('Upload Error', err.message || 'Could not upload image.');
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    try {
      await deletePostImage({ postId, imageId }).unwrap();
      Alert.alert('Deleted', 'Image removed.');
      if (isMountedRef.current) {
        refetchPost();
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', err.data?.message || 'Could not delete image.');
    }
  };

  const handleSavePollOptions = async () => {
    const optionsToSend = pollOptions
      .map((text) => text.trim())
      .filter((text) => text.length > 0);

    if (optionsToSend.length < 2) {
      return Alert.alert(
        'Validation',
        'Please provide at least two poll options.',
      );
    }

    try {
      const payload = optionsToSend.map((text) => ({ text }));
      await setPollOptions({ postId, options: payload }).unwrap();
      Alert.alert('Success', 'Poll options saved.');
      if (isMountedRef.current) {
        refetchPost();
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', err.data?.message || 'Could not save options.');
    }
  };

  const handleClosePoll = async () => {
    try {
      await closePoll(postId).unwrap();
      Alert.alert('Success', 'Poll closed.');
      if (isMountedRef.current) {
        refetchPost();
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', err.data?.message || 'Could not close poll.');
    }
  };

  const pickAndUploadPreview = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Permission required',
          'Permission to access photos is required to upload a preview image.',
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (result.canceled) {
        return;
      }
      const uri = result.assets?.[0]?.uri;
      if (!uri) {
        return Alert.alert('Error', 'No image selected.');
      }
      const info = await FileSystem.getInfoAsync(uri);
      if (!info.exists) {
        return Alert.alert('Error', 'Image file is not accessible.');
      }
      const filename = uri.split('/').pop() || `preview_${postId}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const mimeType = match ? `image/${match[1].toLowerCase()}` : 'image';

      const formData = new FormData();
      formData.append('file', {
        uri,
        name: filename,
        type: mimeType,
      } as any);

      await uploadMediaPreview({ postId, file: formData }).unwrap();
      Alert.alert('Success', 'Preview image updated.');
      if (isMountedRef.current) {
        refetchPost();
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert('Upload Error', err.message || 'Could not upload preview.');
    }
  };

  const pickAndUploadMedia = async () => {
    if (isUploadingMedia) {
      return;
    }

    try {
      setIsUploadingMedia(true);

      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      let uri: string | undefined;
      let mimeType = '';

      if (post?.type === 'VIDEO') {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert(
            'Permission required',
            'Permission to access your videos is required.',
          );
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        });
        if (result.canceled) return;

        uri = result.assets?.[0]?.uri;
        if (!uri) {
          return Alert.alert('Error', 'No video selected.');
        }

        mimeType = 'video/mp4';
      } else if (post?.type === 'AUDIO') {
        const result = await DocumentPicker.getDocumentAsync({
          type: 'audio/*',
        });

        if (result.canceled || !result.assets || result.assets.length === 0) {
          return;
        }

        const asset = result.assets[0];
        uri = asset.uri;
        mimeType = asset.mimeType || 'audio/mpeg';
      }

      if (!uri) {
        return;
      }

      const info = await FileSystem.getInfoAsync(uri);
      if (!info.exists) {
        return Alert.alert('Error', 'Selected file is not accessible.');
      }

      const { url } = await initiateMediaUpload({
        postId,
        contentType: mimeType,
      }).unwrap();

      const uploadResult = await FileSystem.uploadAsync(url, uri, {
        httpMethod: 'PUT',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: {
          'Content-Type': mimeType,
        },
        sessionType: FileSystem.FileSystemSessionType.BACKGROUND,
      });

      if (uploadResult.status < 200 || uploadResult.status >= 300) {
        return Alert.alert(
          'Upload Error',
          `Failed to upload (status ${uploadResult.status}).`,
        );
      }

      await confirmMediaUpload({ postId, contentType: mimeType }).unwrap();

      setMediaUploadKey((prev) => prev + 1);

      Alert.alert('Success', `${post?.type} file uploaded.`);

      if (isMountedRef.current) {
        await refetchPost();
      }
    } catch (err: any) {
      console.error('Media upload error:', err);
      Alert.alert(
        'Upload Error',
        err.data?.message || err.message || 'Could not upload media.',
      );
    } finally {
      setIsUploadingMedia(false);
    }
  };

  if (loadingPost) {
    return <ActivityIndicator style={styles.center} size="large" />;
  }
  if (!post) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.heading}>Post not found.</Text>
      </SafeAreaView>
    );
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

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.sectionTitle}>Header Image</Text>
        {post.headerUrl ? (
          <Image
            source={{ uri: post.headerUrl }}
            style={styles.headerPreview}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.noHeaderPlaceholder}>
            <Text style={styles.noHeaderText}>No header set</Text>
          </View>
        )}
        <Pressable
          style={[
            styles.uploadButton,
            (uploadingHeader || uploadingImage || isUploadingMedia) &&
              styles.buttonDisabled,
          ]}
          onPress={pickAndUploadHeader}
          disabled={uploadingHeader || uploadingImage || isUploadingMedia}
        >
          {uploadingHeader ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.uploadButtonText}>
              {post.headerUrl ? 'Change Header Image' : 'Upload Header Image'}
            </Text>
          )}
        </Pressable>

        {post.type === 'TEXT' && (
          <>
            <Text style={styles.sectionTitle}>Post Images</Text>
            <View style={styles.imagesRow}>
              {[1, 2, 3, 4, 5].map((order) => {
                const existing = post.images.find((img) => img.order === order);
                return (
                  <View key={order} style={styles.imageSlot}>
                    {existing ? (
                      <>
                        <Image
                          source={{ uri: existing.url }}
                          style={styles.thumbnail}
                          resizeMode="cover"
                        />
                        <Pressable
                          style={styles.deleteButton}
                          onPress={() => handleDeleteImage(existing.id)}
                          disabled={deletingImage || isUploadingMedia}
                        >
                          <Text style={styles.deleteText}>
                            {deletingImage ? '...' : 'Delete'}
                          </Text>
                        </Pressable>
                      </>
                    ) : (
                      <Pressable
                        style={styles.placeholder}
                        onPress={() => pickAndUploadImage(order)}
                        disabled={
                          uploadingHeader || uploadingImage || isUploadingMedia
                        }
                      >
                        {uploadingImage ? (
                          <ActivityIndicator color="#888" />
                        ) : (
                          <Text style={styles.plusText}>+</Text>
                        )}
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>
          </>
        )}

        {post.type === 'POLL' && (
          <>
            <Text style={styles.sectionTitle}>Poll Options</Text>

            {post.poll?.options && post.poll.options.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <Text
                  style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}
                >
                  Current Votes
                </Text>
                {post.poll.options.map((opt) => (
                  <View
                    key={opt.id}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      paddingVertical: 4,
                    }}
                  >
                    <Text style={{ fontSize: 14, flex: 1 }}>{opt.text}</Text>
                    <Text style={{ fontSize: 14, fontWeight: '600' }}>
                      {opt.voteCount}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {!post.poll?.isClosed && (
              <>
                {pollOptions.map((opt, idx) => (
                  <View key={idx} style={styles.pollOptionRow}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder={`Option ${idx + 1}`}
                      value={opt}
                      onChangeText={(text) => {
                        const updated = [...pollOptions];
                        updated[idx] = text;
                        setPollOptionsState(updated);
                      }}
                      editable={!isUploadingMedia}
                    />
                    <Pressable
                      style={styles.removeOptionButton}
                      onPress={() => {
                        const updated = [...pollOptions];
                        updated.splice(idx, 1);
                        setPollOptionsState(updated);
                      }}
                      disabled={isUploadingMedia}
                    >
                      <Text style={styles.removeOptionText}>✕</Text>
                    </Pressable>
                  </View>
                ))}

                <Pressable
                  style={[styles.addOptionButton]}
                  onPress={() => setPollOptionsState([...pollOptions, ''])}
                  disabled={isUploadingMedia}
                >
                  <Text style={styles.addOptionText}>+ Add Option</Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.button,
                    (settingOptions || uploadingImage || isUploadingMedia) &&
                      styles.buttonDisabled,
                  ]}
                  onPress={handleSavePollOptions}
                  disabled={
                    settingOptions || uploadingImage || isUploadingMedia
                  }
                >
                  {settingOptions ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Save Poll Options</Text>
                  )}
                </Pressable>
              </>
            )}

            {post.status === 'ACTIVE' && !post.poll?.isClosed && (
              <Pressable
                style={[
                  styles.button,
                  styles.deactivateButton,
                  closingPoll && styles.buttonDisabled,
                ]}
                onPress={handleClosePoll}
                disabled={closingPoll}
              >
                {closingPoll ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Close Poll</Text>
                )}
              </Pressable>
            )}

            {post.poll?.isClosed && (
              <Text style={styles.closedNotice}>Poll is closed</Text>
            )}

            <View style={styles.sectionSeparator} />
          </>
        )}

        {post.type === 'VIDEO' && post.media?.mediaUrl && (
          <View style={styles.videoWrapper}>
            {showVideoPoster ? (
              <Pressable
                style={styles.posterContainer}
                onPress={() => {
                  videoPlayer.play();
                }}
              >
                <Image
                  source={{ uri: post.media.previewUrl }}
                  style={styles.media}
                  resizeMode="contain"
                />
                <View style={styles.playOverlay}>
                  <Text style={styles.playIcon}>▶︎</Text>
                </View>
              </Pressable>
            ) : (
              <VideoView
                player={videoPlayer}
                style={styles.media}
                contentFit="contain"
                nativeControls
              />
            )}
          </View>
        )}

        {post.type === 'AUDIO' && post.media?.mediaUrl && (
          <View style={styles.audioWrapper}>
            <Pressable onPress={togglePlayPauseAudio} style={styles.playButton}>
              <Text style={styles.playButtonText}>
                {isPlayingAudio ? '⏸ Pause' : '▶ Play'}
              </Text>
            </Pressable>
            <View style={styles.progressRow}>
              <Text style={styles.timeText}>
                {Math.floor(audioProgress.positionMillis / 1000)}s
              </Text>
              <Text style={styles.timeText}>
                {Math.floor(audioProgress.durationMillis / 1000)}s
              </Text>
            </View>
            <Slider
              style={{ width: '100%', height: 40 }}
              minimumValue={0}
              maximumValue={audioProgress.durationMillis}
              value={audioProgress.positionMillis}
              onSlidingComplete={(pos) =>
                soundRef.current?.setPositionAsync(pos)
              }
            />
            <Text style={styles.percentText}>
              {Math.round(
                (audioProgress.positionMillis / audioProgress.durationMillis) *
                  100,
              )}
              %
            </Text>
          </View>
        )}

        {(post.type === 'VIDEO' || post.type === 'AUDIO') && (
          <>
            <Text style={styles.sectionTitle}>Media Upload</Text>

            <Text style={styles.subTitle}>Preview (Thumbnail)</Text>
            {post.media?.previewUrl ? (
              <Image
                source={{ uri: post.media.previewUrl }}
                style={styles.previewImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.noPreviewPlaceholder}>
                <Text style={styles.noPreviewText}>No preview set</Text>
              </View>
            )}
            <Pressable
              style={[
                styles.uploadButton,
                uploadingPreview && styles.buttonDisabled,
              ]}
              onPress={pickAndUploadPreview}
              disabled={uploadingPreview}
            >
              {uploadingPreview ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.uploadButtonText}>
                  {post.media?.previewUrl
                    ? 'Change Preview Image'
                    : 'Upload Preview Image'}
                </Text>
              )}
            </Pressable>

            <Text style={styles.subTitle}>
              {post.type === 'VIDEO' ? 'Video File' : 'Audio File'}
            </Text>
            {post.media?.mediaUrl ? (
              <Text style={styles.uploadedNotice}>
                {post.type === 'VIDEO'
                  ? 'Video already uploaded'
                  : 'Audio already uploaded'}
              </Text>
            ) : (
              <Text style={styles.uploadedNotice}>No media uploaded</Text>
            )}
            <Pressable
              style={[
                styles.button,
                (initiatingMedia || confirmingMedia) && styles.buttonDisabled,
              ]}
              onPress={pickAndUploadMedia}
              disabled={initiatingMedia || confirmingMedia}
            >
              {initiatingMedia || confirmingMedia ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>
                  {post.media?.mediaUrl
                    ? `Re-upload ${post.type.toLowerCase()}`
                    : `Upload ${post.type}`}
                </Text>
              )}
            </Pressable>

            <View style={styles.sectionSeparator} />
          </>
        )}

        <Text style={styles.sectionTitle}>Edit Post</Text>

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Post name"
        />

        <Text style={[styles.label, { marginTop: 12 }]}>Description</Text>

        <RichToolbar
          editor={richTextRef}
          actions={[
            actions.setBold,
            actions.setItalic,
            actions.setUnderline,
            actions.insertBulletsList,
            actions.insertOrderedList,
            actions.insertLink,
            actions.setStrikethrough,
            actions.setParagraph,
          ]}
          style={styles.richToolbar}
        />

        <View style={styles.richContainer}>
          <RichEditor
            ref={richTextRef}
            initialContentHTML={description}
            onChange={(html) => setDescription(html)}
            placeholder="Start typing..."
            style={styles.richEditor}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.label}>Comments Enabled</Text>
          <Switch
            value={commentsEnabled}
            onValueChange={async (value) => {
              setCommentsEnabled(value);
              await updatePost({
                postId,
                commentsEnabled: value,
              }).unwrap();
              refetchPost();
            }}
          />
        </View>

        <Pressable
          style={[styles.button, updatingPost && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={updatingPost}
        >
          {updatingPost ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Save Changes</Text>
          )}
        </Pressable>

        {post.isReadyForActivation && post.status === 'DRAFT' && (
          <Pressable
            style={[
              styles.button,
              styles.activateButton,
              activating && styles.buttonDisabled,
            ]}
            onPress={handleActivate}
            disabled={activating}
          >
            {activating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Activate Post</Text>
            )}
          </Pressable>
        )}

        {post.status === 'ACTIVE' && (
          <Pressable
            style={[
              styles.button,
              styles.deactivateButton,
              deactivating && styles.buttonDisabled,
            ]}
            onPress={handleDeactivate}
            disabled={deactivating}
          >
            {deactivating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Deactivate (Draft)</Text>
            )}
          </Pressable>
        )}

        {commentsEnabled && post.comments.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Comments</Text>
            {post.comments.map((c) => (
              <View key={c.id} style={styles.commentItem}>
                <Text style={styles.commentAuthor}>{c.user.userName}</Text>
                <Text style={styles.commentText}>{c.content}</Text>
              </View>
            ))}
            <View style={styles.sectionSeparator} />
          </>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  safe: { flex: 1, backgroundColor: '#fff' },
  statusBarShim: { width: '100%', backgroundColor: '#fff' },
  container: { padding: 16 },

  heading: {
    fontSize: 20,
    fontWeight: '700',
    margin: 16,
    textAlign: 'center',
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  subTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },

  headerPreview: {
    width: '100%',
    height: 200,
    borderRadius: 6,
    marginBottom: 8,
    backgroundColor: '#EEE',
  },
  noHeaderPlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 6,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  noHeaderText: {
    color: '#888',
    fontSize: 14,
  },
  uploadButton: {
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: '#007bff',
    borderRadius: 6,
    alignItems: 'center',
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  imagesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  imageSlot: {
    width: '30%',
    aspectRatio: 1,
    marginBottom: 12,
    alignItems: 'center',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  deleteButton: {
    position: 'absolute',
    bottom: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  deleteText: {
    color: '#fff',
    fontSize: 12,
  },
  placeholder: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CCC',
    backgroundColor: '#FAFAFA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusText: {
    fontSize: 32,
    color: '#888',
  },

  pollOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  removeOptionButton: {
    marginLeft: 8,
    backgroundColor: '#dc3545',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  removeOptionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  addOptionButton: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  addOptionText: {
    color: '#007bff',
    fontSize: 16,
    fontWeight: '600',
  },
  closedNotice: {
    color: '#555',
    fontStyle: 'italic',
    marginBottom: 12,
  },

  videoWrapper: {
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  posterContainer: {
    position: 'relative',
    width: '100%',
    height: 250,
    backgroundColor: '#000',
  },
  media: {
    width: '100%',
    height: 250,
    backgroundColor: '#000',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  playIcon: {
    fontSize: 48,
    color: '#fff',
  },

  audioWrapper: {
    marginBottom: 16,
  },
  playButton: {
    padding: 12,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    alignItems: 'center',
  },
  playButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  timeText: {
    fontSize: 12,
    color: '#333',
  },
  percentText: {
    textAlign: 'center',
    marginTop: 4,
    fontSize: 12,
    color: '#555',
  },

  previewImage: {
    width: '100%',
    height: 180,
    borderRadius: 6,
    marginBottom: 8,
    backgroundColor: '#EEE',
  },
  noPreviewPlaceholder: {
    width: '100%',
    height: 180,
    borderRadius: 6,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  noPreviewText: {
    color: '#888',
    fontSize: 14,
  },
  uploadedNotice: {
    fontStyle: 'italic',
    color: '#555',
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

  input: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 6,
    padding: 8,
    backgroundColor: '#FAFAFA',
    fontSize: 14,
    marginTop: 4,
  },

  richToolbar: {
    backgroundColor: '#F0F0F0',
    borderColor: '#DDD',
    borderWidth: 1,
    borderRadius: 6,
    marginTop: 8,
  },
  richContainer: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 6,
    marginTop: 4,
    minHeight: 160,
    backgroundColor: '#FAFAFA',
  },
  richEditor: {
    flex: 1,
    minHeight: 150,
    padding: 4,
  },

  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },

  button: {
    marginTop: 16,
    paddingVertical: 14,
    backgroundColor: '#28A745',
    borderRadius: 6,
    alignItems: 'center',
  },
  activateButton: {
    backgroundColor: '#007bff',
    marginTop: 16,
  },
  deactivateButton: {
    backgroundColor: '#dc3545',
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  commentItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: '#EEE',
  },
  commentAuthor: {
    fontWeight: '600',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
  },
});
