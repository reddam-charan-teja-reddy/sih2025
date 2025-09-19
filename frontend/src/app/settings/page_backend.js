'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RouteGuard, useAuth } from '@/components/auth/AuthGuards';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Settings,
  Bell,
  Map,
  Shield,
  Smartphone,
  Globe,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  AlertTriangle,
} from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { user, isGuest, canPerformAction } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [settings, setSettings] = useState({
    notifications: {
      pushEnabled: true,
      emailEnabled: true,
      smsEnabled: false,
      emergencyAlerts: true,
      weeklyReports: true,
      soundEnabled: true,
    },
    map: {
      defaultZoom: 12,
      autoLocation: true,
      showClusters: true,
      mapStyle: 'standard',
      refreshInterval: 30,
    },
    privacy: {
      shareLocation: true,
      profileVisible: false,
      analyticsEnabled: true,
    },
    display: {
      theme: 'system',
      language: 'en',
      timezone: 'auto',
    },
  });

  useEffect(() => {
    // Load user settings from localStorage or API
    const savedSettings = localStorage.getItem('userSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings((prev) => ({ ...prev, ...parsed }));
      } catch (err) {
        console.error('Failed to parse saved settings:', err);
      }
    }
  }, []);

  const handleSettingChange = (category, setting, value) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: value,
      },
    }));
  };

  const saveSettings = async () => {
    if (!canPerformAction('save_preferences')) {
      setError('You do not have permission to save settings.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Save to localStorage
      localStorage.setItem('userSettings', JSON.stringify(settings));

      // Also save to server if authenticated
      if (!isGuest) {
        const response = await fetch('/api/user/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to save settings');
        }
      }

      setSuccess('Settings saved successfully!');
    } catch (err) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  if (isGuest) {
    return (
      <RouteGuard allowGuest={true}>
        <div className='min-h-screen bg-gray-50'>
          <Header />
          <div className='container mx-auto px-4 py-8'>
            <Card>
              <CardContent className='p-8 text-center'>
                <AlertTriangle className='h-12 w-12 text-yellow-500 mx-auto mb-4' />
                <h2 className='text-xl font-semibold mb-2'>
                  Limited Settings Access
                </h2>
                <p className='text-gray-600 mb-4'>
                  Guest users have limited access to settings. Some preferences
                  are saved locally only.
                </p>
                <Button onClick={() => router.push('/auth/login')}>
                  Log In for Full Access
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </RouteGuard>
    );
  }

  return (
    <RouteGuard allowGuest={true}>
      <div className='min-h-screen bg-gray-50'>
        <Header />
        <div className='container mx-auto px-4 py-8 max-w-4xl'>
          {/* Header */}
          <div className='mb-8'>
            <Card>
              <CardHeader>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-3'>
                    <Settings className='h-6 w-6' />
                    <CardTitle className='text-2xl'>Settings</CardTitle>
                  </div>
                  <Button onClick={saveSettings} disabled={loading}>
                    {loading ? 'Saving...' : 'Save All Changes'}
                  </Button>
                </div>
              </CardHeader>
            </Card>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <Card className='mb-6 border-red-200 bg-red-50'>
              <CardContent className='p-4'>
                <p className='text-red-800 text-sm'>{error}</p>
              </CardContent>
            </Card>
          )}

          {success && (
            <Card className='mb-6 border-green-200 bg-green-50'>
              <CardContent className='p-4'>
                <p className='text-green-800 text-sm'>{success}</p>
              </CardContent>
            </Card>
          )}

          {/* Settings Tabs */}
          <Tabs defaultValue='notifications' className='space-y-6'>
            <TabsList className='grid w-full grid-cols-4'>
              <TabsTrigger value='notifications'>Notifications</TabsTrigger>
              <TabsTrigger value='map'>Map & Location</TabsTrigger>
              <TabsTrigger value='privacy'>Privacy</TabsTrigger>
              <TabsTrigger value='display'>Display</TabsTrigger>
            </TabsList>

            <TabsContent value='notifications'>
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2'>
                    <Bell className='h-5 w-5' />
                    Notification Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent className='space-y-6'>
                  <div className='space-y-4'>
                    <div className='flex items-center justify-between'>
                      <div>
                        <Label htmlFor='push-notifications'>
                          Push Notifications
                        </Label>
                        <p className='text-sm text-gray-600'>
                          Receive real-time alerts on your device
                        </p>
                      </div>
                      <Switch
                        id='push-notifications'
                        checked={settings.notifications.pushEnabled}
                        onCheckedChange={(checked) =>
                          handleSettingChange(
                            'notifications',
                            'pushEnabled',
                            checked
                          )
                        }
                      />
                    </div>

                    <div className='flex items-center justify-between'>
                      <div>
                        <Label htmlFor='email-notifications'>
                          Email Notifications
                        </Label>
                        <p className='text-sm text-gray-600'>
                          Get updates via email
                        </p>
                      </div>
                      <Switch
                        id='email-notifications'
                        checked={settings.notifications.emailEnabled}
                        onCheckedChange={(checked) =>
                          handleSettingChange(
                            'notifications',
                            'emailEnabled',
                            checked
                          )
                        }
                      />
                    </div>

                    <div className='flex items-center justify-between'>
                      <div>
                        <Label htmlFor='emergency-alerts'>
                          Emergency Alerts
                        </Label>
                        <p className='text-sm text-gray-600'>
                          Critical emergency notifications
                        </p>
                      </div>
                      <Switch
                        id='emergency-alerts'
                        checked={settings.notifications.emergencyAlerts}
                        onCheckedChange={(checked) =>
                          handleSettingChange(
                            'notifications',
                            'emergencyAlerts',
                            checked
                          )
                        }
                      />
                    </div>

                    <div className='flex items-center justify-between'>
                      <div>
                        <Label htmlFor='sound-notifications'>
                          Sound Alerts
                        </Label>
                        <p className='text-sm text-gray-600'>
                          Play sound for notifications
                        </p>
                      </div>
                      <Switch
                        id='sound-notifications'
                        checked={settings.notifications.soundEnabled}
                        onCheckedChange={(checked) =>
                          handleSettingChange(
                            'notifications',
                            'soundEnabled',
                            checked
                          )
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value='map'>
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2'>
                    <Map className='h-5 w-5' />
                    Map & Location Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className='space-y-6'>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div>
                      <Label htmlFor='default-zoom'>Default Zoom Level</Label>
                      <Select
                        value={settings.map.defaultZoom.toString()}
                        onValueChange={(value) =>
                          handleSettingChange(
                            'map',
                            'defaultZoom',
                            parseInt(value)
                          )
                        }>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='8'>City Level (8)</SelectItem>
                          <SelectItem value='10'>
                            District Level (10)
                          </SelectItem>
                          <SelectItem value='12'>Local Area (12)</SelectItem>
                          <SelectItem value='14'>Neighborhood (14)</SelectItem>
                          <SelectItem value='16'>Street Level (16)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor='refresh-interval'>
                        Auto Refresh (seconds)
                      </Label>
                      <Select
                        value={settings.map.refreshInterval.toString()}
                        onValueChange={(value) =>
                          handleSettingChange(
                            'map',
                            'refreshInterval',
                            parseInt(value)
                          )
                        }>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='15'>15 seconds</SelectItem>
                          <SelectItem value='30'>30 seconds</SelectItem>
                          <SelectItem value='60'>1 minute</SelectItem>
                          <SelectItem value='120'>2 minutes</SelectItem>
                          <SelectItem value='300'>5 minutes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className='space-y-4'>
                    <div className='flex items-center justify-between'>
                      <div>
                        <Label htmlFor='auto-location'>
                          Auto-detect Location
                        </Label>
                        <p className='text-sm text-gray-600'>
                          Automatically center map on your location
                        </p>
                      </div>
                      <Switch
                        id='auto-location'
                        checked={settings.map.autoLocation}
                        onCheckedChange={(checked) =>
                          handleSettingChange('map', 'autoLocation', checked)
                        }
                      />
                    </div>

                    <div className='flex items-center justify-between'>
                      <div>
                        <Label htmlFor='show-clusters'>Show Clusters</Label>
                        <p className='text-sm text-gray-600'>
                          Group nearby markers into clusters
                        </p>
                      </div>
                      <Switch
                        id='show-clusters'
                        checked={settings.map.showClusters}
                        onCheckedChange={(checked) =>
                          handleSettingChange('map', 'showClusters', checked)
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value='privacy'>
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2'>
                    <Shield className='h-5 w-5' />
                    Privacy & Security
                  </CardTitle>
                </CardHeader>
                <CardContent className='space-y-6'>
                  <div className='space-y-4'>
                    <div className='flex items-center justify-between'>
                      <div>
                        <Label htmlFor='share-location'>Share Location</Label>
                        <p className='text-sm text-gray-600'>
                          Allow location sharing for reports
                        </p>
                      </div>
                      <Switch
                        id='share-location'
                        checked={settings.privacy.shareLocation}
                        onCheckedChange={(checked) =>
                          handleSettingChange(
                            'privacy',
                            'shareLocation',
                            checked
                          )
                        }
                      />
                    </div>

                    <div className='flex items-center justify-between'>
                      <div>
                        <Label htmlFor='profile-visible'>Public Profile</Label>
                        <p className='text-sm text-gray-600'>
                          Make your profile visible to other users
                        </p>
                      </div>
                      <Switch
                        id='profile-visible'
                        checked={settings.privacy.profileVisible}
                        onCheckedChange={(checked) =>
                          handleSettingChange(
                            'privacy',
                            'profileVisible',
                            checked
                          )
                        }
                      />
                    </div>

                    <div className='flex items-center justify-between'>
                      <div>
                        <Label htmlFor='analytics'>Usage Analytics</Label>
                        <p className='text-sm text-gray-600'>
                          Help improve the app with anonymous usage data
                        </p>
                      </div>
                      <Switch
                        id='analytics'
                        checked={settings.privacy.analyticsEnabled}
                        onCheckedChange={(checked) =>
                          handleSettingChange(
                            'privacy',
                            'analyticsEnabled',
                            checked
                          )
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value='display'>
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2'>
                    <Smartphone className='h-5 w-5' />
                    Display & Language
                  </CardTitle>
                </CardHeader>
                <CardContent className='space-y-6'>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div>
                      <Label htmlFor='theme'>Theme</Label>
                      <Select
                        value={settings.display.theme}
                        onValueChange={(value) =>
                          handleSettingChange('display', 'theme', value)
                        }>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='light'>
                            <div className='flex items-center gap-2'>
                              <Sun className='h-4 w-4' />
                              Light Mode
                            </div>
                          </SelectItem>
                          <SelectItem value='dark'>
                            <div className='flex items-center gap-2'>
                              <Moon className='h-4 w-4' />
                              Dark Mode
                            </div>
                          </SelectItem>
                          <SelectItem value='system'>
                            <div className='flex items-center gap-2'>
                              <Smartphone className='h-4 w-4' />
                              System Default
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor='language'>Language</Label>
                      <Select
                        value={settings.display.language}
                        onValueChange={(value) =>
                          handleSettingChange('display', 'language', value)
                        }>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='en'>English</SelectItem>
                          <SelectItem value='hi'>हिंदी (Hindi)</SelectItem>
                          <SelectItem value='te'>తెలుగు (Telugu)</SelectItem>
                          <SelectItem value='ta'>தமிழ் (Tamil)</SelectItem>
                          <SelectItem value='bn'>বাংলা (Bengali)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Save Button */}
          <div className='flex justify-end'>
            <Button onClick={saveSettings} disabled={loading} size='lg'>
              {loading ? 'Saving Settings...' : 'Save All Changes'}
            </Button>
          </div>
        </div>
      </div>
    </RouteGuard>
  );
}
