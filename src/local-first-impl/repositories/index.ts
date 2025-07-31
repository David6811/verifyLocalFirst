/**
 * Local-First Repositories
 * 
 * Generic, domain-independent repository implementations for local-first architecture.
 * All repositories are fully generic and can work with any domain entity that extends LocalFirstEntity.
 * 
 * REPOSITORY ARCHITECTURE:
 * - SchemaAwareSupabaseRepository is the unified Supabase implementation
 * - Supports both legacy StorageAdapter<T> and new IStorageProvider<DynamicEntity> interfaces
 * - Provides schema management capabilities for user-configurable tables
 * - All existing factory functions now use SchemaAwareSupabaseRepository internally
 * - Backward compatibility maintained for all existing code
 */

// Export repository classes
export { ChromeStorageRepository } from './chrome-storage-repository';
export { ChromeStorageSyncRepository } from './chrome-storage-sync-repository';
export { SchemaAwareSupabaseRepository, DynamicSupabaseStorageProvider } from './schema-aware-supabase-repository';

// Export factory functions
export { createChromeStorageRepository } from './chrome-storage-repository';
export { createChromeStorageSyncRepository, createLocalFirstRepository } from './chrome-storage-sync-repository';
export { createSchemaAwareSupabaseRepository, createDynamicSupabaseProvider } from './schema-aware-supabase-repository';

// Export configuration interfaces
export type { ChromeStorageConfig } from './chrome-storage-repository';
export type { SchemaAwareSupabaseConfig } from './schema-aware-supabase-repository';

// Legacy class export for backward compatibility
export { ChromeStorageSyncRepository as LocalFirstRepository } from './chrome-storage-sync-repository';

// Types
export type { StorageAdapter } from '../../local-first/core';

// Import factory functions for generic implementations
import { createChromeStorageRepository } from './chrome-storage-repository';
import { createLocalFirstRepository } from './chrome-storage-sync-repository';
import { createSchemaAwareSupabaseRepository } from './schema-aware-supabase-repository';
import { LocalFirstEntity } from '../../local-first/core';

// Generic factory functions for bookmark entities - with proper constraints
export const createBookmarkChromeStorageRepository = <T extends LocalFirstEntity = LocalFirstEntity>(storageArea?: chrome.storage.StorageArea) => 
  createChromeStorageRepository<T>(storageArea);

// Schema-aware Supabase repository for bookmarks (RECOMMENDED)
export const createBookmarkSupabaseRepository = <T extends LocalFirstEntity = LocalFirstEntity>() => {
  return createSchemaAwareSupabaseRepository<T>();
};

// Alias for clarity
export const createBookmarkSchemaAwareSupabaseRepository = createBookmarkSupabaseRepository;

export const createBookmarkChromeStorageSyncRepository = <T extends LocalFirstEntity = LocalFirstEntity>(storageArea?: chrome.storage.StorageArea) => 
  createLocalFirstRepository<T>(storageArea);

export const createBookmarkLocalFirstRepository = createBookmarkChromeStorageSyncRepository;

// Type aliases using ReturnType for clean typing
export type BookmarkChromeStorageRepository = ReturnType<typeof createBookmarkChromeStorageRepository>;
export type BookmarkSupabaseRepository = ReturnType<typeof createBookmarkSupabaseRepository>;
export type BookmarkSchemaAwareSupabaseRepository = BookmarkSupabaseRepository; // Same implementation now
export type BookmarkChromeStorageSyncRepository = ReturnType<typeof createBookmarkChromeStorageSyncRepository>;
export type BookmarkLocalFirstRepository = BookmarkChromeStorageSyncRepository;

// Recommended aliases for new code
export const createBookmarkRemoteRepository = createBookmarkSupabaseRepository;
export type BookmarkRemoteRepository = BookmarkSupabaseRepository;

// Legacy aliases for backward compatibility
export const createBookmarkLocalStorageAdapter = createBookmarkChromeStorageRepository;
export const createBookmarkRemoteStorageAdapter = createBookmarkSupabaseRepository;
export const createBookmarkLocalFirstStorageAdapter = createBookmarkLocalFirstRepository;

export type BookmarkLocalStorageAdapter = BookmarkChromeStorageRepository;
export type BookmarkRemoteStorageAdapter = BookmarkSupabaseRepository;
export type BookmarkLocalFirstStorageAdapter = BookmarkLocalFirstRepository;