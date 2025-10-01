'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import {
  selectIsAuthenticated,
  selectIsGuest,
  selectUser,
  selectGuestSession,
  refreshToken,
  expireGuestSession,
  clearAuth,
} from '@/store/authSlice';

// Auth initialization hook
const useAuthInitialization = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isGuest = useAppSelector(selectIsGuest);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('🔄 Initializing authentication...', {
          hasUser: !!user,
          hasAccessToken: !!accessToken,
          isAuthenticated,
          isGuest,
        });

        // If we have a user but no access token, try to refresh
        if (user && !accessToken && !isGuest) {
          console.log(
            '🔑 User found but no access token, attempting refresh...'
          );
          const result = await dispatch(refreshToken()).unwrap();
          console.log('✅ Token refresh successful');
        } else if (!user && !isGuest && !accessToken) {
          // No user data at all, try silent refresh in case there's a valid refresh token
          console.log('🔄 No user data, attempting silent refresh...');
          try {
            const result = await dispatch(refreshToken()).unwrap();
            console.log('✅ Silent refresh successful');
          } catch (silentError) {
            console.log(
              'ℹ️ Silent refresh failed (expected if no valid session)'
            );
            // Silent failure is expected if no valid session exists
          }
        } else {
          console.log('ℹ️ Auth state is valid, no refresh needed');
        }
      } catch (error) {
        console.error('❌ Token refresh failed:', error);

        // Log the specific error for debugging
        if (error.error) {
          console.error('Refresh error details:', error.error);
        }

        // Only clear auth if it's a real authentication failure
        // Don't clear on network errors or temporary issues
        if (
          error.error === 'Refresh token not found' ||
          error.error === 'Invalid refresh token' ||
          error.error === 'Account verification required' ||
          error.error === 'User not found'
        ) {
          console.log('🧹 Authentication failure, clearing auth state');
          dispatch(clearAuth());
        } else {
          console.log('⚠️ Temporary refresh failure, keeping user logged in');
          // Just mark as not initializing but keep user state
        }
      } finally {
        setIsInitializing(false);
        console.log('✅ Auth initialization complete');
      }
    };

    initializeAuth();
  }, [dispatch, user, accessToken, isGuest]);

  return { isInitializing };
};

// Higher-Order Component for protected routes
export const withAuth = (WrappedComponent, options = {}) => {
  const {
    requireAuth = true,
    allowGuest = false,
    requiredRoles = [],
    redirectTo = '/auth/login',
    guestRedirectTo = '/auth/login',
  } = options;

  const AuthenticatedComponent = (props) => {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const isAuthenticated = useAppSelector(selectIsAuthenticated);
    const isGuest = useAppSelector(selectIsGuest);
    const user = useAppSelector(selectUser);
    const guestSession = useAppSelector(selectGuestSession);

    useEffect(() => {
      // Check guest session expiry
      if (
        isGuest &&
        guestSession.expiresAt &&
        Date.now() > guestSession.expiresAt
      ) {
        dispatch(expireGuestSession());
        router.push(guestRedirectTo);
        return;
      }

      // If authentication is required
      if (requireAuth) {
        if (!isAuthenticated && !isGuest) {
          // Try to refresh token first
          dispatch(refreshToken()).then((result) => {
            if (result.type === 'auth/refresh/rejected') {
              router.push(redirectTo);
            }
          });
          return;
        }

        // If guest access is not allowed
        if (isGuest && !allowGuest) {
          router.push(guestRedirectTo);
          return;
        }

        // Check role requirements (only for authenticated users)
        if (isAuthenticated && requiredRoles.length > 0 && user) {
          if (!requiredRoles.includes(user.role)) {
            router.push('/unauthorized');
            return;
          }
        }
      }
    }, [isAuthenticated, isGuest, user, guestSession, router, dispatch]);

    // Don't render if redirecting
    if (requireAuth && !isAuthenticated && !isGuest) {
      return <div>Loading...</div>;
    }

    if (requireAuth && isGuest && !allowGuest) {
      return <div>Redirecting...</div>;
    }

    if (
      requireAuth &&
      requiredRoles.length > 0 &&
      user &&
      !requiredRoles.includes(user.role)
    ) {
      return <div>Unauthorized access...</div>;
    }

    return <WrappedComponent {...props} />;
  };

  AuthenticatedComponent.displayName = `withAuth(${
    WrappedComponent.displayName || WrappedComponent.name
  })`;

  return AuthenticatedComponent;
};

// Hook for checking authentication status
export const useAuth = () => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isGuest = useAppSelector(selectIsGuest);
  const user = useAppSelector(selectUser);
  const guestSession = useAppSelector(selectGuestSession);

  const hasRole = (role) => {
    return user?.role === role;
  };

  const hasAnyRole = (roles) => {
    return roles.some((role) => user?.role === role);
  };

  const canPerformAction = (action) => {
    // Define action permissions
    const permissions = {
      // Treat guests like citizens for these actions
      submit_report: (isAuthenticated && !isGuest) || isGuest,
      verify_report:
        isAuthenticated &&
        user?.role === 'official' &&
        user?.isOfficialVerified,
      send_alert:
        isAuthenticated &&
        user?.role === 'official' &&
        user?.isOfficialVerified,
      view_reports: isAuthenticated || isGuest,
      save_preferences: (isAuthenticated && !isGuest) || isGuest,
      access_admin:
        isAuthenticated &&
        user?.role === 'official' &&
        user?.isOfficialVerified,
    };

    return permissions[action] || false;
  };

  const isGuestExpired = () => {
    return (
      isGuest && guestSession.expiresAt && Date.now() > guestSession.expiresAt
    );
  };

  const getGuestTimeRemaining = () => {
    if (!isGuest || !guestSession.expiresAt) return 0;
    const remaining = Math.max(0, guestSession.expiresAt - Date.now());
    return Math.floor(remaining / 1000); // Return seconds
  };

  return {
    isAuthenticated,
    isGuest,
    user,
    guestSession,
    hasRole,
    hasAnyRole,
    canPerformAction,
    isGuestExpired,
    getGuestTimeRemaining,
  };
};

// Route Guard Component
export const RouteGuard = ({
  children,
  requireAuth = true,
  allowGuest = false,
  requiredRoles = [],
}) => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated, isGuest, user, isGuestExpired } = useAuth();
  const { isInitializing } = useAuthInitialization();

  useEffect(() => {
    // Don't run route checks while auth is initializing
    if (isInitializing) return;

    if (isGuestExpired()) {
      dispatch(expireGuestSession());
      router.push('/auth/login');
      return;
    }

    if (requireAuth) {
      if (!isAuthenticated && !isGuest) {
        router.push('/auth/login');
        return;
      }

      if (isGuest && !allowGuest) {
        router.push('/auth/login');
        return;
      }

      if (isAuthenticated && requiredRoles.length > 0 && user) {
        if (!requiredRoles.includes(user.role)) {
          router.push('/unauthorized');
          return;
        }
      }
    }
  }, [
    isAuthenticated,
    isGuest,
    user,
    requireAuth,
    allowGuest,
    requiredRoles,
    router,
    dispatch,
    isInitializing,
  ]);

  // Show loading while auth is initializing
  if (isInitializing) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4'></div>
          <p className='text-sm text-gray-600'>
            Initializing authentication...
          </p>
        </div>
      </div>
    );
  }

  // Loading state while checking authentication
  if (requireAuth && !isAuthenticated && !isGuest) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600'></div>
      </div>
    );
  }

  // Unauthorized state
  if (requireAuth && isGuest && !allowGuest) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div>Redirecting to login...</div>
      </div>
    );
  }

  if (
    requireAuth &&
    requiredRoles.length > 0 &&
    user &&
    !requiredRoles.includes(user.role)
  ) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div>Unauthorized access</div>
      </div>
    );
  }

  return children;
};

// Component to show guest limitations
export const GuestLimitationBanner = () => {
  const { isGuest, guestSession, getGuestTimeRemaining } = useAuth();
  const router = useRouter();

  if (!isGuest) return null;

  const timeRemaining = getGuestTimeRemaining();
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  return (
    <div className='bg-orange-50 dark:bg-orange-950 border-b border-orange-200 dark:border-orange-800 px-4 py-2'>
      <div className='flex items-center justify-between text-sm'>
        <div className='flex items-center space-x-2'>
          <span className='font-medium text-orange-800 dark:text-orange-200'>
            Guest Mode
          </span>
          <span className='text-orange-600 dark:text-orange-300'>
            {minutes}:{seconds.toString().padStart(2, '0')} remaining
          </span>
        </div>
        <div className='flex items-center space-x-2'>
          <span className='text-orange-600 dark:text-orange-300 text-xs'>
            Core features enabled • Session-limited
          </span>
          <button
            onClick={() => router.push('/auth/login')}
            className='text-orange-800 dark:text-orange-200 hover:underline font-medium'>
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
};
