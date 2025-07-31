/**
 * Conflict resolution utilities for Simple Sync Operations
 */

import * as RemoteOps from '../../local-first-impl/supabase-operations';
import * as LocalOps from '../../local-first-impl/local-first-operations';

/**
 * Resolve update conflict when entity exists on both sides
 * Phase 3.2d: Enhanced Last-write-wins conflict resolution
 */
export const resolveUpdateConflict = async (id: string, local: any, remote: any): Promise<void> => {
  // Parse timestamps with fallback to created_at if updated_at is missing
  const localTime = new Date(local.updated_at || local.created_at).getTime();
  const remoteTime = new Date(remote.updated_at || remote.created_at).getTime();
  
  // Calculate time difference for logging
  const timeDiff = Math.abs(localTime - remoteTime);
  const diffMinutes = Math.round(timeDiff / (1000 * 60));
  
  const entityTitle = local.data?.title || remote.data?.title || id;
  console.log(`[SimpleSync] Resolving update conflict for "${entityTitle}":`);
  console.log(`[SimpleSync] - Local timestamp: ${new Date(localTime).toISOString()}`);
  console.log(`[SimpleSync] - Remote timestamp: ${new Date(remoteTime).toISOString()}`);
  console.log(`[SimpleSync] - Time difference: ${diffMinutes} minutes`);

  if (localTime > remoteTime) {
    // Local is newer - push to remote (Last-write-wins: local wins)
    await RemoteOps.updateEntityLegacy(id, {
      data: local.data
    });
    console.log(`[SimpleSync] ✅ CONFLICT RESOLVED: Local wins (${diffMinutes}min newer) - updated remote: "${entityTitle}"`);
  } else if (remoteTime > localTime) {
    // Remote is newer - pull to local (Last-write-wins: remote wins)
    await LocalOps.updateEntity(id, {
      data: remote.data
    });
    console.log(`[SimpleSync] ✅ CONFLICT RESOLVED: Remote wins (${diffMinutes}min newer) - updated local: "${entityTitle}"`);
  } else {
    // Timestamps are equal - no conflict, both sides are in sync
    console.log(`[SimpleSync] ℹ️  NO CONFLICT: Timestamps are equal - both sides in sync: "${entityTitle}"`);
  }
};

/**
 * Handle entity that exists locally but not remotely
 */
export const handleLocalOnlyEntity = async (
  id: string,
  local: any,
  wasKnownRemotely: boolean,
  userId: string
): Promise<void> => {
  const entityTitle = local.data?.title || id;
  
  if (wasKnownRemotely) {
    // Was on remote before, now missing → deleted remotely → delete locally
    console.log(`[SimpleSync] Deleting locally (was deleted remotely): ${entityTitle}`);
    await LocalOps.deleteEntity(id);
  } else {
    // Never was on remote → new local item → push to remote
    console.log(`[SimpleSync] Pushing new local entity: ${entityTitle}`);
    await RemoteOps.createEntityLegacy({
      uuid: local.id,  // Preserve original UUID
      user_id: userId,
      data: local.data
    });
  }
};

/**
 * Handle entity that exists remotely but not locally
 */
export const handleRemoteOnlyEntity = async (
  id: string,
  remote: any, 
  wasKnownLocally: boolean, 
  userId: string
): Promise<void> => {
  const entityTitle = remote.data?.title || id;
  
  if (wasKnownLocally) {
    // Was local before, now missing → deleted locally → delete from remote
    console.log(`[SimpleSync] Deleting from remote (was deleted locally): ${entityTitle}`);
    await RemoteOps.deleteEntityLegacy(id);
  } else {
    // Never was local → new remote item → pull to local
    console.log(`[SimpleSync] Pulling new remote entity: ${entityTitle}`);
    await LocalOps.createEntity(remote.entityType, {
      uuid: remote.id,  // Preserve original UUID
      user_id: userId,
      data: remote.data
    });
  }
};

/**
 * Sync a single entity based on its current state and history
 */
export const syncSingleEntity = async (
  id: string,
  local: any | undefined,
  remote: any | undefined,
  wasKnownRemotely: boolean,
  wasKnownLocally: boolean,
  userId: string
): Promise<void> => {
  if (local && remote) {
    // Both exist - resolve conflict using timestamps
    await resolveUpdateConflict(id, local, remote);
  } else if (local && !remote) {
    // Local only - decide based on remote history
    await handleLocalOnlyEntity(id, local, wasKnownRemotely, userId);
  } else if (!local && remote) {
    // Remote only - decide based on local history
    await handleRemoteOnlyEntity(id, remote, wasKnownLocally, userId);
  } else if (!local && !remote && (wasKnownRemotely || wasKnownLocally)) {
    // Was known before but now missing from both → deleted everywhere
    console.log(`[SimpleSync] Item ${id} was deleted from both sides`);
  }
};

// Backward compatibility alias
export const syncSingleBookmark = syncSingleEntity;
export const handleLocalOnlyBookmark = handleLocalOnlyEntity;
export const handleRemoteOnlyBookmark = handleRemoteOnlyEntity;