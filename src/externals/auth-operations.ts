/**
 * Auth Operations
 * 
 * 为 UI 组件提供简单易用的认证操作接口
 * Simple and easy-to-use authentication operations for UI components
 * 
 * 职责：封装底层认证实现，提供统一的认证操作接口
 * Responsibility: Encapsulate authentication implementation, provide unified auth operations
 */

import { Effect } from 'effect';
import { 
  signInLegacy, 
  signOutLegacy, 
  getCurrentUserLegacy 
} from '../local-first-impl/auth/auth';

// ================================
// 类型定义 Type Definitions
// ================================

/**
 * 用户信息接口
 * User information interface
 */
export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
}

/**
 * 登录凭证接口
 * Login credentials interface
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * 认证结果接口
 * Authentication result interface
 */
export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

// ================================
// 认证操作函数 Authentication Operations
// ================================

/**
 * 用户登录
 * User sign in
 * 
 * @param credentials 登录凭证
 * @returns Effect<AuthResult, Error>
 * 
 * @example
 * const result = await Effect.runPromise(
 *   signIn({ email: 'user@example.com', password: 'password' })
 * );
 */
export const signIn = (credentials: LoginCredentials): Effect.Effect<AuthResult, Error> => {
  return Effect.map(
    Effect.promise(() => signInLegacy(credentials)),
    (user) => ({
      success: true,
      user: user ? {
        id: user.id,
        email: user.email || credentials.email,
        name: user.email?.split('@')[0],
        avatar: undefined
      } : undefined
    })
  ).pipe(
    Effect.catchAll((error) => 
      Effect.succeed({
        success: false,
        error: (error as Error)?.message || 'Login failed'
      })
    )
  );
};

/**
 * 用户登出
 * User sign out
 * 
 * @returns Effect<AuthResult, Error>
 * 
 * @example
 * const result = await Effect.runPromise(signOut());
 */
export const signOut = (): Effect.Effect<AuthResult, Error> => {
  return Effect.map(
    Effect.promise(() => signOutLegacy()),
    () => ({ success: true })
  ).pipe(
    Effect.catchAll((error) => 
      Effect.succeed({
        success: false,
        error: (error as Error)?.message || 'Logout failed'
      })
    )
  );
};

/**
 * 获取当前用户
 * Get current user
 * 
 * @returns Effect<User | null, Error>
 * 
 * @example
 * const user = await Effect.runPromise(getCurrentUser());
 * if (user) {
 *   console.log(`Hello, ${user.email}!`);
 * }
 */
export const getCurrentUser = (): Effect.Effect<User | null, Error> => {
  return Effect.map(
    Effect.promise(() => getCurrentUserLegacy()),
    (user) => user ? {
      id: user.id,
      email: user.email || '',
      name: user.email?.split('@')[0],
      avatar: undefined
    } : null
  );
};

/**
 * 检查用户是否已登录
 * Check if user is authenticated
 * 
 * @returns Effect<boolean, Error>
 * 
 * @example
 * const isLoggedIn = await Effect.runPromise(isAuthenticated());
 */
export const isAuthenticated = (): Effect.Effect<boolean, Error> => {
  return Effect.map(getCurrentUser(), (user) => user !== null);
};

// ================================
// 便捷函数 Convenience Functions
// ================================

/**
 * 快速登录（使用预设的测试账号）
 * Quick login with preset test account
 * 
 * @returns Effect<AuthResult, Error>
 * 
 * @example
 * const result = await Effect.runPromise(quickLogin());
 */
export const quickLogin = (): Effect.Effect<AuthResult, Error> => {
  return signIn({
    email: 'weixu.wang+test@gmail.com',
    password: 'test123456'
  });
};

/**
 * 获取用户显示名称
 * Get user display name
 * 
 * @returns Effect<string, Error>
 */
export const getUserDisplayName = (): Effect.Effect<string, Error> => {
  return Effect.map(
    getCurrentUser(),
    (user) => user?.name || user?.email || 'Anonymous'
  );
};

// ================================
// 导出配置 Export Configuration
// ================================

/**
 * 认证服务配置
 * Auth service configuration
 */
export const AuthConfig = {
  // 可以在这里添加认证相关的配置
  // Add auth-related configuration here
  defaultRedirectUrl: '/',
  sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
} as const;