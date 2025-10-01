'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  loginUser,
  loginAsGuest,
  clearMessages,
  clearAuth,
  selectAuth,
  setPasswordResetStep,
} from '@/store/authSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertCircle,
  Eye,
  EyeOff,
  Shield,
  Users,
  MapPin,
  Timer,
  Lock,
  Mail,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const {
    isAuthenticated,
    isGuest,
    loading,
    error,
    message,
    requiresVerification,
    requiresOfficialVerification,
    verificationUserId,
  } = useAppSelector(selectAuth);

  const [activeTab, setActiveTab] = useState('citizen');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
  const [formData, setFormData] = useState({
    credential: '',
    password: '',
  });
  const [formErrors, setFormErrors] = useState({});

  // Redirect if already authenticated (but allow guests to access login)
  useEffect(() => {
    if (isAuthenticated && !isGuest) {
      router.push('/');
    }
    // If user is a guest and accessing login, clear guest state
    if (isGuest) {
      dispatch(clearAuth());
    }
  }, [isAuthenticated, isGuest, router, dispatch]);

  // Clear messages when component mounts
  useEffect(() => {
    dispatch(clearMessages());
  }, [dispatch]);

  const validateForm = () => {
    const errors = {};

    if (!formData.credential.trim()) {
      errors.credential = 'Email or phone number is required';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    const credentials = {
      ...formData,
      rememberDevice,
      role: activeTab, // Include role context
    };

    dispatch(loginUser(credentials));
  };

  const handleGuestLogin = () => {
    dispatch(loginAsGuest());
  };

  const handleForgotPassword = () => {
    dispatch(setPasswordResetStep({ step: 'request' }));
    router.push('/auth/forgot-password');
  };

  const getCredentialPlaceholder = () => {
    return activeTab === 'official'
      ? 'Official email or phone'
      : 'Email or phone number';
  };

  const getCredentialIcon = () => {
    return formData.credential.includes('@') ? Mail : Users;
  };

  const CredentialIcon = getCredentialIcon();

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-blue-950 dark:via-gray-900 dark:to-cyan-950'>
      <div className='container mx-auto px-4 py-8'>
        <div className='grid lg:grid-cols-2 gap-8 min-h-screen items-center'>
          {/* Hero Section */}
          <div className='space-y-6'>
            <div className='space-y-4'>
              <h1 className='text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white'>
                Samudra Sahayak
              </h1>
              <p className='text-xl text-gray-600 dark:text-gray-300'>
                Crowdsourced Ocean Hazard Reporting System
              </p>
            </div>

            <div className='prose prose-lg max-w-none'>
              <p className='text-gray-700 dark:text-gray-300'>
                Join thousands of citizens and officials in keeping our coastal
                communities safe. Report hazards, receive real-time alerts, and
                access critical safety information.
              </p>
            </div>

            {/* Feature highlights */}
            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='flex items-center space-x-3 p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg'>
                <MapPin className='h-8 w-8 text-blue-600' />
                <div>
                  <h3 className='font-semibold'>Real-time Reports</h3>
                  <p className='text-sm text-gray-600 dark:text-gray-300'>
                    Get instant hazard updates from your community
                  </p>
                </div>
              </div>

              <div className='flex items-center space-x-3 p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg'>
                <Shield className='h-8 w-8 text-green-600' />
                <div>
                  <h3 className='font-semibold'>Official Verification</h3>
                  <p className='text-sm text-gray-600 dark:text-gray-300'>
                    Reports verified by coastal authorities
                  </p>
                </div>
              </div>
            </div>

            {/* Emergency notice */}
            <Alert className='border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950'>
              <Timer className='h-4 w-4' />
              <AlertDescription>
                <strong>In an emergency?</strong> Use the guest mode below for
                immediate access to safety information.
              </AlertDescription>
            </Alert>
          </div>

          {/* Login Form Section */}
          <div className='w-full max-w-md mx-auto'>
            <Card className='shadow-xl'>
              <CardHeader className='space-y-1'>
                <CardTitle className='text-2xl font-bold text-center'>
                  Welcome Back
                </CardTitle>
                <CardDescription className='text-center'>
                  Sign in to your account to continue
                </CardDescription>
              </CardHeader>

              <CardContent className='space-y-4'>
                {/* Error/Success Messages */}
                {error && (
                  <Alert variant='destructive'>
                    <AlertCircle className='h-4 w-4' />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {message && (
                  <Alert className='border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'>
                    <AlertCircle className='h-4 w-4' />
                    <AlertDescription>{message}</AlertDescription>
                  </Alert>
                )}

                {/* Verification Notice */}
                {requiresVerification && (
                  <Alert className='border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950'>
                    <AlertCircle className='h-4 w-4' />
                    <AlertDescription>
                      Please verify your account first.{' '}
                      <Link
                        href={`/auth/verify?userId=${verificationUserId}`}
                        className='font-medium underline'>
                        Verify now
                      </Link>
                    </AlertDescription>
                  </Alert>
                )}

                {requiresOfficialVerification && (
                  <Alert className='border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950'>
                    <Lock className='h-4 w-4' />
                    <AlertDescription>
                      Your official account is pending verification. Contact
                      your administrator for assistance.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Role Selection Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className='grid w-full grid-cols-2'>
                    <TabsTrigger
                      value='citizen'
                      className='flex items-center gap-2'>
                      <Users className='h-4 w-4' />
                      Citizen
                    </TabsTrigger>
                    <TabsTrigger
                      value='official'
                      className='flex items-center gap-2'>
                      <Shield className='h-4 w-4' />
                      Official
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value='citizen' className='space-y-4 mt-4'>
                    <p className='text-sm text-gray-600 dark:text-gray-300 text-center'>
                      Report hazards and receive safety alerts in your area
                    </p>
                  </TabsContent>

                  <TabsContent value='official' className='space-y-4 mt-4'>
                    <p className='text-sm text-gray-600 dark:text-gray-300 text-center'>
                      Verify reports and send official alerts to citizens
                    </p>
                  </TabsContent>
                </Tabs>

                {/* Login Form */}
                <form onSubmit={handleLogin} className='space-y-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='credential'>Email or Phone Number</Label>
                    <div className='relative'>
                      <CredentialIcon className='absolute left-3 top-3 h-4 w-4 text-gray-400' />
                      <Input
                        id='credential'
                        name='credential'
                        type='text'
                        placeholder={getCredentialPlaceholder()}
                        value={formData.credential}
                        onChange={handleInputChange}
                        className={`pl-10 ${
                          formErrors.credential ? 'border-red-500' : ''
                        }`}
                        autoComplete='username'
                        aria-describedby='credential-error'
                      />
                    </div>
                    {formErrors.credential && (
                      <p id='credential-error' className='text-sm text-red-600'>
                        {formErrors.credential}
                      </p>
                    )}
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='password'>Password</Label>
                    <div className='relative'>
                      <Lock className='absolute left-3 top-3 h-4 w-4 text-gray-400' />
                      <Input
                        id='password'
                        name='password'
                        type={showPassword ? 'text' : 'password'}
                        placeholder='Enter your password'
                        value={formData.password}
                        onChange={handleInputChange}
                        className={`pl-10 pr-10 ${
                          formErrors.password ? 'border-red-500' : ''
                        }`}
                        autoComplete='current-password'
                        aria-describedby='password-error'
                      />
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        className='absolute right-1 top-1 h-8 w-8 p-0'
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={
                          showPassword ? 'Hide password' : 'Show password'
                        }>
                        {showPassword ? (
                          <EyeOff className='h-4 w-4' />
                        ) : (
                          <Eye className='h-4 w-4' />
                        )}
                      </Button>
                    </div>
                    {formErrors.password && (
                      <p id='password-error' className='text-sm text-red-600'>
                        {formErrors.password}
                      </p>
                    )}
                  </div>

                  <div className='flex items-center justify-between'>
                    <div className='flex items-center space-x-2'>
                      <Checkbox
                        id='remember'
                        checked={rememberDevice}
                        onCheckedChange={setRememberDevice}
                      />
                      <Label htmlFor='remember' className='text-sm'>
                        Remember this device
                      </Label>
                    </div>

                    <Button
                      type='button'
                      variant='link'
                      className='px-0 text-sm'
                      onClick={handleForgotPassword}>
                      Forgot password?
                    </Button>
                  </div>

                  <Button type='submit' className='w-full' disabled={loading}>
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>

                {/* Emergency Guest Access */}
                <div className='space-y-3'>
                  <div className='relative'>
                    <div className='absolute inset-0 flex items-center'>
                      <span className='w-full border-t' />
                    </div>
                    <div className='relative flex justify-center text-xs uppercase'>
                      <span className='bg-background px-2 text-muted-foreground'>
                        Emergency Access
                      </span>
                    </div>
                  </div>

                  <Button
                    type='button'
                    variant='outline'
                    className='w-full border-orange-200 text-orange-700 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-300 dark:hover:bg-orange-950'
                    onClick={handleGuestLogin}
                    disabled={loading}>
                    <Timer className='mr-2 h-4 w-4' />
                    Enter Citizen View (10 min)
                  </Button>

                  <p className='text-xs text-center text-gray-500'>
                    Limited access • Read-only mode • No report submission
                  </p>
                </div>

                {/* Registration Link */}
                <div className='text-center space-y-2'>
                  <p className='text-sm text-gray-600 dark:text-gray-300'>
                    Don't have an account?{' '}
                    <Link
                      href='/auth/register'
                      className='font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400'>
                      Sign up
                    </Link>
                  </p>

                  <p className='text-xs text-gray-500'>
                    🔒 We never store your password in plain text
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
