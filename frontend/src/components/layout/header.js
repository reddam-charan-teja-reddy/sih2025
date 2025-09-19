'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, LogOut, Settings, Shield, Menu, X } from 'lucide-react';
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

export function Header() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isAuthenticated, isGuest, user } = useAuth();
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

  if (!isAuthenticated && !isGuest) {
    // Show simple header for unauthenticated users
    return (
      <header className='border-b bg-background px-4 py-3'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <h1 className='text-xl font-bold text-gray-900'>
              🚨 Emergency Hub
            </h1>
          </div>
          <div className='flex items-center gap-2'>
            <Button
              onClick={() => router.push('/auth/login')}
              variant='outline'>
              Login
            </Button>
            <Button onClick={() => router.push('/auth/register')}>
              Register
            </Button>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className='border-b bg-background px-4 py-3 shadow-sm'>
      <div className='flex items-center justify-between'>
        {/* Logo and Title */}
        <div className='flex items-center gap-3'>
          <button
            onClick={() => router.push('/')}
            className='text-xl font-bold text-foreground hover:text-primary transition-colors'>
            🚨 Emergency Hub
          </button>

          {isGuest && (
            <span className='text-xs bg-[#FF9500]/10 text-[#FF9500] px-2 py-1 rounded-full'>
              Guest Mode
            </span>
          )}
        </div>

        {/* User Menu */}
        <div className='flex items-center gap-3'>
          {/* Quick Actions - Only show dashboard for official users */}
          {!isGuest &&
            user &&
            (user.role === 'official' ||
              user.role === 'admin' ||
              user.role === 'responder') && (
              <div className='hidden md:flex items-center gap-2'>
                <Button
                  onClick={() => router.push('/dashboard')}
                  variant='ghost'
                  size='sm'
                  className='text-muted-foreground hover:text-foreground'>
                  Dashboard
                </Button>
              </div>
            )}

          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                className='flex items-center gap-2 px-3 py-2'>
                <div className='h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center'>
                  <User className='h-4 w-4 text-primary' />
                </div>
                <span className='hidden md:block text-sm font-medium'>
                  {isGuest
                    ? 'Guest User'
                    : user?.fullName || user?.email || 'User'}
                </span>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align='end' className='w-56'>
              <DropdownMenuLabel>
                <div className='flex flex-col space-y-1'>
                  <p className='text-sm font-medium'>
                    {isGuest ? 'Guest User' : user?.fullName || 'User'}
                  </p>
                  {!isGuest && user?.email && (
                    <p className='text-xs text-muted-foreground'>
                      {user.email}
                    </p>
                  )}
                  {user?.role && (
                    <div className='flex items-center gap-1'>
                      <Shield className='h-3 w-3' />
                      <span className='text-xs text-blue-600 capitalize'>
                        {user.role}
                      </span>
                    </div>
                  )}
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              {!isGuest && (
                <>
                  <DropdownMenuItem onClick={() => router.push('/profile')}>
                    <User className='mr-2 h-4 w-4' />
                    Profile
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => router.push('/settings')}>
                    <Settings className='mr-2 h-4 w-4' />
                    Settings
                  </DropdownMenuItem>

                  {/* Only show dashboard for official users */}
                  {(user?.role === 'official' ||
                    user?.role === 'admin' ||
                    user?.role === 'responder') && (
                    <DropdownMenuItem onClick={() => router.push('/dashboard')}>
                      <Shield className='mr-2 h-4 w-4' />
                      Dashboard
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator />
                </>
              )}

              {isGuest ? (
                <>
                  <DropdownMenuItem onClick={() => router.push('/auth/login')}>
                    <User className='mr-2 h-4 w-4' />
                    Login
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push('/auth/register')}>
                    <User className='mr-2 h-4 w-4' />
                    Register
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem
                  onClick={handleLogout}
                  disabled={isLoggingOut}>
                  <LogOut className='mr-2 h-4 w-4' />
                  {isLoggingOut ? 'Signing out...' : 'Sign out'}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
