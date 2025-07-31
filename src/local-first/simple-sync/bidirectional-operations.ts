/**
 * Consolidated sync operations for Simple Sync (Local ↔ Remote)
 * Includes push, pull, and bidirectional sync functionality
 */

import * as RemoteOps from '../../local-first-impl/supabase-operations';
import * as LocalOps from '../../local-first-impl/local-first-operations';
import { getCurrentUserIdLegacy as getCurrentUserId } from '../../local-first-impl/auth';
import { saveLastKnownRemoteIds, saveLastKnownLocalIds } from './last-known-ids';
import { prepareSyncData } from './sync-data-preparation';
import { syncSingleEntity } from './conflict-resolution';
import { SyncResult } from './types';

/**
 * Bidirectional sync (Local ↔ Remote) with integrated delete detection
 * Strategy: Merge new items, delete items that were explicitly deleted
 */
export const bidirectionalSync = async (): Promise<SyncResult> => {
  const startTime = new Date();
  const errors: string[] = [];
  let syncedCount = 0;

  try {
    // Step 1: Get current user ID
    const userId = await getCurrentUserId();
    console.log(`[SimpleSync] Starting bidirectional sync for user: ${userId}`);

    // Step 2: Prepare all sync data
    const syncData = await prepareSyncData(userId);

    // Step 3: Process each entity
    for (const id of syncData.allIds) {
      try {
        const local = syncData.localMap.get(id);
        const remote = syncData.remoteMap.get(id);
        const wasKnownRemotely = syncData.lastKnownRemoteIds.includes(id);
        const wasKnownLocally = syncData.lastKnownLocalIds.includes(id);
        
        await syncSingleEntity(id, local, remote, wasKnownRemotely, wasKnownLocally, userId);
        syncedCount++;
      } catch (error) {
        const errorMsg = `Failed to sync entity ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(`[SimpleSync] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    // Step 4: Save current state for next sync (only if completely successful)
    if (errors.length === 0) {
      // Get the ACTUAL current state after sync operations complete
      const [finalLocalEntities, finalRemoteEntities] = await Promise.all([
        LocalOps.getEntities({ user_id: userId }),
        RemoteOps.getEntitiesLegacy({ user_id: userId })
      ]);
      
      const finalLocalIds = finalLocalEntities.map((e: any) => e.id);
      const finalRemoteIds = finalRemoteEntities.map((e: any) => e.id);
      
      await Promise.all([
        saveLastKnownRemoteIds(userId, finalRemoteIds),
        saveLastKnownLocalIds(userId, finalLocalIds)
      ]);
      
      console.log(`[SimpleSync] Updated tracking: ${finalLocalIds.length} local IDs, ${finalRemoteIds.length} remote IDs`);
    }

    console.log(`[SimpleSync] Bidirectional sync completed: ${syncedCount}/${syncData.allIds.size} entities processed`);

    return {
      success: errors.length === 0,
      localCount: syncData.localEntities.length,
      remoteCount: syncData.remoteEntities.length,
      syncedCount,
      errors,
      timestamp: startTime,
      direction: 'bidirectional'
    };

  } catch (error) {
    const errorMsg = `Bidirectional sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(`[SimpleSync] ${errorMsg}`);
    
    return {
      success: false,
      localCount: 0,
      remoteCount: 0,
      syncedCount: 0,
      errors: [errorMsg],
      timestamp: startTime,
      direction: 'bidirectional'
    };
  }
};

