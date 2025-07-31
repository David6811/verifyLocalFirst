/**
 * Local-First Core Module
 * 
 * Simplified exports focused purely on sync engine operations.
 * Contains only generic, business-independent sync functionality.
 */

// Core sync types
export type {
  LocalFirstEntity,
  FilterOptions,
  QueryCriteria,
  BatchOperation,
} from './types';

// Error types and utilities
export type {
  StorageErrorType,
  SyncErrorType,
  ConflictErrorType,
} from './errors';

export {
  StorageError,
  SyncError,
  ConflictError,
  createStorageError,
  createSyncError,
  createConflictError,
  isStorageError,
  isSyncError,
  isConflictError,
} from './errors';

// Note: RealtimeSubscriptionStatus enum is exported directly from interfaces module

// Generic sync interfaces (aligned with implementation)
export type {
  StorageAdapter,
  FilterContext,
  FilterStats,
  StorageStats,
  // Provider interfaces  
  IStorageProvider,
  RealtimePayload,
  RealtimeSubscription,
  RealtimeSubscriptionStatus,
  AuthUser,
  QueryFilter,
  SortConfig,
  PaginationConfig,
} from './interfaces';

// Core sync utilities
export {
  // Basic entity operations
  createEntityId,
  createTimestamp,
  createBaseEntity,
  
  // Entity updates
  updateEntity,
  markEntityDeleted,
  incrementSyncVersion,
  
  // Validation
  isValidSyncEntity,
  
  // Filtering and sorting
  filterEntitiesByType,
  filterEntitiesByUser,
  filterActiveEntities,
  sortEntitiesByCreated,
  sortEntitiesByUpdated,
  
  // Conflict resolution
  compareEntityTimestamps,
  isEntityNewer,
  mergeSyncMetadata,
  
  // Batch operations
  groupEntitiesByType,
  chunkArray,
} from './utils';