// Validation utilities for authentication
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone) => {
  // Supports international format with optional + prefix
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};

export const validatePassword = (password) => {
  const errors = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength: calculatePasswordStrength(password),
  };
};

const calculatePasswordStrength = (password) => {
  let score = 0;

  // Length
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;

  // Character types
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1;

  // Complexity
  if (password.length >= 16) score += 1;
  if (/(.)\1{2,}/.test(password)) score -= 1; // Repeated characters

  if (score <= 2) return 'weak';
  if (score <= 4) return 'medium';
  if (score <= 6) return 'strong';
  return 'very-strong';
};

export const validateCredential = (credential) => {
  if (!credential || credential.trim().length === 0) {
    return { isValid: false, error: 'Email or phone number is required' };
  }

  const trimmed = credential.trim();

  // Check if it's an email
  if (trimmed.includes('@')) {
    if (validateEmail(trimmed)) {
      return { isValid: true, type: 'email', value: trimmed.toLowerCase() };
    } else {
      return { isValid: false, error: 'Please enter a valid email address' };
    }
  }

  // Check if it's a phone number
  const cleanPhone = trimmed.replace(/[\s\-\(\)]/g, '');
  if (validatePhone(cleanPhone)) {
    // Normalize phone number (ensure it starts with +)
    const normalizedPhone = cleanPhone.startsWith('+')
      ? cleanPhone
      : `+${cleanPhone}`;
    return { isValid: true, type: 'phone', value: normalizedPhone };
  }

  return {
    isValid: false,
    error: 'Please enter a valid email address or phone number',
  };
};

export const validateRegistrationData = (data) => {
  const errors = {};

  // Full name validation
  if (!data.fullName || data.fullName.trim().length < 2) {
    errors.fullName = 'Full name must be at least 2 characters long';
  }

  // Email validation
  if (!data.email || !validateEmail(data.email)) {
    errors.email = 'Please enter a valid email address';
  }

  // Phone validation
  if (!data.phone || !validatePhone(data.phone)) {
    errors.phone = 'Please enter a valid phone number';
  }

  // Password validation
  const passwordValidation = validatePassword(data.password);
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.errors;
  }

  // Password confirmation (only check if confirmPassword is provided)
  if (data.confirmPassword && data.password !== data.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  // Role validation
  if (!['citizen', 'official'].includes(data.role)) {
    errors.role = 'Please select a valid role';
  }

  // Official-specific validation
  if (data.role === 'official') {
    if (!data.officialId || data.officialId.trim().length < 3) {
      errors.officialId =
        'Official ID is required and must be at least 3 characters';
    }

    if (!data.organization || data.organization.trim().length < 2) {
      errors.organization = 'Organization name is required';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .slice(0, 1000); // Limit length
};

export const sanitizeUserData = (data) => {
  const sanitized = {};

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};
