/**
 * Local-First Core Utilities
 * 
 * Pure utility functions for sync operations only.
 * No business logic - focused solely on sync engine needs.
 */

import { v4 as uuidv4 } from 'uuid';
import { LocalFirstEntity } from './types';

// =============================================================================
// Basic Entity Operations
// =============================================================================

/**
 * Generate unique entity ID
 */
export const createEntityId = (): string => uuidv4();

/**
 * Create current timestamp
 */
export const createTimestamp = (): Date => new Date();

/**
 * Create base entity fields for sync
 */
export const createBaseEntity = (
  userId?: string,
  entityId?: string
): Pick<LocalFirstEntity, 'id' | 'created_at' | 'updated_at' | 'is_deleted' | 'sync_version' | 'user_id'> => ({
  id: entityId || createEntityId(),
  created_at: createTimestamp(),
  updated_at: createTimestamp(),
  is_deleted: false,
  sync_version: 1,
  user_id: userId,
});

/**
 * Update entity with new sync version
 */
export const updateEntity = <T extends LocalFirstEntity>(
  entity: T,
  updates: Partial<Omit<T, 'id' | 'type' | 'created_at' | 'updated_at' | 'sync_version'>>
): T => ({
  ...entity,
  ...updates,
  updated_at: createTimestamp(),
  sync_version: entity.sync_version + 1,
});

/**
 * Mark entity as deleted (soft delete for sync)
 */
export const markEntityDeleted = <T extends LocalFirstEntity>(entity: T): T => ({
  ...entity,
  is_deleted: true,
  updated_at: createTimestamp(),
  sync_version: entity.sync_version + 1,
});

/**
 * Increment sync version
 */
export const incrementSyncVersion = <T extends LocalFirstEntity>(entity: T): T => ({
  ...entity,
  updated_at: createTimestamp(),
  sync_version: entity.sync_version + 1,
});

// =============================================================================
// Sync Validation
// =============================================================================

/**
 * Validate entity has required sync fields
 */
export const isValidSyncEntity = (entity: unknown): entity is LocalFirstEntity => {
  if (!entity || typeof entity !== 'object') return false;
  
  const e = entity as Record<string, unknown>;
  
  return (
    typeof e.id === 'string' &&
    e.created_at instanceof Date &&
    e.updated_at instanceof Date &&
    typeof e.is_deleted === 'boolean' &&
    typeof e.sync_version === 'number'
  );
};

// =============================================================================
// Simple Filtering for Sync
// =============================================================================

/**
 * Filter entities by type (business layer should provide type field)
 */
export const filterEntitiesByType = <T extends LocalFirstEntity & { type: string }>(
  entities: T[],
  type: T['type']
): T[] => {
  return entities.filter(entity => entity.type === type);
};

/**
 * Filter entities by user
 */
export const filterEntitiesByUser = (
  entities: LocalFirstEntity[],
  userId: string
): LocalFirstEntity[] => {
  return entities.filter(entity => entity.user_id === userId);
};

/**
 * Filter active (non-deleted) entities
 */
export const filterActiveEntities = (entities: LocalFirstEntity[]): LocalFirstEntity[] => {
  return entities.filter(entity => !entity.is_deleted);
};

/**
 * Sort entities by creation date
 */
export const sortEntitiesByCreated = (entities: LocalFirstEntity[], ascending = false): LocalFirstEntity[] => {
  return [...entities].sort((a, b) => {
    const comparison = a.created_at.getTime() - b.created_at.getTime();
    return ascending ? comparison : -comparison;
  });
};

/**
 * Sort entities by update date
 */
export const sortEntitiesByUpdated = (entities: LocalFirstEntity[], ascending = false): LocalFirstEntity[] => {
  return [...entities].sort((a, b) => {
    const comparison = a.updated_at.getTime() - b.updated_at.getTime();
    return ascending ? comparison : -comparison;
  });
};

// =============================================================================
// Sync Conflict Resolution
// =============================================================================

/**
 * Compare entity timestamps for conflict resolution
 */
export const compareEntityTimestamps = (a: LocalFirstEntity, b: LocalFirstEntity): number => {
  const timeDiff = a.updated_at.getTime() - b.updated_at.getTime();
  if (timeDiff !== 0) return timeDiff;
  
  // Use sync_version as tiebreaker
  return a.sync_version - b.sync_version;
};

/**
 * Check if entity A is newer than entity B
 */
export const isEntityNewer = (a: LocalFirstEntity, b: LocalFirstEntity): boolean => {
  return compareEntityTimestamps(a, b) > 0;
};

/**
 * Merge sync metadata from two entities
 */
export const mergeSyncMetadata = (target: LocalFirstEntity, source: LocalFirstEntity): LocalFirstEntity => {
  return {
    ...target,
    updated_at: isEntityNewer(source, target) ? source.updated_at : target.updated_at,
    sync_version: Math.max(target.sync_version, source.sync_version) + 1,
  };
};

/**
 * Alias for mergeSyncMetadata (for compatibility)
 */
export const mergeEntityMetadata = mergeSyncMetadata;

// =============================================================================
// Batch Operations
// =============================================================================

/**
 * Group entities by type for batch processing (business layer should provide type field)
 */
export const groupEntitiesByType = <T extends LocalFirstEntity & { type: string }>(
  entities: T[]
): Record<string, T[]> => {
  return entities.reduce((groups, entity) => {
    const type = entity.type;
    if (!groups[type]) groups[type] = [];
    groups[type].push(entity);
    return groups;
  }, {} as Record<string, T[]>);
};

/**
 * Split array into chunks for batch processing
 */
export const chunkArray = <T>(array: T[], chunkSize: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
};