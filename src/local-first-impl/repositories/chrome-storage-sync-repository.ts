/**
 * Local-First Repository
 * 
 * Extends ChromeStorageRepository with sync-aware capabilities for local-first architecture.
 * Maintains all the Chrome Storage API benefits while adding sync metadata and change tracking.
 * 
 * Key Features:
 * - Inherits cross-context compatibility from ChromeStorageRepository
 * - Adds sync versioning and change tracking
 * - Maintains last sync timestamps for incremental sync
 * - Enhanced metadata for conflict resolution
 * - Future-ready for bidirectional sync capabilities
 */

import { Effect, pipe } from 'effect';
import {
  StorageAdapter,
  FilterOptions,
  QueryCriteria,
  BatchOperation,
  StorageStats,
  StorageError,
  createStorageError,
  LocalFirstEntity,
} from '../../local-first/core';
import { ChromeStorageRepository } from './chrome-storage-repository';

// Local-First specific metadata keys
const LOCAL_FIRST_METADATA_KEY = 'mateme_localfirst_metadata';
const SYNC_STATE_KEY = 'mateme_sync_state';

interface LocalFirstMetadata {
  last_sync_timestamp?: string;
  highest_sync_version: number;
  sync_enabled: boolean;
  conflict_resolution_strategy: 'last_write_wins' | 'manual' | 'custom';
}

interface SyncState {
  pending_changes: string[]; // Entity IDs with pending changes
  last_successful_sync?: string;
  sync_in_progress: boolean;
}

export class ChromeStorageSyncRepository<T extends LocalFirstEntity = LocalFirstEntity> implements StorageAdapter<T> {
  private baseRepository: ChromeStorageRepository<T>;

  constructor(storageArea: chrome.storage.StorageArea = chrome.storage.local) {
    this.baseRepository = new ChromeStorageRepository<T>(storageArea);
  }

  // Helper: Get or create local-first metadata
  private async getLocalFirstMetadata(): Promise<LocalFirstMetadata> {
    try {
      const result = await (this.baseRepository as any).storageArea.get(LOCAL_FIRST_METADATA_KEY);
      return result[LOCAL_FIRST_METADATA_KEY] || {
        highest_sync_version: 0,
        sync_enabled: true,
        conflict_resolution_strategy: 'last_write_wins',
      };
    } catch (error) {
      console.warn('Failed to get local-first metadata, creating default:', error);
      return {
        highest_sync_version: 0,
        sync_enabled: true,
        conflict_resolution_strategy: 'last_write_wins',
      };
    }
  }

  // Helper: Update local-first metadata
  private async updateLocalFirstMetadata(metadata: Partial<LocalFirstMetadata>): Promise<void> {
    const current = await this.getLocalFirstMetadata();
    const updated = { ...current, ...metadata };
    await (this.baseRepository as any).storageArea.set({ [LOCAL_FIRST_METADATA_KEY]: updated });
  }

  // Helper: Get or create sync state
  private async getSyncState(): Promise<SyncState> {
    try {
      const result = await (this.baseRepository as any).storageArea.get(SYNC_STATE_KEY);
      return result[SYNC_STATE_KEY] || {
        pending_changes: [],
        sync_in_progress: false,
      };
    } catch (error) {
      console.warn('Failed to get sync state, creating default:', error);
      return {
        pending_changes: [],
        sync_in_progress: false,
      };
    }
  }

  // Helper: Update sync state
  private async updateSyncState(syncState: Partial<SyncState>): Promise<void> {
    const current = await this.getSyncState();
    const updated = { ...current, ...syncState };
    await (this.baseRepository as any).storageArea.set({ [SYNC_STATE_KEY]: updated });
  }

  // Helper: Track entity changes for sync
  private async trackEntityChange(entityId: string): Promise<void> {
    const syncState = await this.getSyncState();
    
    if (!syncState.pending_changes.includes(entityId)) {
      syncState.pending_changes.push(entityId);
      await this.updateSyncState(syncState);
    }
  }

  // Helper: Enhance entity with sync metadata
  private enhanceWithSyncMetadata(entity: T): T {
    return {
      ...entity,
      // Increment sync version for tracking changes
      sync_version: (entity.sync_version || 0) + 1,
      updated_at: new Date(), // Always update timestamp for sync tracking
    };
  }

  create(entity: T): Effect.Effect<T, StorageError> {
    return pipe(
      Effect.sync(() => this.enhanceWithSyncMetadata(entity)),
      Effect.flatMap(enhancedEntity => 
        pipe(
          this.baseRepository.create(enhancedEntity),
          Effect.flatMap(createdEntity =>
            Effect.tryPromise({
              try: async () => {
                // Track change for sync
                await this.trackEntityChange(createdEntity.id);
                
                // Update highest sync version
                const metadata = await this.getLocalFirstMetadata();
                if (createdEntity.sync_version && createdEntity.sync_version > metadata.highest_sync_version) {
                  await this.updateLocalFirstMetadata({ 
                    highest_sync_version: createdEntity.sync_version 
                  });
                }
                
                return createdEntity;
              },
              catch: (error) => createStorageError('UNKNOWN_ERROR', 
                `Failed to update sync metadata: ${error}`, error instanceof Error ? error : new Error(String(error)))
            })
          )
        )
      )
    );
  }

  get(id: string): Effect.Effect<T | null, StorageError> {
    return this.baseRepository.get(id);
  }

  update(entity: T): Effect.Effect<T, StorageError> {
    return pipe(
      Effect.sync(() => this.enhanceWithSyncMetadata(entity)),
      Effect.flatMap(enhancedEntity => 
        pipe(
          this.baseRepository.update(enhancedEntity),
          Effect.flatMap(updatedEntity =>
            Effect.tryPromise({
              try: async () => {
                // Track change for sync
                await this.trackEntityChange(updatedEntity.id);
                
                // Update highest sync version
                const metadata = await this.getLocalFirstMetadata();
                if (updatedEntity.sync_version && updatedEntity.sync_version > metadata.highest_sync_version) {
                  await this.updateLocalFirstMetadata({ 
                    highest_sync_version: updatedEntity.sync_version 
                  });
                }
                
                return updatedEntity;
              },
              catch: (error) => createStorageError('UNKNOWN_ERROR', 
                `Failed to update sync metadata: ${error}`, error instanceof Error ? error : new Error(String(error)))
            })
          )
        )
      )
    );
  }

  delete(id: string): Effect.Effect<void, StorageError> {
    return pipe(
      this.baseRepository.delete(id),
      Effect.flatMap(() =>
        Effect.tryPromise({
          try: async () => {
            // Remove from pending changes (entity is deleted)
            const syncState = await this.getSyncState();
            syncState.pending_changes = syncState.pending_changes.filter(changeId => changeId !== id);
            await this.updateSyncState(syncState);
            
            return void 0;
          },
          catch: (error) => createStorageError('UNKNOWN_ERROR', 
            `Failed to update sync state after delete: ${error}`, error instanceof Error ? error : new Error(String(error)))
        })
      )
    );
  }

  list(filter?: FilterOptions): Effect.Effect<T[], StorageError> {
    return this.baseRepository.list(filter);
  }

  query(criteria: QueryCriteria): Effect.Effect<T[], StorageError> {
    return this.baseRepository.query(criteria);
  }

  getChangesSince(since: Date): Effect.Effect<any[], StorageError> {
    return this.baseRepository.getChangesSince(since);
  }

  count(filter?: FilterOptions): Effect.Effect<number, StorageError> {
    return this.baseRepository.count(filter);
  }

  batchUpdate(operations: BatchOperation<T>[]): Effect.Effect<void, StorageError> {
    return pipe(
      // Enhance all entities with sync metadata
      Effect.sync(() => 
        operations.map(op => ({
          ...op,
          entity: op.type === 'delete' ? op.entity : this.enhanceWithSyncMetadata(op.entity)
        }))
      ),
      Effect.flatMap(enhancedOps => 
        pipe(
          this.baseRepository.batchUpdate(enhancedOps),
          Effect.flatMap(() =>
            Effect.tryPromise({
              try: async () => {
                // Track all changes for sync
                const entityIds = enhancedOps
                  .filter(op => op.type !== 'delete')
                  .map(op => op.entity.id);
                
                const syncState = await this.getSyncState();
                entityIds.forEach(id => {
                  if (!syncState.pending_changes.includes(id)) {
                    syncState.pending_changes.push(id);
                  }
                });
                
                // Remove deleted entities from pending changes
                const deletedIds = enhancedOps
                  .filter(op => op.type === 'delete')
                  .map(op => op.entity.id);
                
                syncState.pending_changes = syncState.pending_changes.filter(
                  id => !deletedIds.includes(id)
                );
                
                await this.updateSyncState(syncState);
                
                // Update highest sync version
                const highestVersion = Math.max(
                  ...enhancedOps
                    .filter(op => op.type !== 'delete')
                    .map(op => op.entity.sync_version || 0)
                );
                
                if (highestVersion > 0) {
                  const metadata = await this.getLocalFirstMetadata();
                  if (highestVersion > metadata.highest_sync_version) {
                    await this.updateLocalFirstMetadata({ 
                      highest_sync_version: highestVersion 
                    });
                  }
                }
                
                return void 0;
              },
              catch: (error) => createStorageError('UNKNOWN_ERROR', 
                `Failed to update sync metadata after batch: ${error}`, error instanceof Error ? error : new Error(String(error)))
            })
          )
        )
      )
    );
  }

  getChangedEntities(since?: Date): Effect.Effect<T[], StorageError> {
    return Effect.tryPromise({
      try: async () => {
        // Get entities with pending changes first (most accurate)
        const syncState = await this.getSyncState();
        
        if (syncState.pending_changes.length > 0) {
          // Load pending entities
          const pendingEntities = await Promise.all(
            syncState.pending_changes.map(id => 
              Effect.runPromise(this.baseRepository.get(id))
            )
          );
          
          const validEntities = pendingEntities.filter(Boolean) as T[];
          
          // If since date provided, also filter by date
          if (since) {
            return validEntities.filter(entity => entity.updated_at > since);
          }
          
          return validEntities;
        }
        
        // Fallback: use base implementation
        return await Effect.runPromise(this.baseRepository.getChangedEntities(since));
      },
      catch: (error) => createStorageError('UNKNOWN_ERROR', 
        `Failed to get changed entities: ${error}`, error instanceof Error ? error : new Error(String(error)))
    });
  }

  getHighestSyncVersion(): Effect.Effect<number, StorageError> {
    return Effect.tryPromise({
      try: async () => {
        const metadata = await this.getLocalFirstMetadata();
        return metadata.highest_sync_version;
      },
      catch: (error) => createStorageError('UNKNOWN_ERROR', 
        `Failed to get highest sync version: ${error}`, error instanceof Error ? error : new Error(String(error)))
    });
  }

  getStats(): Effect.Effect<StorageStats, StorageError> {
    return pipe(
      this.baseRepository.getStats(),
      Effect.flatMap(baseStats =>
        Effect.tryPromise({
          try: async () => {
            const metadata = await this.getLocalFirstMetadata();
            const syncState = await this.getSyncState();
            
            return {
              ...baseStats,
              // Add local-first specific stats
              sync_enabled: metadata.sync_enabled,
              highest_sync_version: metadata.highest_sync_version,
              pending_changes_count: syncState.pending_changes.length,
              last_sync_timestamp: metadata.last_sync_timestamp,
            };
          },
          catch: (error) => createStorageError('UNKNOWN_ERROR', 
            `Failed to get local-first stats: ${error}`, error instanceof Error ? error : new Error(String(error)))
        })
      )
    );
  }

  vacuum(): Effect.Effect<void, StorageError> {
    return pipe(
      this.baseRepository.vacuum(),
      Effect.flatMap(() =>
        Effect.tryPromise({
          try: async () => {
            // Clean up sync state (remove invalid pending changes)
            const syncState = await this.getSyncState();
            const validEntityIds: string[] = [];
            
            // Check which pending changes still exist
            for (const id of syncState.pending_changes) {
              const entity = await Effect.runPromise(this.get(id));
              if (entity) {
                validEntityIds.push(id);
              }
            }
            
            if (validEntityIds.length !== syncState.pending_changes.length) {
              await this.updateSyncState({
                pending_changes: validEntityIds
              });
              console.log(`🔧 ChromeStorageSyncRepository.vacuum: Cleaned up ${syncState.pending_changes.length - validEntityIds.length} invalid pending changes`);
            }
            
            return void 0;
          },
          catch: (error) => createStorageError('UNKNOWN_ERROR', 
            `Failed to vacuum local-first storage: ${error}`, error instanceof Error ? error : new Error(String(error)))
        })
      )
    );
  }

  // Local-First specific methods

  /**
   * Mark sync as completed for specific entities
   */
  markSyncCompleted(entityIds: string[]): Effect.Effect<void, StorageError> {
    return Effect.tryPromise({
      try: async () => {
        const syncState = await this.getSyncState();
        
        // Remove synced entities from pending changes
        syncState.pending_changes = syncState.pending_changes.filter(
          id => !entityIds.includes(id)
        );
        
        // Update last successful sync timestamp
        syncState.last_successful_sync = new Date().toISOString();
        
        await this.updateSyncState(syncState);
        
        // Update metadata
        await this.updateLocalFirstMetadata({
          last_sync_timestamp: new Date().toISOString()
        });
        
        return void 0;
      },
      catch: (error) => createStorageError('UNKNOWN_ERROR', 
        `Failed to mark sync completed: ${error}`, error instanceof Error ? error : new Error(String(error)))
    });
  }

  /**
   * Get entities that need to be synced
   */
  getPendingChanges(): Effect.Effect<T[], StorageError> {
    return this.getChangedEntities();
  }

  /**
   * Check if sync is enabled
   */
  isSyncEnabled(): Effect.Effect<boolean, StorageError> {
    return Effect.tryPromise({
      try: async () => {
        const metadata = await this.getLocalFirstMetadata();
        return metadata.sync_enabled;
      },
      catch: (error) => createStorageError('UNKNOWN_ERROR', 
        `Failed to check sync enabled: ${error}`, error instanceof Error ? error : new Error(String(error)))
    });
  }

  /**
   * Enable or disable sync
   */
  setSyncEnabled(enabled: boolean): Effect.Effect<void, StorageError> {
    return Effect.tryPromise({
      try: async () => {
        await this.updateLocalFirstMetadata({ sync_enabled: enabled });
        return void 0;
      },
      catch: (error) => createStorageError('UNKNOWN_ERROR', 
        `Failed to set sync enabled: ${error}`, error instanceof Error ? error : new Error(String(error)))
    });
  }
}

// Factory function for creating typed repository instances
export const createChromeStorageSyncRepository = <T extends LocalFirstEntity = LocalFirstEntity>(
  storageArea?: chrome.storage.StorageArea
): ChromeStorageSyncRepository<T> => {
  return new ChromeStorageSyncRepository<T>(storageArea);
};

// Legacy alias for backward compatibility
export const createLocalFirstRepository = createChromeStorageSyncRepository;