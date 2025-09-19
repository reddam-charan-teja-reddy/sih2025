import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// API base URL
const API_BASE = '/api/auth';

// Async thunks for authentication actions
export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data);
      }

      return data;
    } catch (error) {
      return rejectWithValue({ error: 'Network error. Please try again.' });
    }
  }
);

export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data);
      }

      return data;
    } catch (error) {
      return rejectWithValue({ error: 'Network error. Please try again.' });
    }
  }
);

export const loginAsGuest = createAsyncThunk(
  'auth/loginGuest',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE}/guest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data);
      }

      return data;
    } catch (error) {
      return rejectWithValue({ error: 'Network error. Please try again.' });
    }
  }
);

export const refreshToken = createAsyncThunk(
  'auth/refresh',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE}/refresh`, {
        method: 'POST',
        credentials: 'include', // Include cookies
      });

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data);
      }

      return data;
    } catch (error) {
      return rejectWithValue({
        error: 'Session expired. Please log in again.',
      });
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE}/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data);
      }

      return data;
    } catch (error) {
      // Even if logout fails on server, clear local state
      return { message: 'Logged out' };
    }
  }
);

export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async (credential, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE}/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ credential }),
      });

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data);
      }

      return data;
    } catch (error) {
      return rejectWithValue({ error: 'Network error. Please try again.' });
    }
  }
);

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async ({ token, password }, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data);
      }

      return data;
    } catch (error) {
      return rejectWithValue({ error: 'Network error. Please try again.' });
    }
  }
);

export const verifyAccount = createAsyncThunk(
  'auth/verify',
  async (token, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data);
      }

      return data;
    } catch (error) {
      return rejectWithValue({ error: 'Network error. Please try again.' });
    }
  }
);

export const resendVerification = createAsyncThunk(
  'auth/resendVerification',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await fetch(`${API_BASE}/verify`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        return rejectWithValue(data);
      }

      return data;
    } catch (error) {
      return rejectWithValue({ error: 'Network error. Please try again.' });
    }
  }
);

// Initial state
const initialState = {
  // Authentication state
  isAuthenticated: false,
  isGuest: false,
  user: null,
  accessToken: null,

  // Guest session
  guestExpiresAt: null,
  guestLimitations: [],

  // UI state
  loading: false,
  error: null,
  message: null,

  // Flow state
  requiresVerification: false,
  requiresOfficialVerification: false,
  verificationUserId: null,

  // Password reset state
  passwordResetStep: null, // 'request' | 'reset'
  passwordResetToken: null,
};

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Clear messages and errors
    clearMessages: (state) => {
      state.error = null;
      state.message = null;
    },

    // Clear authentication state
    clearAuth: (state) => {
      state.isAuthenticated = false;
      state.isGuest = false;
      state.user = null;
      state.accessToken = null;
      state.guestExpiresAt = null;
      state.guestLimitations = [];
      state.requiresVerification = false;
      state.requiresOfficialVerification = false;
      state.verificationUserId = null;
      state.error = null;
      state.message = null;
    },

    // Update access token
    setAccessToken: (state, action) => {
      state.accessToken = action.payload;
    },

    // Handle guest session expiry
    expireGuestSession: (state) => {
      state.isGuest = false;
      state.guestExpiresAt = null;
      state.guestLimitations = [];
      state.accessToken = null;
      state.message =
        'Your guest session has expired. Please log in to continue.';
    },

    // Set password reset step
    setPasswordResetStep: (state, action) => {
      state.passwordResetStep = action.payload.step;
      state.passwordResetToken = action.payload.token || null;
    },

    // Clear password reset state
    clearPasswordReset: (state) => {
      state.passwordResetStep = null;
      state.passwordResetToken = null;
    },
  },
  extraReducers: (builder) => {
    // Register user
    builder
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.message = action.payload.message;
        state.requiresVerification = action.payload.verificationRequired;
        state.verificationUserId = action.payload.user?.id;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        const payload = action.payload;
        if (payload?.details && typeof payload.details === 'object') {
          // If validation details are provided, format them nicely
          const errorMessages = Object.values(payload.details).flat();
          state.error = errorMessages.join(', ');
        } else {
          state.error = payload?.error || 'Registration failed';
        }
      });

    // Login user
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.isGuest = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.message = action.payload.message;
        state.requiresVerification = false;
        state.requiresOfficialVerification = false;
        state.guestExpiresAt = null;
        state.guestLimitations = [];
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.error || 'Login failed';
        state.requiresVerification =
          action.payload?.requiresVerification || false;
        state.requiresOfficialVerification =
          action.payload?.requiresOfficialVerification || false;
        state.verificationUserId = action.payload?.userId || null;
      });

    // Guest login
    builder
      .addCase(loginAsGuest.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginAsGuest.fulfilled, (state, action) => {
        state.loading = false;
        state.isGuest = true;
        state.isAuthenticated = false;
        state.accessToken = action.payload.accessToken;
        state.guestExpiresAt = Date.now() + action.payload.expiresIn * 1000;
        state.guestLimitations = action.payload.limitations;
        state.message = action.payload.message;
      })
      .addCase(loginAsGuest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.error || 'Failed to start guest session';
      });

    // Refresh token
    builder
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
      })
      .addCase(refreshToken.rejected, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.accessToken = null;
      });

    // Logout user
    builder.addCase(logoutUser.fulfilled, (state) => {
      state.isAuthenticated = false;
      state.isGuest = false;
      state.user = null;
      state.accessToken = null;
      state.guestExpiresAt = null;
      state.guestLimitations = [];
      state.message = 'Logged out successfully';
    });

    // Forgot password
    builder
      .addCase(forgotPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(forgotPassword.fulfilled, (state, action) => {
        state.loading = false;
        state.message = action.payload.message;
        state.passwordResetStep = 'reset';
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.error || 'Failed to send reset email';
      });

    // Reset password
    builder
      .addCase(resetPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resetPassword.fulfilled, (state, action) => {
        state.loading = false;
        state.message = action.payload.message;
        state.passwordResetStep = null;
        state.passwordResetToken = null;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.error || 'Failed to reset password';
      });

    // Verify account
    builder
      .addCase(verifyAccount.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyAccount.fulfilled, (state, action) => {
        state.loading = false;
        state.message = action.payload.message;
        state.requiresVerification = false;
        state.verificationUserId = null;
      })
      .addCase(verifyAccount.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.error || 'Verification failed';
      });

    // Resend verification
    builder
      .addCase(resendVerification.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resendVerification.fulfilled, (state, action) => {
        state.loading = false;
        state.message = action.payload.message;
      })
      .addCase(resendVerification.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.error || 'Failed to resend verification';
      });
  },
});

// Export actions
export const {
  clearMessages,
  clearAuth,
  setAccessToken,
  expireGuestSession,
  setPasswordResetStep,
  clearPasswordReset,
} = authSlice.actions;

// Selectors
export const selectAuth = (state) => state.auth;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectIsGuest = (state) => state.auth.isGuest;
export const selectUser = (state) => state.auth.user;
export const selectAccessToken = (state) => state.auth.accessToken;
export const selectAuthLoading = (state) => state.auth.loading;
export const selectAuthError = (state) => state.auth.error;
export const selectAuthMessage = (state) => state.auth.message;
export const selectRequiresVerification = (state) =>
  state.auth.requiresVerification;
export const selectRequiresOfficialVerification = (state) =>
  state.auth.requiresOfficialVerification;
export const selectGuestSession = (state) => ({
  isGuest: state.auth.isGuest,
  expiresAt: state.auth.guestExpiresAt,
  limitations: state.auth.guestLimitations,
});

// Export reducer
export default authSlice.reducer;
