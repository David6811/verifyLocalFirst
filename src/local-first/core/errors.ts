/**
 * Local-First Error Types
 * 
 * Sealed error classes using Effect-ts patterns for type-safe error handling.
 * Provides comprehensive error types for storage, sync, and conflict resolution operations.
 */

import { Data } from 'effect';

// =============================================================================
// Storage Error Types
// =============================================================================

/**
 * Possible error types for storage operations
 */
export type StorageErrorType = 
  | 'CONNECTION_FAILED'       // Database connection or initialization failed
  | 'TRANSACTION_FAILED'      // Database transaction failed or was aborted
  | 'ENTITY_NOT_FOUND'        // Requested entity does not exist
  | 'VALIDATION_ERROR'        // Entity data validation failed
  | 'QUOTA_EXCEEDED'          // Storage quota exceeded
  | 'PERMISSION_DENIED'       // Insufficient permissions for operation
  | 'AUTHENTICATION_REQUIRED' // Authentication is required for remote operations
  | 'UNKNOWN_ERROR';          // Unexpected error occurred

/**
 * Storage operation error with detailed context
 */
export class StorageError extends Data.TaggedError("StorageError")<{
  /** Type of storage error */
  readonly type: StorageErrorType;
  /** Human-readable error message */
  readonly message: string;
  /** Original underlying error if available */
  readonly originalError?: Error;
  /** ID of entity that caused the error */
  readonly entityId?: string;
}> {}

// =============================================================================
// Sync Error Types
// =============================================================================

/**
 * Possible error types for sync operations
 */
export type SyncErrorType = 
  | 'NETWORK_ERROR'         // Network connectivity issues
  | 'AUTH_ERROR'            // Authentication or authorization failed
  | 'CONFLICT_ERROR'        // Data conflicts detected during sync
  | 'VALIDATION_ERROR'      // Sync data validation failed
  | 'RATE_LIMIT_ERROR'      // API rate limits exceeded
  | 'SERVER_ERROR'          // Remote server error
  | 'UNKNOWN_ERROR';        // Unexpected sync error

/**
 * Sync operation error with retry information
 */
export class SyncError extends Data.TaggedError("SyncError")<{
  /** Type of sync error */
  readonly type: SyncErrorType;
  /** Human-readable error message */
  readonly message: string;
  /** Original underlying error if available */
  readonly originalError?: Error;
  /** Whether this error is retryable */
  readonly retryable?: boolean;
}> {}

// =============================================================================
// Conflict Resolution Error Types
// =============================================================================

/**
 * Possible error types for conflict resolution
 */
export type ConflictErrorType = 
  | 'UNRESOLVABLE_CONFLICT'  // Conflict cannot be automatically resolved
  | 'INVALID_CONFLICT_DATA'  // Conflict data is malformed or invalid
  | 'RESOLUTION_FAILED';     // Conflict resolution process failed

/**
 * Conflict resolution error with entity context
 */
export class ConflictError extends Data.TaggedError("ConflictError")<{
  /** Type of conflict error */
  readonly type: ConflictErrorType;
  /** Human-readable error message */
  readonly message: string;
  /** Local entity involved in conflict */
  readonly localEntity?: unknown;
  /** Remote entity involved in conflict */
  readonly remoteEntity?: unknown;
}> {}

// =============================================================================
// Error Factory Functions
// =============================================================================

/**
 * Create a storage error instance
 */
export const createStorageError = (
  type: StorageErrorType,
  message: string,
  originalError?: Error,
  entityId?: string
): StorageError => 
  new StorageError({ 
    type, 
    message, 
    originalError, 
    entityId 
  });

/**
 * Create a sync error instance
 */
export const createSyncError = (
  type: SyncErrorType,
  message: string,
  originalError?: Error,
  retryable = false
): SyncError => 
  new SyncError({ 
    type, 
    message, 
    originalError, 
    retryable 
  });

/**
 * Create a conflict error instance
 */
export const createConflictError = (
  type: ConflictErrorType,
  message: string,
  localEntity?: unknown,
  remoteEntity?: unknown
): ConflictError => 
  new ConflictError({ 
    type, 
    message, 
    localEntity, 
    remoteEntity 
  });

// =============================================================================
// Type Guards and Utilities
// =============================================================================

/**
 * Type guard for storage errors
 */
export const isStorageError = (error: unknown): error is StorageError =>
  error instanceof StorageError;

/**
 * Type guard for sync errors
 */
export const isSyncError = (error: unknown): error is SyncError =>
  error instanceof SyncError;

/**
 * Type guard for conflict errors
 */
export const isConflictError = (error: unknown): error is ConflictError =>
  error instanceof ConflictError;