'use client';

import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import L from 'leaflet';
import 'leaflet.markercluster';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Custom icons using our SVG assets
const createCustomIcon = (type, isVerified = false) => {
  const iconUrl = isVerified
    ? '/assets/markers/verified-report.svg'
    : '/assets/markers/unverified-report.svg';

  return new L.Icon({
    iconUrl,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
    className: `marker-${type} ${isVerified ? 'verified' : 'unverified'}`,
  });
};

const alertIcon = new L.Icon({
  iconUrl: '/assets/markers/official-alert.svg',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
  className: 'marker-alert',
});

// User location icon
const userIcon = new L.Icon({
  iconUrl: '/assets/icons/pin.svg',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
  className: 'marker-user animate-pulse',
});

// Map controls component - moved to bottom-left
function MapControls({ onRefresh, isLoading }) {
  return (
    <div className='absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-full shadow-md p-1'>
      <Button
        size='sm'
        variant='ghost'
        onClick={onRefresh}
        disabled={isLoading}
        className='text-xs px-2 py-1 h-8 w-8 rounded-full hover:bg-gray-100'
        title={isLoading ? 'Loading...' : 'Refresh map data'}>
        <span className={`text-sm ${isLoading ? 'animate-spin' : ''}`}>🔄</span>
      </Button>
    </div>
  );
}

// Component to handle clustering
function ClusterLayer({ data }) {
  const map = useMap();
  const clusterGroupRef = useRef(null);

  useEffect(() => {
    if (!map) return;

    // Remove existing cluster group
    if (clusterGroupRef.current) {
      map.removeLayer(clusterGroupRef.current);
    }

    // Create new cluster group
    clusterGroupRef.current = L.markerClusterGroup({
      chunkedLoading: true,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      maxClusterRadius: 80,
      iconCreateFunction: function (cluster) {
        const count = cluster.getChildCount();
        let className = 'marker-cluster-';

        if (count < 10) {
          className += 'small';
        } else if (count < 100) {
          className += 'medium';
        } else {
          className += 'large';
        }

        return new L.DivIcon({
          html: `<div><span>${count}</span></div>`,
          className: `marker-cluster ${className}`,
          iconSize: new L.Point(40, 40),
        });
      },
    });

    // Add all markers (no filtering)
    data.forEach((item) => {
      let icon;
      let popupContent;

      if (item.type === 'report') {
        icon = createCustomIcon(item.hazardType, item.isVerified);
        popupContent = `
          <div class="p-2 min-w-[200px]">
            <div class="flex items-center gap-2 mb-2">
              <img src="/assets/icons/${item.hazardType}.svg" alt="${
          item.hazardType
        }" class="w-5 h-5" />
              <h3 class="font-semibold text-sm">${item.title}</h3>
            </div>
            <p class="text-xs text-gray-600 mb-2">${item.description}</p>
            <div class="flex flex-wrap gap-1 mb-2">
              <span class="px-2 py-1 bg-${getSeverityColor(
                item.severity
              )}-100 text-${getSeverityColor(
          item.severity
        )}-800 text-xs rounded">
                ${item.severity}
              </span>
              ${
                item.isVerified
                  ? '<span class="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">✓ Verified</span>'
                  : '<span class="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">⚠ Unverified</span>'
              }
            </div>
            <div class="text-xs text-gray-500">
              <p>📍 ${item.address || 'Location not specified'}</p>
              <p>🕒 ${new Date(item.createdAt).toLocaleString()}</p>
              <p>👤 ${item.reportedBy?.fullName || 'Anonymous'}</p>
            </div>
          </div>
        `;
      } else if (item.type === 'alert') {
        icon = alertIcon;
        popupContent = `
          <div class="p-2 min-w-[200px]">
            <div class="flex items-center gap-2 mb-2">
              <img src="/assets/icons/${item.hazardType}.svg" alt="${
          item.hazardType
        }" class="w-5 h-5" />
              <h3 class="font-semibold text-sm text-red-700">${item.title}</h3>
            </div>
            <p class="text-xs text-gray-600 mb-2">${item.message}</p>
            <div class="flex flex-wrap gap-1 mb-2">
              <span class="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                🚨 ${item.alertType}
              </span>
              <span class="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">
                ${item.urgency}
              </span>
            </div>
            <div class="text-xs text-gray-500">
              <p>🏛️ ${item.organization}</p>
              <p>🕒 ${new Date(item.issuedAt).toLocaleString()}</p>
              ${
                item.expiresAt
                  ? `<p>⏰ Expires: ${new Date(
                      item.expiresAt
                    ).toLocaleString()}</p>`
                  : ''
              }
            </div>
          </div>
        `;
      }

      const coordinates = item.location?.coordinates || [item.lat, item.lng];
      const marker = L.marker([coordinates[1], coordinates[0]], { icon });
      marker.bindPopup(popupContent);
      clusterGroupRef.current.addLayer(marker);
    });

    map.addLayer(clusterGroupRef.current);

    return () => {
      if (clusterGroupRef.current) {
        map.removeLayer(clusterGroupRef.current);
      }
    };
  }, [map, data]);

  return null;
}

// Utility function for severity colors
function getSeverityColor(severity) {
  const colors = {
    low: 'blue',
    medium: 'yellow',
    high: 'orange',
    critical: 'red',
  };
  return colors[severity] || 'gray';
}

export function MapView() {
  const [userPosition, setUserPosition] = useState([17.6868, 83.2185]); // Default to Visakhapatnam
  const [mapData, setMapData] = useState({ reports: [], alerts: [] });
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get user location
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPosition([pos.coords.latitude, pos.coords.longitude]);
        setLoading(false);
      },
      (err) => {
        console.error('Could not get user location:', err);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Fetch map data
  const fetchMapData = async () => {
    if (loading) return; // Don't fetch until we have position

    setDataLoading(true);
    setError(null);

    try {
      const [lat, lng] = userPosition;
      const response = await fetch(
        `/api/map/data?lat=${lat}&lng=${lng}&radius=10000&includeReports=true&includeAlerts=true&activeOnly=true`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch map data');
      }

      const data = await response.json();
      setMapData(data);
    } catch (err) {
      console.error('Error fetching map data:', err);
      setError(err.message);
    } finally {
      setDataLoading(false);
    }
  };

  // Fetch data when position is available
  useEffect(() => {
    fetchMapData();
  }, [userPosition, loading]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchMapData, 30000);
    return () => clearInterval(interval);
  }, [userPosition]);

  if (loading) {
    return (
      <div className='flex h-full w-full items-center justify-center bg-gray-100'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2'></div>
          <p className='text-sm text-gray-600'>Getting your location...</p>
        </div>
      </div>
    );
  }

  if (error && !mapData.reports?.length && !mapData.alerts?.length) {
    return (
      <div className='flex h-full w-full items-center justify-center bg-gray-100'>
        <Card className='p-4 text-center'>
          <CardContent>
            <p className='text-red-600 mb-2'>⚠️ Failed to load map data</p>
            <p className='text-sm text-gray-600 mb-3'>{error}</p>
            <Button onClick={fetchMapData} size='sm'>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Combine reports and alerts for clustering
  const allMapItems = [
    ...(mapData.reports || []).map((report) => ({ ...report, type: 'report' })),
    ...(mapData.alerts || []).map((alert) => ({ ...alert, type: 'alert' })),
  ];

  return (
    <div className='h-full w-full relative'>
      <MapContainer
        center={userPosition}
        zoom={13}
        scrollWheelZoom={true}
        className='h-full w-full z-0'
        style={{ backgroundColor: '#f8fafc' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        />

        {/* User's Location Marker */}
        <Marker position={userPosition} icon={userIcon}>
          <Popup>
            <div className='text-center p-1'>
              <p className='font-semibold text-sm'>📍 You are here</p>
              <p className='text-xs text-gray-600'>
                {userPosition[0].toFixed(4)}, {userPosition[1].toFixed(4)}
              </p>
            </div>
          </Popup>
        </Marker>

        {/* Clustered markers for reports and alerts */}
        <ClusterLayer data={allMapItems} />
      </MapContainer>

      {/* Map Controls */}
      <MapControls onRefresh={fetchMapData} isLoading={dataLoading} />

      {/* Data status indicator */}
      {dataLoading && (
        <div className='absolute bottom-4 left-4 z-10 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs'>
          <div className='flex items-center gap-2'>
            <div className='animate-spin rounded-full h-3 w-3 border-b border-blue-600'></div>
            Updating...
          </div>
        </div>
      )}

      {/* Data summary */}
      <div className='absolute bottom-4 right-4 z-10 bg-white rounded-lg shadow-lg p-2'>
        <div className='flex gap-2 text-xs'>
          <Badge variant='outline'>
            {(mapData.reports || []).length} Reports
          </Badge>
          <Badge variant='outline'>
            {(mapData.alerts || []).length} Alerts
          </Badge>
        </div>
      </div>
    </div>
  );
}
