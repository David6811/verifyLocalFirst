/**
 * Change Detectors Module (Simplified)
 * 
 * Exports simplified change detection components for the auto-sync engine.
 * No longer uses provider abstraction - direct Chrome/Supabase integration.
 */

// Simplified storage change detector (Chrome-specific)
export { 
  StorageChangeDetector,
  type StorageChangeCallback,
  type StorageChangeDetectorConfig,
  type StorageChange
} from './storage-change-detector';


export { 
  PeriodicSyncDetector,
  type PeriodicSyncCallback,
  type PeriodicSyncDetectorConfig
} from './periodic-sync-detector';

// Simplified remote change detector (Supabase-specific)
export { 
  RemoteChangeDetector,
  type RemoteChangeCallback,
  type RemoteChangeDetectorConfig,
  type RemoteChangePayload,
  SubscriptionStatus
} from './remote-change-detector';

// Keep minimal interfaces from core for backward compatibility
export type { 
  AuthUser
} from '../../core/interfaces';