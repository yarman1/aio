import React, { useEffect, useRef, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  Image,
  ActivityIndicator,
  Pressable,
  TextInput,
  Button,
  StyleSheet,
  Clipboard,
  Alert,
  useWindowDimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import RenderHTML from 'react-native-render-html';
import { Audio } from 'expo-av';
import Slider from '@react-native-community/slider';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEventListener } from 'expo';

import {
  useGetPostAuthenticatedQuery,
  useRefreshMediaQuery,
  useLikePostMutation,
  useUnlikePostMutation,
  useRepostPostMutation,
  useVotePollMutation,
  useCreateCommentMutation,
  useRecordPlayMutation,
} from '../../services/baseAPI';

type Params = RouteProp<
  { PostDetail: { postId: number; creatorId: number } },
  'PostDetail'
>;

export default function PostDetailScreen() {
  const { postId } = useRoute<Params>().params;
  const { width } = useWindowDimensions();
  const navigation = useNavigation();

  const {
    data: post,
    isLoading,
    refetch,
  } = useGetPostAuthenticatedQuery({ postId });

  useEffect(() => {
    if (post && post.hasAccess === false) {
      Alert.alert(
        'Access Denied',
        'You do not have permission to view this post.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
        { cancelable: false },
      );
    }
  }, [post, navigation]);

  const { refetch: refreshMedia } = useRefreshMediaQuery(
    { postId },
    { skip: !post?.media },
  );

  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState({
    positionMillis: 0,
    durationMillis: 1,
  });

  const loadSound = async () => {
    if (post?.type === 'AUDIO' && post.media) {
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
          if (status.didJustFinish) recordPlay({ postId });
        } else if (status.error) {
          console.warn('Audio error, refreshing media');
          refreshMedia();
          soundRef.current?.unloadAsync();
          soundRef.current = null;
          loadSound();
        }
      });
    }
  };

  useEffect(() => {
    loadSound();
    return () => {
      soundRef.current?.unloadAsync();
      soundRef.current = null;
    };
  }, [post?.media]);

  const togglePlayPauseAudio = async () => {
    if (!soundRef.current) return;
    const status = await soundRef.current.getStatusAsync();
    if (status.isLoaded) {
      if (status.isPlaying) {
        await soundRef.current.pauseAsync();
      } else {
        recordPlay({ postId });
        await soundRef.current.playAsync();
      }
    } else {
      loadSound();
    }
  };

  const refreshTimer = useRef<NodeJS.Timeout>();
  useEffect(() => {
    if (post?.media) {
      clearTimeout(refreshTimer.current!);
      refreshTimer.current = setTimeout(() => refreshMedia(), 14 * 60 * 1000);
      return () => clearTimeout(refreshTimer.current!);
    }
  }, [post?.media]);

  const videoPlayer = useVideoPlayer(
    post?.media ? { uri: post.media.mediaUrl } : null,
    (player) => {
      player.loop = false;
    },
  );

  const [showPoster, setShowPoster] = useState(true);

  useEventListener(videoPlayer, 'statusChange', ({ status, error }) => {
    if (error) {
      console.warn('Video error, refreshing media');
      refreshMedia();
    }
  });
  useEventListener(
    videoPlayer,
    'playingChange',
    ({ isPlaying, oldIsPlaying }) => {
      if (isPlaying && !oldIsPlaying) {
        setShowPoster(false);
        recordPlay({ postId });
      }
    },
  );

  const [likePost] = useLikePostMutation();
  const [unlikePost] = useUnlikePostMutation();
  const [repostPost] = useRepostPostMutation();
  const [votePoll] = useVotePollMutation();
  const [createComment] = useCreateCommentMutation();
  const [recordPlay] = useRecordPlayMutation();

  const handleLike = async () => {
    if (!post) return;
    post.isLiked
      ? await unlikePost({ postId: post.id })
      : await likePost({ postId });
    refetch();
  };

  const handleRepost = async () => {
    await repostPost({ postId });
    Clipboard.setString(`app://post/${postId}`);
    Alert.alert('Repost URL copied!');
    refetch();
  };

  const handleVote = async (optionId: number) => {
    try {
      await votePoll({ postId, optionId }).unwrap();
      refetch();
    } catch (err: any) {
      const msg =
        err?.data?.message || 'You’ve already voted or this poll is closed.';
      Alert.alert('Poll', msg);
    }
  };

  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<number | null>(null);

  const handleComment = async () => {
    const content = newComment.trim();
    if (!content) return;

    try {
      await createComment({
        postId,
        content,
        parentId: replyTo ?? undefined,
      }).unwrap();
      setNewComment('');
      setReplyTo(null);
      refetch();
    } catch (err: any) {
      Alert.alert('Error', 'Could not post comment.');
    }
  };

  if (isLoading || !post) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator style={{ flex: 1 }} />
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
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {post.headerUrl && (
          <Image source={{ uri: post.headerUrl }} style={styles.header} />
        )}

        <Text style={styles.title}>{post.name}</Text>

        <View style={styles.descriptionCard}>
          <RenderHTML
            contentWidth={width - 32}
            source={{ html: post.description }}
          />
        </View>

        {post.images.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.gallery}
          >
            {post.images.map((img) => (
              <Image
                key={img.id}
                source={{ uri: img.url }}
                style={styles.galleryImage}
              />
            ))}
          </ScrollView>
        )}

        {post.type === 'VIDEO' && post.media && (
          <View style={styles.videoWrapper}>
            {showPoster ? (
              <Pressable
                style={styles.posterContainer}
                onPress={() => videoPlayer.play()}
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

        {post.type === 'AUDIO' && (
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

        {post.type === 'POLL' && post.poll
          ? (() => {
              const pollData = post.poll;
              return (
                <View style={styles.pollWrapper}>
                  <Text style={styles.pollTitle}>Poll</Text>
                  {pollData.options.map((opt) => {
                    const total = pollData.options.reduce(
                      (sum, o) => sum + o.voteCount,
                      0,
                    );
                    const pct = total > 0 ? (opt.voteCount / total) * 100 : 0;

                    return (
                      <Pressable
                        key={opt.id}
                        onPress={() => handleVote(opt.id)}
                        style={styles.pollOption}
                      >
                        <View style={styles.pollOptionHeader}>
                          <Text style={styles.pollOptionText}>{opt.text}</Text>
                          <Text style={styles.pollPercentText}>
                            {pct.toFixed(0)}%
                          </Text>
                        </View>
                        <View style={styles.pollBarBackground}>
                          <View
                            style={[styles.pollBarFill, { width: `${pct}%` }]}
                          />
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              );
            })()
          : null}

        <View style={styles.actionsBar}>
          <Pressable onPress={handleLike} style={styles.actionButton}>
            <Text style={styles.actionText}>
              {post.isLiked ? '❤️' : '🤍'} {post.likesCount}
            </Text>
          </Pressable>
          <Pressable onPress={handleRepost} style={styles.actionButton}>
            <Text style={styles.actionText}>🔁 {post.repostsCount}</Text>
          </Pressable>
        </View>

        <View style={styles.commentsSection}>
          {post.comments.map((c) => (
            <View key={c.id} style={styles.commentCard}>
              <Text style={styles.commentAuthor}>{c.user.userName}</Text>
              <Text>{c.content}</Text>

              <Pressable
                onPress={() => setReplyTo(c.id)}
                style={styles.replyButton}
              >
                <Text style={styles.replyButtonText}>Reply</Text>
              </Pressable>

              {c.replies?.map((r) => (
                <View key={r.id} style={styles.replyCard}>
                  <Text style={styles.commentAuthor}>{r.user.userName}</Text>
                  <Text>{r.content}</Text>
                </View>
              ))}
            </View>
          ))}

          {post.commentsEnabled && (
            <View style={styles.newCommentSection}>
              {replyTo != null && (
                <View style={styles.replyingTo}>
                  <Text style={{ flex: 1 }}>
                    Replying to{' '}
                    {post.comments.find((c) => c.id === replyTo)!.user.userName}
                  </Text>
                  <Pressable onPress={() => setReplyTo(null)}>
                    <Text style={styles.cancelReply}>×</Text>
                  </Pressable>
                </View>
              )}

              <TextInput
                style={styles.newCommentInput}
                value={newComment}
                onChangeText={setNewComment}
                placeholder={
                  replyTo != null ? 'Write a reply…' : 'Write a comment…'
                }
                multiline
              />
              <Button title="Send" onPress={handleComment} />
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },
  descriptionCard: {
    backgroundColor: '#F9F9F9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  descriptionText: {
    fontSize: 16,
    color: '#333',
  },
  gallery: {
    marginBottom: 16,
  },
  galleryImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginRight: 12,
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
  actionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: '#EFEFEF',
    borderRadius: 8,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
  },
  actionText: {
    fontSize: 16,
  },
  pollWrapper: {
    marginBottom: 16,
  },
  pollTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  pollOption: {
    marginBottom: 12,
  },
  pollOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  pollOptionText: {
    fontSize: 16,
    flexShrink: 1,
  },
  pollPercentText: {
    fontSize: 16,
    fontWeight: '600',
  },
  pollBarBackground: {
    height: 8,
    backgroundColor: '#EEE',
    borderRadius: 4,
    overflow: 'hidden',
  },
  pollBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  commentsSection: {
    marginTop: 24,
  },
  commentCard: {
    backgroundColor: '#FCFCFC',
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
  },
  commentAuthor: {
    fontWeight: '600',
    marginBottom: 4,
  },
  replyButton: {
    marginTop: 8,
  },
  replyButtonText: {
    color: '#2196F3',
    fontSize: 14,
  },
  replyCard: {
    marginLeft: 16,
    marginTop: 8,
    backgroundColor: '#FFF',
    padding: 8,
    borderRadius: 6,
  },
  newCommentSection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderColor: '#eee',
    paddingTop: 16,
  },
  replyingTo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cancelReply: {
    fontSize: 18,
    paddingHorizontal: 8,
    color: '#999',
  },
  newCommentInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
});
