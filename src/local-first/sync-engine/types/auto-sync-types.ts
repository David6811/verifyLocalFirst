/**
 * Auto-Sync Engine Type Definitions
 * 
 * Central type definitions for the auto-sync engine and its components.
 * These types provide type safety and clear interfaces for all sync operations.
 */

import { SyncResult } from '../../simple-sync';

// ================================
// CORE AUTO-SYNC TYPES
// ================================

/**
 * Types of events that can trigger auto-sync operations
 */
export enum AutoSyncEventType {
  /** Local storage changes */
  DATA_CHANGE = 'data-change',
  /** Network connectivity changes */
  NETWORK_CHANGE = 'network-change', 
  /** Periodic sync timer */
  TIMER_TRIGGER = 'timer-trigger',
  /** Manual sync button/API call */
  MANUAL_TRIGGER = 'manual-trigger',
  /** Remote database changes */
  REMOTE_CHANGE = 'remote-change'
}

/**
 * Priority levels for sync operations
 */
export type SyncPriority = 'high' | 'medium' | 'low';

/**
 * Source of the sync trigger
 */
export type SyncSource = 'local' | 'remote';

/**
 * Auto-sync event that can be queued for processing
 */
export interface AutoSyncEvent {
  /** Type of event that triggered the sync */
  type: AutoSyncEventType;
  /** Optional entity ID for targeted sync operations */
  entityId?: string;
  /** Timestamp when the event occurred */
  timestamp: Date;
  /** Priority level for queue processing */
  priority: SyncPriority;
  /** Source of the event (local or remote) */
  source?: SyncSource;
}

/**
 * Current status of the auto-sync engine
 */
export interface AutoSyncStatus {
  /** Whether auto-sync is enabled */
  enabled: boolean;
  /** Whether sync is currently running */
  isRunning: boolean;
  /** Number of items in the sync queue */
  queueSize: number;
  /** Timestamp of the last sync operation */
  lastSync?: Date;
  /** Result of the last sync operation */
  lastResult?: SyncResult;
  /** Current error message if any */
  error?: string;
  /** Next scheduled sync time (for periodic syncs) */
  nextScheduledSync?: Date;
}

/**
 * Internal queue item for managing sync operations
 */
export interface QueueItem {
  /** The sync event to be processed */
  event: AutoSyncEvent;
  /** Number of retry attempts */
  retryCount: number;
  /** When this item was scheduled */
  scheduledTime: Date;
}

// ================================
// COMPONENT-SPECIFIC TYPES
// ================================

/**
 * Status listener callback function
 */
export type StatusListener = (status: AutoSyncStatus) => void;

/**
 * Storage change callback function
 */
export type StorageChangeCallback = (keys: string[]) => void;

/**
 * Remote change callback function
 */
export type RemoteChangeCallback = (payload: any) => void;

/**
 * Sync processing callback function
 */
export type SyncProcessingCallback = () => Promise<void>;

// ================================
// FILTER TYPES
// ================================

/**
 * Filter result for sync operations
 */
export interface FilterResult {
  /** Whether the operation should be filtered (blocked) */
  shouldFilter: boolean;
  /** Reason for filtering (for debugging) */
  reason?: string;
  /** Filter layer that made the decision */
  layer?: FilterLayer;
}

/**
 * Filter layers in the four-layer protection system
 */
export type FilterLayer = 
  | 'sync-operation'    // Layer 1: During sync operations
  | 'processing'        // Layer 2: During queue processing
  | 'queue'            // Layer 3: When queue has items
  | 'remote-batching'; // Layer 4: Remote change batching

// ================================
// DETECTOR TYPES
// ================================

/**
 * Configuration for storage change detection
 */
export interface StorageDetectionConfig {
  /** Storage area to monitor ('local' | 'sync' | 'managed') */
  area: 'local' | 'sync' | 'managed';
  /** Key patterns to include in monitoring */
  includePatterns: string[];
  /** Key patterns to exclude from monitoring */
  excludePatterns: string[];
}

/**
 * Configuration for remote change detection
 */
export interface RemoteDetectionConfig {
  /** Supabase table to monitor */
  table: string;
  /** Database schema */
  schema: string;
  /** Filter for database changes */
  filter?: string;
  /** Events to listen for */
  events: ('INSERT' | 'UPDATE' | 'DELETE')[];
}

/**
 * Supabase real-time payload structure
 */
export interface SupabasePayload {
  /** Type of database event */
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  /** Database schema */
  schema: string;
  /** Table name */
  table: string;
  /** New row data (for INSERT/UPDATE) */
  new?: any;
  /** Old row data (for UPDATE/DELETE) */
  old?: any;
  /** Additional metadata */
  [key: string]: any;
}

// ================================
// QUEUE TYPES
// ================================

/**
 * Queue processing statistics
 */
export interface QueueStats {
  /** Total items processed */
  totalProcessed: number;
  /** Number of successful operations */
  successful: number;
  /** Number of failed operations */
  failed: number;
  /** Average processing time per item */
  averageProcessingTime: number;
  /** Current queue size */
  currentSize: number;
}

/**
 * Queue processing options
 */
export interface QueueProcessingOptions {
  /** Maximum batch size for processing */
  maxBatchSize?: number;
  /** Timeout for individual operations */
  operationTimeout?: number;
  /** Whether to stop on first error */
  stopOnError?: boolean;
}

// ================================
// ERROR TYPES
// ================================

/**
 * Auto-sync specific error types
 */
export type AutoSyncErrorType = 
  | 'configuration-error'  // Configuration loading/saving errors
  | 'storage-error'        // Chrome storage errors
  | 'network-error'        // Network connectivity errors
  | 'sync-error'           // Sync operation errors
  | 'remote-error'         // Remote database errors
  | 'queue-error'          // Queue processing errors
  | 'filter-error'         // Filter operation errors
  | 'unknown-error';       // Unclassified errors

/**
 * Structured error information
 */
export interface AutoSyncError {
  /** Type of error */
  type: AutoSyncErrorType;
  /** Error message */
  message: string;
  /** Original error object */
  originalError?: Error;
  /** Context where error occurred */
  context?: string;
  /** Timestamp when error occurred */
  timestamp: Date;
  /** Whether this is a recoverable error */
  recoverable: boolean;
}

// ================================
// UTILITY TYPES
// ================================

/**
 * Cleanup function type
 */
export type CleanupFunction = () => void;

/**
 * Timer reference type (Node.js or Browser)
 */
export type TimerRef = ReturnType<typeof setTimeout>;

/**
 * Subscription reference type
 */
export type SubscriptionRef = {
  unsubscribe: () => void;
};

// ================================
// FACTORY TYPES
// ================================

/**
 * Dependency injection container for auto-sync engine
 */
export interface AutoSyncDependencies {
  /** Configuration manager instance */
  configManager: any; // Will be typed properly when component is created
  /** Status manager instance */
  statusManager: any; // Will be typed properly when component is created
  /** Filter manager instance */
  filterManager: any; // Will be typed properly when component is created
  /** Queue manager instance */
  queueManager: any; // Will be typed properly when component is created
  /** Storage change detector instance */
  storageDetector: any; // Will be typed properly when component is created
  /** Remote change detector instance */
  remoteDetector: any; // Will be typed properly when component is created
}

/**
 * Factory configuration options
 */
export interface AutoSyncFactoryConfig {
  /** Custom configuration overrides */
  config?: Partial<any>; // Will be typed properly when component is created
  /** Custom logger instance */
  logger?: any;
  /** Development mode flag */
  developmentMode?: boolean;
}

// ================================
// EXPORT UTILITIES
// ================================

/**
 * Type guard to check if an object is an AutoSyncEvent
 */
export function isAutoSyncEvent(obj: any): obj is AutoSyncEvent {
  return obj && 
    typeof obj === 'object' &&
    typeof obj.type === 'string' &&
    obj.timestamp instanceof Date &&
    typeof obj.priority === 'string';
}

/**
 * Type guard to check if an object is an AutoSyncStatus
 */
export function isAutoSyncStatus(obj: any): obj is AutoSyncStatus {
  return obj &&
    typeof obj === 'object' &&
    typeof obj.enabled === 'boolean' &&
    typeof obj.isRunning === 'boolean' &&
    typeof obj.queueSize === 'number';
}

/**
 * Helper to create a default AutoSyncEvent
 */
export function createAutoSyncEvent(
  type: AutoSyncEventType,
  options?: Partial<AutoSyncEvent>
): AutoSyncEvent {
  return {
    type,
    timestamp: new Date(),
    priority: 'medium',
    ...options
  };
}

/**
 * Helper to create a default AutoSyncStatus
 */
export function createAutoSyncStatus(
  options?: Partial<AutoSyncStatus>
): AutoSyncStatus {
  return {
    enabled: false,
    isRunning: false,
    queueSize: 0,
    ...options
  };
}