/**
 * Chrome Storage Repository - Chrome Storage API Implementation
 * 
 * Generic repository for Chrome Extension storage API with local-first data storage.
 * Designed to work in both content scripts and extension contexts (sidebar, popup, background).
 * Includes date serialization handling for JSON compatibility.
 * 
 * Storage Limits: 10 MB total, 8 KB per item (sufficient for bookmark data)
 */

import { Effect } from 'effect';
import {
  StorageAdapter,
  BatchOperation,
  StorageError,
  createStorageError,
  LocalFirstEntity,
  QueryCriteria,
} from '../../local-first/core';
import { DynamicEntityGenerator } from '../../local-first/schema';

// Simplified filter options - only what's actually used
interface FilterOptions {
  user_id?: string;
  is_deleted?: boolean;
}

// Chrome Storage Configuration
export interface ChromeStorageConfig {
  keyPrefix?: string;
  indexKey?: string;
}

const DEFAULT_CONFIG: Required<ChromeStorageConfig> = {
  keyPrefix: 'mateme_entity_',
  indexKey: 'mateme_index',
};

interface ChromeStorageIndex {
  entities: string[]; // Array of entity IDs
  user_index: Record<string, string[]>; // user_id -> entity IDs
  last_updated: string;
}

export class ChromeStorageRepository<T extends LocalFirstEntity = LocalFirstEntity> implements StorageAdapter<T> {
  private readonly config: Required<ChromeStorageConfig>;

  constructor(
    private storageArea: chrome.storage.StorageArea = chrome.storage.local,
    config: ChromeStorageConfig = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private serializeEntity(entity: T): any {
    if (entity && typeof entity === 'object' && 'entityType' in entity && 'data' in entity) {
      const storageFormat = DynamicEntityGenerator.toStorageFormat(entity as any);
      return {
        ...storageFormat,
        created_at: storageFormat.created_at.toISOString(),
        updated_at: storageFormat.updated_at.toISOString(),
      };
    }
    
    return {
      ...entity,
      created_at: entity.created_at.toISOString(),
      updated_at: entity.updated_at.toISOString(),
    };
  }

  private deserializeEntity(data: any): T {
    if (!data) return data;
    
    if (data.entity_type) {
      const dataWithDates = {
        ...data,
        created_at: new Date(data.created_at),
        updated_at: new Date(data.updated_at),
      };
      return DynamicEntityGenerator.fromStorageFormat(dataWithDates) as unknown as T;
    }
    
    return {
      ...data,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
    } as T;
  }

  private getEntityKey(id: string): string {
    return `${this.config.keyPrefix}${id}`;
  }

  private async getIndex(): Promise<ChromeStorageIndex> {
    try {
      const result = await this.storageArea.get(this.config.indexKey);
      return result[this.config.indexKey] || {
        entities: [],
        user_index: {},
        last_updated: new Date().toISOString(),
      };
    } catch (error) {
      console.warn('Failed to get storage index, creating new one:', error);
      return {
        entities: [],
        user_index: {},
        last_updated: new Date().toISOString(),
      };
    }
  }

  private async updateIndex(entity: T, operation: 'add' | 'remove'): Promise<void> {
    const index = await this.getIndex();
    
    if (operation === 'add') {
      if (!index.entities.includes(entity.id)) {
        index.entities.push(entity.id);
      }
      
      const userId = (entity as any).user_id;
      if (userId) {
        if (!index.user_index[userId]) {
          index.user_index[userId] = [];
        }
        if (!index.user_index[userId].includes(entity.id)) {
          index.user_index[userId].push(entity.id);
        }
      }
    } else {
      index.entities = index.entities.filter(id => id !== entity.id);
      Object.keys(index.user_index).forEach(userId => {
        index.user_index[userId] = index.user_index[userId].filter(id => id !== entity.id);
      });
    }
    
    index.last_updated = new Date().toISOString();
    await this.storageArea.set({ [this.config.indexKey]: index });
  }

  private async applyFilters(entityIds: string[], filter?: FilterOptions): Promise<string[]> {
    if (!filter) return entityIds;
    
    let filteredIds = entityIds;
    
    if (filter.user_id) {
      const index = await this.getIndex();
      const userEntityIds = index.user_index[filter.user_id] || [];
      filteredIds = filteredIds.filter(id => userEntityIds.includes(id));
    }
    
    if (filter.is_deleted !== undefined) {
      const entities = await this.loadEntitiesByIds(filteredIds);
      const filtered = entities.filter(entity => (entity as any).is_deleted === filter.is_deleted);
      return filtered.map(entity => entity.id);
    }
    
    return filteredIds;
  }

  private async loadEntitiesByIds(ids: string[]): Promise<T[]> {
    if (ids.length === 0) return [];
    
    const keys = ids.map(id => this.getEntityKey(id));
    const result = await this.storageArea.get(keys);
    
    return ids.map(id => {
      const data = result[this.getEntityKey(id)];
      return data ? this.deserializeEntity(data) : null;
    }).filter(Boolean) as T[];
  }

  create(entity: T): Effect.Effect<T, StorageError> {
    return Effect.tryPromise({
      try: async () => {
        const serialized = this.serializeEntity(entity);
        const key = this.getEntityKey(entity.id);
        
        await this.storageArea.set({ [key]: serialized });
        await this.updateIndex(entity, 'add');
        
        return entity;
      },
      catch: (error) => createStorageError('UNKNOWN_ERROR', `Failed to create entity: ${error}`, error instanceof Error ? error : new Error(String(error)))
    });
  }

  get(id: string): Effect.Effect<T | null, StorageError> {
    return Effect.tryPromise({
      try: async () => {
        const key = this.getEntityKey(id);
        const result = await this.storageArea.get(key);
        const data = result[key];
        
        if (!data) return null;
        
        return this.deserializeEntity(data);
      },
      catch: (error) => createStorageError('UNKNOWN_ERROR', `Failed to get entity ${id}: ${error}`, error instanceof Error ? error : new Error(String(error)))
    });
  }

  update(entity: T): Effect.Effect<T, StorageError> {
    return Effect.tryPromise({
      try: async () => {
        const serialized = this.serializeEntity(entity);
        const key = this.getEntityKey(entity.id);
        
        await this.storageArea.set({ [key]: serialized });
        await this.updateIndex(entity, 'add');
        
        return entity;
      },
      catch: (error) => createStorageError('UNKNOWN_ERROR', `Failed to update entity: ${error}`, error instanceof Error ? error : new Error(String(error)))
    });
  }

  delete(id: string): Effect.Effect<void, StorageError> {
    return Effect.tryPromise({
      try: async () => {
        const key = this.getEntityKey(id);
        const result = await this.storageArea.get(key);
        const entity = result[key];
        
        await this.storageArea.remove(key);
        
        if (entity) {
          const deserializedEntity = this.deserializeEntity(entity);
          await this.updateIndex(deserializedEntity, 'remove');
        }
      },
      catch: (error) => createStorageError('UNKNOWN_ERROR', `Failed to delete entity: ${error}`, error instanceof Error ? error : new Error(String(error)))
    });
  }

  list(filter?: FilterOptions): Effect.Effect<T[], StorageError> {
    return Effect.tryPromise({
      try: async () => {
        const index = await this.getIndex();
        const filteredIds = await this.applyFilters(index.entities, filter);
        return await this.loadEntitiesByIds(filteredIds);
      },
      catch: (error) => createStorageError('UNKNOWN_ERROR', `Failed to list entities: ${error}`, error instanceof Error ? error : new Error(String(error)))
    });
  }

  query(criteria: QueryCriteria): Effect.Effect<T[], StorageError> {
    const filter: FilterOptions = {
      user_id: criteria.user_id,
      is_deleted: criteria.is_deleted,
    };
    
    return Effect.flatMap(
      this.list(filter),
      (entities) => Effect.succeed(
        this.transformEntities(entities, criteria)
      )
    );
  }

  /**
   * Elegant functional pipeline for entity transformation
   */
  private transformEntities(entities: T[], criteria: QueryCriteria): T[] {
    return entities
      .filter(entity => this.matchesAdvancedFilters(entity, criteria))
      .slice(criteria.offset || 0, this.calculateEndIndex(criteria));
  }

  /**
   * Pure function to check if entity matches advanced filters
   */
  private matchesAdvancedFilters(entity: T, criteria: QueryCriteria): boolean {
    const filters = (criteria as any).filters;
    if (!filters) return true;
    
    return Object.entries(filters).every(([key, expectedValue]) => 
      this.getEntityFieldValue(entity, key) === expectedValue
    );
  }

  /**
   * Pure function to extract field value from entity
   */
  private getEntityFieldValue(entity: T, fieldPath: string): any {
    if (fieldPath.startsWith('data.')) {
      const fieldName = fieldPath.substring(5);
      const entityData = (entity as any).data || {};
      return entityData[fieldName];
    }
    return (entity as any)[fieldPath];
  }

  /**
   * Pure function to calculate pagination end index
   */
  private calculateEndIndex(criteria: QueryCriteria): number | undefined {
    const { offset = 0, limit } = criteria;
    return limit ? offset + limit : undefined;
  }

  batchUpdate(operations: BatchOperation<T>[]): Effect.Effect<void, StorageError> {
    return Effect.tryPromise({
      try: async () => {
        const updates: Record<string, any> = {};
        const removals: string[] = [];
        
        for (const op of operations) {
          if (op.type === 'create' || op.type === 'update') {
            const serialized = this.serializeEntity(op.entity);
            updates[this.getEntityKey(op.entity.id)] = serialized;
            await this.updateIndex(op.entity, 'add');
          } else if (op.type === 'delete') {
            removals.push(this.getEntityKey(op.entity.id));
            await this.updateIndex(op.entity, 'remove');
          }
        }
        
        if (Object.keys(updates).length > 0) {
          await this.storageArea.set(updates);
        }
        if (removals.length > 0) {
          await this.storageArea.remove(removals);
        }
      },
      catch: (error) => createStorageError('UNKNOWN_ERROR', `Failed to batch update: ${error}`, error instanceof Error ? error : new Error(String(error)))
    });
  }


  // Interface requirement - returns empty array as Chrome storage doesn't track changes
  getChangesSince(_since: Date): Effect.Effect<any[], StorageError> {
    return Effect.succeed([]);
  }

  getChangedEntities(since?: Date): Effect.Effect<T[], StorageError> {
    return Effect.tryPromise({
      try: async () => {
        const allEntities = await Effect.runPromise(this.list());
        if (!since) return allEntities;
        return allEntities.filter(entity => entity.updated_at > since);
      },
      catch: (error) => createStorageError('UNKNOWN_ERROR', `Failed to get changed entities: ${error}`, error instanceof Error ? error : new Error(String(error)))
    });
  }

  count(filter?: FilterOptions): Effect.Effect<number, StorageError> {
    return Effect.tryPromise({
      try: async () => {
        const entities = await Effect.runPromise(this.list(filter));
        return entities.length;
      },
      catch: (error) => createStorageError('UNKNOWN_ERROR', `Failed to count entities: ${error}`, error instanceof Error ? error : new Error(String(error)))
    });
  }

  vacuum(): Effect.Effect<void, StorageError> {
    return Effect.succeed(void 0);
  }

  getStats(): Effect.Effect<any, StorageError> {
    return Effect.tryPromise({
      try: async () => {
        const index = await this.getIndex();
        return {
          total_entities: index.entities.length,
          entities_by_type: {},
          storage_size_bytes: 0,
          last_cleanup: null,
          fragmentation_ratio: 0,
        };
      },
      catch: (error) => createStorageError('UNKNOWN_ERROR', `Failed to get storage stats: ${error}`, error instanceof Error ? error : new Error(String(error)))
    });
  }
}

// Factory function for creating typed repository instances
export const createChromeStorageRepository = <T extends LocalFirstEntity = LocalFirstEntity>(
  storageArea?: chrome.storage.StorageArea,
  config?: ChromeStorageConfig
): ChromeStorageRepository<T> => {
  return new ChromeStorageRepository<T>(storageArea, config);
};