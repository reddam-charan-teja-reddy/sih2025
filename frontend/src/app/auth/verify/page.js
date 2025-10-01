'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  verifyAccount,
  resendVerification,
  clearMessages,
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
  CheckCircle,
  RefreshCw,
  ArrowLeft,
  Mail,
  MessageSquare,
} from 'lucide-react';

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { loading, error, message, requiresVerification, verificationUserId } =
    useAppSelector(selectAuth);

  const [verificationCode, setVerificationCode] = useState('');
  const [userId, setUserId] = useState('');
  const [codeError, setCodeError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isVerified, setIsVerified] = useState(false);

  // Get token and userId from URL params (maintain backward compatibility)
  useEffect(() => {
    const token = searchParams.get('token');
    const userIdParam = searchParams.get('userId');

    // If there's a token in URL (old system), still support it
    if (token) {
      setVerificationCode(token);
      // Auto-verify if token is in URL (backward compatibility)
      dispatch(verifyAccount(token));
    }

    if (userIdParam) {
      setUserId(userIdParam);
    } else if (verificationUserId) {
      setUserId(verificationUserId);
    }
  }, [searchParams, verificationUserId, dispatch]);

  // Clear messages when component mounts
  useEffect(() => {
    dispatch(clearMessages());
  }, [dispatch]);

  // Handle successful verification
  useEffect(() => {
    if (message && message.includes('verified successfully')) {
      setIsVerified(true);
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/auth/login');
      }, 3000);
    }
  }, [message, router]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const validateCode = () => {
    if (!verificationCode.trim()) {
      setCodeError('Verification code is required');
      return false;
    }

    const code = verificationCode.trim();

    // Accept either 6-digit codes or hex tokens (64 characters)
    if (code.length === 6 && !/^\d{6}$/.test(code)) {
      setCodeError('Please enter a valid 6-digit verification code');
      return false;
    } else if (code.length === 64 && !/^[a-f0-9]{64}$/.test(code)) {
      setCodeError('Please enter a valid verification token');
      return false;
    } else if (code.length !== 6 && code.length !== 64) {
      setCodeError('Please enter a valid 6-digit code or verification token');
      return false;
    }

    setCodeError('');
    return true;
  };

  const handleVerify = (e) => {
    e.preventDefault();

    if (!validateCode()) return;

    dispatch(verifyAccount(verificationCode.trim()));
  };

  const handleResendVerification = () => {
    if (!userId) {
      return;
    }

    dispatch(resendVerification(userId));
    setResendCooldown(60); // 60 second cooldown
  };

  const handleCodeChange = (e) => {
    let value = e.target.value;

    // Accept any alphanumeric characters for backward compatibility with old hex tokens
    // Remove any non-alphanumeric characters
    value = value.replace(/[^a-zA-Z0-9]/g, '');

    setVerificationCode(value);

    if (codeError) {
      setCodeError('');
    }
  };

  // Success screen
  if (isVerified) {
    return (
      <div className='min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-blue-950 dark:via-gray-900 dark:to-cyan-950 flex items-center justify-center'>
        <div className='container mx-auto px-4'>
          <div className='max-w-md mx-auto'>
            <Card className='shadow-xl'>
              <CardHeader className='text-center'>
                <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900'>
                  <CheckCircle className='h-8 w-8 text-green-600 dark:text-green-400' />
                </div>
                <CardTitle className='text-2xl font-bold text-green-800 dark:text-green-400'>
                  Account Verified!
                </CardTitle>
                <CardDescription>
                  Your account has been successfully verified
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4 text-center'>
                <Alert className='border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'>
                  <CheckCircle className='h-4 w-4' />
                  <AlertDescription>{message}</AlertDescription>
                </Alert>

                <div className='space-y-2'>
                  <p className='text-sm text-gray-600 dark:text-gray-300'>
                    You can now log in to your account and start using Samudra
                    Sahayak.
                  </p>
                  <p className='text-xs text-gray-500'>
                    Redirecting to login page in a few seconds...
                  </p>
                </div>

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
            <CardHeader className='space-y-1 text-center'>
              <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900'>
                <Mail className='h-6 w-6 text-blue-600 dark:text-blue-400' />
              </div>
              <CardTitle className='text-2xl font-bold'>
                Verify Your Account
              </CardTitle>
              <CardDescription>
                Enter the 6-digit verification code sent to your email
              </CardDescription>
            </CardHeader>

            <CardContent className='space-y-4'>
              {/* Email Check Instructions */}
              <div className='bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4'>
                <div className='flex items-start space-x-3'>
                  <Mail className='h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5' />
                  <div>
                    <h4 className='font-semibold text-blue-900 dark:text-blue-100 text-sm'>
                      Check Your Email
                    </h4>
                    <p className='text-blue-700 dark:text-blue-300 text-sm mt-1'>
                      We've sent a verification email to your inbox. Please
                      check:
                    </p>
                    <ul className='text-blue-600 dark:text-blue-400 text-xs mt-2 space-y-1'>
                      <li>• Your inbox and spam/junk folder</li>
                      <li>• The email contains a 6-digit verification code</li>
                      <li>• Email may take 1-2 minutes to arrive</li>
                    </ul>
                  </div>
                </div>
              </div>
              {/* Error/Success Messages */}
              {error && (
                <Alert variant='destructive'>
                  <AlertCircle className='h-4 w-4' />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {message && !isVerified && (
                <Alert className='border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'>
                  <AlertCircle className='h-4 w-4' />
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              )}

              {/* Instructions */}
              <div className='space-y-3 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg'>
                <div className='flex items-start space-x-3'>
                  <Mail className='h-5 w-5 text-blue-600 mt-0.5' />
                  <div className='space-y-1'>
                    <p className='text-sm font-medium text-blue-800 dark:text-blue-300'>
                      Check your email
                    </p>
                    <p className='text-xs text-blue-600 dark:text-blue-400'>
                      We sent a 6-digit verification code to your email address.
                      You can copy it directly from the email.
                    </p>
                  </div>
                </div>
              </div>

              {/* Verification Form */}
              <form onSubmit={handleVerify} className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor='code'>Verification Code</Label>
                  <Input
                    id='code'
                    type='text'
                    placeholder='Enter 6-digit code or verification token'
                    value={verificationCode}
                    onChange={handleCodeChange}
                    className={`text-center ${
                      verificationCode.length === 6
                        ? 'text-2xl tracking-[0.5em] font-mono'
                        : 'text-sm tracking-wide font-mono'
                    } ${codeError ? 'border-red-500' : ''}`}
                    maxLength={64}
                    autoComplete='one-time-code'
                  />
                  {codeError && (
                    <p className='text-sm text-red-600'>{codeError}</p>
                  )}
                  <p className='text-xs text-gray-500 text-center'>
                    Enter the 6-digit code from your email or the full
                    verification token
                  </p>
                </div>

                <Button type='submit' className='w-full' disabled={loading}>
                  {loading ? 'Verifying...' : 'Verify Account'}
                </Button>
              </form>

              {/* Resend Verification */}
              <div className='space-y-3'>
                <div className='relative'>
                  <div className='absolute inset-0 flex items-center'>
                    <span className='w-full border-t' />
                  </div>
                  <div className='relative flex justify-center text-xs uppercase'>
                    <span className='bg-background px-2 text-muted-foreground'>
                      Didn't receive the code?
                    </span>
                  </div>
                </div>

                <Button
                  type='button'
                  variant='outline'
                  className='w-full'
                  onClick={handleResendVerification}
                  disabled={loading || resendCooldown > 0 || !userId}>
                  <RefreshCw className='mr-2 h-4 w-4' />
                  {resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : 'Resend Verification Code'}
                </Button>

                {!userId && (
                  <Alert>
                    <AlertCircle className='h-4 w-4' />
                    <AlertDescription>
                      Unable to resend verification. Please{' '}
                      <Button
                        variant='link'
                        className='p-0 h-auto'
                        onClick={() => router.push('/auth/register')}>
                        register again
                      </Button>{' '}
                      or contact support.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Help Text */}
              <div className='text-center space-y-2 pt-4 border-t'>
                <p className='text-xs text-gray-500'>
                  Make sure to check your spam/junk folder
                </p>
                <p className='text-xs text-gray-500'>
                  Verification codes expire after 24 hours
                </p>
              </div>

              {/* Footer Links */}
              <div className='text-center'>
                <p className='text-sm text-gray-600 dark:text-gray-300'>
                  Need help?{' '}
                  <Button variant='link' className='p-0 h-auto text-sm'>
                    Contact Support
                  </Button>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
