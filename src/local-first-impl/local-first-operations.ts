/**
 * Local-First Operations - Simplified
 * 
 * Generic operations for local-first storage using dynamic entities.
 */

import { Effect } from 'effect';
import { createLocalFirstRepository } from './repositories';
import { 
  DynamicEntityGenerator, 
  DynamicEntity,
  GenericEntityCreateData,
  GenericEntityUpdateData,
  GenericEntityQueryOptions
} from '../local-first/schema';

// Create repository instance
const repository = createLocalFirstRepository<DynamicEntity>();

// ================================
// CORE OPERATIONS
// ================================

export const createEntity = async (tableName: string, data: GenericEntityCreateData): Promise<DynamicEntity> => {
  try {
    const entity = DynamicEntityGenerator.createEntity(tableName, data.data, data.user_id, data.uuid);
    return await Effect.runPromise(repository.create(entity));
  } catch (error) {
    throw new Error(`Create failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const getEntityById = async (id: string): Promise<DynamicEntity | null> => {
  try {
    return await Effect.runPromise(repository.get(id));
  } catch (error) {
    throw new Error(`Get failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const updateEntity = async (id: string, data: GenericEntityUpdateData): Promise<DynamicEntity> => {
  try {
    const entity = await Effect.runPromise(repository.get(id));
    if (!entity) throw new Error(`Entity ${id} not found`);
    
    const updated: DynamicEntity = {
      ...entity,
      data: { ...entity.data, ...data.data },
      updated_at: new Date(),
    };
    
    return await Effect.runPromise(repository.update(updated));
  } catch (error) {
    throw new Error(`Update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const deleteEntity = async (id: string): Promise<void> => {
  try {
    const entity = await Effect.runPromise(repository.get(id));
    if (!entity) return;
    
    const updated: DynamicEntity = {
      ...entity,
      is_deleted: true,
      updated_at: new Date(),
    };
    
    await Effect.runPromise(repository.update(updated));
  } catch (error) {
    throw new Error(`Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const permanentDeleteEntity = async (id: string): Promise<void> => {
  try {
    await Effect.runPromise(repository.delete(id));
  } catch (error) {
    throw new Error(`Permanent delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const getEntities = async (options?: GenericEntityQueryOptions): Promise<DynamicEntity[]> => {
  try {
    const criteria = {
      is_deleted: false,
      ...options
    };
    
    return await Effect.runPromise(repository.query(criteria));
  } catch (error) {
    throw new Error(`Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

