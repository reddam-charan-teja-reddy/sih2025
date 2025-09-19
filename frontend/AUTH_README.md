# Samudra Sahayak - Authentication System

A comprehensive, secure authentication system for the emergency management platform with role-based access control and guest mode functionality.

## Features

### 🔐 Authentication & Security

- **JWT-based authentication** with access & refresh tokens
- **bcryptjs password hashing** (cost factor 12)
- **Rate limiting** on sensitive endpoints
- **Account lockout** after failed attempts
- **Password strength validation**
- **Email/phone verification** system
- **Forgot password** with token-based reset

### 👥 User Roles & Permissions

- **Citizens**: Can submit reports, view alerts
- **Officials**: Can verify reports, send alerts (requires verification)
- **Guest Mode**: 10-minute emergency access with view-only permissions

### 🛡️ Route Protection

- **Middleware-based** route protection
- **Role-based access control** (RBAC)
- **Higher-order components** for page protection
- **Permission-based UI** rendering

### ⏱️ Guest Mode

- **10-minute time limit** for emergency access
- **Visual countdown timer** with warnings
- **Limited permissions** (view-only)
- **Smooth upgrade path** to full account

## Quick Start

### 1. Environment Setup

```bash
cp .env.example .env.local
```

Configure your environment variables:

- `MONGODB_URI`: Your MongoDB connection string
- `JWT_SECRET` & `JWT_REFRESH_SECRET`: Strong secrets for JWT signing
- Email settings for password reset functionality

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

### 4. Access the Application

- **Homepage**: http://localhost:3000
- **Login**: http://localhost:3000/auth/login
- **Register**: http://localhost:3000/auth/register
- **Dashboard**: http://localhost:3000/dashboard

## API Endpoints

### Authentication Routes

| Method | Endpoint                    | Description            | Rate Limit |
| ------ | --------------------------- | ---------------------- | ---------- |
| POST   | `/api/auth/register`        | User registration      | 3/hour     |
| POST   | `/api/auth/login`           | User login             | 5/15min    |
| POST   | `/api/auth/guest`           | Guest mode access      | 5/15min    |
| POST   | `/api/auth/refresh`         | Refresh tokens         | -          |
| POST   | `/api/auth/logout`          | User logout            | -          |
| POST   | `/api/auth/forgot-password` | Request password reset | 3/15min    |
| POST   | `/api/auth/reset-password`  | Reset password         | 3/15min    |
| POST   | `/api/auth/verify`          | Verify account         | 5/15min    |

### Authentication Flow

#### Standard Login

```javascript
// Email/phone login
const response = await dispatch(
  loginUser({
    credential: 'user@example.com',
    password: 'password123',
    role: 'citizen',
  })
);
```

#### Guest Mode

```javascript
// Emergency guest access
const response = await dispatch(loginAsGuest());
```

#### Registration

```javascript
// User registration
const response = await dispatch(
  registerUser({
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+911234567890',
    password: 'SecurePass123!',
    role: 'citizen',
  })
);
```

## Route Protection

### Using RouteGuard Component

```javascript
import { RouteGuard } from '@/components/auth/AuthGuards';

export default function ProtectedPage() {
  return (
    <RouteGuard
      requireAuth={true}
      allowGuest={false}
      requiredRoles={['official']}>
      <YourPageContent />
    </RouteGuard>
  );
}
```

### Using withAuth HOC

```javascript
import { withAuth } from '@/components/auth/AuthGuards';

const ProtectedComponent = () => {
  return <div>Protected content</div>;
};

export default withAuth(ProtectedComponent, {
  requireAuth: true,
  allowGuest: false,
  requiredRoles: ['citizen', 'official'],
});
```

### Using useAuth Hook

```javascript
import { useAuth } from '@/components/auth/AuthGuards';

export default function Dashboard() {
  const {
    isAuthenticated,
    isGuest,
    user,
    canPerformAction,
    getGuestTimeRemaining,
  } = useAuth();

  if (canPerformAction('submit_report')) {
    // Show submit button
  }

  return <div>Dashboard content</div>;
}
```

## Permissions System

### Available Actions

| Action             | Description              | Required Auth     | Guest Allowed |
| ------------------ | ------------------------ | ----------------- | ------------- |
| `view_reports`     | View emergency reports   | Any               | ✅            |
| `submit_report`    | Submit emergency reports | Full auth         | ❌            |
| `verify_report`    | Verify reports           | Verified official | ❌            |
| `send_alert`       | Send emergency alerts    | Verified official | ❌            |
| `save_preferences` | Save user preferences    | Full auth         | ❌            |
| `access_admin`     | Access admin features    | Verified official | ❌            |

### Check Permissions

```javascript
const { canPerformAction } = useAuth();

// Check if user can submit reports
if (canPerformAction('submit_report')) {
  // Show submit form
}

// Check if user can access admin
if (canPerformAction('access_admin')) {
  // Show admin menu
}
```

## Guest Mode Features

### Automatic Session Management

- **10-minute timer** with visual countdown
- **Warning alerts** at 2 minutes and 1 minute remaining
- **Automatic expiration** with redirect to login
- **Session extension** prompts

### UI Components

```javascript
import { GuestModeManager, GuestLimitations } from '@/components/auth/GuestMode';

// Show guest countdown and controls
<GuestModeManager />

// Show guest limitations info
<GuestLimitations />
```

### Guest Limitations

- Cannot submit emergency reports
- Cannot save favorite locations
- Cannot receive personalized alerts
- Cannot access emergency contacts
- View-only access to incident data
- Session expires after 10 minutes

## Security Features

### Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Account Security

- **Account lockout** after 5 failed login attempts
- **Lockout duration** increases with repeated failures
- **Rate limiting** on authentication endpoints
- **Secure cookie** settings for production

### Token Management

- **Access tokens**: 15-minute expiration
- **Refresh tokens**: 7-day expiration, httpOnly cookies
- **Guest tokens**: 10-minute expiration
- **Automatic token refresh** on API calls

## Customization

### Extending Permissions

```javascript
// In useAuth hook
const canPerformAction = (action) => {
  const permissions = {
    submit_report: isAuthenticated && !isGuest,
    your_custom_action: isAuthenticated && user?.role === 'admin',
    // Add more permissions
  };

  return permissions[action] || false;
};
```

### Custom Route Protection

```javascript
// Create custom route guard
export const AdminRoute = ({ children }) => {
  return (
    <RouteGuard
      requireAuth={true}
      requiredRoles={['official']}
      allowGuest={false}>
      {children}
    </RouteGuard>
  );
};
```

## Troubleshooting

### Common Issues

1. **JWT Verification Failed**

   - Check JWT secrets in environment variables
   - Ensure tokens haven't expired
   - Verify cookie settings

2. **Guest Session Not Working**

   - Check `GUEST_SESSION_DURATION` in env
   - Verify guest token generation
   - Check browser cookie support

3. **Rate Limiting Issues**

   - Adjust rate limits in environment
   - Check IP address detection
   - Consider Redis for production

4. **Password Reset Not Working**
   - Configure email settings in env
   - Check SMTP credentials
   - Verify frontend URL setting

### Debug Mode

Enable debug logging by setting:

```bash
NODE_ENV=development
```

## Production Deployment

### Security Checklist

- [ ] Use strong JWT secrets (32+ characters)
- [ ] Enable secure cookies (`SECURE_COOKIES=true`)
- [ ] Configure HTTPS
- [ ] Set up Redis for rate limiting
- [ ] Use MongoDB Atlas or secure database
- [ ] Configure email service properly
- [ ] Set appropriate CORS settings
- [ ] Use environment-specific secrets

### Environment Variables

```bash
# Production settings
NODE_ENV=production
SECURE_COOKIES=true
MONGODB_URI=mongodb+srv://...
FRONTEND_URL=https://yourdomain.com
```

## Contributing

1. Follow the existing code structure
2. Add tests for new features
3. Update documentation
4. Ensure security best practices
5. Test rate limiting and permissions

## License

This project is part of the Samudra Sahayak emergency management system.
