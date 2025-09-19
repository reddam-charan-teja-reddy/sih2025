'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import {
  selectIsAuthenticated,
  selectIsGuest,
  selectUser,
  selectGuestSession,
  refreshToken,
  expireGuestSession,
} from '@/store/authSlice';

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
      submit_report: isAuthenticated && !isGuest,
      verify_report:
        isAuthenticated &&
        user?.role === 'official' &&
        user?.isOfficialVerified,
      send_alert:
        isAuthenticated &&
        user?.role === 'official' &&
        user?.isOfficialVerified,
      view_reports: isAuthenticated || isGuest,
      save_preferences: isAuthenticated && !isGuest,
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

  useEffect(() => {
    if (isGuestExpired()) {
      dispatch(expireGuestSession());
      router.push('/auth/login');
      return;
    }

    if (requireAuth) {
      if (!isAuthenticated && !isGuest) {
        // Try refresh token first
        dispatch(refreshToken()).then((result) => {
          if (result.type === 'auth/refresh/rejected') {
            router.push('/auth/login');
          }
        });
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
  ]);

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
            Limited access • Read-only
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
