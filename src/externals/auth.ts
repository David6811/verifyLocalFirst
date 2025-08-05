/**
 * Simple Auth Functions
 * Just basic login/logout - no fancy abstractions
 */

import { signInLegacy, signOutLegacy, getCurrentUserLegacy } from '../local-first-impl/auth/auth';

export interface User {
  id: string;
  email: string;
}

// Simple login - just returns user or throws error
export async function login(email: string, password: string): Promise<User> {
  const user = await signInLegacy({ email, password });
  return {
    id: user.id,
    email: user.email || email
  };
}

// Simple logout - just logs out
export async function logout(): Promise<void> {
  await signOutLegacy();
}

// Get current user - returns user or null
export async function getCurrentUser(): Promise<User | null> {
  try {
    const user = await getCurrentUserLegacy();
    return user ? {
      id: user.id,
      email: user.email || ''
    } : null;
  } catch {
    return null;
  }
}

// Check if logged in
export async function isLoggedIn(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

// Quick test login
export async function quickLogin(): Promise<User> {
  return login('weixu.wang+test@gmail.com', 'test123456');
}