'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RouteGuard, useAuth } from '@/components/auth/AuthGuards';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Shield,
  Edit,
  Save,
  Camera,
  AlertTriangle,
  CheckCircle,
  Clock,
} from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isGuest } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  
  // Mock profile data
  const [formData, setFormData] = useState({
    fullName: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+91 98765 43210',
    location: 'Visakhapatnam, Andhra Pradesh',
    emergencyContact: '+91 98765 43211',
    organization: 'Volunteer Rescue Team',
  });

  // Mock statistics
  const [stats, setStats] = useState({
    reportsSubmitted: 12,
    alertsReceived: 45,
    communityScore: 850,
    badgesEarned: 3,
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    setSuccess(null);
    
    // Mock save operation
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      setSuccess('Profile updated successfully! (Backend integration pending)');
      setIsEditing(false);
    } catch (error) {
      console.error('Mock save error:', error);
    } finally {
      setLoading(false);
    }
  };

  const mockBadges = [
    { name: 'First Reporter', icon: '🏆', description: 'Submitted your first emergency report' },
    { name: 'Community Helper', icon: '🤝', description: 'Helped 10+ community members' },
    { name: 'Quick Responder', icon: '⚡', description: 'Responded to emergencies within 5 minutes' },
  ];

  const mockRecentActivity = [
    { date: '2024-01-15', action: 'Reported flood on Main Street', type: 'report' },
    { date: '2024-01-12', action: 'Received storm warning alert', type: 'alert' },
    { date: '2024-01-10', action: 'Updated emergency contact', type: 'profile' },
    { date: '2024-01-08', action: 'Reported road blockage', type: 'report' },
  ];

  return (
    <RouteGuard allowGuest={false}>
      <div className='min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50'>
        <Header />
        
        <div className='container mx-auto px-4 py-8 max-w-4xl'>
          {/* Page Header */}
          <div className='mb-8'>
            <h1 className='text-3xl font-bold text-gray-900 mb-2'>Profile</h1>
            <p className='text-gray-600'>Manage your account information and emergency settings</p>
            
            {/* Backend Notice */}
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-yellow-800 font-medium">
                  Note: This page uses mock data. Backend integration to be implemented later.
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

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile">Profile Info</TabsTrigger>
              <TabsTrigger value="stats">Statistics</TabsTrigger>
              <TabsTrigger value="activity">Recent Activity</TabsTrigger>
            </TabsList>

            {/* Profile Information Tab */}
            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Personal Information
                    </CardTitle>
                  </div>
                  <Button
                    onClick={() => setIsEditing(!isEditing)}
                    variant="outline"
                    size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    {isEditing ? 'Cancel' : 'Edit'}
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className={!isEditing ? 'bg-gray-50' : ''}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className={!isEditing ? 'bg-gray-50' : ''}
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className={!isEditing ? 'bg-gray-50' : ''}
                      />
                    </div>
                    <div>
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className={!isEditing ? 'bg-gray-50' : ''}
                      />
                    </div>
                    <div>
                      <Label htmlFor="emergencyContact">Emergency Contact</Label>
                      <Input
                        id="emergencyContact"
                        name="emergencyContact"
                        value={formData.emergencyContact}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className={!isEditing ? 'bg-gray-50' : ''}
                      />
                    </div>
                    <div>
                      <Label htmlFor="organization">Organization</Label>
                      <Input
                        id="organization"
                        name="organization"
                        value={formData.organization}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className={!isEditing ? 'bg-gray-50' : ''}
                      />
                    </div>
                  </div>

                  {isEditing && (
                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button
                        onClick={handleSave}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700">
                        <Save className="h-4 w-4 mr-2" />
                        {loading ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Badges Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Achievement Badges
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {mockBadges.map((badge, index) => (
                      <div key={index} className="text-center p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border">
                        <div className="text-3xl mb-2">{badge.icon}</div>
                        <h3 className="font-semibold text-gray-900 mb-1">{badge.name}</h3>
                        <p className="text-xs text-gray-600">{badge.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Statistics Tab */}
            <TabsContent value="stats" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="text-center">
                  <CardContent className="p-6">
                    <div className="text-2xl font-bold text-blue-600 mb-2">{stats.reportsSubmitted}</div>
                    <div className="text-sm text-gray-600">Reports Submitted</div>
                  </CardContent>
                </Card>
                <Card className="text-center">
                  <CardContent className="p-6">
                    <div className="text-2xl font-bold text-red-600 mb-2">{stats.alertsReceived}</div>
                    <div className="text-sm text-gray-600">Alerts Received</div>
                  </CardContent>
                </Card>
                <Card className="text-center">
                  <CardContent className="p-6">
                    <div className="text-2xl font-bold text-green-600 mb-2">{stats.communityScore}</div>
                    <div className="text-sm text-gray-600">Community Score</div>
                  </CardContent>
                </Card>
                <Card className="text-center">
                  <CardContent className="p-6">
                    <div className="text-2xl font-bold text-purple-600 mb-2">{stats.badgesEarned}</div>
                    <div className="text-sm text-gray-600">Badges Earned</div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Recent Activity Tab */}
            <TabsContent value="activity" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockRecentActivity.map((activity, index) => (
                      <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-shrink-0">
                          {activity.type === 'report' && <AlertTriangle className="h-5 w-5 text-red-500" />}
                          {activity.type === 'alert' && <Shield className="h-5 w-5 text-orange-500" />}
                          {activity.type === 'profile' && <User className="h-5 w-5 text-blue-500" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                          <p className="text-xs text-gray-600">{new Date(activity.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </RouteGuard>
  );
}