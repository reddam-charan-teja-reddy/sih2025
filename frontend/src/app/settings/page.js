'use client';

import { useState, useEffect } from 'react';
import { RouteGuard, useAuth } from '@/components/auth/AuthGuards';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Settings,
  Bell,
  Map,
  Shield,
  Palette,
  CheckCircle,
  Clock,
  Save,
  RotateCcw,
} from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  // Mock settings data with localStorage persistence
  const [settings, setSettings] = useState({
    notifications: {
      emergencyAlerts: true,
      reportUpdates: true,
      emailNotifications: false,
      smsNotifications: true,
      quietHours: false,
      weeklyDigest: true,
    },
    map: {
      showReports: true,
      showAlerts: true,
      autoCenter: true,
      clusterMarkers: true,
      satelliteView: false,
      trafficLayer: false,
    },
    privacy: {
      shareLocation: true,
      anonymousReporting: false,
      profileVisibility: true,
      dataSharing: false,
      analyticsOptIn: true,
    },
    display: {
      darkMode: false,
      highContrast: false,
      largeText: false,
      reduceMotion: false,
      compactView: false,
    },
  });

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('emergencyAppSettings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (error) {
        console.error('Error loading saved settings:', error);
      }
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('emergencyAppSettings', JSON.stringify(settings));
  }, [settings]);

  const handleSettingChange = (category, key, value) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    setSuccess(null);

    try {
      // Mock save operation
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSuccess('Settings saved successfully! (Backend integration pending)');
    } catch (error) {
      console.error('Mock save error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    const defaultSettings = {
      notifications: {
        emergencyAlerts: true,
        reportUpdates: true,
        emailNotifications: false,
        smsNotifications: true,
        quietHours: false,
        weeklyDigest: true,
      },
      map: {
        showReports: true,
        showAlerts: true,
        autoCenter: true,
        clusterMarkers: true,
        satelliteView: false,
        trafficLayer: false,
      },
      privacy: {
        shareLocation: true,
        anonymousReporting: false,
        profileVisibility: true,
        dataSharing: false,
        analyticsOptIn: true,
      },
      display: {
        darkMode: false,
        highContrast: false,
        largeText: false,
        reduceMotion: false,
        compactView: false,
      },
    };
    setSettings(defaultSettings);
  };

  const SettingItem = ({
    label,
    description,
    checked,
    onChange,
    category,
    settingKey,
  }) => (
    <div className='flex items-center justify-between p-4 bg-gray-50 rounded-lg'>
      <div className='flex-1'>
        <Label
          htmlFor={`${category}-${settingKey}`}
          className='text-sm font-medium'>
          {label}
        </Label>
        {description && (
          <p className='text-xs text-gray-500 mt-1'>{description}</p>
        )}
      </div>
      <Switch
        id={`${category}-${settingKey}`}
        checked={checked}
        onCheckedChange={onChange}
      />
    </div>
  );

  return (
    <RouteGuard allowGuest={false}>
      <div className='min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50'>
        <Header />

        <div className='container mx-auto px-4 py-8 max-w-4xl'>
          {/* Page Header */}
          <div className='mb-8'>
            <h1 className='text-3xl font-bold text-gray-900 mb-2'>Settings</h1>
            <p className='text-gray-600'>
              Customize your emergency management preferences
            </p>

            {/* Backend Notice */}
            <div className='mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg'>
              <div className='flex items-center gap-2'>
                <Clock className='h-4 w-4 text-yellow-600' />
                <span className='text-sm text-yellow-800 font-medium'>
                  Note: Settings are saved locally. Backend integration to be
                  implemented later.
                </span>
              </div>
            </div>
          </div>

          {success && (
            <Card className='mb-6 border-green-200 bg-green-50'>
              <CardContent className='p-4'>
                <div className='flex items-center gap-2 text-green-800'>
                  <CheckCircle className='h-4 w-4' />
                  <span className='text-sm font-medium'>{success}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue='notifications' className='space-y-6'>
            <TabsList className='grid w-full grid-cols-4'>
              <TabsTrigger value='notifications'>
                <Bell className='h-4 w-4 mr-2' />
                <span className='hidden sm:inline'>Notifications</span>
              </TabsTrigger>
              <TabsTrigger value='map'>
                <Map className='h-4 w-4 mr-2' />
                <span className='hidden sm:inline'>Map</span>
              </TabsTrigger>
              <TabsTrigger value='privacy'>
                <Shield className='h-4 w-4 mr-2' />
                <span className='hidden sm:inline'>Privacy</span>
              </TabsTrigger>
              <TabsTrigger value='display'>
                <Palette className='h-4 w-4 mr-2' />
                <span className='hidden sm:inline'>Display</span>
              </TabsTrigger>
            </TabsList>

            {/* Notifications Tab */}
            <TabsContent value='notifications' className='space-y-6'>
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2'>
                    <Bell className='h-5 w-5' />
                    Notification Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <SettingItem
                    category='notifications'
                    settingKey='emergencyAlerts'
                    label='Emergency Alerts'
                    description='Receive critical emergency notifications immediately'
                    checked={settings.notifications.emergencyAlerts}
                    onChange={(value) =>
                      handleSettingChange(
                        'notifications',
                        'emergencyAlerts',
                        value
                      )
                    }
                  />
                  <SettingItem
                    category='notifications'
                    settingKey='reportUpdates'
                    label='Report Updates'
                    description='Get notified when your reports are updated'
                    checked={settings.notifications.reportUpdates}
                    onChange={(value) =>
                      handleSettingChange(
                        'notifications',
                        'reportUpdates',
                        value
                      )
                    }
                  />
                  <SettingItem
                    category='notifications'
                    settingKey='emailNotifications'
                    label='Email Notifications'
                    description='Receive notifications via email'
                    checked={settings.notifications.emailNotifications}
                    onChange={(value) =>
                      handleSettingChange(
                        'notifications',
                        'emailNotifications',
                        value
                      )
                    }
                  />
                  <SettingItem
                    category='notifications'
                    settingKey='smsNotifications'
                    label='SMS Notifications'
                    description='Receive critical alerts via SMS'
                    checked={settings.notifications.smsNotifications}
                    onChange={(value) =>
                      handleSettingChange(
                        'notifications',
                        'smsNotifications',
                        value
                      )
                    }
                  />
                  <SettingItem
                    category='notifications'
                    settingKey='quietHours'
                    label='Quiet Hours (10 PM - 6 AM)'
                    description='Limit non-critical notifications during quiet hours'
                    checked={settings.notifications.quietHours}
                    onChange={(value) =>
                      handleSettingChange('notifications', 'quietHours', value)
                    }
                  />
                  <SettingItem
                    category='notifications'
                    settingKey='weeklyDigest'
                    label='Weekly Digest'
                    description='Receive a weekly summary of activity in your area'
                    checked={settings.notifications.weeklyDigest}
                    onChange={(value) =>
                      handleSettingChange(
                        'notifications',
                        'weeklyDigest',
                        value
                      )
                    }
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Map Tab */}
            <TabsContent value='map' className='space-y-6'>
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2'>
                    <Map className='h-5 w-5' />
                    Map Display Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <SettingItem
                    category='map'
                    settingKey='showReports'
                    label='Show Reports'
                    description='Display user-submitted emergency reports on the map'
                    checked={settings.map.showReports}
                    onChange={(value) =>
                      handleSettingChange('map', 'showReports', value)
                    }
                  />
                  <SettingItem
                    category='map'
                    settingKey='showAlerts'
                    label='Show Official Alerts'
                    description='Display government and official emergency alerts'
                    checked={settings.map.showAlerts}
                    onChange={(value) =>
                      handleSettingChange('map', 'showAlerts', value)
                    }
                  />
                  <SettingItem
                    category='map'
                    settingKey='autoCenter'
                    label='Auto-center on Location'
                    description='Automatically center map on your current location'
                    checked={settings.map.autoCenter}
                    onChange={(value) =>
                      handleSettingChange('map', 'autoCenter', value)
                    }
                  />
                  <SettingItem
                    category='map'
                    settingKey='clusterMarkers'
                    label='Cluster Markers'
                    description='Group nearby markers for better map performance'
                    checked={settings.map.clusterMarkers}
                    onChange={(value) =>
                      handleSettingChange('map', 'clusterMarkers', value)
                    }
                  />
                  <SettingItem
                    category='map'
                    settingKey='satelliteView'
                    label='Satellite View'
                    description='Use satellite imagery instead of standard map view'
                    checked={settings.map.satelliteView}
                    onChange={(value) =>
                      handleSettingChange('map', 'satelliteView', value)
                    }
                  />
                  <SettingItem
                    category='map'
                    settingKey='trafficLayer'
                    label='Traffic Layer'
                    description='Show real-time traffic information on the map'
                    checked={settings.map.trafficLayer}
                    onChange={(value) =>
                      handleSettingChange('map', 'trafficLayer', value)
                    }
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Privacy Tab */}
            <TabsContent value='privacy' className='space-y-6'>
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2'>
                    <Shield className='h-5 w-5' />
                    Privacy & Security
                  </CardTitle>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <SettingItem
                    category='privacy'
                    settingKey='shareLocation'
                    label='Share Location'
                    description='Allow emergency responders to access your location'
                    checked={settings.privacy.shareLocation}
                    onChange={(value) =>
                      handleSettingChange('privacy', 'shareLocation', value)
                    }
                  />
                  <SettingItem
                    category='privacy'
                    settingKey='anonymousReporting'
                    label='Anonymous Reporting'
                    description='Submit reports without revealing your identity'
                    checked={settings.privacy.anonymousReporting}
                    onChange={(value) =>
                      handleSettingChange(
                        'privacy',
                        'anonymousReporting',
                        value
                      )
                    }
                  />
                  <SettingItem
                    category='privacy'
                    settingKey='profileVisibility'
                    label='Profile Visibility'
                    description='Make your profile visible to other verified users'
                    checked={settings.privacy.profileVisibility}
                    onChange={(value) =>
                      handleSettingChange('privacy', 'profileVisibility', value)
                    }
                  />
                  <SettingItem
                    category='privacy'
                    settingKey='dataSharing'
                    label='Data Sharing'
                    description='Share anonymized data for emergency research'
                    checked={settings.privacy.dataSharing}
                    onChange={(value) =>
                      handleSettingChange('privacy', 'dataSharing', value)
                    }
                  />
                  <SettingItem
                    category='privacy'
                    settingKey='analyticsOptIn'
                    label='Analytics'
                    description='Help improve the app by sharing usage analytics'
                    checked={settings.privacy.analyticsOptIn}
                    onChange={(value) =>
                      handleSettingChange('privacy', 'analyticsOptIn', value)
                    }
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Display Tab */}
            <TabsContent value='display' className='space-y-6'>
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2'>
                    <Palette className='h-5 w-5' />
                    Display & Accessibility
                  </CardTitle>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <SettingItem
                    category='display'
                    settingKey='darkMode'
                    label='Dark Mode'
                    description='Use dark theme for reduced eye strain'
                    checked={settings.display.darkMode}
                    onChange={(value) =>
                      handleSettingChange('display', 'darkMode', value)
                    }
                  />
                  <SettingItem
                    category='display'
                    settingKey='highContrast'
                    label='High Contrast'
                    description='Increase contrast for better visibility'
                    checked={settings.display.highContrast}
                    onChange={(value) =>
                      handleSettingChange('display', 'highContrast', value)
                    }
                  />
                  <SettingItem
                    category='display'
                    settingKey='largeText'
                    label='Large Text'
                    description='Increase text size for better readability'
                    checked={settings.display.largeText}
                    onChange={(value) =>
                      handleSettingChange('display', 'largeText', value)
                    }
                  />
                  <SettingItem
                    category='display'
                    settingKey='reduceMotion'
                    label='Reduce Motion'
                    description='Minimize animations and transitions'
                    checked={settings.display.reduceMotion}
                    onChange={(value) =>
                      handleSettingChange('display', 'reduceMotion', value)
                    }
                  />
                  <SettingItem
                    category='display'
                    settingKey='compactView'
                    label='Compact View'
                    description='Use a more compact layout to show more information'
                    checked={settings.display.compactView}
                    onChange={(value) =>
                      handleSettingChange('display', 'compactView', value)
                    }
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className='flex flex-col sm:flex-row gap-3 pt-6 border-t'>
            <Button
              onClick={handleSave}
              disabled={loading}
              className='flex-1 bg-green-600 hover:bg-green-700'>
              <Save className='h-4 w-4 mr-2' />
              {loading ? 'Saving...' : 'Save Settings'}
            </Button>
            <Button onClick={handleReset} variant='outline' className='flex-1'>
              <RotateCcw className='h-4 w-4 mr-2' />
              Reset to Defaults
            </Button>
          </div>
        </div>
      </div>
    </RouteGuard>
  );
}
