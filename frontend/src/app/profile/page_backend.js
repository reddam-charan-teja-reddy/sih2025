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
} from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isGuest, canPerformAction } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    location: '',
    emergencyContact: '',
    organization: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || '',
        email: user.email || '',
        phone: user.phone || '',
        location: user.location || '',
        emergencyContact: user.emergencyContact || '',
        organization: user.organization || '',
      });
    }
  }, [user]);

  const handleSave = async () => {
    if (!canPerformAction('save_preferences')) {
      setError('You do not have permission to save changes.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      setSuccess('Profile updated successfully!');
      setIsEditing(false);

      // Refresh user data
      window.location.reload();
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getRoleInfo = () => {
    if (user?.role === 'official') {
      return {
        label: user.isOfficialVerified
          ? 'Verified Official'
          : 'Pending Official',
        color: user.isOfficialVerified
          ? 'bg-green-100 text-green-800'
          : 'bg-yellow-100 text-yellow-800',
        icon: user.isOfficialVerified ? CheckCircle : AlertTriangle,
      };
    }
    return {
      label: 'Citizen',
      color: 'bg-blue-100 text-blue-800',
      icon: User,
    };
  };

  if (isGuest) {
    return (
      <RouteGuard allowGuest={false}>
        <div className='min-h-screen bg-gray-50'>
          <Header />
          <div className='container mx-auto px-4 py-8'>
            <Card>
              <CardContent className='p-8 text-center'>
                <AlertTriangle className='h-12 w-12 text-yellow-500 mx-auto mb-4' />
                <h2 className='text-xl font-semibold mb-2'>
                  Profile Not Available
                </h2>
                <p className='text-gray-600 mb-4'>
                  Guest users cannot access profile settings. Please log in to
                  manage your profile.
                </p>
                <Button onClick={() => router.push('/auth/login')}>
                  Log In
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </RouteGuard>
    );
  }

  const roleInfo = getRoleInfo();
  const RoleIcon = roleInfo.icon;

  return (
    <RouteGuard allowGuest={false}>
      <div className='min-h-screen bg-gray-50'>
        <Header />
        <div className='container mx-auto px-4 py-8 max-w-4xl'>
          {/* Profile Header */}
          <div className='mb-8'>
            <Card>
              <CardHeader>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-4'>
                    <div className='w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center'>
                      <User className='h-8 w-8 text-gray-500' />
                    </div>
                    <div>
                      <CardTitle className='text-2xl'>
                        {user?.fullName || 'User'}
                      </CardTitle>
                      <div className='flex items-center gap-2 mt-1'>
                        <Badge className={roleInfo.color}>
                          <RoleIcon className='h-3 w-3 mr-1' />
                          {roleInfo.label}
                        </Badge>
                        {user?.role === 'official' && user?.organization && (
                          <Badge variant='outline'>
                            <Shield className='h-3 w-3 mr-1' />
                            {user.organization}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant={isEditing ? 'default' : 'outline'}
                    onClick={() => setIsEditing(!isEditing)}
                    disabled={loading}>
                    {isEditing ? (
                      <Save className='h-4 w-4 mr-2' />
                    ) : (
                      <Edit className='h-4 w-4 mr-2' />
                    )}
                    {isEditing ? 'Cancel' : 'Edit Profile'}
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

          {/* Profile Content */}
          <Tabs defaultValue='personal' className='space-y-6'>
            <TabsList className='grid w-full grid-cols-3'>
              <TabsTrigger value='personal'>Personal Info</TabsTrigger>
              <TabsTrigger value='contact'>Contact Details</TabsTrigger>
              <TabsTrigger value='security'>Security</TabsTrigger>
            </TabsList>

            <TabsContent value='personal'>
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div>
                      <Label htmlFor='fullName'>Full Name</Label>
                      <Input
                        id='fullName'
                        value={formData.fullName}
                        onChange={(e) =>
                          handleChange('fullName', e.target.value)
                        }
                        disabled={!isEditing}
                        className={!isEditing ? 'bg-gray-50' : ''}
                      />
                    </div>
                    <div>
                      <Label htmlFor='email'>Email Address</Label>
                      <Input
                        id='email'
                        type='email'
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        disabled={!isEditing}
                        className={!isEditing ? 'bg-gray-50' : ''}
                      />
                    </div>
                  </div>

                  {user?.role === 'official' && (
                    <div>
                      <Label htmlFor='organization'>Organization</Label>
                      <Input
                        id='organization'
                        value={formData.organization}
                        onChange={(e) =>
                          handleChange('organization', e.target.value)
                        }
                        disabled={!isEditing}
                        className={!isEditing ? 'bg-gray-50' : ''}
                        placeholder='Government agency or organization'
                      />
                    </div>
                  )}

                  {isEditing && (
                    <div className='flex gap-2 pt-4'>
                      <Button onClick={handleSave} disabled={loading}>
                        {loading ? 'Saving...' : 'Save Changes'}
                      </Button>
                      <Button
                        variant='outline'
                        onClick={() => setIsEditing(false)}>
                        Cancel
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value='contact'>
              <Card>
                <CardHeader>
                  <CardTitle>Contact Details</CardTitle>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div>
                      <Label htmlFor='phone'>Phone Number</Label>
                      <Input
                        id='phone'
                        type='tel'
                        value={formData.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        disabled={!isEditing}
                        className={!isEditing ? 'bg-gray-50' : ''}
                        placeholder='+91 XXXXX XXXXX'
                      />
                    </div>
                    <div>
                      <Label htmlFor='emergencyContact'>
                        Emergency Contact
                      </Label>
                      <Input
                        id='emergencyContact'
                        type='tel'
                        value={formData.emergencyContact}
                        onChange={(e) =>
                          handleChange('emergencyContact', e.target.value)
                        }
                        disabled={!isEditing}
                        className={!isEditing ? 'bg-gray-50' : ''}
                        placeholder='Emergency contact number'
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor='location'>Location</Label>
                    <Input
                      id='location'
                      value={formData.location}
                      onChange={(e) => handleChange('location', e.target.value)}
                      disabled={!isEditing}
                      className={!isEditing ? 'bg-gray-50' : ''}
                      placeholder='City, State'
                    />
                  </div>

                  {isEditing && (
                    <div className='flex gap-2 pt-4'>
                      <Button onClick={handleSave} disabled={loading}>
                        {loading ? 'Saving...' : 'Save Changes'}
                      </Button>
                      <Button
                        variant='outline'
                        onClick={() => setIsEditing(false)}>
                        Cancel
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value='security'>
              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='space-y-4'>
                    <div className='p-4 border rounded-lg'>
                      <h4 className='font-medium mb-2'>Account Status</h4>
                      <div className='flex items-center gap-2'>
                        <CheckCircle className='h-4 w-4 text-green-600' />
                        <span className='text-sm'>Email Verified</span>
                      </div>
                      {user?.role === 'official' && (
                        <div className='flex items-center gap-2 mt-2'>
                          {user.isOfficialVerified ? (
                            <>
                              <CheckCircle className='h-4 w-4 text-green-600' />
                              <span className='text-sm'>
                                Official Status Verified
                              </span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className='h-4 w-4 text-yellow-600' />
                              <span className='text-sm'>
                                Official Status Pending Verification
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    <div className='space-y-2'>
                      <Button variant='outline' className='w-full'>
                        Change Password
                      </Button>
                      <Button variant='outline' className='w-full'>
                        Two-Factor Authentication
                      </Button>
                    </div>
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
