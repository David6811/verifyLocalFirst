import { Effect, pipe } from 'effect';
import { supabase } from '../../local-first-impl/supabase';
import { AuthError, UnknownError, SupabaseError, SupabaseErrorType, AppError, AuthErrorType } from './errors';

// ================================
// ERROR MAPPING UTILITIES
// ================================

// Error message patterns for different auth scenarios
const AUTH_ERROR_PATTERNS = {
  EMAIL_ALREADY_EXISTS: ['email', 'already'],
  WEAK_PASSWORD: ['password', 'weak'],
  INVALID_CREDENTIALS: ['invalid', 'wrong', 'incorrect'],
  USER_NOT_FOUND: ['not found'],
  EMAIL_NOT_VERIFIED: ['email', 'verified'],
  TOKEN_EXPIRED: ['session', 'missing', 'expired']
} as const;

// Error message mappings for user-friendly messages
const ERROR_MESSAGES = {
  EMAIL_ALREADY_EXISTS: 'Email already registered',
  WEAK_PASSWORD: 'Password is too weak',
  INVALID_CREDENTIALS: 'Invalid login credentials',
  USER_NOT_FOUND: 'User not found',
  EMAIL_NOT_VERIFIED: 'Email not verified',
  TOKEN_EXPIRED: 'Session expired'
} as const;

// Pure function to determine auth error type from message
const determineAuthErrorType = (message: string): AuthErrorType => {
  const lowerMessage = message.toLowerCase();
  
  for (const [errorType, patterns] of Object.entries(AUTH_ERROR_PATTERNS)) {
    const matchesAllPatterns = patterns.some(pattern => lowerMessage.includes(pattern));
    if (matchesAllPatterns) {
      return errorType as AuthErrorType;
    }
  }
  
  return 'INVALID_CREDENTIALS'; // Default fallback
};

// Pure function to create AuthError from raw error
const mapToAuthError = (error: Error): AuthError => {
  const errorType = determineAuthErrorType(error.message);
  const userMessage = ERROR_MESSAGES[errorType];
  
  return new AuthError({
    type: errorType,
    message: userMessage,
    originalError: error
  });
};

// Pure function to create UnknownError
const mapToUnknownError = (error: unknown, context: string): UnknownError => {
  return new UnknownError({
    message: `Unknown error during ${context}`,
    originalError: error as Error
  });
};

// Higher-order function for consistent error mapping
const withErrorMapping = (context: string) => (error: unknown) => {
  if (error instanceof Error) {
    return mapToAuthError(error);
  }
  return mapToUnknownError(error, context);
};

// ================================
// DOMAIN TYPES
// ================================

export interface AuthUser {
  id: string;
  email?: string;
  created_at?: string;
  last_sign_in_at?: string;
}

export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface SignUpData {
  email: string;
  password: string;
  displayName?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

// ================================
// PURE FUNCTIONAL AUTH OPERATIONS
// ================================

// Sign up operation
export const signUp = (signUpData: SignUpData): Effect.Effect<AuthUser, AppError> =>
  Effect.tryPromise({
    try: async () => {
      console.log('🔐 Attempting to sign up user:', signUpData.email);
      
      const { data, error } = await supabase.auth.signUp({
        email: signUpData.email,
        password: signUpData.password,
        options: {
          data: {
            display_name: signUpData.displayName || signUpData.email.split('@')[0]
          }
        }
      });

      if (error) {
        console.error('❌ Sign up error:', error.message);
        throw error;
      }

      if (!data.user) {
        throw new Error('Sign up succeeded but no user returned');
      }

      console.log('✅ User signed up successfully:', data.user.email);
      
      return {
        id: data.user.id,
        email: data.user.email,
        created_at: data.user.created_at,
        last_sign_in_at: data.user.last_sign_in_at
      };
    },
    catch: withErrorMapping('sign up')
  });

// Sign in operation
export const signIn = (signInData: SignInData): Effect.Effect<AuthUser, AppError> =>
  Effect.tryPromise({
    try: async () => {
      console.log('🔐 Attempting to sign in user:', signInData.email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: signInData.email,
        password: signInData.password
      });

      if (error) {
        console.error('❌ Sign in error:', error.message);
        throw error;
      }

      if (!data.user) {
        throw new Error('Sign in succeeded but no user returned');
      }

      console.log('✅ User signed in successfully:', data.user.email);
      
      return {
        id: data.user.id,
        email: data.user.email,
        created_at: data.user.created_at,
        last_sign_in_at: data.user.last_sign_in_at
      };
    },
    catch: withErrorMapping('sign in')
  });

// Sign out operation
export const signOut = (): Effect.Effect<void, AppError> =>
  Effect.tryPromise({
    try: async () => {
      console.log('🔐 Signing out user...');
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ Sign out error:', error.message);
        throw error;
      }
      
      console.log('✅ User signed out successfully');
    },
    catch: withErrorMapping('sign out')
  });

// Get current user operation
export const getCurrentUser = (): Effect.Effect<AuthUser | null, AppError> =>
  Effect.tryPromise({
    try: async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        // Don't log auth session missing errors - this is normal when not signed in
        const isAuthSessionMissing = error.message.includes('Auth session missing') || 
                                   error.message.includes('session_not_found');
        
        if (!isAuthSessionMissing) {
          console.error('❌ Get user error:', error.message);
        }
        
        throw error;
      }
      
      if (!user) {
        return null;
      }
      
      return {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at
      };
    },
    catch: withErrorMapping('get current user')
  });

export const isAuthenticated = (): Effect.Effect<boolean, never> =>
  pipe(
    getCurrentUser(),
    Effect.map(user => user !== null),
    Effect.catchAll(() => Effect.succeed(false))
  );

// ================================
// LEGACY PROMISE-BASED API
// ================================

// Direct Effect.runPromise - no adapter needed
export const signUpLegacy = (data: SignUpData): Promise<AuthUser> =>
  Effect.runPromise(signUp(data));

export const signInLegacy = (data: SignInData): Promise<AuthUser> =>
  Effect.runPromise(signIn(data));

export const signOutLegacy = (): Promise<void> =>
  Effect.runPromise(signOut());

export const getCurrentUserLegacy = (): Promise<AuthUser | null> =>
  Effect.runPromise(getCurrentUser());

export const isAuthenticatedLegacy = (): Promise<boolean> =>
  Effect.runPromise(isAuthenticated());

/**
 * Get current authenticated user ID only
 * Utility function for Supabase RLS policy compliance
 */
export const getCurrentUserIdLegacy = async (): Promise<string> => {
  const user = await getCurrentUserLegacy();
  
  if (!user) {
    throw new Error('User not authenticated. Please sign in before syncing.');
  }
  
  return user.id;
};

// ================================
// ADDITIONAL AUTH UTILITIES  
// ================================

// Reset password (keeping as legacy function for now)
export const resetPassword = async (email: string): Promise<void> => {
  const resetEffect = Effect.tryPromise({
    try: async () => {
      console.log('🔐 Sending password reset email to:', email);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `chrome-extension://${chrome.runtime.id}/index.html`
      });
      
      if (error) {
        console.error('❌ Password reset error:', error.message);
        throw error;
      }
      
      console.log('✅ Password reset email sent successfully');
    },
    catch: (error) => {
      if (error instanceof Error) {
        return new SupabaseError(`Password reset failed: ${error.message}`, SupabaseErrorType.AUTH_ERROR, error);
      }
      return new SupabaseError('Failed to send password reset email', SupabaseErrorType.AUTH_ERROR, error as Error);
    }
  });
  
  return await Effect.runPromise(resetEffect);
};

// Listen to auth state changes
export function onAuthStateChange(callback: (authState: AuthState) => void): () => void {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('🔐 Auth state changed:', event, session?.user?.email || 'no user');
    
    const authState: AuthState = {
      user: session?.user ? {
        id: session.user.id,
        email: session.user.email,
        created_at: session.user.created_at,
        last_sign_in_at: session.user.last_sign_in_at
      } : null,
      isLoading: false,
      isAuthenticated: session?.user ? true : false
    };
    
    // Save user data to Chrome storage for background script access
    if (typeof chrome !== 'undefined' && chrome.storage) {
      try {
        if (authState.user && session) {
          await chrome.storage.local.set({ 
            currentUser: authState.user,
            currentSession: session 
          });
          console.log('✅ User and session saved to Chrome storage:', authState.user);
        } else {
          await chrome.storage.local.remove(['currentUser', 'currentSession']);
          console.log('✅ User and session removed from Chrome storage');
        }
      } catch (error) {
        console.error('❌ Failed to save user to Chrome storage:', error);
      }
    }
    
    callback(authState);
  });
  
  // Return unsubscribe function
  return () => {
    subscription.unsubscribe();
  };
}