'use client';

import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '@/store/store';
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { refreshToken, clearAuth } from '@/store/authSlice';

// Global Auth Initializer Component
const AuthInitializer = ({ children }) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const isGuest = useAppSelector((state) => state.auth.isGuest);

  useEffect(() => {
    const initializeAuth = async () => {
      // Only try to refresh if we have a user but no access token (and not a guest)
      if (user && !accessToken && !isGuest) {
        console.log('🔄 Attempting to restore session for user:', user.email);
        try {
          await dispatch(refreshToken()).unwrap();
          console.log('✅ Session restored successfully');
        } catch (error) {
          console.log(
            '❌ Failed to restore session:',
            error.error || error.message
          );
          // Clear auth state if refresh fails
          if (
            error.error === 'Refresh token not found' ||
            error.error === 'Invalid refresh token' ||
            error.error === 'Account verification required' ||
            error.error === 'User not found'
          ) {
            dispatch(clearAuth());
          }
        }
      }
    };

    initializeAuth();
  }, [dispatch, user, accessToken, isGuest]);

  return children;
};

// Loading component shown during persistence rehydration
const PersistenceLoading = () => (
  <div className='flex min-h-screen items-center justify-center'>
    <div className='animate-pulse text-center'>
      <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4'></div>
      <p className='text-sm text-muted-foreground'>Loading your account...</p>
    </div>
  </div>
);

export function Providers({ children }) {
  return (
    <Provider store={store}>
      <PersistGate loading={<PersistenceLoading />} persistor={persistor}>
        <AuthInitializer>{children}</AuthInitializer>
      </PersistGate>
    </Provider>
  );
}
