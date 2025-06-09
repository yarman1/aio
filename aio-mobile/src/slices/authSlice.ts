import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface User {
  id: number;
  email: string;
  userName: string;
  avatarUrl?: string;
  isEmailConfirmed: boolean;
}

interface AuthState {
  isLoggedIn: boolean;
  accessToken: string;
  refreshToken: string;
  deviceId: string;
  errorMessage: string;
  user?: User;
}

const initialState: AuthState = {
  isLoggedIn: false,
  accessToken: '',
  refreshToken: '',
  deviceId: '',
  errorMessage: '',
  user: undefined,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{
        accessToken: string;
        refreshToken: string;
        deviceId: string;
        user?: User;
      }>,
    ) => {
      state.isLoggedIn = true;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.deviceId = action.payload.deviceId;
      if (action.payload.user) {
        state.user = action.payload.user;
      }
    },
    updateUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
    logout: (state) => {
      state.isLoggedIn = false;
      state.accessToken = '';
      state.refreshToken = '';
      state.deviceId = '';
      state.errorMessage = '';
      state.user = undefined;
    },
    updateErrorMessage: (state, action: PayloadAction<string>) => {
      state.errorMessage = action.payload;
    },
  },
});

export const { setCredentials, updateUser, logout, updateErrorMessage } = authSlice.actions;
export default authSlice.reducer;
