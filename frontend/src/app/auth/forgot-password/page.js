'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  forgotPassword,
  resetPassword,
  clearMessages,
  clearPasswordReset,
  selectAuth,
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertCircle,
  Eye,
  EyeOff,
  Mail,
  Phone,
  ArrowLeft,
  Lock,
  CheckCircle,
} from 'lucide-react';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { loading, error, message, passwordResetStep, passwordResetToken } =
    useAppSelector(selectAuth);

  const [step, setStep] = useState('request'); // 'request' | 'reset'
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    credential: '',
    token: '',
    password: '',
    confirmPassword: '',
  });
  const [formErrors, setFormErrors] = useState({});

  // Get token from URL if present
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      setStep('reset');
      setFormData((prev) => ({ ...prev, token }));
    }
  }, [searchParams]);

  // Update step based on Redux state
  useEffect(() => {
    if (passwordResetStep === 'reset') {
      setStep('reset');
    }
  }, [passwordResetStep]);

  // Clear messages when component mounts
  useEffect(() => {
    dispatch(clearMessages());

    // Cleanup on unmount
    return () => {
      dispatch(clearPasswordReset());
    };
  }, [dispatch]);

  const validateRequestForm = () => {
    const errors = {};

    if (!formData.credential.trim()) {
      errors.credential = 'Email or phone number is required';
    } else {
      const credential = formData.credential.trim();
      // Basic validation for email or phone
      if (
        !credential.includes('@') &&
        !/^\+?[1-9]\d{1,14}$/.test(credential.replace(/[\s\-\(\)]/g, ''))
      ) {
        errors.credential =
          'Please enter a valid email address or phone number';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateResetForm = () => {
    const errors = {};

    if (!formData.token.trim()) {
      errors.token = 'Reset token is required';
    }

    if (!formData.password) {
      errors.password = 'New password is required';
    } else {
      // Password validation
      const passwordErrors = [];
      if (formData.password.length < 8) {
        passwordErrors.push('at least 8 characters');
      }
      if (!/[a-z]/.test(formData.password)) {
        passwordErrors.push('one lowercase letter');
      }
      if (!/[A-Z]/.test(formData.password)) {
        passwordErrors.push('one uppercase letter');
      }
      if (!/\d/.test(formData.password)) {
        passwordErrors.push('one number');
      }
      if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password)) {
        passwordErrors.push('one special character');
      }

      if (passwordErrors.length > 0) {
        errors.password = `Password must contain ${passwordErrors.join(', ')}`;
      }
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
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

  const handleRequestSubmit = async (e) => {
    e.preventDefault();

    if (!validateRequestForm()) return;

    dispatch(forgotPassword(formData.credential.trim()));
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();

    if (!validateResetForm()) return;

    dispatch(
      resetPassword({
        token: formData.token,
        password: formData.password,
      })
    );
  };

  const getCredentialIcon = () => {
    return formData.credential.includes('@') ? Mail : Phone;
  };

  const CredentialIcon = getCredentialIcon();

  // If reset was successful, show success message
  if (message && message.includes('reset successfully')) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-blue-950 dark:via-gray-900 dark:to-cyan-950 flex items-center justify-center'>
        <div className='container mx-auto px-4'>
          <div className='max-w-md mx-auto'>
            <Card className='shadow-xl'>
              <CardHeader className='text-center'>
                <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900'>
                  <CheckCircle className='h-6 w-6 text-green-600 dark:text-green-400' />
                </div>
                <CardTitle className='text-2xl font-bold'>
                  Password Reset Successful
                </CardTitle>
                <CardDescription>
                  Your password has been updated successfully
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <Alert className='border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'>
                  <CheckCircle className='h-4 w-4' />
                  <AlertDescription>{message}</AlertDescription>
                </Alert>

                <Button
                  className='w-full'
                  onClick={() => router.push('/auth/login')}>
                  Continue to Login
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-blue-950 dark:via-gray-900 dark:to-cyan-950'>
      <div className='container mx-auto px-4 py-8'>
        <div className='max-w-md mx-auto'>
          {/* Back to Login */}
          <div className='mb-6'>
            <Button
              variant='ghost'
              className='p-0 h-auto'
              onClick={() => router.push('/auth/login')}>
              <ArrowLeft className='mr-2 h-4 w-4' />
              Back to Login
            </Button>
          </div>

          <Card className='shadow-xl'>
            <CardHeader className='space-y-1'>
              <CardTitle className='text-2xl font-bold text-center'>
                {step === 'request' ? 'Forgot Password' : 'Reset Password'}
              </CardTitle>
              <CardDescription className='text-center'>
                {step === 'request'
                  ? 'Enter your email or phone to receive a reset link'
                  : 'Enter your reset token and new password'}
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

              {message && !message.includes('reset successfully') && (
                <Alert className='border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'>
                  <AlertCircle className='h-4 w-4' />
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              )}

              {step === 'request' ? (
                /* Request Reset Form */
                <form onSubmit={handleRequestSubmit} className='space-y-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='credential'>Email or Phone Number</Label>
                    <div className='relative'>
                      <CredentialIcon className='absolute left-3 top-3 h-4 w-4 text-gray-400' />
                      <Input
                        id='credential'
                        name='credential'
                        type='text'
                        placeholder='Enter your email or phone number'
                        value={formData.credential}
                        onChange={handleInputChange}
                        className={`pl-10 ${
                          formErrors.credential ? 'border-red-500' : ''
                        }`}
                        autoComplete='username'
                      />
                    </div>
                    {formErrors.credential && (
                      <p className='text-sm text-red-600'>
                        {formErrors.credential}
                      </p>
                    )}
                  </div>

                  <Button type='submit' className='w-full' disabled={loading}>
                    {loading ? 'Sending...' : 'Send Reset Link'}
                  </Button>

                  <div className='text-center'>
                    <Button
                      type='button'
                      variant='link'
                      className='text-sm'
                      onClick={() => setStep('reset')}>
                      Already have a reset token?
                    </Button>
                  </div>
                </form>
              ) : (
                /* Reset Password Form */
                <form onSubmit={handleResetSubmit} className='space-y-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='token'>Reset Token</Label>
                    <Input
                      id='token'
                      name='token'
                      type='text'
                      placeholder='Enter the reset token from your email/SMS'
                      value={formData.token}
                      onChange={handleInputChange}
                      className={formErrors.token ? 'border-red-500' : ''}
                    />
                    {formErrors.token && (
                      <p className='text-sm text-red-600'>{formErrors.token}</p>
                    )}
                    <p className='text-xs text-gray-500'>
                      Check your email or SMS for the reset token
                    </p>
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='password'>New Password</Label>
                    <div className='relative'>
                      <Lock className='absolute left-3 top-3 h-4 w-4 text-gray-400' />
                      <Input
                        id='password'
                        name='password'
                        type={showPassword ? 'text' : 'password'}
                        placeholder='Enter your new password'
                        value={formData.password}
                        onChange={handleInputChange}
                        className={`pl-10 pr-10 ${
                          formErrors.password ? 'border-red-500' : ''
                        }`}
                        autoComplete='new-password'
                      />
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        className='absolute right-1 top-1 h-8 w-8 p-0'
                        onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? (
                          <EyeOff className='h-4 w-4' />
                        ) : (
                          <Eye className='h-4 w-4' />
                        )}
                      </Button>
                    </div>
                    {formErrors.password && (
                      <p className='text-sm text-red-600'>
                        {formErrors.password}
                      </p>
                    )}
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='confirmPassword'>
                      Confirm New Password
                    </Label>
                    <div className='relative'>
                      <Lock className='absolute left-3 top-3 h-4 w-4 text-gray-400' />
                      <Input
                        id='confirmPassword'
                        name='confirmPassword'
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder='Confirm your new password'
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className={`pl-10 pr-10 ${
                          formErrors.confirmPassword ? 'border-red-500' : ''
                        }`}
                        autoComplete='new-password'
                      />
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        className='absolute right-1 top-1 h-8 w-8 p-0'
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }>
                        {showConfirmPassword ? (
                          <EyeOff className='h-4 w-4' />
                        ) : (
                          <Eye className='h-4 w-4' />
                        )}
                      </Button>
                    </div>
                    {formErrors.confirmPassword && (
                      <p className='text-sm text-red-600'>
                        {formErrors.confirmPassword}
                      </p>
                    )}
                  </div>

                  <Button type='submit' className='w-full' disabled={loading}>
                    {loading ? 'Resetting...' : 'Reset Password'}
                  </Button>

                  <div className='text-center'>
                    <Button
                      type='button'
                      variant='link'
                      className='text-sm'
                      onClick={() => setStep('request')}>
                      Need a new reset token?
                    </Button>
                  </div>
                </form>
              )}

              {/* Footer */}
              <div className='text-center pt-4 border-t'>
                <p className='text-sm text-gray-600 dark:text-gray-300'>
                  Remember your password?{' '}
                  <Link
                    href='/auth/login'
                    className='font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400'>
                    Sign in
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
