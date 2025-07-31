/**
 * Local-First Core Interfaces
 * 
 * Abstract interfaces for storage adapters, sync engine, and conflict resolution.
 * These interfaces define the contracts for the local-first architecture.
 * Updated to align with the implemented auto-sync system while maintaining future extensibility.
 */

import { Effect } from 'effect';
import { 
  LocalFirstEntity,
  FilterOptions, 
  QueryCriteria, 
  BatchOperation
} from './types';
import { StorageError } from './errors';

// All sync-engine type imports removed - not used after deleting interfaces
// SyncResult import removed - not used after deleting interfaces

// =============================================================================
// Core Storage Interface
// =============================================================================

/**
 * Storage Adapter Interface
 * 
 * Abstract interface for both local (IndexedDB) and remote (Supabase) storage.
 * Implements unified CRUD operations with Effect-ts error handling patterns.
 */
export interface StorageAdapter<T extends LocalFirstEntity = LocalFirstEntity> {
  /** Create a new entity */
  create(entity: T): Effect.Effect<T, StorageError>;
  
  /** Get entity by ID, returns null if not found */
  get(id: string): Effect.Effect<T | null, StorageError>;
  
  /** Update existing entity */
  update(entity: T): Effect.Effect<T, StorageError>;
  
  /** Delete entity by ID */
  delete(id: string): Effect.Effect<void, StorageError>;
  
  /** List entities with optional filtering */
  list(filter?: FilterOptions): Effect.Effect<T[], StorageError>;
  
  /** Execute multiple operations atomically */
  batchUpdate(operations: BatchOperation<T>[]): Effect.Effect<void, StorageError>;
  
  /** Get all changes since a timestamp for sync operations */
  getChangesSince(timestamp: Date): Effect.Effect<any[], StorageError>;
  
  /** Advanced querying with search and pagination */
  query(criteria: QueryCriteria): Effect.Effect<T[], StorageError>;
  
  /** Count entities matching filter criteria */
  count(filter?: FilterOptions): Effect.Effect<number, StorageError>;
  
  /** Perform storage cleanup and optimization */
  vacuum(): Effect.Effect<void, StorageError>;
  
  /** Get storage statistics and health metrics */
  getStats(): Effect.Effect<StorageStats, StorageError>;
}

// ConflictResolver interface removed - not implemented or used

// AutoSyncEngine interface removed - class exists but doesn't implement interface

// Manager interfaces removed - classes exist but don't implement interfaces

// StatusManager and FilterManager interfaces removed - classes exist but don't implement interfaces

// QueueManager interface removed - actual implementation doesn't use interface

// ChangeDetector interfaces removed - classes exist but don't implement interfaces

// =============================================================================
// Storage Provider Interface (Missing Export)
// =============================================================================

/**
 * Generic query filter interface
 */
export interface QueryFilter {
  field: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'like';
  value: any;
}

/**
 * Sort configuration interface
 */
export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Pagination configuration interface
 */
export interface PaginationConfig {
  limit: number;
  offset: number;
}

/**
 * Storage provider interface for CRUD operations
 * Generic interface that works with any storage backend
 */
export interface IStorageProvider<T = any> {
  /**
   * Create a new record
   */
  create(data: Omit<T, 'id'>): Promise<T>;
  
  /**
   * Read a single record by ID
   */
  read(id: string): Promise<T | null>;
  
  /**
   * Update an existing record
   */
  update(id: string, data: Partial<T>): Promise<T>;
  
  /**
   * Delete a record by ID
   */
  delete(id: string): Promise<void>;
  
  /**
   * List records with optional filtering
   */
  list(options?: {
    filters?: QueryFilter[];
    sort?: SortConfig;
    pagination?: PaginationConfig;
  }): Promise<T[]>;
  
  /**
   * Count records matching criteria
   */
  count(filters?: QueryFilter[]): Promise<number>;
  
  /**
   * Batch operations for better performance
   */
  batch?: {
    create(items: Omit<T, 'id'>[]): Promise<T[]>;
    update(updates: Array<{ id: string; data: Partial<T> }>): Promise<T[]>;
    delete(ids: string[]): Promise<void>;
  };
}

// =============================================================================
// Abstract Provider Interfaces (For Dependency Injection)
// =============================================================================

/**
 * Real-time change payload from database subscriptions
 * Generic format that works with any real-time database system
 */
export interface RealtimePayload {
  /** Type of database operation */
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  /** Database table/collection name */
  table: string;
  /** Database schema (optional, for SQL databases) */
  schema?: string;
  /** New data (for INSERT/UPDATE operations) */
  new?: Record<string, any>;
  /** Old data (for UPDATE/DELETE operations) */
  old?: Record<string, any>;
  /** Any errors that occurred */
  errors?: string[];
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Real-time subscription status
 * Standardized across different database providers
 */
export enum RealtimeSubscriptionStatus {
  /** Successfully connected and receiving updates */
  SUBSCRIBED = 'SUBSCRIBED',
  /** Connection error occurred */
  CHANNEL_ERROR = 'CHANNEL_ERROR',
  /** Connection is closed */
  CLOSED = 'CLOSED',
  /** Currently connecting */
  CONNECTING = 'CONNECTING',
  /** Connection timed out */
  TIMED_OUT = 'TIMED_OUT'
}

/**
 * Real-time subscription handle
 */
export interface RealtimeSubscription {
  /** Unique subscription identifier */
  id: string;
  /** Current subscription status */
  status: RealtimeSubscriptionStatus;
  /** Unsubscribe from real-time updates */
  unsubscribe(): Promise<void>;
  /** Check if subscription is active */
  isActive(): boolean;
}

// IRealtimeProvider interface removed - not implemented

/**
 * Authenticated user information
 */
export interface AuthUser {
  /** Unique user identifier */
  id: string;
  /** User email address */
  email?: string;
  /** Additional user metadata */
  metadata?: Record<string, any>;
}

// IAuthProvider interface removed - not implemented

// IConfigProvider interface removed - not implemented

/**
 * Storage change information
 */
export interface StorageChange {
  /** The storage key that changed */
  key: string;
  /** Old value (if any) */
  oldValue?: any;
  /** New value (if any) */
  newValue?: any;
}


// =============================================================================
// Supporting Data Types (Aligned with Implementation)
// =============================================================================

/**
 * Filter context information
 */
export interface FilterContext {
  /** Whether auto-sync is enabled */
  isEnabled: boolean;
  /** Whether sync is currently running */
  isRunning: boolean;
  /** Current queue size */
  queueSize: number;
  /** Last local change timestamp */
  lastLocalChangeTime: Date | null;
  /** Whether sync operation is in progress */
  isPerformingSyncOperation: boolean;
}

/**
 * Filter statistics and metrics
 */
export interface FilterStats {
  /** Last local change timestamp */
  lastLocalChangeTime: Date | null;
  /** Whether sync operation is in progress */
  isPerformingSyncOperation: boolean;
  /** Number of active timeouts */
  activeTimeouts: number;
}

// Queue processing result and stats interfaces removed - not used by actual implementation

// SyncOptions interface removed - only used by deleted LegacySyncEngine

// SimpleSyncOperations interface removed - not implemented

/**
 * Storage performance and health statistics
 */
export interface StorageStats {
  /** Total number of entities stored */
  total_entities: number;
  /** Breakdown of entities by type */
  entities_by_type: Record<string, number>;
  /** Storage size in bytes (if available) */
  storage_size_bytes: number;
  /** Last cleanup operation timestamp */
  last_cleanup: Date | null;
  /** Storage fragmentation ratio (0-1) */
  fragmentation_ratio: number;
}

// SyncStats interface removed - only used by deleted LegacySyncEngine

// Factory interfaces removed - not used in actual implementation

// Change detector, storage adapter, and conflict resolver factory interfaces removed - not used

// LegacySyncEngine interface removed - not implemented or used