// In-memory rate limiting store (in production, use Redis)
const rateLimitStore = new Map();

export const rateLimit = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 5, // Limit each IP/user to 5 requests per windowMs
    message = 'Too many requests, please try again later.',
    keyGenerator = (request) => {
      // Try to get IP from various headers
      const forwarded = request.headers.get('x-forwarded-for');
      const realIp = request.headers.get('x-real-ip');
      const remoteAddr = request.headers.get('remote-addr');

      return forwarded?.split(',')[0] || realIp || remoteAddr || 'unknown';
    },
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = options;

  return {
    check: (request, response = null) => {
      const key = keyGenerator(request);
      const now = Date.now();
      const windowStart = now - windowMs;

      // Clean old entries
      if (rateLimitStore.has(key)) {
        const requests = rateLimitStore
          .get(key)
          .filter((time) => time > windowStart);
        rateLimitStore.set(key, requests);
      }

      const requests = rateLimitStore.get(key) || [];

      if (requests.length >= max) {
        const oldestRequest = Math.min(...requests);
        const timeUntilReset = Math.ceil(
          (oldestRequest + windowMs - now) / 1000
        );

        return {
          success: false,
          error: message,
          retryAfter: timeUntilReset,
          limit: max,
          remaining: 0,
          reset: oldestRequest + windowMs,
        };
      }

      // Add current request timestamp
      requests.push(now);
      rateLimitStore.set(key, requests);

      return {
        success: true,
        limit: max,
        remaining: max - requests.length,
        reset: windowStart + windowMs,
      };
    },
  };
};

// Specific rate limiters for different endpoints
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  message: 'Too many authentication attempts, please try again in 15 minutes.',
});

export const registerRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registrations per hour
  message: 'Too many registration attempts, please try again in an hour.',
});

export const forgotPasswordRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 password reset requests per hour
  message: 'Too many password reset requests, please try again in an hour.',
  keyGenerator: (request) => {
    // Rate limit by email/phone instead of IP for forgot password
    const body = request.body;
    return body?.credential || 'unknown';
  },
});

export const generalAPIRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: 'Too many API requests, please try again later.',
});
