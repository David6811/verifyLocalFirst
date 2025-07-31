/**
 * Sync status tracking and management
 */

import { SyncStatus, SyncResult } from './types';

let currentSyncStatus: SyncStatus = {
  isRunning: false
};

/**
 * Get current sync status
 */
export const getSyncStatus = (): SyncStatus => {
  return { ...currentSyncStatus };
};

/**
 * Check if sync is currently running
 */
export const isSyncRunning = (): boolean => {
  return currentSyncStatus.isRunning;
};

/**
 * Get last sync result
 */
export const getLastSyncResult = (): SyncResult | undefined => {
  return currentSyncStatus.lastResult;
};

/**
 * Clear sync status (useful for testing)
 */
export const clearSyncStatus = (): void => {
  currentSyncStatus = {
    isRunning: false
  };
};

/**
 * Internal function to update sync status (used by sync executor)
 */
export const updateSyncStatus = (status: Partial<SyncStatus>): void => {
  currentSyncStatus = {
    ...currentSyncStatus,
    ...status
  };
};