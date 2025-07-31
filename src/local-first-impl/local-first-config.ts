/**
 * Local-First Configuration
 * 
 * Essential configuration for local-first operations.
 */

export interface LocalFirstConfig {
  /** Primary storage backend type */
  primaryStorage: 'chrome-storage' | 'chrome-storage-sync' | 'indexeddb' | 'memory';
  /** Secondary storage for sync operations */
  remoteStorage?: 'supabase' | 'firebase' | 'custom';
  /** Chrome storage area to use */
  chromeStorageArea: 'local' | 'sync';
  /** Maximum items per storage batch operation */
  batchSize: number;
  /** Enable automatic synchronization */
  autoSyncEnabled: boolean;
  /** Debounce delay for batching sync operations (ms) */
  debounceDelay: number;
  /** Conflict resolution strategy */
  conflictResolution: 'last-write-wins' | 'merge' | 'manual';
  /** Maximum retry attempts for failed operations */
  maxRetries: number;
  /** Delay between retry attempts (ms) */
  retryDelay: number;
  /** Timeout for sync operations (ms) */
  syncTimeout: number;
}

export const DEFAULT_LOCAL_FIRST_CONFIG: LocalFirstConfig = {
  primaryStorage: 'chrome-storage',
  remoteStorage: 'supabase',
  chromeStorageArea: 'local',
  batchSize: 100,
  autoSyncEnabled: false,
  debounceDelay: 500,
  conflictResolution: 'last-write-wins',
  maxRetries: 3,
  retryDelay: 10000,
  syncTimeout: 30000
};

/**
 * Merge partial configuration with defaults
 */
export function mergeConfig(
  base: LocalFirstConfig = DEFAULT_LOCAL_FIRST_CONFIG,
  overrides: Partial<LocalFirstConfig> = {}
): LocalFirstConfig {
  return { ...base, ...overrides };
}

// ================================
// PRESET CONFIGURATIONS
// ================================

/**
 * Chrome Extension Configuration
 * Optimized for Chrome extension environment with local storage
 */
export const CHROME_EXTENSION_CONFIG = mergeConfig(DEFAULT_LOCAL_FIRST_CONFIG, {
  primaryStorage: 'chrome-storage' as const,
  chromeStorageArea: 'local' as const,
  batchSize: 50,
  autoSyncEnabled: true,
  debounceDelay: 1000
});

/**
 * Web App Configuration
 * Optimized for web applications with IndexedDB
 */
export const WEB_APP_CONFIG = mergeConfig(DEFAULT_LOCAL_FIRST_CONFIG, {
  primaryStorage: 'indexeddb' as const,
  chromeStorageArea: 'local' as const,
  batchSize: 100
});

/**
 * Testing Configuration
 * Optimized for unit and integration tests
 */
export const TESTING_CONFIG = mergeConfig(DEFAULT_LOCAL_FIRST_CONFIG, {
  primaryStorage: 'memory' as const,
  chromeStorageArea: 'local' as const,
  batchSize: 10,
  autoSyncEnabled: false
});