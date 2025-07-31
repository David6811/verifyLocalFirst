/**
 * Local-First Core Types
 * 
 * Minimal types needed for sync engine operations.
 * Contains only sync-related data structures, no business logic.
 */

// =============================================================================
// Core Sync Entity
// =============================================================================

/**
 * Base entity interface for sync operations
 * Contains only the minimal fields required for data synchronization
 */
export interface LocalFirstEntity {
  /** Unique identifier across devices */
  id: string;
  /** Creation timestamp */
  created_at: Date;
  /** Last modification timestamp */
  updated_at: Date;
  /** Soft delete flag for sync-safe deletion */
  is_deleted: boolean;
  /** Version for conflict resolution */
  sync_version: number;
  /** Optional user ownership */
  user_id?: string;
}

// =============================================================================
// Sync Operations
// =============================================================================

/**
 * Basic filtering for sync operations
 */
export interface FilterOptions {
  user_id?: string;
  is_deleted?: boolean;
  created_after?: Date;
  updated_after?: Date;
}

/**
 * Query criteria for sync operations
 */
export interface QueryCriteria extends FilterOptions {
  limit?: number;
  offset?: number;
}

/**
 * Batch operation for sync
 */
export interface BatchOperation<T extends LocalFirstEntity = LocalFirstEntity> {
  type: 'create' | 'update' | 'delete';
  entity: T;
}

