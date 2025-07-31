/**
 * Sync execution with status tracking
 */

import { SyncResult } from '../simple-sync/types';
import { bidirectionalSync } from '../simple-sync/bidirectional-operations';
import { updateSyncStatus, isSyncRunning } from '../simple-sync/sync-status';

/**
 * Perform manual sync with status tracking
 * Uses bidirectional sync for comprehensive synchronization
 */
export const performManualSync = async (): Promise<SyncResult> => {
  if (isSyncRunning()) {
    throw new Error('Sync already in progress');
  }

  console.log(`[SimpleSync] Starting manual sync`);
  
  // Update status to running
  updateSyncStatus({
    isRunning: true,
    error: undefined
  });

  try {
    const result = await bidirectionalSync();

    // Update status with result
    updateSyncStatus({
      isRunning: false,
      lastSync: result.timestamp,
      lastResult: result,
      error: result.success ? undefined : result.errors.join('; ')
    });

    console.log(`[SimpleSync] Manual sync completed:`, result);
    return result;

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown sync error';
    console.error(`[SimpleSync] Manual sync failed:`, error);
    
    // Update status with error
    updateSyncStatus({
      isRunning: false,
      lastSync: new Date(),
      error: errorMsg
    });

    throw error;
  }
};