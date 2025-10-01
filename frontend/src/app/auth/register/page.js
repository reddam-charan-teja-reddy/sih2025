'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  registerUser,
  clearMessages,
  clearAuth,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertCircle,
  Eye,
  EyeOff,
  Shield,
  Users,
  Check,
  X,
  Lock,
  Mail,
  User,
  Building,
} from 'lucide-react';

// Password strength indicators
const PasswordStrengthIndicator = ({ password }) => {
  const getStrength = (pwd) => {
    if (!pwd) return { score: 0, label: '', color: 'gray' };

    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (pwd.length >= 12) score += 1;
    if (/[a-z]/.test(pwd)) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/\d/.test(pwd)) score += 1;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) score += 1;

    if (score <= 2) return { score, label: 'Weak', color: 'red' };
    if (score <= 4) return { score, label: 'Medium', color: 'yellow' };
    if (score <= 5) return { score, label: 'Strong', color: 'green' };
    return { score, label: 'Very Strong', color: 'green' };
  };

  const strength = getStrength(password);

  return (
    <div className='space-y-2'>
      <div className='flex items-center justify-between text-xs'>
        <span>Password strength</span>
        <span className={`font-medium text-${strength.color}-600`}>
          {strength.label}
        </span>
      </div>
      <div className='w-full bg-gray-200 rounded-full h-1'>
        <div
          className={`h-1 rounded-full transition-all bg-${strength.color}-500`}
          style={{ width: `${(strength.score / 6) * 100}%` }}
        />
      </div>
    </div>
  );
};

// Password requirements checklist
const PasswordRequirements = ({ password }) => {
  const requirements = [
    { label: 'At least 8 characters', test: (pwd) => pwd.length >= 8 },
    { label: 'One lowercase letter', test: (pwd) => /[a-z]/.test(pwd) },
    { label: 'One uppercase letter', test: (pwd) => /[A-Z]/.test(pwd) },
    { label: 'One number', test: (pwd) => /\d/.test(pwd) },
    {
      label: 'One special character',
      test: (pwd) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
    },
  ];

  return (
    <div className='space-y-1'>
      {requirements.map((req, index) => {
        const isValid = req.test(password);
        return (
          <div key={index} className='flex items-center space-x-2 text-xs'>
            {isValid ? (
              <Check className='h-3 w-3 text-green-600' />
            ) : (
              <X className='h-3 w-3 text-gray-400' />
            )}
            <span className={isValid ? 'text-green-600' : 'text-gray-500'}>
              {req.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default function RegisterPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const {
    isAuthenticated,
    isGuest,
    loading,
    error,
    message,
    requiresVerification,
    verificationUserId,
  } = useAppSelector(selectAuth);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'citizen',
    officialId: '',
    organization: '',
    language: 'en',
  });
  const [formErrors, setFormErrors] = useState({});

  // Redirect if already authenticated (but allow guests to access register)
  useEffect(() => {
    if (isAuthenticated && !isGuest) {
      router.push('/');
    }
    // If user is a guest and accessing register, clear guest state
    if (isGuest) {
      dispatch(clearAuth());
    }
  }, [isAuthenticated, isGuest, router, dispatch]);

  // Clear messages when component mounts
  useEffect(() => {
    dispatch(clearMessages());
  }, [dispatch]);

  // Redirect to verification if registration successful
  useEffect(() => {
    if (requiresVerification && verificationUserId) {
      router.push(`/auth/verify?userId=${verificationUserId}`);
    }
  }, [requiresVerification, verificationUserId, router]);

  const validateForm = () => {
    const errors = {};

    // Full name validation
    if (!formData.fullName.trim()) {
      errors.fullName = 'Full name is required';
    } else if (formData.fullName.trim().length < 2) {
      errors.fullName = 'Full name must be at least 2 characters';
    }

    // Email validation
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Phone validation (optional)
    if (
      formData.phone &&
      !/^\+?[1-9]\d{1,14}$/.test(formData.phone.replace(/[\s\-\(\)]/g, ''))
    ) {
      errors.phone = 'Please enter a valid phone number';
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    } else {
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

    // Confirm password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    // Role-specific validation
    if (formData.role === 'official') {
      if (!formData.officialId.trim()) {
        errors.officialId = 'Official ID is required for official accounts';
      } else if (formData.officialId.trim().length < 3) {
        errors.officialId = 'Official ID must be at least 3 characters';
      }

      if (!formData.organization.trim()) {
        errors.organization =
          'Organization name is required for official accounts';
      }
    }

    // Terms acceptance
    if (!acceptTerms) {
      errors.terms = 'You must accept the terms and privacy policy';
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

  const handlePhoneChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      phone: value || '',
    }));

    if (formErrors.phone) {
      setFormErrors((prev) => ({
        ...prev,
        phone: '',
      }));
    }
  };

  const handleRoleChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      role: value,
      // Clear official fields if switching to citizen
      ...(value === 'citizen' && {
        officialId: '',
        organization: '',
      }),
    }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      const registrationData = {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: formData.role,
        language: formData.language,
      };

      // Add official-specific fields if role is official
      if (formData.role === 'official') {
        registrationData.officialId = formData.officialId;
        registrationData.organization = formData.organization;
      }

      console.log('Submitting registration data:', {
        ...registrationData,
        password: '[HIDDEN]',
      });

      const result = await dispatch(registerUser(registrationData)).unwrap();

      console.log('Registration successful:', result);

      // Redirect to verification page if successful
      if (result.verificationRequired) {
        router.push(`/auth/verify?userId=${result.user.id}`);
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Registration failed:', error);
      // Error is already handled by Redux and shown in UI
    }
  };

  const isFormValid = () => {
    // Check if all required fields are filled
    const basicFieldsValid =
      formData.fullName.trim() &&
      formData.email.trim() &&
      formData.password &&
      formData.confirmPassword &&
      acceptTerms;

    if (!basicFieldsValid) return false;

    // Check email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(formData.email)) return false;

    // Check password requirements
    const passwordValid =
      formData.password.length >= 8 &&
      /[a-z]/.test(formData.password) &&
      /[A-Z]/.test(formData.password) &&
      /\d/.test(formData.password) &&
      /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password);

    if (!passwordValid) return false;

    // Check password confirmation
    if (formData.password !== formData.confirmPassword) return false;

    // Check role-specific fields
    if (formData.role === 'official') {
      if (!formData.officialId.trim() || formData.officialId.trim().length < 3)
        return false;
      if (!formData.organization.trim()) return false;
    }

    return true;
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-blue-950 dark:via-gray-900 dark:to-cyan-950'>
      <div className='container mx-auto px-4 py-8'>
        <div className='max-w-2xl mx-auto'>
          {/* Header */}
          <div className='text-center mb-8'>
            <h1 className='text-3xl font-bold text-gray-900 dark:text-white mb-2'>
              Join Samudra Sahayak
            </h1>
            <p className='text-gray-600 dark:text-gray-300'>
              Create your account to help keep coastal communities safe
            </p>
          </div>

          <Card className='shadow-xl'>
            <CardHeader>
              <CardTitle className='text-2xl font-bold text-center'>
                Create Account
              </CardTitle>
              <CardDescription className='text-center'>
                Fill in your details to get started
              </CardDescription>
            </CardHeader>

            <CardContent className='space-y-6'>
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

              <form onSubmit={handleRegister} className='space-y-4'>
                {/* Full Name */}
                <div className='space-y-2'>
                  <Label htmlFor='fullName'>Full Name *</Label>
                  <div className='relative'>
                    <User className='absolute left-3 top-3 h-4 w-4 text-gray-400' />
                    <Input
                      id='fullName'
                      name='fullName'
                      type='text'
                      placeholder='Enter your full name'
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className={`pl-10 ${
                        formErrors.fullName ? 'border-red-500' : ''
                      }`}
                      autoComplete='name'
                    />
                  </div>
                  {formErrors.fullName && (
                    <p className='text-sm text-red-600'>
                      {formErrors.fullName}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div className='space-y-2'>
                  <Label htmlFor='email'>Email Address *</Label>
                  <div className='relative'>
                    <Mail className='absolute left-3 top-3 h-4 w-4 text-gray-400' />
                    <Input
                      id='email'
                      name='email'
                      type='email'
                      placeholder='Enter your email address'
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`pl-10 ${
                        formErrors.email ? 'border-red-500' : ''
                      }`}
                      autoComplete='email'
                    />
                  </div>
                  {formErrors.email && (
                    <p className='text-sm text-red-600'>{formErrors.email}</p>
                  )}
                </div>

                {/* Phone Number */}
                <div className='space-y-2'>
                  <Label htmlFor='phone'>Phone Number (Optional)</Label>
                  <PhoneInput
                    id='phone'
                    placeholder='Enter your phone number (optional)'
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    defaultCountry='IN'
                    className={`phone-input ${
                      formErrors.phone ? 'border-red-500' : ''
                    }`}
                  />
                  {formErrors.phone && (
                    <p className='text-sm text-red-600'>{formErrors.phone}</p>
                  )}
                </div>

                {/* Role Selection */}
                <div className='space-y-2'>
                  <Label htmlFor='role'>Account Type *</Label>
                  <Select
                    value={formData.role}
                    onValueChange={handleRoleChange}>
                    <SelectTrigger>
                      <SelectValue placeholder='Select your account type' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='citizen'>
                        <div className='flex items-center space-x-2'>
                          <Users className='h-4 w-4' />
                          <span>Citizen</span>
                        </div>
                      </SelectItem>
                      <SelectItem value='official'>
                        <div className='flex items-center space-x-2'>
                          <Shield className='h-4 w-4' />
                          <span>Official</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className='text-xs text-gray-500'>
                    {formData.role === 'citizen'
                      ? 'Report hazards and receive safety alerts'
                      : 'Verify reports and send official alerts (requires approval)'}
                  </p>
                </div>

                {/* Official-specific fields */}
                {formData.role === 'official' && (
                  <>
                    <div className='space-y-2'>
                      <Label htmlFor='officialId'>Official ID *</Label>
                      <Input
                        id='officialId'
                        name='officialId'
                        type='text'
                        placeholder='Enter your official ID'
                        value={formData.officialId}
                        onChange={handleInputChange}
                        className={
                          formErrors.officialId ? 'border-red-500' : ''
                        }
                      />
                      {formErrors.officialId && (
                        <p className='text-sm text-red-600'>
                          {formErrors.officialId}
                        </p>
                      )}
                    </div>

                    <div className='space-y-2'>
                      <Label htmlFor='organization'>Organization *</Label>
                      <div className='relative'>
                        <Building className='absolute left-3 top-3 h-4 w-4 text-gray-400' />
                        <Input
                          id='organization'
                          name='organization'
                          type='text'
                          placeholder='Enter your organization name'
                          value={formData.organization}
                          onChange={handleInputChange}
                          className={`pl-10 ${
                            formErrors.organization ? 'border-red-500' : ''
                          }`}
                        />
                      </div>
                      {formErrors.organization && (
                        <p className='text-sm text-red-600'>
                          {formErrors.organization}
                        </p>
                      )}
                    </div>

                    <Alert className='border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950'>
                      <AlertCircle className='h-4 w-4' />
                      <AlertDescription>
                        Official accounts require manual verification. You'll be
                        contacted within 24-48 hours.
                      </AlertDescription>
                    </Alert>
                  </>
                )}

                {/* Password */}
                <div className='space-y-2'>
                  <Label htmlFor='password'>Password *</Label>
                  <div className='relative'>
                    <Lock className='absolute left-3 top-3 h-4 w-4 text-gray-400' />
                    <Input
                      id='password'
                      name='password'
                      type={showPassword ? 'text' : 'password'}
                      placeholder='Create a strong password'
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
                  {formData.password && (
                    <div className='space-y-3'>
                      <PasswordStrengthIndicator password={formData.password} />
                      <PasswordRequirements password={formData.password} />
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className='space-y-2'>
                  <Label htmlFor='confirmPassword'>Confirm Password *</Label>
                  <div className='relative'>
                    <Lock className='absolute left-3 top-3 h-4 w-4 text-gray-400' />
                    <Input
                      id='confirmPassword'
                      name='confirmPassword'
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder='Confirm your password'
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

                {/* Language Preference */}
                <div className='space-y-2'>
                  <Label htmlFor='language'>Preferred Language</Label>
                  <Select
                    value={formData.language}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, language: value }))
                    }>
                    <SelectTrigger>
                      <SelectValue placeholder='Select your preferred language' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='en'>English</SelectItem>
                      <SelectItem value='te'>Telugu</SelectItem>
                      <SelectItem value='hi'>Hindi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Terms and Privacy */}
                <div className='space-y-2'>
                  <div className='flex items-start space-x-2'>
                    <Checkbox
                      id='terms'
                      checked={acceptTerms}
                      onCheckedChange={setAcceptTerms}
                    />
                    <div className='leading-none'>
                      <Label htmlFor='terms' className='text-sm cursor-pointer'>
                        I agree to the{' '}
                        <Link
                          href='/terms'
                          className='text-blue-600 hover:underline'>
                          Terms of Service
                        </Link>{' '}
                        and{' '}
                        <Link
                          href='/privacy'
                          className='text-blue-600 hover:underline'>
                          Privacy Policy
                        </Link>
                      </Label>
                    </div>
                  </div>
                  {formErrors.terms && (
                    <p className='text-sm text-red-600'>{formErrors.terms}</p>
                  )}
                </div>

                {/* Submit Button */}
                <Button
                  type='submit'
                  className='w-full'
                  disabled={loading || !isFormValid()}>
                  {loading ? 'Creating Account...' : 'Create Account'}
                </Button>

                {/* Debug validation info - only show in development */}
                {process.env.NODE_ENV === 'development' && !isFormValid() && (
                  <div className='text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded'>
                    <p>Form validation status:</p>
                    <ul className='list-disc list-inside space-y-1'>
                      {!formData.fullName.trim() && <li>Full name required</li>}
                      {!formData.email.trim() && <li>Email required</li>}
                      {formData.email.trim() &&
                        !/^\S+@\S+\.\S+$/.test(formData.email) && (
                          <li>Valid email required</li>
                        )}
                      {formData.phone &&
                        !/^\+?[1-9]\d{1,14}$/.test(
                          formData.phone.replace(/[\s\-\(\)]/g, '')
                        ) && <li>Valid phone number format required</li>}
                      {!formData.password && <li>Password required</li>}
                      {formData.password && formData.password.length < 8 && (
                        <li>Password too short</li>
                      )}
                      {formData.password &&
                        !/[a-z]/.test(formData.password) && (
                          <li>Password needs lowercase letter</li>
                        )}
                      {formData.password &&
                        !/[A-Z]/.test(formData.password) && (
                          <li>Password needs uppercase letter</li>
                        )}
                      {formData.password && !/\d/.test(formData.password) && (
                        <li>Password needs number</li>
                      )}
                      {formData.password &&
                        !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(
                          formData.password
                        ) && <li>Password needs special character</li>}
                      {!formData.confirmPassword && (
                        <li>Password confirmation required</li>
                      )}
                      {formData.password &&
                        formData.confirmPassword &&
                        formData.password !== formData.confirmPassword && (
                          <li>Passwords don't match</li>
                        )}
                      {formData.role === 'official' &&
                        !formData.officialId.trim() && (
                          <li>Official ID required</li>
                        )}
                      {formData.role === 'official' &&
                        formData.officialId.trim() &&
                        formData.officialId.trim().length < 3 && (
                          <li>Official ID too short</li>
                        )}
                      {formData.role === 'official' &&
                        !formData.organization.trim() && (
                          <li>Organization required</li>
                        )}
                      {!acceptTerms && <li>Must accept terms</li>}
                    </ul>
                  </div>
                )}
              </form>

              {/* Login Link */}
              <div className='text-center'>
                <p className='text-sm text-gray-600 dark:text-gray-300'>
                  Already have an account?{' '}
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

      {/* Custom styles for phone input */}
      <style jsx global>{`
        .phone-input .PhoneInputInput {
          border: 1px solid hsl(var(--border));
          border-radius: calc(var(--radius) - 2px);
          padding: 0.5rem 0.75rem;
          background: transparent;
          font-size: 0.875rem;
          width: 100%;
        }
        .phone-input .PhoneInputInput:focus {
          outline: none;
          border-color: hsl(var(--ring));
          box-shadow: 0 0 0 3px hsl(var(--ring) / 0.5);
        }
        .phone-input.border-red-500 .PhoneInputInput {
          border-color: #ef4444;
        }
      `}</style>
    </div>
  );
}
