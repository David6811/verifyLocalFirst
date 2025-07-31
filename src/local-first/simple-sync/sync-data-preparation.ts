/**
 * Sync data preparation utilities for Simple Sync Operations
 */

import * as RemoteOps from '../../local-first-impl/supabase-operations';
import * as LocalOps from '../../local-first-impl/local-first-operations';
import { getLastKnownRemoteIds, getLastKnownLocalIds } from './last-known-ids';
import { SyncData } from './types';

/**
 * Prepare sync data structures
 */
export const prepareSyncData = async (userId: string): Promise<SyncData> => {
  // Get both local and remote entities
  const [localEntities, remoteEntities] = await Promise.all([
    LocalOps.getEntities({ user_id: userId }),
    RemoteOps.getEntitiesLegacy({ user_id: userId })
  ]);

  // Get last known IDs for delete detection
  const lastKnownRemoteIds = await getLastKnownRemoteIds(userId);
  const lastKnownLocalIds = await getLastKnownLocalIds(userId);

  // Create lookup structures
  const localMap = new Map(localEntities.map(e => [e.id, e]));
  const remoteMap = new Map(remoteEntities.map(e => [e.id, e]));
  const currentRemoteIds = remoteEntities.map(e => e.id);
  const currentLocalIds = localEntities.map(e => e.id);
  const allIds = new Set([...localMap.keys(), ...remoteMap.keys(), ...lastKnownRemoteIds, ...lastKnownLocalIds]);

  console.log(`[SimpleSync] Sync data prepared: ${localEntities.length} local, ${remoteEntities.length} remote, ${lastKnownRemoteIds.length} remote tracked, ${lastKnownLocalIds.length} local tracked`);

  return {
    localEntities,
    remoteEntities,
    localMap,
    remoteMap,
    lastKnownRemoteIds,
    lastKnownLocalIds,
    currentRemoteIds,
    currentLocalIds,
    allIds
  };
};