/**
 * Local-First Implementation Module
 * 
 * Concrete implementations for local-first storage with sync capabilities.
 * This module provides the actual implementations of the local-first interfaces.
 */

// Local-First Repository Implementation
export { LocalFirstRepository } from './repositories';

// Import the create function for use in factory
import { createLocalFirstRepository } from './repositories';

// Local-First Operations Implementation  
export * from './local-first-operations';

// Local-First Configuration System
export * from './local-first-config';

// Authentication Module
export * from './auth';

// Import type constraint
import { LocalFirstEntity } from '../local-first/core';

// Generic factory function for backward compatibility - with proper constraints
export const createBookmarkLocalFirstStorageAdapter = <T extends LocalFirstEntity = LocalFirstEntity>(storageArea?: chrome.storage.StorageArea) => 
  createLocalFirstRepository<T>(storageArea);

// Type alias using ReturnType for clean typing
export type BookmarkLocalFirstStorageAdapter = ReturnType<typeof createBookmarkLocalFirstStorageAdapter>;