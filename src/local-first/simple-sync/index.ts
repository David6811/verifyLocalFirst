/**
 * Simple Sync Operations for Local-First Mode
 * 
 * Provides basic manual sync functionality between local storage and remote (Supabase).
 * Implements simple merge strategies and handles authentication requirements.
 * 
 * Phase 3.2b: Basic Sync Operations
 */

// Export types
export type { SyncResult, SyncStatus, SyncData } from './types';

// Export main sync operations
export { bidirectionalSync } from './bidirectional-operations';

// Export status management
export {
  getSyncStatus,
  isSyncRunning,
  getLastSyncResult,
  clearSyncStatus
} from './sync-status';

// Export manual sync
export { performManualSync } from '../manual-sync';

// Export utilities (for advanced use cases)
export {
  getLastKnownRemoteIds,
  getLastKnownLocalIds,
  saveLastKnownRemoteIds,
  saveLastKnownLocalIds
} from './last-known-ids';
export { prepareSyncData } from './sync-data-preparation';
export {
  resolveUpdateConflict,
  handleLocalOnlyBookmark,
  handleRemoteOnlyBookmark,
  syncSingleBookmark
} from './conflict-resolution';

// Re-export auth functions from the main auth module (preferred approach)
export {
  getCurrentUserLegacy as getCurrentUser,
  getCurrentUserIdLegacy as getCurrentUserId,
  isAuthenticatedLegacy as isAuthenticated,
  signInLegacy as signIn,
  signOutLegacy as signOut
} from '../../local-first-impl/auth';