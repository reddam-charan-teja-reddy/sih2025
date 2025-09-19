'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { AlertsFeed } from '@/components/home/AlertsFeed';
import { ReportModal } from '@/components/home/ReportModal';
import { Header } from '@/components/layout/Header';
import { RouteGuard, useAuth } from '@/components/auth/AuthGuards';
import { GuestLimitations } from '@/components/auth/GuestMode';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  MapPin,
  Users,
  Smartphone,
  Navigation,
  Clock,
  Wifi,
  WifiOff
} from 'lucide-react';

// Dynamically import the MapView to ensure it only runs on the client-side
const MapView = dynamic(
  () => import('@/components/home/MapView').then((mod) => mod.MapView),
  {
    ssr: false,
    loading: () => (
      <div className='flex h-full w-full items-center justify-center bg-gray-200'>
        <div className="animate-pulse">
          <p>Loading Map...</p>
        </div>
      </div>
    ),
  }
);

export default function HomePage() {
  const router = useRouter();
  const { isGuest, canPerformAction, user } = useAuth();
  const [stats, setStats] = useState({
    activeAlerts: 0,
    recentReports: 0,
    affectedAreas: 0,
    responseTeams: 0
  });
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('online');
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Fetch dashboard statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        
        // Fetch multiple endpoints sequentially using async/await
        const alertsRes = await fetch('/api/alerts?limit=100');
        const reportsRes = await fetch('/api/reports?limit=100');

        if (alertsRes.ok && reportsRes.ok) {
          const alertsData = await alertsRes.json();
          const reportsData = await reportsRes.json();

          // Calculate statistics
          const now = Date.now();
          const dayAgo = now - (24 * 60 * 60 * 1000);
          const weekAgo = now - (7 * 24 * 60 * 60 * 1000);

          const activeAlerts = alertsData.alerts?.filter(alert => 
            alert.status === 'active' && new Date(alert.createdAt).getTime() > weekAgo
          ).length || 0;

          const recentReports = reportsData.reports?.filter(report => 
            new Date(report.createdAt).getTime() > dayAgo
          ).length || 0;

          // Extract unique affected areas (based on district/city)
          const affectedAreas = new Set([
            ...(alertsData.alerts || []).map(alert => alert.area?.district || 'Unknown'),
            ...(reportsData.reports || []).map(report => report.address?.split(',')[1]?.trim() || 'Unknown')
          ]).size;

          // Simulate response teams count
          const responseTeams = Math.max(3, Math.floor(activeAlerts * 1.5 + recentReports * 0.5));

          setStats({
            activeAlerts,
            recentReports,
            affectedAreas,
            responseTeams
          });
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        setConnectionStatus('offline');
      } finally {
        setLoading(false);
        setLastUpdate(new Date());
      }
    };

    fetchStats();
    
    // Refresh stats every 2 minutes
    const interval = setInterval(fetchStats, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const updateOnlineStatus = () => {
      setConnectionStatus(navigator.onLine ? 'online' : 'offline');
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  const StatCard = ({ icon: Icon, title, value, description, color = "blue" }) => (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium">{title}</CardTitle>
        <Icon className={`h-3 w-3 text-${color}-600`} />
      </CardHeader>
      <CardContent>
        <div className="text-lg font-bold">
          {loading ? (
            <div className="animate-pulse bg-gray-200 h-6 w-12 rounded"></div>
          ) : (
            value
          )}
        </div>
        {description && (
          <p className="text-xs text-gray-600 mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <RouteGuard allowGuest={true}>
      <main className='flex h-screen w-screen flex-col overflow-hidden'>
        <Header />
        
        {/* Quick Stats Bar - Mobile optimized */}
        <div className="bg-white border-b px-2 py-2 md:px-4 md:py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Badge 
                variant={connectionStatus === 'online' ? 'default' : 'destructive'}
                className="text-xs"
              >
                {connectionStatus === 'online' ? (
                  <><Wifi className="h-3 w-3 mr-1" />Online</>
                ) : (
                  <><WifiOff className="h-3 w-3 mr-1" />Offline</>
                )}
              </Badge>
              {lastUpdate && (
                <div className="hidden sm:flex items-center text-xs text-gray-500">
                  <Clock className="h-3 w-3 mr-1" />
                  {lastUpdate.toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-2">
            <StatCard
              icon={AlertTriangle}
              title="Alerts"
              value={stats.activeAlerts}
              description="7 days"
              color="red"
            />
            <StatCard
              icon={Smartphone}
              title="Reports"
              value={stats.recentReports}
              description="24 hrs"
              color="orange"
            />
            <StatCard
              icon={MapPin}
              title="Areas"
              value={stats.affectedAreas}
              description="affected"
              color="purple"
            />
            <StatCard
              icon={Users}
              title="Teams"
              value={stats.responseTeams}
              description="active"
              color="green"
            />
          </div>
        </div>

        <div className='flex flex-1 flex-col md:flex-row overflow-hidden'>
          {/* Top 50% on mobile, Left 50% on desktop */}
          <div className='h-1/2 w-full md:h-full md:w-1/2 relative'>
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
            <div className='p-3 border-b bg-gray-50 dark:bg-gray-900'>
              <div className='flex gap-2 flex-wrap'>
                {canPerformAction('submit_report') ? (
                  <div className="flex-1">
                    <ReportModal />
                  </div>
                ) : (
                  <Button
                    onClick={() => router.push('/auth/login')}
                    size='sm'
                    className='bg-red-600 hover:bg-red-700 text-white'>
                    Login to Report
                  </Button>
                )}
                
                <Button
                  onClick={() => router.push('/reports')}
                  variant='outline'
                  size='sm'>
                  <Navigation className="h-3 w-3 mr-1" />
                  Reports
                </Button>
                
                <Button
                  onClick={() => router.push('/alerts')}
                  variant='outline'
                  size='sm'>
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Alerts
                </Button>

                {/* Emergency Quick Dial */}
                <Button
                  onClick={() => window.open('tel:112')}
                  variant='destructive'
                  size='sm'
                  className='ml-auto'>
                  🚨 112
                </Button>
              </div>
            </div>

            {/* Alerts Feed */}
            <div className='flex-1 overflow-hidden'>
              <AlertsFeed />
            </div>
          </div>
        </div>

        {/* Offline Banner */}
        {connectionStatus === 'offline' && (
          <div className="bg-red-600 text-white p-2 text-center">
            <div className="flex items-center justify-center gap-2">
              <WifiOff className="h-4 w-4" />
              <span className="text-sm">Offline mode - Some features limited</span>
            </div>
          </div>
        )}
      </main>
    </RouteGuard>
  );
}
