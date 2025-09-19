import { configureStore, combineReducers, Action } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  createTransform,
} from 'redux-persist';
import storage from '@/hooks/storage';
import authReducer from './authSlice';

// Transform to exclude sensitive data from persistence
const authTransform = createTransform(
  // Transform state on its way to being serialized and persisted
  (inboundState) => {
    // Don't persist access tokens for security
    return {
      ...inboundState,
      accessToken: null,
      error: null,
      message: null,
      loading: false,
    };
  },
  // Transform state being rehydrated
  (outboundState) => {
    return {
      ...outboundState,
      accessToken: null,
      error: null,
      message: null,
      loading: false,
    };
  },
  // Define which reducer this transform is for
  { whitelist: ['auth'] }
);

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth'], // Only persist auth state
  transforms: [authTransform],
};

export const RESET_STORE = 'RESET_STORE';

const appReducer = combineReducers({
  auth: authReducer,
});

const rootReducer = (state, action) => {
  // Reset all slices to initial state if the action is RESET_STORE
  if (action.type === RESET_STORE) {
    // Return undefined to let each reducer initialize with their default state
    return appReducer(undefined, action);
  }
  return appReducer(state, action);
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);
