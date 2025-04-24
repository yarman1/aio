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
} from '../slices/authSlice';
import { useNavigation } from '@react-navigation/native';
import { AuthStackNavigationProp } from '../navigation';

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
    //trying to get new token
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
    const errorData = result.error.data as any;
    let errorMessage = '';
    if (errorData.message) {
      if (Array.isArray(errorData.message)) {
        errorMessage = errorData.message
          .filter(
            (value: string, index: number, array: string[]) =>
              array.indexOf(value) === index,
          )
          .join('\n');
      } else {
        errorMessage = errorData.message;
      }
    } else if (errorData.description) {
      errorMessage = errorData.description;
    }
    api.dispatch(updateErrorMessage(errorMessage));
  }
  return result;
};

export const baseAPI = createApi({
  reducerPath: 'baseAPI',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Auth'],
  endpoints: (build) => ({
    signIn: build.mutation<ITokenRes, ISignInReq>({
      query: (body) => ({
        url: '/auth/local/mobile/sign-in',
        method: 'POST',
        body,
      }),
    }),
    signUp: build.mutation<ITokenRes, ISignUpReq>({
      query: (body) => ({
        url: '/auth/local/mobile/sign-up',
        method: 'POST',
        body,
      }),
    }),
    passwordRecovery: build.mutation<void, IRecoveryReq>({
      query: (body) => ({
        url: '/auth/recovery',
        method: 'POST',
        body,
      }),
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
  }),
});

export const {
  useSignInMutation,
  useSignUpMutation,
  usePasswordRecoveryMutation,
} = baseAPI;

export const { useLogOutMutation } = refreshAPI;
