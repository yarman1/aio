import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  isLoggedIn: boolean;
  accessToken: string;
  refreshToken: string;
  deviceId: string;
  errorMessage: string;
}

const initialState: AuthState = {
  isLoggedIn: false,
  accessToken: '',
  refreshToken: '',
  deviceId: '',
  errorMessage: '',
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
      }>,
    ) => {
      state.isLoggedIn = true;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.deviceId = action.payload.deviceId;
    },
    logout: (state) => {
      state.isLoggedIn = false;
      state.accessToken = '';
      state.refreshToken = '';
      state.deviceId = '';
      state.errorMessage = '';
    },
    updateErrorMessage: (state, action: PayloadAction<string>) => {
      state.errorMessage = action.payload;
    },
  },
});

export const { setCredentials, logout, updateErrorMessage } = authSlice.actions;
export default authSlice.reducer;
