import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../slices/authSlice';
import { baseAPI, refreshAPI } from '../services/baseAPI';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [baseAPI.reducerPath]: baseAPI.reducer,
    [refreshAPI.reducerPath]: refreshAPI.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(baseAPI.middleware)
      .concat(refreshAPI.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
