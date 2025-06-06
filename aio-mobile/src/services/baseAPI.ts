import {
  BaseQueryFn,
  createApi,
  FetchArgs,
  fetchBaseQuery,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store/store';
import {
  logout,
  setCredentials,
  updateErrorMessage,
  updateUser,
} from '../slices/authSlice';
import { useNavigation } from '@react-navigation/native';
import { AuthStackNavigationProp } from '../navigation/AuthNavigator';
import { LogBox } from 'react-native';

LogBox.ignoreLogs([/Support for defaultProps will be removed/]);

interface ITokens {
  accessToken: string;
  refreshToken: string;
  deviceId: string;
}

interface ITokenRes {
  accessToken: string;
  refreshToken: string;
  deviceId: string;
}

interface ISignInReq {
  email: string;
  password: string;
}

interface ISignUpReq {
  email: string;
  userName: string;
  password: string;
}

interface IRecoveryReq {
  email: string;
}

interface IUpdateUserInfoReq {
  userName: string;
}

interface IUpdatePasswordReq {
  oldPassword: string;
  newPassword: string;
}

interface IUserInfo {
  id: number;
  email: string;
  userName: string;
  createdAt: string;
  isEmailConfirmed: boolean;
  avatarUrl?: string;
}

interface ISignInResponse {
  tokens: ITokenRes;
  user: IUserInfo;
}

interface IConfirmEmailReq {
  code: string;
}

export type PostType = 'TEXT' | 'POLL' | 'VIDEO' | 'AUDIO';

export interface Category {
  id: number;
  name: string;
  isPublic: boolean;
}

export interface Image {
  id: number;
  key: string;
  order: number;
  url: string;
}

export interface PollOption {
  id: number;
  text: string;
  voteCount: number;
}

export interface Poll {
  id: number;
  isClosed: boolean;
  options: PollOption[];
}

export interface Media {
  id: number;
  mediaKey: string;
  previewKey: string;
  uploaded: boolean;
  mediaUrl: string;
  previewUrl: string;
}

export interface Creator {
  id: number;
  creatorUsername: string;
  description: string;
  isStripeAccountVerified: boolean;
  avatarUrl?: string;
}

export interface Comment {
  id: number;
  content: string;
  postId: number;
  userId: number;
  parentId: number | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    userName: string;
    avatarUrl: string | null;
  };
  replies?: Comment[];
}

export interface Post {
  id: number;
  type: PostType;
  name: string;
  description: string;
  status: string;
  categoryId: number;
  category: Category;
  commentsEnabled: boolean;
  isReadyForActivation: boolean;
  createdAt: string;
  updatedAt: string;
  likesCount: number;
  repostsCount: number;
  isLiked: boolean;
  hasAccess?: boolean; // only for video/audio
  headerKey: string | null;
  headerUrl?: string;
  images: Image[];
  poll?: Poll;
  media?: Media;
  comments: Comment[];
}

export interface CreatorCategory {
  id: number;
  name: string;
  isPublic: boolean;
}

export interface ExternalBenefit {
  id: number;
  name: string;
}

export interface Plan {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  description: string;
  price: string;
  isArchived: boolean;
  interval: string; // e.g. "month" | "year" | ...
  intervalCount: number; // e.g. 1, 3, 12, …
  creatorCategories: CreatorCategory[];
  externalBenefits: ExternalBenefit[];
}

const baseQuery = fetchBaseQuery({
  baseUrl: process.env.EXPO_PUBLIC_API_BASE,
  prepareHeaders: (headers: Headers, { getState }) => {
    const token = (getState() as RootState).auth.accessToken;
    if (token) headers.set('Authorization', `Bearer ${token}`);
    headers.set('x-client-type', 'mobile');
    return headers;
  },
});

const refreshQuery = fetchBaseQuery({
  baseUrl: process.env.EXPO_PUBLIC_API_BASE,
  prepareHeaders: (headers: Headers, { getState }) => {
    headers.set('x-client-type', 'mobile');

    const refreshToken = (getState() as RootState).auth.refreshToken;
    const deviceId = (getState() as RootState).auth.deviceId;
    if (refreshToken && deviceId) {
      headers.set('x-refresh-token', refreshToken);
      headers.set('x-device-id', deviceId);
    }
    return headers;
  },
});

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  api.dispatch(updateErrorMessage(''));

  let result = await baseQuery(args, api, extraOptions);
  if (result.error && result.error.status === 401) {
    const refreshResult = await refreshQuery(
      '/auth/refresh',
      api,
      extraOptions,
    );
    const tokens = refreshResult.data as ITokens;
    if (tokens.accessToken && tokens.refreshToken && tokens.deviceId) {
      api.dispatch(setCredentials(tokens));
      result = await baseQuery(args, api, extraOptions);
    } else {
      api.dispatch(logout());
      const navigationAuth = useNavigation<AuthStackNavigationProp>();
      navigationAuth.navigate('Login');
    }
  }

  if (result.error) {
    const errorData = result.error?.data as any;
    let errorMessage = '';

    if (errorData && typeof errorData === 'object') {
      if (Array.isArray(errorData.message)) {
        errorMessage = errorData.message
          .filter(
            (value: string, index: number, array: string[]) =>
              array.indexOf(value) === index,
          )
          .join('\n');
      } else if (typeof errorData.message === 'string') {
        errorMessage = errorData.message;
      } else if (errorData.description) {
        errorMessage = errorData.description;
      }
    } else {
      errorMessage = 'Unknown error occurred.';
    }

    api.dispatch(updateErrorMessage(errorMessage));
  }

  return result;
};

export const baseAPI = createApi({
  reducerPath: 'baseAPI',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'Auth',
    'User',
    'Creator',
    'CreatorPublic',
    'Followed',
    'CreatorCategories',
    'MyCreatorCategories',
    'MyPlans',
    'CreatorPosts',
    'CreatorPlans',
    'SubscriptionInfo',
    'Post',
    'ManagementPosts',
    'Credentials',
  ],
  endpoints: (build) => ({
    requestRecoveryMobile: build.mutation<void, { email: string }>({
      query: (body) => ({
        url: '/auth/recovery-mobile',
        method: 'POST',
        body,
      }),
    }),

    /**
     * PUT /auth/reset-password
     * Body: { token, newPassword }
     * Returns 204 on success, or 400/404 with JSON { statusCode, message, error }
     */
    resetPassword: build.mutation<void, { token: string; newPassword: string }>(
      {
        query: (body) => ({
          url: '/auth/reset-password',
          method: 'PUT',
          body,
        }),
      },
    ),
    getCredentials: build.query<
      { clientId: string; createdAt: string }[],
      void
    >({
      query: () => '/credentials',
      providesTags: (result) =>
        result
          ? [
              ...result.map((c) => ({
                type: 'Credentials' as const,
                id: c.clientId,
              })),
              { type: 'Credentials' as const, id: 'LIST' },
            ]
          : [{ type: 'Credentials' as const, id: 'LIST' }],
    }),

    // ➜  POST /credentials   (create a new credential pair)
    createCredential: build.mutation<
      { clientId: string; clientSecret: string },
      void
    >({
      query: () => ({
        url: '/credentials',
        method: 'POST',
      }),
      invalidatesTags: [{ type: 'Credentials', id: 'LIST' }],
    }),

    // ➜  DELETE /credentials/:clientId   (revoke a credential)
    revokeCredential: build.mutation<void, { clientId: string }>({
      query: ({ clientId }) => ({
        url: `/credentials/${clientId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { clientId }) => [
        { type: 'Credentials', id: clientId },
      ],
    }),

    //
    // ─── ◆  RECOMMENDATIONS  ◆ ────────────────────────────────────────────
    //
    // GET  /recommendations/creator-category/:id?date=YYYY-MM-DD
    getCategoryRecommendations: build.query<
      { recommendation: string },
      { categoryId: number; date?: string }
    >({
      query: ({ categoryId, date }) => ({
        url: `/recommendations/creator-category/${categoryId}`,
        params: date ? { date } : {},
      }),
      // no invalidation needed—this is read‐only
    }),

    // GET  /recommendations/creator-plan/:planId?date=YYYY-MM-DD
    getPlanRecommendations: build.query<
      { recommendation: string },
      { planId: number; date?: string }
    >({
      query: ({ planId, date }) => ({
        url: `/recommendations/creator-plan/${planId}`,
        params: date ? { date } : {},
      }),
    }),
    //
    // ─── ◆  POSTS  ◆ ───────────────────────────────────────────────────────
    //
    // POST   /posts
    createPost: build.mutation<
      Post,
      { type: PostType; name: string; categoryId: number }
    >({
      query: (body) => ({
        url: '/posts',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'ManagementPosts', id: 'PARTIAL-LIST' }],
    }),

    // PUT   /posts/:id
    updatePost: build.mutation<
      Post,
      {
        postId: number;
        name?: string;
        description?: string;
        commentsEnabled?: boolean;
      }
    >({
      query: ({ postId, ...rest }) => ({
        url: `/posts/${postId}`,
        method: 'PUT',
        body: rest,
      }),
      invalidatesTags: (result) =>
        result ? [{ type: 'ManagementPosts' as const, id: result.id }] : [],
    }),

    // PUT   /posts/:id/activate
    activatePost: build.mutation<Post, number>({
      query: (postId) => ({
        url: `/posts/${postId}/activate`,
        method: 'PUT',
      }),
      invalidatesTags: (result) =>
        result ? [{ type: 'ManagementPosts' as const, id: result.id }] : [],
    }),

    // PUT   /posts/:id/deactivate
    deactivatePost: build.mutation<Post, number>({
      query: (postId) => ({
        url: `/posts/${postId}/deactivate`,
        method: 'PUT',
      }),
      invalidatesTags: (result) =>
        result ? [{ type: 'ManagementPosts' as const, id: result.id }] : [],
    }),

    // GET   /posts/creator/:id
    getPostByCreator: build.query<Post, number>({
      query: (postId) => `/posts/creator/${postId}`,
      providesTags: (result) =>
        result ? [{ type: 'ManagementPosts' as const, id: result.id }] : [],
    }),

    // GET   /posts/creator/search-posts?page=&limit=&…
    searchByCreatorPosts: build.query<
      { posts: Post[]; total: number },
      {
        page: number;
        limit: number;
        categoryId?: number;
        name?: string;
        type?: string;
      }
    >({
      query: ({ page, limit, categoryId, name, type }) => ({
        url: '/posts/creator/search-posts',
        params: {
          page,
          limit,
          ...(categoryId ? { categoryId } : {}),
          ...(name ? { name } : {}),
          ...(type ? { type } : {}),
        },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.posts.map((p) => ({
                type: 'ManagementPosts' as const,
                id: p.id,
              })),
              { type: 'ManagementPosts' as const, id: 'PARTIAL-LIST' },
            ]
          : [{ type: 'ManagementPosts' as const, id: 'PARTIAL-LIST' }],
    }),

    // POST /posts/:id/header
    uploadPostHeader: build.mutation<Post, { postId: number; file: FormData }>({
      query: ({ postId, file }) => ({
        url: `/posts/${postId}/header`,
        method: 'POST',
        body: file,
      }),
      invalidatesTags: (result) =>
        result ? [{ type: 'ManagementPosts' as const, id: result.id }] : [],
    }),

    // POST /posts/:id/images
    uploadPostImage: build.mutation<Post, { postId: number; file: FormData }>({
      query: ({ postId, file }) => ({
        url: `/posts/${postId}/images`,
        method: 'POST',
        body: file,
      }),
      invalidatesTags: (result) =>
        result ? [{ type: 'ManagementPosts' as const, id: result.id }] : [],
    }),

    // DELETE /posts/:postId/images/:imageId
    deletePostImage: build.mutation<Post, { postId: number; imageId: number }>({
      query: ({ postId, imageId }) => ({
        url: `/posts/${postId}/images/${imageId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result) =>
        result ? [{ type: 'ManagementPosts' as const, id: result.id }] : [],
    }),

    // POST /posts/:id/media/initiate
    initiateMediaUpload: build.mutation<
      { key: string; url: string },
      { postId: number; contentType: string }
    >({
      query: ({ postId, contentType }) => ({
        url: `/posts/${postId}/media/initiate`,
        method: 'POST',
        body: { contentType },
      }),
    }),

    // POST /posts/:id/media/confirm
    confirmMediaUpload: build.mutation<
      Post,
      { postId: number; contentType: string }
    >({
      query: ({ postId, contentType }) => ({
        url: `/posts/${postId}/media/confirm`,
        method: 'POST',
        body: { contentType },
      }),
      invalidatesTags: (result) =>
        result ? [{ type: 'ManagementPosts' as const, id: result.id }] : [],
    }),

    // POST /posts/:id/media/preview
    uploadMediaPreview: build.mutation<
      Post,
      { postId: number; file: FormData }
    >({
      query: ({ postId, file }) => ({
        url: `/posts/${postId}/media/preview`,
        method: 'POST',
        body: file,
      }),
      invalidatesTags: (result) =>
        result ? [{ type: 'ManagementPosts' as const, id: result.id }] : [],
    }),

    // POST /posts/:id/poll/options
    setPollOptions: build.mutation<
      Post,
      { postId: number; options: { text: string }[] }
    >({
      query: ({ postId, options }) => ({
        url: `/posts/${postId}/poll/options`,
        method: 'POST',
        body: { options },
      }),
      invalidatesTags: (result) =>
        result ? [{ type: 'ManagementPosts' as const, id: result.id }] : [],
    }),

    // PUT /posts/:id/poll/close
    closePoll: build.mutation<Post, number>({
      query: (postId) => ({
        url: `/posts/${postId}/poll/close`,
        method: 'PUT',
      }),
      invalidatesTags: (result) =>
        result ? [{ type: 'ManagementPosts' as const, id: result.id }] : [],
    }),

    isCreatorExist: build.query<{ result: boolean }, void>({
      query: () => `/creators/is-exist`,
      providesTags: ['Creator'],
    }),

    //
    // ───  ◆  CREATOR‐CATEGORIES  ◆ ──────────────────────────────────────────
    //
    // GET   /plan/creator-category
    getCreatorCategories: build.query<CreatorCategory[], void>({
      query: () => '/plan/creator-category',
      providesTags: (cats) =>
        cats
          ? [
              ...cats.map((c) => ({
                type: 'MyCreatorCategories' as const,
                id: c.id,
              })),
              { type: 'MyCreatorCategories' as const, id: 'LIST' },
            ]
          : [{ type: 'MyCreatorCategories' as const, id: 'LIST' }],
    }),
    // POST  /plan/creator-category
    createCreatorCategory: build.mutation<
      CreatorCategory,
      { name: string; isPublic: boolean }
    >({
      query: (body) => ({
        url: '/plan/creator-category',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'MyCreatorCategories', id: 'LIST' }],
    }),

    //
    // ───  ◆  EXTERNAL‐BENEFITS  ◆ ────────────────────────────────────────────
    //
    // GET   /plan/external-benefit
    getExternalBenefits: build.query<ExternalBenefit[], void>({
      query: () => '/plan/external-benefit',
      providesTags: (benefits) =>
        benefits
          ? [
              ...benefits.map((b) => ({
                type: 'CreatorPlans' as const,
                id: b.id,
              })),
              { type: 'MyPlans' as const, id: 'BENEFITS' },
            ]
          : [{ type: 'MyPlans' as const, id: 'BENEFITS' }],
    }),
    // POST  /plan/external-benefit
    createExternalBenefit: build.mutation<ExternalBenefit, { name: string }>({
      query: (body) => ({
        url: '/plan/external-benefit',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'MyPlans', id: 'BENEFITS' }],
    }),

    //
    // ───  ◆  PLANS  ◆ ───────────────────────────────────────────────────────
    //
    // GET   /plan
    getPlans: build.query<Plan[], void>({
      query: () => '/plan',
      providesTags: (plans) =>
        plans
          ? [
              ...plans.map((p) => ({
                type: 'CreatorPlans' as const,
                id: p.id,
              })),
              { type: 'MyPlans' as const, id: 'LIST' },
            ]
          : [{ type: 'MyPlans' as const, id: 'LIST' }],
    }),
    // POST  /plan
    createPlan: build.mutation<
      Plan,
      {
        name: string;
        description: string;
        intervalType: string;
        intervalCount: number;
        price: string;
        categoryIds: number[];
        externalBenefits: number[];
      }
    >({
      query: (body) => ({
        url: '/plan',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'MyPlans', id: 'LIST' }],
    }),
    // PATCH /plan
    updatePlan: build.mutation<
      Plan,
      {
        planId: number;
        name?: string;
        description?: string;
        categoryIds?: number[];
        externalBenefits?: number[];
      }
    >({
      query: ({ planId, ...rest }) => ({
        url: '/plan',
        method: 'PATCH',
        body: { planId, ...rest },
      }),
      invalidatesTags: (result) =>
        result
          ? [
              { type: 'MyPlans', id: result.id },
              { type: 'MyPlans', id: 'LIST' },
            ]
          : [],
    }),
    // GET   /plan/:planId
    getMyPlan: build.query<Plan, number>({
      query: (planId) => `/plan/${planId}`,
      providesTags: (plan) =>
        plan ? [{ type: 'MyPlans' as const, id: plan.id }] : [],
    }),

    // ─── fetch *your* creator account (if any) ───────────────────────
    getMyCreator: build.query<
      {
        id: number;
        creatorUsername: string;
        description: string;
        isStripeAccountVerified: boolean;
        avatarUrl?: string;
      },
      void
    >({
      query: () => `/creators`,
      providesTags: ['Creator'],
    }),

    // ─── kick off Stripe onboarding to *create* your creator ─────────
    createCreator: build.mutation<{ url: string }, { creatorUsername: string }>(
      {
        query: ({ creatorUsername }) => ({
          url: `/creators/link/onboarding`,
          method: 'POST',
          body: { creatorUsername },
        }),
        invalidatesTags: ['Creator'],
      },
    ),

    // — check if I own the specified creator
    getCreatorIsOwner: build.query<{ isOwner: boolean }, number>({
      query: (id) => `/creators/${id}/is-owner`,
    }),

    // — update Stripe account info (e.g. to re-verify)
    updateStripeAccount: build.mutation<{ url: string }, void>({
      query: () => ({
        url: '/creators/link/account/update',
        method: 'PUT',
      }),
      invalidatesTags: ['Creator'],
    }),

    // — launch Stripe “dashboard” to withdraw, see payouts, etc.
    getStripeDashboard: build.query<{ url: string }, void>({
      query: () => '/creators/stripe/dashboard',
    }),

    // — change your creator’s public description
    updateCreatorDescription: build.mutation<Creator, { description: string }>({
      query: ({ description }) => ({
        url: '/creators/description',
        method: 'PATCH',
        body: { description },
      }),
      invalidatesTags: ['Creator'],
    }),

    // — change your creator’s username
    updateCreatorUsername: build.mutation<Creator, { creatorUsername: string }>(
      {
        query: ({ creatorUsername }) => ({
          url: '/creators/creator-username',
          method: 'PATCH',
          body: { creatorUsername },
        }),
        invalidatesTags: ['Creator'],
      },
    ),

    // — upload/change your creator avatar
    updateCreatorAvatar: build.mutation<{ avatarUrl: string }, FormData>({
      query: (formData) => ({
        url: '/creators/avatar',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: () => ['Creator'],
    }),
    getPostAuthenticated: build.query<Post, { postId: number }>({
      query: ({ postId }) => `/posts/${postId}/authenticated`,
      providesTags: (result) =>
        result ? [{ type: 'Post' as const, id: result.id }] : [],
    }),

    // — refresh expired media URLs
    refreshMedia: build.query<Media, { postId: number }>({
      query: ({ postId }) => `/posts/${postId}/media/refresh`,
      // no tags; we’ll manually re-run getPostAuthenticated on error
    }),

    // — like a post
    likePost: build.mutation<void, { postId: number }>({
      query: ({ postId }) => ({
        url: `/posts/like/${postId}`,
        method: 'POST',
        body: { postId },
      }),
      invalidatesTags: (_res, _err, { postId }) => [
        { type: 'Post' as const, id: postId },
      ],
    }),

    // — unlike a post (pass the likeId you got back originally, if available)
    unlikePost: build.mutation<void, { postId: number }>({
      query: ({ postId }) => ({
        url: `/posts/like/${postId}`,
        method: 'DELETE',
      }),
      // if you know the postId, invalidate that; otherwise:
      invalidatesTags: (_res, _err, { postId }) => [
        { type: 'Post' as const, id: postId },
      ],
    }),

    // — repost a post
    repostPost: build.mutation<void, { postId: number }>({
      query: ({ postId }) => ({
        url: `/posts/repost/${postId}`,
        method: 'POST',
      }),
      invalidatesTags: (_res, _err, { postId }) => [
        { type: 'Post' as const, id: postId },
      ],
    }),

    // — vote in a poll
    votePoll: build.mutation<Post, { postId: number; optionId: number }>({
      query: ({ postId, optionId }) => ({
        url: `/posts/poll/vote`,
        method: 'POST',
        body: { pollId: postId, optionId },
      }),
      invalidatesTags: (_res, _err, { postId }) => [
        { type: 'Post' as const, id: postId },
      ],
    }),

    // — create a comment (optionally with parentId)
    createComment: build.mutation<
      Comment,
      { postId: number; content: string; parentId?: number }
    >({
      query: ({ postId, content, parentId }) => ({
        url: `/posts/comments/${postId}`,
        method: 'POST',
        body: { content, parentId },
      }),
      invalidatesTags: (_res, _err, { postId }) => [
        { type: 'Post' as const, id: postId },
      ],
    }),

    // — record a media play for stats
    recordPlay: build.mutation<void, { postId: number }>({
      query: ({ postId }) => ({
        url: `/posts/${postId}/play`,
        method: 'POST',
      }),
      // no need to invalidate
    }),
    upgradePreview: build.mutation<
      {
        upcomingInvoiceId: string;
        amountDue: number;
        currency: string;
        lines: { description: string; amount: number; quantity: number }[];
        periodStart: number;
        periodEnd: number;
      },
      { creatorId: number; newPlanId: number }
    >({
      query: ({ creatorId, newPlanId }) => ({
        url: '/subscriptions/upgrade-preview',
        method: 'POST',
        body: { creatorId, newPlanId },
      }),
    }),
    upgradeConfirm: build.mutation<
      void,
      { creatorId: number; newPlanId: number }
    >({
      query: ({ creatorId, newPlanId }) => ({
        url: '/subscriptions/upgrade',
        method: 'POST',
        body: { creatorId, newPlanId },
      }),
      invalidatesTags: (_result, _error, { creatorId }) => [
        { type: 'SubscriptionInfo' as const, id: creatorId },
        { type: 'CreatorPlans' as const, id: 'PARTIAL-LIST' },
      ],
    }),
    getCheckoutSession: build.query<{ url: string }, number>({
      query: (planId) => `/subscriptions/checkout-session/${planId}`,
    }),
    getSubscriptionInfo: build.query<
      {
        planId: number;
        createdAt: string;
        currentPeriodEnd: string;
        isCancelled: boolean;
      },
      number
    >({
      query: (creatorId) => `/subscriptions/info/${creatorId}`,
      providesTags: (_res, _err, creatorId) => [
        { type: 'SubscriptionInfo' as const, id: creatorId },
      ],
    }),
    getPortalLink: build.query<{ url: string }, number>({
      query: (creatorId) => `/subscriptions/portal/${creatorId}`,
    }),
    getCreatorPlans: build.query<
      {
        id: number;
        name: string;
        createdAt: string;
        updatedAt: string;
        description: string;
        price: string;
        isArchived: boolean;
        interval: string;
        intervalCount: number;
        creatorCategories: { id: number; name: string; isPublic: boolean }[];
        externalBenefits: { id: number; name: string }[];
      }[],
      number
    >({
      query: (creatorId) => `/plan/${creatorId}/public`,
      providesTags: (plans) =>
        plans
          ? plans.map((p) => ({ type: 'CreatorPlans' as const, id: p.id }))
          : [],
    }),
    getCreatorCategoriesPublic: build.query<
      { id: number; name: string; isPublic: boolean }[],
      number
    >({
      query: (creatorId) => `/plan/creator-category/${creatorId}`,
      providesTags: (cats) =>
        cats
          ? cats.map((c) => ({ type: 'CreatorCategories' as const, id: c.id }))
          : [],
    }),

    // 2️⃣ search posts for a creator
    searchCreatorPosts: build.query<
      {
        posts: {
          id: number;
          type: 'TEXT' | 'POLL' | 'VIDEO' | 'AUDIO';
          name: string;
          description: string;
          categoryId: number;
          category: { id: number; name: string; isPublic: boolean };
          hasAccess: boolean;
        }[];
        total: number;
      },
      {
        creatorId: number;
        page: number;
        limit: number;
        categoryId?: number;
        name?: string;
        type?: string;
      }
    >({
      query: ({ creatorId, page, limit, categoryId, name, type }) => ({
        url: '/posts/user/search-posts',
        params: {
          creatorId,
          page,
          limit,
          ...(categoryId ? { categoryId } : {}),
          ...(name ? { name } : {}),
          ...(type ? { type } : {}),
        },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.posts.map((p) => ({
                type: 'CreatorPosts' as const,
                id: p.id,
              })),
              { type: 'CreatorPosts', id: 'PARTIAL-LIST' },
            ]
          : [{ type: 'CreatorPosts', id: 'PARTIAL-LIST' }],
    }),
    getFollowedCreators: build.query<
      {
        id: number;
        creatorUsername: string;
        description: string;
        isStripeAccountVerified: boolean;
        avatarUrl: string | null;
      }[],
      void
    >({
      query: () => '/creators/followed',
      providesTags: (result) =>
        result
          ? [
              ...result.map((c) => ({ type: 'Followed' as const, id: c.id })),
              { type: 'Followed' as const, id: 'LIST' },
            ]
          : [{ type: 'Followed' as const, id: 'LIST' }],
    }),
    getCreatorPublic: build.query<
      {
        id: number;
        creatorUsername: string;
        description: string;
        isStripeAccountVerified: boolean;
        avatarUrl: string | null;
        isFollowed: boolean;
        isSubscribed: boolean;
      },
      number
    >({
      query: (creatorId) => `/creators/public/${creatorId}`,
      providesTags: (result, error, creatorId) => [
        { type: 'CreatorPublic' as const, id: creatorId },
      ],
    }),
    followCreator: build.mutation<
      {
        id: number;
        creatorUsername: string;
        description: string;
        isStripeAccountVerified: boolean;
        avatarUrl: string | null;
        isFollowed: boolean;
        isSubscribed: boolean;
      },
      number
    >({
      query: (creatorId) => ({
        url: `/creators/${creatorId}/follow`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, creatorId) => [
        { type: 'CreatorPublic' as const, id: creatorId },
        { type: 'Followed', id: 'LIST' },
      ],
    }),
    unfollowCreator: build.mutation<
      {
        id: number;
        creatorUsername: string;
        description: string;
        isStripeAccountVerified: boolean;
        avatarUrl: string | null;
        isFollowed: boolean;
        isSubscribed: boolean;
      },
      number
    >({
      query: (creatorId) => ({
        url: `/creators/${creatorId}/follow`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, creatorId) => [
        { type: 'CreatorPublic' as const, id: creatorId },
        { type: 'Followed', id: 'LIST' },
      ],
    }),
    searchCreators: build.query<
      {
        creators: {
          id: number;
          creatorUsername: string;
          description: string;
          avatarUrl: string | null;
          isStripeAccountVerified: boolean;
        }[];
        total: number;
      },
      { name: string; page: number; limit: number }
    >({
      query: ({ name, page, limit }) => ({
        url: `/creators/search`,
        params: { name, page, limit },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.creators.map(({ id }) => ({
                type: 'Creator' as const,
                id,
              })),
              { type: 'Creator', id: 'PARTIAL-LIST' },
            ]
          : [{ type: 'Creator', id: 'PARTIAL-LIST' }],
    }),
    signIn: build.mutation<ITokens, ISignInReq>({
      query: (body) => ({
        url: '/auth/local/mobile/sign-in',
        method: 'POST',
        body,
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setCredentials(data));
          // Fetch user data after successful login
          const userResult = await dispatch(
            baseAPI.endpoints.getUserInfo.initiate(),
          );
          if ('data' in userResult) {
            dispatch(updateUser(userResult.data));
          }
        } catch {
          // Error handling is done by the baseQueryWithReauth
        }
      },
    }),
    signUp: build.mutation<ITokenRes, ISignUpReq>({
      query: (body) => ({
        url: '/auth/local/mobile/sign-up',
        method: 'POST',
        body,
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setCredentials(data));
          // Fetch user data after successful login
          const userResult = await dispatch(
            baseAPI.endpoints.getUserInfo.initiate(),
          );
          if ('data' in userResult) {
            dispatch(updateUser(userResult.data));
          }
        } catch {}
      },
    }),
    passwordRecovery: build.mutation<void, IRecoveryReq>({
      query: (body) => ({
        url: '/auth/recovery',
        method: 'POST',
        body,
      }),
    }),
    updateUserInfo: build.mutation<IUserInfo, IUpdateUserInfoReq>({
      query: (body) => ({
        url: '/user',
        method: 'PATCH',
        body,
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          // Map IUserInfo to User type
          dispatch(
            updateUser({
              id: data.id,
              email: data.email,
              userName: data.userName,
              avatarUrl: data.avatarUrl,
              isEmailConfirmed: data.isEmailConfirmed,
            }),
          );
        } catch {}
      },
      invalidatesTags: ['User'],
    }),
    updateAvatar: build.mutation<{ avatarUrl: string }, FormData>({
      query: (formData) => ({
        url: '/user/avatar',
        method: 'POST',
        body: formData,
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;

          const userResult = await dispatch(
            baseAPI.endpoints.getUserInfo.initiate(),
          ).unwrap();

          dispatch(
            updateUser({
              id: userResult.id,
              email: userResult.email,
              userName: userResult.userName,
              avatarUrl: userResult.avatarUrl,
              isEmailConfirmed: userResult.isEmailConfirmed,
            }),
          );
        } catch {}
      },
      invalidatesTags: ['User'],
    }),
    getUserInfo: build.query<IUserInfo, void>({
      query: () => '/user',
      providesTags: ['User'],
    }),
    resendConfirmationEmail: build.mutation<void, void>({
      query: () => ({
        url: '/auth/email-confirmation/request',
        method: 'POST',
      }),
    }),
    confirmEmail: build.mutation<void, IConfirmEmailReq>({
      query: (body) => ({
        url: '/auth/confirm-email',
        method: 'PUT',
        body,
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          // Get updated user data after confirmation
          const userResult = await dispatch(
            baseAPI.endpoints.getUserInfo.initiate(),
          );
          if ('data' in userResult && userResult.data) {
            dispatch(
              updateUser({
                id: userResult.data.id,
                email: userResult.data.email,
                userName: userResult.data.userName,
                avatarUrl: userResult.data.avatarUrl,
                isEmailConfirmed: userResult.data.isEmailConfirmed,
              }),
            );
          }
        } catch {}
      },
      invalidatesTags: ['User'],
    }),
  }),
});

export const refreshAPI = createApi({
  reducerPath: 'refreshAPI',
  baseQuery: refreshQuery,
  tagTypes: ['Refresh'],
  endpoints: (build) => ({
    logOut: build.mutation<void, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
    }),
    getRefresh: build.mutation<ITokenRes, void>({
      query: () => ({
        url: '/auth/refresh',
        method: 'POST',
      }),
    }),
    updatePassword: build.mutation<ITokens, IUpdatePasswordReq>({
      query: (body) => ({
        url: '/auth/password',
        method: 'PUT',
        body,
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setCredentials(data));
          await dispatch(baseAPI.endpoints.getUserInfo.initiate());
        } catch {}
      },
    }),
  }),
});

export const {
  useSignInMutation,
  useSignUpMutation,
  usePasswordRecoveryMutation,
  useUpdateUserInfoMutation,
  useUpdateAvatarMutation,
  useGetUserInfoQuery,
  useResendConfirmationEmailMutation,
  useConfirmEmailMutation,
  useSearchCreatorsQuery,
  useGetCreatorPublicQuery,
  useFollowCreatorMutation,
  useUnfollowCreatorMutation,
  useGetFollowedCreatorsQuery,
  useGetCreatorCategoriesPublicQuery,
  useSearchCreatorPostsQuery,
  useGetCreatorPlansQuery,
  useGetCheckoutSessionQuery,
  useLazyGetCheckoutSessionQuery,
  useGetSubscriptionInfoQuery,
  useLazyGetPortalLinkQuery,
  useUpgradePreviewMutation,
  useUpgradeConfirmMutation,
  useGetPostAuthenticatedQuery,
  useRefreshMediaQuery,
  useLikePostMutation,
  useUnlikePostMutation,
  useRepostPostMutation,
  useVotePollMutation,
  useCreateCommentMutation,
  useRecordPlayMutation,
  useIsCreatorExistQuery,
  useGetMyCreatorQuery,
  useCreateCreatorMutation,
  useGetCreatorIsOwnerQuery,
  useUpdateStripeAccountMutation,
  useGetStripeDashboardQuery,
  useUpdateCreatorDescriptionMutation,
  useUpdateCreatorUsernameMutation,
  useUpdateCreatorAvatarMutation,
  useGetCreatorCategoriesQuery,
  useCreateCreatorCategoryMutation,
  useGetExternalBenefitsQuery,
  useCreateExternalBenefitMutation,
  useGetPlansQuery,
  useCreatePlanMutation,
  useUpdatePlanMutation,
  useGetMyPlanQuery,
  useCreatePostMutation,
  useUpdatePostMutation,
  useActivatePostMutation,
  useDeactivatePostMutation,
  useGetPostByCreatorQuery,
  useSearchByCreatorPostsQuery,
  useUploadPostHeaderMutation,
  useUploadPostImageMutation,
  useDeletePostImageMutation,
  useInitiateMediaUploadMutation,
  useConfirmMediaUploadMutation,
  useUploadMediaPreviewMutation,
  useSetPollOptionsMutation,
  useClosePollMutation,
  useGetCategoryRecommendationsQuery,
  useGetPlanRecommendationsQuery,
  useGetCredentialsQuery,
  useCreateCredentialMutation,
  useRevokeCredentialMutation,
  useRequestRecoveryMobileMutation,
  useResetPasswordMutation,
} = baseAPI;

export const { useLogOutMutation, useUpdatePasswordMutation } = refreshAPI;
