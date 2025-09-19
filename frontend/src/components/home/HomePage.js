'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { AlertsFeed } from '@/components/home/AlertsFeed';
import { Header } from '@/components/layout/Header';
import { RouteGuard, useAuth } from '@/components/auth/AuthGuards';
import { GuestLimitations } from '@/components/auth/GuestMode';
import { Button } from '@/components/ui/button';

// Dynamically import the MapView to ensure it only runs on the client-side
const MapView = dynamic(
  () => import('@/components/home/MapView').then((mod) => mod.MapView),
  {
    ssr: false,
    loading: () => (
      <div className='flex h-full w-full items-center justify-center bg-gray-200'>
        <p>Loading Map...</p>
      </div>
    ),
  }
);

export default function HomePage() {
  const router = useRouter();
  const { isGuest, canPerformAction } = useAuth();

  return (
    <RouteGuard allowGuest={true}>
      <main className='flex h-screen w-screen flex-col overflow-hidden'>
        <Header />
        <div className='flex flex-1 flex-col md:flex-row'>
          {/* Top 50% on mobile, Left 50% on desktop */}
          <div className='h-1/2 w-full md:h-full md:w-1/2'>
            <MapView />
          </div>
          {/* Bottom 50% on mobile, Right 50% on desktop */}
          <div className='h-1/2 w-full md:h-full md:w-1/2 flex flex-col'>
            {/* Guest limitations banner */}
            {isGuest && (
              <div className='p-4 border-b'>
                <GuestLimitations />
              </div>
            )}

            {/* Quick Actions */}
            {!isGuest && (
              <div className='p-4 border-b bg-gray-50 dark:bg-gray-900'>
                <div className='flex gap-2 flex-wrap'>
                  {canPerformAction('submit_report') && (
                    <Button
                      onClick={() => router.push('/submit-report')}
                      size='sm'
                      className='bg-red-600 hover:bg-red-700 text-white'>
                      Report Emergency
                    </Button>
                  )}
                  <Button
                    onClick={() => router.push('/reports')}
                    variant='outline'
                    size='sm'>
                    View Reports
                  </Button>
                  <Button
                    onClick={() => router.push('/alerts')}
                    variant='outline'
                    size='sm'>
                    Active Alerts
                  </Button>
                </div>
              </div>
            )}

            {/* Alerts Feed */}
            <div className='flex-1 overflow-hidden'>
              <AlertsFeed />
            </div>
          </div>
        </div>
      </main>
    </RouteGuard>
  );
}
