// components/layout/Header.js
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  LogOut,
  Settings,
  Shield,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/components/auth/AuthGuards';
import { useAppDispatch } from '@/store/hooks';
import { logoutUser } from '@/store/authSlice';
import { GuestModeManager } from '@/components/auth/GuestMode';

export function Header() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated, isGuest, user, getGuestTimeRemaining } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await dispatch(logoutUser(user?.id)).unwrap();
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleProfileClick = () => {
    if (isGuest) {
      router.push('/auth/login?reason=guest_limitation');
      return;
    }
    router.push('/profile');
  };

  const getDisplayName = () => {
    if (isGuest) return 'Guest User';
    if (user?.name) return user.name;
    if (user?.email) return user.email;
    if (user?.phone) return user.phone;
    return 'User';
  };

  const getRoleDisplay = () => {
    if (isGuest) return 'Guest';
    if (user?.role === 'official') {
      return user?.isOfficialVerified
        ? 'Verified Official'
        : 'Pending Official';
    }
    return 'Citizen';
  };

  const getRoleIcon = () => {
    if (isGuest) return <Clock className='h-4 w-4' />;
    if (user?.role === 'official') {
      return user?.isOfficialVerified ? (
        <Shield className='h-4 w-4 text-green-600' />
      ) : (
        <AlertTriangle className='h-4 w-4 text-orange-500' />
      );
    }
    return <User className='h-4 w-4' />;
  };

  return (
    <>
      {/* Guest Mode Manager - shows countdown and warnings */}
      {isGuest && (
        <div className='border-b'>
          <div className='container mx-auto px-4'>
            <GuestModeManager />
          </div>
        </div>
      )}

      <header className='flex h-16 items-center justify-between border-b bg-background px-4 md:px-6'>
        <div className='flex items-center gap-2'>
          <button
            onClick={() => router.push('/')}
            className='font-bold text-lg hover:text-blue-600 transition-colors'>
            Samudra Sahayak
          </button>
          {isGuest && (
            <span className='ml-2 px-2 py-1 text-xs bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 rounded-full'>
              Guest Mode
            </span>
          )}
        </div>

        <div className='flex items-center gap-4'>
          {/* Authentication Status */}
          {isAuthenticated || isGuest ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant='ghost'
                  className='flex items-center gap-2 h-auto p-2'>
                  <div className='flex items-center gap-2'>
                    {getRoleIcon()}
                    <div className='text-left'>
                      <div className='text-sm font-medium'>
                        {getDisplayName()}
                      </div>
                      <div className='text-xs text-muted-foreground'>
                        {getRoleDisplay()}
                      </div>
                    </div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='w-56'>
                <DropdownMenuLabel>
                  <div className='flex flex-col space-y-1'>
                    <p className='text-sm font-medium leading-none'>
                      {getDisplayName()}
                    </p>
                    <p className='text-xs leading-none text-muted-foreground'>
                      {getRoleDisplay()}
                    </p>
                    {isGuest && (
                      <p className='text-xs text-orange-600 dark:text-orange-400'>
                        {Math.floor(getGuestTimeRemaining() / 60)}:
                        {(getGuestTimeRemaining() % 60)
                          .toString()
                          .padStart(2, '0')}{' '}
                        remaining
                      </p>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {!isGuest && (
                  <>
                    <DropdownMenuItem onClick={handleProfileClick}>
                      <User className='mr-2 h-4 w-4' />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/settings')}>
                      <Settings className='mr-2 h-4 w-4' />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}

                {isGuest && (
                  <>
                    <DropdownMenuItem
                      onClick={() => router.push('/auth/login')}>
                      <User className='mr-2 h-4 w-4' />
                      <span>Sign In</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => router.push('/auth/register')}>
                      <Settings className='mr-2 h-4 w-4' />
                      <span>Create Account</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}

                <DropdownMenuItem
                  onClick={handleLogout}
                  disabled={isLoggingOut}>
                  <LogOut className='mr-2 h-4 w-4' />
                  <span>{isGuest ? 'Exit Guest Mode' : 'Sign Out'}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className='flex items-center gap-2'>
              <Button
                variant='ghost'
                onClick={() => router.push('/auth/login')}>
                Sign In
              </Button>
              <Button onClick={() => router.push('/auth/register')}>
                Get Started
              </Button>
            </div>
          )}
        </div>
      </header>
    </>
  );
}
