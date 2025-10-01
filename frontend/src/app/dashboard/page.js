'use client';

import { RouteGuard, useAuth } from '@/components/auth/AuthGuards';
import Header from '@/components/layout/Header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  Shield,
  User,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, isGuest, canPerformAction } = useAuth();

  // Check if user has official role access
  const isOfficialUser =
    user?.role === 'official' ||
    user?.role === 'admin' ||
    user?.role === 'responder';

  // If user is not official, show access denied
  if (isGuest || !user || !isOfficialUser) {
    return (
      <RouteGuard allowGuest={false}>
        <div className='min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50'>
          <Header />
          <div className='container mx-auto px-4 py-16 max-w-2xl text-center'>
            <div className='bg-white rounded-xl shadow-lg p-8 border border-red-200'>
              <Shield className='h-16 w-16 text-red-600 mx-auto mb-4' />
              <h1 className='text-2xl font-bold text-gray-900 mb-4'>
                Access Restricted
              </h1>
              <p className='text-gray-600 mb-6'>
                This dashboard is only available to authorized emergency
                response personnel. Normal users cannot access official
                emergency management features.
              </p>
              <div className='bg-red-50 border border-red-200 rounded-lg p-4 mb-6'>
                <p className='text-sm text-red-800'>
                  <strong>Required Role:</strong> Official, Admin, or Emergency
                  Responder
                </p>
                {user && (
                  <p className='text-sm text-red-700 mt-1'>
                    <strong>Your Role:</strong> {user.role || 'Standard User'}
                  </p>
                )}
              </div>
              <div className='flex flex-col sm:flex-row gap-3 justify-center'>
                <Button
                  onClick={() => (window.location.href = '/')}
                  className='bg-blue-600 hover:bg-blue-700'>
                  Return to Home
                </Button>
                <Button
                  onClick={() => (window.location.href = '/profile')}
                  variant='outline'>
                  View Profile
                </Button>
              </div>
            </div>
          </div>
        </div>
      </RouteGuard>
    );
  }

  const stats = [
    {
      title: 'Active Incidents',
      value: '12',
      description: 'Currently being monitored',
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-100 dark:bg-red-900',
    },
    {
      title: 'Resolved Today',
      value: '8',
      description: 'Incidents resolved',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900',
    },
    {
      title: 'Response Time',
      value: '4.2 min',
      description: 'Average response',
      icon: Clock,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900',
    },
    {
      title: 'Coverage Area',
      value: '15 km²',
      description: 'Monitoring radius',
      icon: MapPin,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900',
    },
  ];

  const quickActions = [
    {
      title: 'Report Emergency',
      description: 'Submit a new emergency report',
      action: 'submit_report',
      href: '/submit-report',
      color: 'bg-red-600 hover:bg-red-700',
      icon: AlertTriangle,
    },
    {
      title: 'View All Reports',
      description: 'Browse emergency reports',
      action: 'view_reports',
      href: '/reports',
      color: 'bg-blue-600 hover:bg-blue-700',
      icon: Users,
    },
    {
      title: 'Emergency Contacts',
      description: 'Manage your emergency contacts',
      action: 'save_preferences',
      href: '/emergency-contacts',
      color: 'bg-green-600 hover:bg-green-700',
      icon: User,
    },
    {
      title: 'Admin Panel',
      description: 'Access admin features',
      action: 'access_admin',
      href: '/admin',
      color: 'bg-purple-600 hover:bg-purple-700',
      icon: Shield,
    },
  ];

  return (
    <RouteGuard allowGuest={true}>
      <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
        <Header />

        <div className='container mx-auto px-4 py-8'>
          {/* Welcome Section */}
          <div className='mb-8'>
            <div className='flex items-center justify-between mb-4'>
              <div>
                <h1 className='text-3xl font-bold text-gray-900 dark:text-gray-100'>
                  Welcome back{user?.name ? `, ${user.name}` : ''}
                </h1>
                <p className='text-gray-600 dark:text-gray-400'>
                  {isGuest
                    ? 'You are viewing in guest mode. Core features are available during this session.'
                    : 'Monitor and respond to emergencies in your area.'}
                </p>
              </div>
              <div className='flex items-center space-x-2'>
                {user?.role === 'official' && (
                  <Badge
                    variant={user.isOfficialVerified ? 'default' : 'secondary'}>
                    <Shield className='h-3 w-3 mr-1' />
                    {user.isOfficialVerified
                      ? 'Verified Official'
                      : 'Pending Verification'}
                  </Badge>
                )}
                {isGuest && (
                  <Badge variant='outline'>
                    <Clock className='h-3 w-3 mr-1' />
                    Guest Mode
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'>
            {stats.map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <Card key={index} className='hover:shadow-lg transition-shadow'>
                  <CardContent className='p-6'>
                    <div className='flex items-center justify-between'>
                      <div>
                        <p className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                          {stat.title}
                        </p>
                        <p className='text-3xl font-bold text-gray-900 dark:text-gray-100'>
                          {stat.value}
                        </p>
                        <p className='text-sm text-gray-500 dark:text-gray-500'>
                          {stat.description}
                        </p>
                      </div>
                      <div className={`p-3 rounded-full ${stat.bgColor}`}>
                        <IconComponent className={`h-6 w-6 ${stat.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common tasks and operations you can perform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
                {quickActions.map((action, index) => {
                  const IconComponent = action.icon;
                  const canPerform = canPerformAction(action.action);

                  return (
                    <Button
                      key={index}
                      variant={canPerform ? 'default' : 'outline'}
                      disabled={!canPerform}
                      className={`h-auto p-4 flex flex-col items-start text-left ${
                        canPerform ? action.color : ''
                      }`}
                      onClick={() => {
                        if (canPerform) {
                          window.location.href = action.href;
                        }
                      }}>
                      <div className='flex items-center w-full mb-2'>
                        <IconComponent className='h-5 w-5 mr-2' />
                        <span className='font-semibold'>{action.title}</span>
                      </div>
                      <span className='text-sm opacity-80'>
                        {action.description}
                      </span>
                      {!canPerform && (
                        <span className='text-xs text-red-500 mt-1'>
                          {isGuest
                            ? 'Sign in required'
                            : 'Insufficient permissions'}
                        </span>
                      )}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className='mt-8'>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Latest emergency reports and system updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                {[
                  {
                    time: '2 minutes ago',
                    title: 'New emergency report submitted',
                    description: 'Flooding reported near Marine Drive',
                    status: 'active',
                  },
                  {
                    time: '15 minutes ago',
                    title: 'Incident resolved',
                    description: 'Oil spill cleanup completed at Gateway',
                    status: 'resolved',
                  },
                  {
                    time: '1 hour ago',
                    title: 'Emergency alert sent',
                    description: 'High tide warning for coastal areas',
                    status: 'alert',
                  },
                ].map((activity, index) => (
                  <div
                    key={index}
                    className='flex items-start space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800'>
                    <div
                      className={`w-2 h-2 rounded-full mt-2 ${
                        activity.status === 'active'
                          ? 'bg-red-500'
                          : activity.status === 'resolved'
                          ? 'bg-green-500'
                          : 'bg-yellow-500'
                      }`}
                    />
                    <div className='flex-1'>
                      <div className='flex items-center justify-between'>
                        <h4 className='font-medium text-gray-900 dark:text-gray-100'>
                          {activity.title}
                        </h4>
                        <span className='text-sm text-gray-500 dark:text-gray-400'>
                          {activity.time}
                        </span>
                      </div>
                      <p className='text-sm text-gray-600 dark:text-gray-400'>
                        {activity.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </RouteGuard>
  );
}
