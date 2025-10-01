'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { AlertsFeed } from '@/components/home/AlertsFeed';
import { ReportModal } from '@/components/home/ReportModal';
import Header from '@/components/layout/Header';
import { RouteGuard, useAuth } from '@/components/auth/AuthGuards';
import { GuestLimitations } from '@/components/auth/GuestMode';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  MapPin,
  Users,
  Smartphone,
  Clock,
  Wifi,
  WifiOff,
} from 'lucide-react';

// Dynamically import the MapView to ensure it only runs on the client-side
const MapView = dynamic(
  () => import('@/components/home/MapView').then((mod) => mod.MapView),
  {
    ssr: false,
    loading: () => (
      <div className='flex h-full w-full items-center justify-center bg-muted/50'>
        <div className='text-center'>
          <div className='spinner mx-auto mb-2 h-8 w-8'></div>
          <p className='text-muted-foreground'>Loading Map...</p>
        </div>
      </div>
    ),
  }
);

export default function HomePage() {
  const router = useRouter();
  const { isGuest, canPerformAction, user } = useAuth();
  const [stats, setStats] = useState({
    alerts: 0,
    reports: 0,
    areas: 0,
  });
  const [isOnline, setIsOnline] = useState(true);

  // Simple stats fetching
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [alertsRes, reportsRes] = await Promise.all([
          fetch('/api/alerts?limit=50'),
          fetch('/api/reports?limit=50'),
        ]);

        if (alertsRes.ok && reportsRes.ok) {
          const alerts = await alertsRes.json();
          const reports = await reportsRes.json();

          setStats({
            alerts: alerts.alerts?.length || 0,
            reports: reports.reports?.length || 0,
            areas: new Set(
              [
                ...(alerts.alerts || []).map((a) => a.area?.district),
                ...(reports.reports || []).map((r) => r.address?.split(',')[0]),
              ].filter(Boolean)
            ).size,
          });
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 300000); // 5 minutes
    return () => clearInterval(interval);
  }, []);

  // Connection status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <RouteGuard allowGuest={true}>
      <div className='h-screen flex flex-col bg-background'>
        <Header />

        {/* Status Bar - Enhanced design */}
        <div className='bg-card/90 backdrop-blur-md border-b border-border px-4 py-3 shadow-sm flex-shrink-0'>
          <div className='max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3'>
            <div className='flex items-center gap-4'>
              <Badge
                variant={isOnline ? 'default' : 'destructive'}
                className={`text-xs font-medium ${
                  isOnline
                    ? 'bg-status-success/10 text-status-success border-status-success/20 shadow-sm'
                    : 'bg-status-danger/10 text-status-danger border-status-danger/20 shadow-sm'
                }`}>
                {isOnline ? (
                  <Wifi className='h-3 w-3 mr-1' />
                ) : (
                  <WifiOff className='h-3 w-3 mr-1' />
                )}
                {isOnline ? 'Live' : 'Offline'}
              </Badge>

              <div className='flex items-center gap-3 text-sm'>
                <span className='flex items-center gap-2 bg-status-danger/5 px-3 py-2 rounded-full shadow-sm border border-status-danger/20'>
                  <AlertTriangle className='h-4 w-4 text-status-danger' />
                  <span className='font-semibold text-destructive'>
                    {stats.alerts}
                  </span>
                  <span className='hidden sm:inline text-destructive/80'>
                    Alerts
                  </span>
                </span>
                <span className='flex items-center gap-2 bg-status-info/5 px-3 py-2 rounded-full shadow-sm border border-status-info/20'>
                  <Smartphone className='h-4 w-4 text-status-info' />
                  <span className='font-semibold text-status-info'>
                    {stats.reports}
                  </span>
                  <span className='hidden sm:inline text-status-info/80'>
                    Reports
                  </span>
                </span>
                <span className='flex items-center gap-2 bg-accent-teal/5 px-3 py-2 rounded-full shadow-sm border border-accent-teal/20'>
                  <MapPin className='h-4 w-4 text-accent-teal' />
                  <span className='font-semibold text-accent-teal'>
                    {stats.areas}
                  </span>
                  <span className='hidden sm:inline text-accent-teal/80'>
                    Areas
                  </span>
                </span>
              </div>
            </div>

            {user && (
              <div className='text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full'>
                <span className='hidden sm:inline'>Welcome, </span>
                <span className='font-medium text-foreground'>
                  {user.fullName || user.email}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Guest Banner removed: no empty padding when GuestLimitations is null */}

        {/* Main Layout - Full remaining height */}
        <div className='flex-1 flex flex-col lg:flex-row overflow-hidden'>
          {/* Map Section - Better visibility for desktop */}
          <div className='h-[50vh] lg:h-full w-full lg:w-2/3 relative bg-background border-r border-border shadow-md'>
            <MapView />
          </div>

          {/* Alerts Section - Full remaining height */}
          <div className='h-[50vh] lg:h-full w-full lg:w-1/3 flex flex-col bg-card'>
            {/* Action Bar - Properly aligned */}
            <div className='p-4 border-b border-border bg-muted/50 flex-shrink-0'>
              <div className='flex flex-col gap-3'>
                {/* Primary Action - Report Button */}

                {/* Emergency Call */}
                <Button
                  onClick={() => window.open('tel:112')}
                  className='w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-lg hover:shadow-xl transition-all duration-300 py-3 rounded-lg font-semibold'>
                  <span className='text-xl mr-2'>🚨</span>
                  Emergency Call 112
                </Button>
              </div>
            </div>

            {/* Alerts Feed - Takes remaining space */}
            <div className='flex-1 overflow-hidden bg-background'>
              <AlertsFeed />
            </div>
          </div>
        </div>

        {/* Offline Warning - Better design 
        {!isOnline && (
          <div className='bg-destructive text-destructive-foreground p-3 text-center shadow-lg'>
            <div className='max-w-7xl mx-auto flex items-center justify-center gap-2'>
              <WifiOff className='h-4 w-4' />
              <span className='text-sm font-medium'>
                You are offline - Some features may be limited
              </span>
            </div>
          </div>
        )}
        */}
      </div>
    </RouteGuard>
  );
}
