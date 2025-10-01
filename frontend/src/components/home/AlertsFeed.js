'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { ReportModal } from './ReportModal';

// Utility function to calculate distance
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Utility function to format time ago
function timeAgo(date) {
  const now = new Date();
  const diffInMinutes = Math.floor((now - new Date(date)) / (1000 * 60));

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
}

// Get severity color
function getSeverityColor(severity) {
  const colors = {
    low: 'bg-[#007AFF]/10 text-[#007AFF]',
    medium: 'bg-[#FFCC00]/10 text-[#FFCC00]',
    high: 'bg-[#FF9500]/10 text-[#FF9500]',
    critical: 'bg-[#FF3B30]/10 text-[#FF3B30]',
  };
  return colors[severity] || 'bg-muted text-muted-foreground';
}

const AlertCard = ({ item, userPosition, onClick }) => {
  const isAlert = item.type === 'alert';
  const coordinates = item.location?.coordinates || [item.lng, item.lat];
  const distance = userPosition
    ? calculateDistance(
        userPosition[0],
        userPosition[1],
        coordinates[1],
        coordinates[0]
      )
    : 0;

  const distanceText =
    distance < 1
      ? `${Math.round(distance * 1000)}m away`
      : `${distance.toFixed(1)}km away`;

  return (
    <Card
      className='mb-4 hover:bg-accent cursor-pointer border-l-4'
      style={{
        borderLeftColor: isAlert
          ? '#ef4444'
          : item.isVerified
          ? '#22c55e'
          : '#f59e0b',
      }}
      onClick={() => onClick && onClick(item)}>
      <CardHeader className='pb-2'>
        <div className='flex items-start justify-between'>
          <div className='flex items-center gap-2'>
            <img
              src={`/assets/icons/${item.hazardType || 'other'}.svg`}
              alt={item.hazardType}
              className='w-5 h-5'
            />
            <CardTitle className='text-sm'>{item.title}</CardTitle>
          </div>
          {isAlert && (
            <Badge variant='destructive' className='text-xs'>
              ALERT
            </Badge>
          )}
        </div>
        <CardDescription className='text-xs'>
          {distanceText} • {timeAgo(item.createdAt || item.issuedAt)}
        </CardDescription>
      </CardHeader>
      <CardContent className='pt-0'>
        <div className='flex items-start gap-3'>
          {item.images && item.images[0] && (
            <div className='flex-shrink-0'>
              <Image
                src={item.images[0].url || '/placeholder.jpg'}
                alt={item.title}
                width={80}
                height={80}
                className='rounded-md object-cover w-20 h-20'
                onError={(e) => {
                  e.target.src = '/placeholder.jpg';
                }}
              />
            </div>
          )}
          <div className='flex-1 min-w-0'>
            <p className='text-sm text-muted-foreground mb-2 line-clamp-2'>
              {item.description || item.message}
            </p>
            <div className='flex flex-wrap gap-1'>
              <Badge
                variant='secondary'
                className={`text-xs ${getSeverityColor(item.severity)}`}>
                {item.severity}
              </Badge>
              {!isAlert && (
                <Badge
                  variant={item.isVerified ? 'default' : 'outline'}
                  className='text-xs'>
                  {item.isVerified ? '✓ Verified' : '⚠ Unverified'}
                </Badge>
              )}
              {isAlert && (
                <Badge variant='outline' className='text-xs'>
                  {item.urgency}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export function AlertsFeed() {
  const [data, setData] = useState({ reports: [], alerts: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userPosition, setUserPosition] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  // Get user location for distance calculations
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPosition([pos.coords.latitude, pos.coords.longitude]);
      },
      (err) => {
        console.error(
          'Could not get user location for distance calculation:',
          err
        );
      }
    );
  }, []);

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const lat = userPosition ? userPosition[0] : 17.6868;
      const lng = userPosition ? userPosition[1] : 83.2185;

      const [reportsResponse, alertsResponse] = await Promise.all([
        fetch(
          `/api/reports?lat=${lat}&lng=${lng}&radius=50000&limit=50&sortBy=createdAt&sortOrder=desc`
        ),
        fetch(
          `/api/alerts?lat=${lat}&lng=${lng}&radius=50000&limit=20&activeOnly=true`
        ),
      ]);

      if (!reportsResponse.ok || !alertsResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const reportsData = await reportsResponse.json();
      const alertsData = await alertsResponse.json();

      setData({
        reports: reportsData.reports || [],
        alerts: alertsData.alerts || [],
      });
    } catch (err) {
      console.error('Error fetching feed data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userPosition]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [userPosition]);

  // Prepare data for tabs
  const localReports = data.reports.filter((report) => {
    if (!userPosition) return true;
    const coordinates = report.location?.coordinates || [0, 0];
    const distance = calculateDistance(
      userPosition[0],
      userPosition[1],
      coordinates[1],
      coordinates[0]
    );
    return distance <= 10; // Within 10km
  });

  const verifiedItems = [
    ...data.reports
      .filter((r) => r.isVerified)
      .map((r) => ({ ...r, type: 'report' })),
    ...data.alerts.map((a) => ({ ...a, type: 'alert' })),
  ].sort(
    (a, b) =>
      new Date(b.createdAt || b.issuedAt) - new Date(a.createdAt || a.issuedAt)
  );

  const unverifiedReports = data.reports
    .filter((r) => !r.isVerified)
    .map((r) => ({ ...r, type: 'report' }));

  const allLocalItems = [
    ...localReports.map((r) => ({ ...r, type: 'report' })),
    ...data.alerts.map((a) => ({ ...a, type: 'alert' })),
  ].sort(
    (a, b) =>
      new Date(b.createdAt || b.issuedAt) - new Date(a.createdAt || a.issuedAt)
  );

  if (loading && !data.reports.length && !data.alerts.length) {
    return (
      <div className='flex flex-col h-full w-full'>
        <div className='flex items-center justify-center flex-1'>
          <div className='text-center'>
            <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2'></div>
            <p className='text-sm text-muted-foreground'>Loading alerts...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !data.reports.length && !data.alerts.length) {
    return (
      <div className='flex flex-col h-full w-full bg-secondary p-4'>
        <Card className='flex-1 flex items-center justify-center'>
          <CardContent className='text-center'>
            <p className='text-red-600 mb-2'>⚠️ Failed to load alerts</p>
            <p className='text-sm text-gray-600 mb-3'>{error}</p>
            <Button onClick={fetchData} size='sm'>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='h-full w-full flex flex-col bg-background'>
      <Tabs defaultValue='local' className='h-full flex flex-col'>
        {/* Tab Header - Fixed */}
        <div className='flex items-center justify-between p-4 pb-2 flex-shrink-0'>
          <TabsList className='grid w-full grid-cols-3'>
            <TabsTrigger value='local' className='text-xs'>
              Local ({allLocalItems.length})
            </TabsTrigger>
            <TabsTrigger value='verified' className='text-xs'>
              Verified ({verifiedItems.length})
            </TabsTrigger>
            <TabsTrigger value='unverified' className='text-xs'>
              Unverified ({unverifiedReports.length})
            </TabsTrigger>
          </TabsList>
          <Button
            onClick={fetchData}
            size='sm'
            variant='ghost'
            disabled={loading}
            className='ml-2'>
            {loading ? '⏳' : '🔄'}
          </Button>
        </div>

        {/* Tab Content - Scrollable */}
        <div className='flex-1 min-h-0 px-4 pb-4'>
          <TabsContent value='local' className='h-full overflow-y-auto'>
            {allLocalItems.length === 0 ? (
              <Card className='p-4 text-center'>
                <CardContent>
                  <p className='text-gray-600 text-sm'>
                    No local alerts or reports found
                  </p>
                  <p className='text-xs text-gray-500 mt-1'>
                    Reports and alerts within 10km will appear here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className='space-y-4 pb-4'>
                {allLocalItems.map((item) => (
                  <AlertCard
                    key={`${item.type}-${item.id || item._id}`}
                    item={item}
                    userPosition={userPosition}
                    onClick={setSelectedItem}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value='verified' className='h-full overflow-y-auto'>
            {verifiedItems.length === 0 ? (
              <Card className='p-4 text-center'>
                <CardContent>
                  <p className='text-gray-600 text-sm'>
                    No verified alerts found
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className='space-y-4 pb-4'>
                {verifiedItems.map((item) => (
                  <AlertCard
                    key={`${item.type}-${item.id || item._id}`}
                    item={item}
                    userPosition={userPosition}
                    onClick={setSelectedItem}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value='unverified' className='h-full overflow-y-auto'>
            <div className='sticky top-0 bg-background z-10 text-center p-3 text-sm text-orange-600 bg-orange-50 rounded-md mb-4 border border-orange-200'>
              ⚠️ These are unconfirmed reports. Please exercise caution and
              verify independently.
            </div>
            {unverifiedReports.length === 0 ? (
              <Card className='p-4 text-center'>
                <CardContent>
                  <p className='text-gray-600 text-sm'>
                    No unverified reports found
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className='space-y-4 pb-4'>
                {unverifiedReports.map((item) => (
                  <AlertCard
                    key={`${item.type}-${item.id || item._id}`}
                    item={item}
                    userPosition={userPosition}
                    onClick={setSelectedItem}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>

      {/* Floating Report Button */}
      <div className='absolute bottom-4 right-4 z-20'>
        <ReportModal />
      </div>
    </div>
  );
}
