/**
 * Supabase Operations - Generic Implementation
 * 
 * Generic operations for Supabase storage using dynamic entities.
 * Follows the same pattern as local-first-operations.ts for consistency.
 */

import { Effect, pipe } from 'effect';
import { SchemaAwareSupabaseRepository } from './repositories';
import { StorageError, createStorageError } from '../local-first/core/errors';
import { 
  DynamicEntity,
  GenericEntityCreateData,
  GenericEntityUpdateData,
  GenericEntityQueryOptions,
  SimpleEntityGenerator
} from '../local-first/schema';
import { getTableConfig } from '../local-first/schema';
import { TABLE_CONFIG } from '../externals/config/table-config';

// Create Supabase repository instance with unified table configuration
const supabaseTableConfig = getTableConfig(TABLE_CONFIG);
const supabaseRepository = new SchemaAwareSupabaseRepository<DynamicEntity>(supabaseTableConfig);

// ================================
// CORE OPERATIONS
// ================================

/**
 * Create a new entity using Supabase
 */
export const createEntity = (data: GenericEntityCreateData): Effect.Effect<DynamicEntity, StorageError> =>
  pipe(
    Effect.try({
      try: () => {
        const tableName = supabaseTableConfig.getTableName();
        return SimpleEntityGenerator.createEntity(tableName, data.data, data.user_id, data.uuid);
      },
      catch: (error) => createStorageError('UNKNOWN_ERROR', `Failed to prepare entity data: ${error}`, error instanceof Error ? error : new Error(String(error)))
    }),
    Effect.flatMap(entity => supabaseRepository.create(entity))
  );

/**
 * Get entity by UUID using Supabase
 */
export const getEntityById = (uuid: string): Effect.Effect<DynamicEntity | null, StorageError> =>
  supabaseRepository.get(uuid);

/**
 * Update entity using Supabase
 */
export const updateEntity = (uuid: string, data: GenericEntityUpdateData): Effect.Effect<DynamicEntity, StorageError> =>
  pipe(
    // First get the existing entity
    supabaseRepository.get(uuid),
    Effect.flatMap(existing => {
      if (!existing) {
        return Effect.fail(createStorageError('ENTITY_NOT_FOUND', `Entity with ID ${uuid} not found`));
      }
      
      // Apply updates
      const updatedEntity: DynamicEntity = {
        ...existing,
        data: { ...existing.data, ...data.data },
        updated_at: new Date()
      };
      
      // Save updated entity
      return supabaseRepository.update(updatedEntity);
    })
  );

/**
 * Delete entity (soft delete) using Supabase
 */
export const deleteEntity = (uuid: string): Effect.Effect<void, StorageError> =>
  pipe(
    supabaseRepository.get(uuid),
    Effect.flatMap(existing => {
      if (!existing) {
        return Effect.fail(createStorageError('ENTITY_NOT_FOUND', `Entity with ID ${uuid} not found`));
      }
      
      const deletedEntity: DynamicEntity = {
        ...existing,
        is_deleted: true,
        updated_at: new Date()
      };
      
      return pipe(
        supabaseRepository.update(deletedEntity),
        Effect.map(() => void 0)
      );
    }),
    Effect.flatMap(() => 
      Effect.tryPromise({
        try: async () => {
          // Update Chrome storage to trigger UI refresh
          const storageTableConfig = supabaseTableConfig;
          const storageKey = storageTableConfig.getStorageKey('last_update');
          await chrome.storage.local.set({
            [storageKey]: Date.now()
          });
          return void 0;
        },
        catch: (error) => createStorageError('UNKNOWN_ERROR', `Failed to update storage after deletion: ${error}`, error instanceof Error ? error : new Error(String(error)))
      })
    )
  );

/**
 * Permanently delete entity using Supabase
 */
export const permanentDeleteEntity = (uuid: string): Effect.Effect<void, StorageError> =>
  pipe(
    supabaseRepository.delete(uuid),
    Effect.flatMap(() => 
      Effect.tryPromise({
        try: async () => {
          // Update Chrome storage to trigger UI refresh
          const storageTableConfig = supabaseTableConfig;
          const storageKey = storageTableConfig.getStorageKey('last_update');
          await chrome.storage.local.set({
            [storageKey]: Date.now()
          });
          return void 0;
        },
        catch: (error) => createStorageError('UNKNOWN_ERROR', `Failed to update storage after deletion: ${error}`, error instanceof Error ? error : new Error(String(error)))
      })
    )
  );

/**
 * Get entities with query options using Supabase
 */
export const getEntities = (options: GenericEntityQueryOptions = {}): Effect.Effect<DynamicEntity[], StorageError> =>
  pipe(
    Effect.try({
      try: () => ({
        user_id: options.user_id,
        is_deleted: false,
        ...options
      }),
      catch: (error) => createStorageError('VALIDATION_ERROR', `Invalid query options: ${error}`, error instanceof Error ? error : new Error(String(error)))
    }),
    Effect.flatMap(filterOptions => supabaseRepository.list(filterOptions))
  );

/**
 * Get entities by table name
 */
export const getEntitiesByTable = (tableName: string, options: GenericEntityQueryOptions = {}): Effect.Effect<DynamicEntity[], StorageError> =>
  pipe(
    getEntities({
      ...options,
      table_name: tableName
    })
  );

/**
 * Update entity sort order
 */
export const updateEntitySortOrder = (
  entityId: string,
  sortOrder: number,
  parentId?: string | null
): Effect.Effect<void, StorageError> => {
  return pipe(
    getEntityById(entityId),
    Effect.flatMap(entity => {
      if (!entity) {
        return Effect.fail(createStorageError('ENTITY_NOT_FOUND', `Entity with ID ${entityId} not found`));
      }
      
      const updateData = {
        data: {
          ...entity.data,
          sort_order: sortOrder,
          ...(parentId !== undefined && { parent_id: parentId })
        }
      };
      
      return updateEntity(entityId, updateData);
    }),
    Effect.map(() => void 0)
  );
};

/**
 * Get entities by tags
 */
export const getEntitiesByTags = (
  tags: string[],
  userId?: string,
  options: GenericEntityQueryOptions = {}
): Effect.Effect<DynamicEntity[], StorageError> =>
  pipe(
    getEntities({ user_id: userId, ...options }),
    Effect.map(entities => 
      entities.filter(entity => {
        const entityTags = entity.data.tags;
        return Array.isArray(entityTags) && entityTags.some((tag: string) => tags.includes(tag));
      })
    )
  );

/**
 * Get entity path (hierarchy) - simplified implementation
 */
export const getEntityPath = (entityId: string): Effect.Effect<string[], StorageError> =>
  pipe(
    getEntityById(entityId),
    Effect.map(entity => entity ? [entity.data.title || entity.id] : [])
  );

// ================================
// LEGACY PROMISE WRAPPERS
// ================================

/**
 * Convert Effect-based operations to legacy Promise-based API
 */
export const toLegacyPromise = <T>(effect: Effect.Effect<T, StorageError>): Promise<T> =>
  Effect.runPromise(effect);

/**
 * Legacy Promise-based operations for backward compatibility
 */
export const createEntityLegacy = (data: GenericEntityCreateData): Promise<DynamicEntity> =>
  toLegacyPromise(createEntity(data));

export const getEntityByIdLegacy = (uuid: string): Promise<DynamicEntity | null> =>
  toLegacyPromise(getEntityById(uuid));

export const updateEntityLegacy = (uuid: string, data: GenericEntityUpdateData): Promise<DynamicEntity> =>
  toLegacyPromise(updateEntity(uuid, data));

export const deleteEntityLegacy = (uuid: string): Promise<void> =>
  toLegacyPromise(deleteEntity(uuid));

export const getEntitiesLegacy = (options?: GenericEntityQueryOptions): Promise<DynamicEntity[]> =>
  toLegacyPromise(getEntities(options));

// ================================
// ADAPTER ACCESS
// ================================

/**
 * Get the underlying SupabaseRepository for advanced operations
 */
export const getRemoteAdapter = (): SchemaAwareSupabaseRepository<DynamicEntity> => supabaseRepository;

/**
 * Check adapter health and connectivity
 */
export const checkAdapterHealth = (): Effect.Effect<boolean, StorageError> =>
  pipe(
    supabaseRepository.getStats(),
    Effect.map(() => true),
    Effect.catchAll(() => Effect.succeed(false))
  );

