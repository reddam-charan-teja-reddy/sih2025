'use client';

import { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import {
  selectGuestSession,
  expireGuestSession,
  selectIsGuest,
} from '@/store/authSlice';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, User, AlertTriangle } from 'lucide-react';

export const GuestModeManager = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const isGuest = useAppSelector(selectIsGuest);
  const guestSession = useAppSelector(selectGuestSession);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (!isGuest || !guestSession.expiresAt) return;

    const updateTimer = () => {
      const remaining = Math.max(0, guestSession.expiresAt - Date.now());
      const seconds = Math.floor(remaining / 1000);

      setTimeRemaining(seconds);

      // Show warning when 2 minutes remaining
      if (seconds <= 120 && seconds > 0) {
        setShowWarning(true);
      }

      // Session expired
      if (seconds <= 0) {
        dispatch(expireGuestSession());
        router.push('/auth/login?reason=session_expired');
      }
    };

    // Initial update
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [isGuest, guestSession.expiresAt, dispatch, router]);

  if (!isGuest) return null;

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const isWarning = timeRemaining <= 120; // 2 minutes
  const isCritical = timeRemaining <= 60; // 1 minute

  return (
    <div className='space-y-2'>
      {/* Guest Mode Status Bar */}
      <div
        className={`
        px-4 py-2 rounded-lg border-2 transition-colors
        ${
          isCritical
            ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
            : isWarning
            ? 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800'
            : 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'
        }
      `}>
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-3'>
            <div
              className={`
              p-2 rounded-full 
              ${
                isCritical
                  ? 'bg-red-100 dark:bg-red-900'
                  : isWarning
                  ? 'bg-orange-100 dark:bg-orange-900'
                  : 'bg-blue-100 dark:bg-blue-900'
              }
            `}>
              <User
                className={`
                h-4 w-4 
                ${
                  isCritical
                    ? 'text-red-600 dark:text-red-400'
                    : isWarning
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-blue-600 dark:text-blue-400'
                }
              `}
              />
            </div>
            <div>
              <div
                className={`
                font-semibold text-sm
                ${
                  isCritical
                    ? 'text-red-800 dark:text-red-200'
                    : isWarning
                    ? 'text-orange-800 dark:text-orange-200'
                    : 'text-blue-800 dark:text-blue-200'
                }
              `}>
                Emergency Guest Mode
              </div>
              <div
                className={`
                text-xs
                ${
                  isCritical
                    ? 'text-red-600 dark:text-red-400'
                    : isWarning
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-blue-600 dark:text-blue-400'
                }
              `}>
                Core features enabled • Session-limited
              </div>
            </div>
          </div>

          <div className='flex items-center space-x-4'>
            <div className='text-right'>
              <div
                className={`
                font-mono text-lg font-bold
                ${
                  isCritical
                    ? 'text-red-700 dark:text-red-300'
                    : isWarning
                    ? 'text-orange-700 dark:text-orange-300'
                    : 'text-blue-700 dark:text-blue-300'
                }
              `}>
                {minutes}:{seconds.toString().padStart(2, '0')}
              </div>
              <div
                className={`
                text-xs
                ${
                  isCritical
                    ? 'text-red-600 dark:text-red-400'
                    : isWarning
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-blue-600 dark:text-blue-400'
                }
              `}>
                remaining
              </div>
            </div>

            <Button
              onClick={() => router.push('/auth/login')}
              size='sm'
              className={
                isCritical
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : isWarning
                  ? 'bg-orange-600 hover:bg-orange-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }>
              Sign In Now
            </Button>
          </div>
        </div>
      </div>

      {/* Warning Alert */}
      {showWarning && (
        <Alert
          className={
            isCritical
              ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950'
              : 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950'
          }>
          <AlertTriangle
            className={`h-4 w-4 ${
              isCritical
                ? 'text-red-600 dark:text-red-400'
                : 'text-orange-600 dark:text-orange-400'
            }`}
          />
          <AlertDescription
            className={
              isCritical
                ? 'text-red-800 dark:text-red-200'
                : 'text-orange-800 dark:text-orange-200'
            }>
            {isCritical
              ? 'Your guest session is about to expire! Please sign in to continue accessing the platform.'
              : 'Your guest session will expire soon. Sign in now to save your progress and unlock full features.'}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export const GuestLimitations = () => {
  return null;
};
