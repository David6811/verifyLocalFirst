/**
 * Schema-Aware Supabase Repository
 * 
 * Refactored Supabase repository using the new schema management system.
 * Supports dynamic table operations based on schema configuration.
 * Integrates with both StorageAdapter and IStorageProvider interfaces.
 */

import { Effect } from 'effect';
import { StorageAdapter, StorageStats } from '../../local-first/core/interfaces';
import { StorageError, createStorageError } from '../../local-first/core/errors';
import { FilterOptions, BatchOperation, LocalFirstEntity, QueryCriteria } from '../../local-first/core/types';
import { IStorageProvider, QueryFilter } from '../../local-first/core/interfaces';
import { DynamicEntity, SimpleEntityGenerator } from '../../local-first/schema/dynamic-entity';
import { TableConfigManager } from '../../local-first/schema';
import { DEFAULT_SUPABASE_CONFIG } from '../../externals/config/table-config';
import { supabase } from '../supabase';

// Simple status constants for Supabase bookmarks table
const STATUS_ACTIVE = 1;
const STATUS_DELETED = 3;

// =============================================================================
// Configuration and Types
// =============================================================================

// Schema-Aware Supabase Repository Configuration
export interface SchemaAwareSupabaseConfig {
  /** Default table name for legacy operations */
  defaultTableName?: string;
  /** Auto-detect table from entity type */
  autoDetectTable?: boolean;
  /** Maximum retries for failed operations */
  maxRetries?: number;
}

// =============================================================================
// Schema-Aware Supabase Repository
// =============================================================================

/**
 * Schema-aware Supabase repository that supports legacy StorageAdapter operations
 */
export class SchemaAwareSupabaseRepository<T extends LocalFirstEntity = LocalFirstEntity> 
  implements StorageAdapter<T> {
  
  private readonly config: Required<SchemaAwareSupabaseConfig>;
  private authInitialized = false;
  private readonly retryDelays = [1000, 2000, 4000];

  constructor(
    private schemaManager?: TableConfigManager,
    config: SchemaAwareSupabaseConfig = {}
  ) {
    this.config = { ...DEFAULT_SUPABASE_CONFIG, ...config };
  }

  // =============================================================================
  // Authentication and Utilities
  // =============================================================================

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (lastError.message.includes('not authenticated')) {
          throw lastError;
        }
        
        if (attempt < this.config.maxRetries - 1) {
          await this.sleep(this.retryDelays[attempt]);
        }
      }
    }
    
    throw lastError!;
  }

  private async initializeAuth(): Promise<void> {
    if (this.authInitialized) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        this.authInitialized = true;
        return;
      }
      
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['currentSession']);
        const savedSession = result.currentSession;
        
        if (savedSession?.access_token) {
          const { data, error } = await supabase.auth.setSession({
            access_token: savedSession.access_token,
            refresh_token: savedSession.refresh_token
          });
          
          if (!error && data.session) {
            this.authInitialized = true;
            return;
          }
        }
      }
    } catch (error) {
      console.error('[SchemaAwareSupabaseRepository] Auth initialization error:', error);
    }
    
    throw new Error('User not authenticated');
  }

  private mapError(error: unknown, operation: string): StorageError {
    if (error instanceof Error) {
      return createStorageError(
        'UNKNOWN_ERROR',
        `${operation} failed: ${error.message}`,
        error
      );
    }
    
    return createStorageError(
      'UNKNOWN_ERROR', 
      `${operation} failed: ${String(error)}`,
      error instanceof Error ? error : new Error(String(error))
    );
  }

  /**
   * Determine table name from entity or use default
   */
  private getTableName(entity?: T | DynamicEntity): string {
    if (!entity) return this.config.defaultTableName;
    
    // For DynamicEntity, use entityType
    if ('entityType' in entity && typeof entity.entityType === 'string') {
      return entity.entityType;
    }
    
    // For typed entities, try to extract type property
    if ('type' in entity && typeof entity.type === 'string') {
      return entity.type + 's';
    }
    
    return this.config.defaultTableName;
  }

  // =============================================================================
  // Data Transformation Methods
  // =============================================================================

  /**
   * Convert database row to domain entity (legacy support)
   */
  private dbFormatToDomainEntity(dbRow: any, _tableName?: string): T {
    if (!dbRow) return dbRow;
    
    const { id, uuid, created_at, updated_at, status, user_id, ...dataFields } = dbRow;
    
    // Check if we're working with DynamicEntity structure (by checking if we have a schema manager)
    if (this.schemaManager) {
      // Convert database row to DynamicEntity format
      const dynamicEntity = {
        id: uuid || String(id),
        entityType: this.schemaManager.getTableName(),
        data: dataFields, // All non-system fields go into data
        created_at: new Date(created_at),
        updated_at: new Date(updated_at),
        is_deleted: status === STATUS_DELETED, // Convert status number to boolean
        sync_version: 1,
        user_id: user_id || null,
      };
      
      return dynamicEntity as unknown as T;
    } else {
      // Legacy format
      return {
        ...dbRow,
        id: uuid || String(id),
        created_at: new Date(created_at),
        updated_at: new Date(updated_at),
      } as T;
    }
  }

  /**
   * Convert domain entity to database format (legacy support)
   */
  private domainEntityToDbFormat(entity: T): any {
    const { id, ...entityWithoutId } = entity as any;
    
    const toISOString = (date: any): string => {
      if (!date) return new Date().toISOString();
      if (date instanceof Date) return date.toISOString();
      if (typeof date === 'string') return new Date(date).toISOString();
      return new Date().toISOString();
    };
    
    // Check if this is a DynamicEntity that needs data field expansion
    const isDynamicEntity = entityWithoutId.data && entityWithoutId.entityType;
    
    if (isDynamicEntity) {
      // For DynamicEntity, expand the data field and handle special field mappings
      const { data, entityType, is_deleted, sync_version, ...otherFields } = entityWithoutId;
      
      // Convert is_deleted boolean to status number if needed
      const statusValue = is_deleted ? STATUS_DELETED : STATUS_ACTIVE;
      
      return {
        ...data, // Expand data fields (title, link, summary, etc.)
        ...otherFields,
        uuid: entity.id || crypto.randomUUID(),
        created_at: toISOString(entity.created_at),
        updated_at: toISOString(entity.updated_at),
        status: statusValue, // Convert boolean to status number
      };
    } else {
      // Legacy entity format
      return {
        ...entityWithoutId,
        uuid: entity.id || crypto.randomUUID(),
        created_at: toISOString(entity.created_at),
        updated_at: toISOString(entity.updated_at),
      };
    }
  }

  /**
   * Convert DynamicEntity to database format using schema
   */
  private async dynamicEntityToDbFormat(entity: DynamicEntity): Promise<any> {
    // Use the SimpleEntityGenerator to convert to storage format
    return SimpleEntityGenerator.toStorageFormat(entity);
  }

  /**
   * Convert database row to DynamicEntity using schema
   */
  private async dbFormatToDynamicEntity(dbRow: any, _tableName: string): Promise<DynamicEntity> {
    // Use the SimpleEntityGenerator to convert from storage format
    return SimpleEntityGenerator.fromStorageFormat(dbRow);
  }

  // =============================================================================
  // Query Building for Dynamic Operations
  // =============================================================================

  /**
   * Build dynamic query filters for Supabase
   */
  private buildSupabaseQuery(
    tableName: string, 
    filters?: QueryFilter[], 
    options?: {
      limit?: number;
      offset?: number;
      sort?: { field: string; direction: 'asc' | 'desc' };
    }
  ) {
    let query = supabase.from(tableName).select('*');

    // Apply filters
    if (filters) {
      for (const filter of filters) {
        switch (filter.operator) {
          case '=':
            query = query.eq(filter.field, filter.value);
            break;
          case '!=':
            query = query.neq(filter.field, filter.value);
            break;
          case '>':
            query = query.gt(filter.field, filter.value);
            break;
          case '<':
            query = query.lt(filter.field, filter.value);
            break;
          case '>=':
            query = query.gte(filter.field, filter.value);
            break;
          case '<=':
            query = query.lte(filter.field, filter.value);
            break;
          case 'in':
            query = query.in(filter.field, Array.isArray(filter.value) ? filter.value : [filter.value]);
            break;
          case 'like':
            query = query.ilike(filter.field, filter.value);
            break;
        }
      }
    }

    // Apply sorting
    if (options?.sort) {
      query = query.order(options.sort.field, { ascending: options.sort.direction === 'asc' });
    }

    // Apply pagination
    if (options?.limit) {
      query = query.limit(options.limit);
      if (options.offset) {
        query = query.range(options.offset, options.offset + options.limit - 1);
      }
    }

    return query;
  }

  // =============================================================================
  // StorageAdapter Interface Implementation (Legacy Support)
  // =============================================================================

  create(entity: T): Effect.Effect<T, StorageError> {
    return Effect.tryPromise({
      try: async () => {
        return await this.withRetry(async () => {
          await this.initializeAuth();
          
          const tableName = this.getTableName(entity);
          const dbEntity = this.domainEntityToDbFormat(entity);
          
          const { data, error } = await supabase
            .from(tableName)
            .insert(dbEntity)
            .select()
            .single();
          
          if (error) {
            throw new Error(error.message);
          }
          
          return this.dbFormatToDomainEntity(data, tableName);
        });
      },
      catch: (error) => this.mapError(error, 'create')
    });
  }

  get(id: string): Effect.Effect<T | null, StorageError> {
    return Effect.tryPromise({
      try: async () => {
        return await this.withRetry(async () => {
          await this.initializeAuth();
          
          const { data, error } = await supabase
            .from(this.config.defaultTableName)
            .select('*')
            .eq('uuid', id)
            .single();
          
          if (error) {
            if (error.code === 'PGRST116') {
              return null;
            }
            throw new Error(error.message);
          }
          
          return this.dbFormatToDomainEntity(data);
        });
      },
      catch: (error) => this.mapError(error, 'get')
    });
  }

  update(entity: T): Effect.Effect<T, StorageError> {
    return Effect.tryPromise({
      try: async () => {
        return await this.withRetry(async () => {
          await this.initializeAuth();
          
          const tableName = this.getTableName(entity);
          const dbEntity = this.domainEntityToDbFormat(entity);
          
          const { data, error } = await supabase
            .from(tableName)
            .update(dbEntity)
            .eq('uuid', entity.id)
            .select()
            .single();
          
          if (error) {
            throw new Error(error.message);
          }
          
          return this.dbFormatToDomainEntity(data, tableName);
        });
      },
      catch: (error) => this.mapError(error, 'update')
    });
  }

  delete(id: string): Effect.Effect<void, StorageError> {
    return Effect.tryPromise({
      try: async () => {
        return await this.withRetry(async () => {
          await this.initializeAuth();
          
          const { error } = await supabase
            .from(this.config.defaultTableName)
            .delete()
            .eq('uuid', id);
          
          if (error) {
            throw new Error(error.message);
          }
          
          return void 0;
        });
      },
      catch: (error) => this.mapError(error, 'delete')
    });
  }

  list(filter?: FilterOptions): Effect.Effect<T[], StorageError> {
    return Effect.tryPromise({
      try: async () => {
        return await this.withRetry(async () => {
          await this.initializeAuth();
          
          let query = supabase.from(this.config.defaultTableName).select('*');
          
          // Apply filters with schema mapping if available
          if (filter?.user_id) {
            const userIdField = this.schemaManager?.getField('userId') || 'user_id';
            query = query.eq(userIdField, filter.user_id);
          }
          
          if (filter?.is_deleted !== undefined) {
            const isDeletedField = this.schemaManager?.getField('isDeleted') || 'is_deleted';
            // Handle status field conversion: STATUS_DELETED means deleted, others mean not deleted
            if (isDeletedField === 'status') {
              if (filter.is_deleted) {
                query = query.eq('status', STATUS_DELETED);
              } else {
                query = query.neq('status', STATUS_DELETED);
              }
            } else {
              // Standard is_deleted boolean field
              query = query.eq(isDeletedField, filter.is_deleted);
            }
          }
          
          if (filter?.created_after) {
            const createdAtField = this.schemaManager?.getField('createdAt') || 'created_at';
            query = query.gte(createdAtField, filter.created_after.toISOString());
          }
          
          if (filter?.updated_after) {
            const updatedAtField = this.schemaManager?.getField('updatedAt') || 'updated_at';
            query = query.gte(updatedAtField, filter.updated_after.toISOString());
          }
          
          const { data, error } = await query;
          
          if (error) {
            throw new Error(error.message);
          }
          
          return (data || []).map(item => this.dbFormatToDomainEntity(item));
        });
      },
      catch: (error) => this.mapError(error, 'list')
    });
  }

  query(criteria: QueryCriteria): Effect.Effect<T[], StorageError> {
    return Effect.tryPromise({
      try: async () => {
        return await this.withRetry(async () => {
          await this.initializeAuth();
          
          let query = supabase.from(this.config.defaultTableName).select('*');
          
          // Apply filters from QueryCriteria
          if (criteria.user_id) {
            query = query.eq('user_id', criteria.user_id);
          }
          
          if (criteria.is_deleted !== undefined) {
            query = query.eq('is_deleted', criteria.is_deleted);
          }
          
          if (criteria.created_after) {
            query = query.gte('created_at', criteria.created_after.toISOString());
          }
          
          if (criteria.updated_after) {
            query = query.gte('updated_at', criteria.updated_after.toISOString());
          }
          
          if (criteria.limit) {
            query = query.limit(criteria.limit);
          }
          
          if (criteria.offset) {
            query = query.range(criteria.offset, (criteria.offset + (criteria.limit || 1000)) - 1);
          }
          
          const { data, error } = await query;
          
          if (error) {
            throw new Error(error.message);
          }
          
          return (data || []).map(item => this.dbFormatToDomainEntity(item));
        });
      },
      catch: (error) => this.mapError(error, 'query')
    });
  }

  batchUpdate(operations: BatchOperation<T>[]): Effect.Effect<void, StorageError> {
    return Effect.tryPromise({
      try: async () => {
        return await this.withRetry(async () => {
          await this.initializeAuth();
          
          // Group operations by table and type
          const operationsByTable = new Map<string, {
            creates: any[];
            updates: { entity: T; dbFormat: any }[];
            deletes: string[];
          }>();
          
          for (const op of operations) {
            const tableName = this.getTableName(op.entity);
            
            if (!operationsByTable.has(tableName)) {
              operationsByTable.set(tableName, { creates: [], updates: [], deletes: [] });
            }
            
            const tableOps = operationsByTable.get(tableName)!;
            
            switch (op.type) {
              case 'create':
                tableOps.creates.push(this.domainEntityToDbFormat(op.entity));
                break;
              case 'update':
                tableOps.updates.push({ entity: op.entity, dbFormat: this.domainEntityToDbFormat(op.entity) });
                break;
              case 'delete':
                tableOps.deletes.push(op.entity.id);
                break;
            }
          }
          
          // Execute operations for each table
          for (const [tableName, ops] of operationsByTable) {
            // Execute creates
            if (ops.creates.length > 0) {
              const { error } = await supabase.from(tableName).insert(ops.creates);
              if (error) throw new Error(error.message);
            }
            
            // Execute updates
            for (const { entity, dbFormat } of ops.updates) {
              const { error } = await supabase
                .from(tableName)
                .update(dbFormat)
                .eq('uuid', entity.id);
              if (error) throw new Error(error.message);
            }
            
            // Execute deletes
            if (ops.deletes.length > 0) {
              const { error } = await supabase
                .from(tableName)
                .delete()
                .in('uuid', ops.deletes);
              if (error) throw new Error(error.message);
            }
          }
          
          return void 0;
        });
      },
      catch: (error) => this.mapError(error, 'batchUpdate')
    });
  }

  getChangesSince(since: Date): Effect.Effect<any[], StorageError> {
    return Effect.tryPromise({
      try: async () => {
        return await this.withRetry(async () => {
          await this.initializeAuth();
          
          const { data, error } = await supabase
            .from(this.config.defaultTableName)
            .select('*')
            .gt('updated_at', since.toISOString())
            .order('updated_at', { ascending: false });
          
          if (error) {
            throw new Error(error.message);
          }
          
          return (data || []).map(item => ({
            id: item.uuid,
            operation: 'update',
            entity: this.dbFormatToDomainEntity(item),
            timestamp: new Date(item.updated_at),
          }));
        });
      },
      catch: (error) => this.mapError(error, 'getChangesSince')
    });
  }

  count(filter?: FilterOptions): Effect.Effect<number, StorageError> {
    return Effect.tryPromise({
      try: async () => {
        return await this.withRetry(async () => {
          await this.initializeAuth();
          
          let query = supabase.from(this.config.defaultTableName).select('*', { count: 'exact', head: true });
          
          if (filter?.user_id) {
            query = query.eq('user_id', filter.user_id);
          }
          
          if (filter?.is_deleted !== undefined) {
            query = query.eq('is_deleted', filter.is_deleted);
          }
          
          if (filter?.created_after) {
            query = query.gte('created_at', filter.created_after.toISOString());
          }
          
          if (filter?.updated_after) {
            query = query.gte('updated_at', filter.updated_after.toISOString());
          }
          
          const { count, error } = await query;
          
          if (error) {
            throw new Error(error.message);
          }
          
          return count || 0;
        });
      },
      catch: (error) => this.mapError(error, 'count')
    });
  }

  getStats(): Effect.Effect<StorageStats, StorageError> {
    return Effect.tryPromise({
      try: async () => {
        return await this.withRetry(async () => {
          await this.initializeAuth();
          
          const { count: totalCount, error: countError } = await supabase
            .from(this.config.defaultTableName)
            .select('*', { count: 'exact', head: true });
          
          if (countError) {
            throw new Error(countError.message);
          }
          
          const { data: typeData, error: typeError } = await supabase
            .from(this.config.defaultTableName)
            .select('type')
            .not('type', 'is', null);
          
          if (typeError) {
            throw new Error(typeError.message);
          }
          
          const entitiesByType: Record<string, number> = {};
          (typeData || []).forEach(item => {
            const type = item.type || 'unknown';
            entitiesByType[type] = (entitiesByType[type] || 0) + 1;
          });
          
          return {
            total_entities: totalCount || 0,
            entities_by_type: entitiesByType,
            storage_size_bytes: 0,
            last_cleanup: null,
            fragmentation_ratio: 0,
          };
        });
      },
      catch: (error) => this.mapError(error, 'getStats')
    });
  }

  vacuum(): Effect.Effect<void, StorageError> {
    return Effect.tryPromise({
      try: async () => {
        return void 0;
      },
      catch: (error) => this.mapError(error, 'vacuum')
    });
  }

  // =============================================================================
  // Dynamic Entity Support Methods (For Schema-Aware Operations)
  // =============================================================================

  /**
   * Create a dynamic entity (schema-aware)
   */
  async createDynamicEntity(data: Omit<DynamicEntity, 'id'>): Promise<DynamicEntity> {
    if (!this.schemaManager) {
      throw new Error('Schema manager required for dynamic operations');
    }

    await this.initializeAuth();
    
    // Create full entity with generated ID
    const entity: DynamicEntity = {
      ...data,
      id: crypto.randomUUID(),
      created_at: new Date(),
      updated_at: new Date(),
      is_deleted: false,
      sync_version: 1
    };
    
    const dbEntity = await this.dynamicEntityToDbFormat(entity);
    
    const { data: result, error } = await supabase
      .from(entity.entityType)
      .insert(dbEntity)
      .select()
      .single();
    
    if (error) {
      throw new Error(error.message);
    }
    
    return await this.dbFormatToDynamicEntity(result, entity.entityType);
  }

  /**
   * Read a dynamic entity by ID (schema-aware)
   */
  async readDynamicEntity(id: string, tableName?: string): Promise<DynamicEntity | null> {
    if (!this.schemaManager) {
      throw new Error('Schema manager required for dynamic operations');
    }

    await this.initializeAuth();
    
    const tableToSearch = tableName || this.config.defaultTableName;
    
    const { data, error } = await supabase
      .from(tableToSearch)
      .select('*')
      .eq('uuid', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(error.message);
    }
    
    return await this.dbFormatToDynamicEntity(data, tableToSearch);
  }

  /**
   * Update a dynamic entity (schema-aware)
   */
  async updateDynamicEntity(id: string, data: Partial<DynamicEntity>, tableName?: string): Promise<DynamicEntity> {
    if (!this.schemaManager) {
      throw new Error('Schema manager required for dynamic operations');
    }

    await this.initializeAuth();
    
    // First get the current entity to determine table
    const existing = await this.readDynamicEntity(id, tableName);
    if (!existing) {
      throw new Error(`Entity with id ${id} not found`);
    }
    
    // Merge updates
    const updatedEntity: DynamicEntity = {
      ...existing,
      ...data,
      id: existing.id, // Preserve ID
      updated_at: new Date(),
      sync_version: existing.sync_version + 1
    };
    
    const dbEntity = await this.dynamicEntityToDbFormat(updatedEntity);
    
    const { data: result, error } = await supabase
      .from(updatedEntity.entityType)
      .update(dbEntity)
      .eq('uuid', id)
      .select()
      .single();
    
    if (error) {
      throw new Error(error.message);
    }
    
    return await this.dbFormatToDynamicEntity(result, updatedEntity.entityType);
  }

  /**
   * List dynamic entities with filtering (schema-aware)
   */
  async listDynamicEntities(tableName: string, options?: {
    filters?: QueryFilter[];
    sort?: { field: string; direction: 'asc' | 'desc' };
    pagination?: { limit: number; offset: number };
  }): Promise<DynamicEntity[]> {
    if (!this.schemaManager) {
      throw new Error('Schema manager required for dynamic operations');
    }

    await this.initializeAuth();
    
    const query = this.buildSupabaseQuery(
      tableName,
      options?.filters,
      {
        limit: options?.pagination?.limit,
        offset: options?.pagination?.offset,
        sort: options?.sort
      }
    );
    
    const { data, error } = await query;
    
    if (error) {
      throw new Error(error.message);
    }
    
    const results: DynamicEntity[] = [];
    for (const item of data || []) {
      const entity = await this.dbFormatToDynamicEntity(item, tableName);
      results.push(entity);
    }
    
    return results;
  }
}

// =============================================================================
// Dynamic Supabase Storage Provider (IStorageProvider Implementation)
// =============================================================================

/**
 * Dedicated storage provider for dynamic entities using IStorageProvider interface
 */
export class DynamicSupabaseStorageProvider implements IStorageProvider<DynamicEntity> {
  private repository: SchemaAwareSupabaseRepository;

  constructor(
    schemaManager: TableConfigManager,
    config?: SchemaAwareSupabaseConfig
  ) {
    this.repository = new SchemaAwareSupabaseRepository(schemaManager, config);
  }

  async create(data: Omit<DynamicEntity, 'id'>): Promise<DynamicEntity> {
    return await this.repository.createDynamicEntity(data);
  }

  async read(id: string): Promise<DynamicEntity | null> {
    return await this.repository.readDynamicEntity(id);
  }

  async update(id: string, data: Partial<DynamicEntity>): Promise<DynamicEntity> {
    return await this.repository.updateDynamicEntity(id, data);
  }

  async delete(id: string): Promise<void> {
    const existing = await this.repository.readDynamicEntity(id);
    if (!existing) {
      throw new Error(`Entity with id ${id} not found`);
    }

    const { error } = await supabase
      .from(existing.entityType)
      .delete()
      .eq('uuid', id);
    
    if (error) {
      throw new Error(error.message);
    }
  }

  async list(options?: {
    filters?: QueryFilter[];
    sort?: { field: string; direction: 'asc' | 'desc' };
    pagination?: { limit: number; offset: number };
  }): Promise<DynamicEntity[]> {
    // For list without specific table, we need to determine which table to search
    // Use the repository's default table name
    const defaultTable = this.repository['config'].defaultTableName;
    return await this.repository.listDynamicEntities(defaultTable, options);
  }

  async count(filters?: QueryFilter[]): Promise<number> {
    await this.repository['initializeAuth']();
    
    const defaultTable = this.repository['config'].defaultTableName;
    let query = supabase.from(defaultTable).select('*', { count: 'exact', head: true });
    
    // Apply filters manually since we can't access private method
    if (filters) {
      for (const filter of filters) {
        switch (filter.operator) {
          case '=':
            query = query.eq(filter.field, filter.value);
            break;
          case '!=':
            query = query.neq(filter.field, filter.value);
            break;
          case '>':
            query = query.gt(filter.field, filter.value);
            break;
          case '<':
            query = query.lt(filter.field, filter.value);
            break;
          case '>=':
            query = query.gte(filter.field, filter.value);
            break;
          case '<=':
            query = query.lte(filter.field, filter.value);
            break;
          case 'in':
            query = query.in(filter.field, Array.isArray(filter.value) ? filter.value : [filter.value]);
            break;
          case 'like':
            query = query.ilike(filter.field, filter.value);
            break;
        }
      }
    }
    
    const { count, error } = await query;
    
    if (error) {
      throw new Error(error.message);
    }
    
    return count || 0;
  }

  batch?: {
    create(items: Omit<DynamicEntity, 'id'>[]): Promise<DynamicEntity[]>;
    update(updates: Array<{ id: string; data: Partial<DynamicEntity> }>): Promise<DynamicEntity[]>;
    delete(ids: string[]): Promise<void>;
  } = {
    create: async (items: Omit<DynamicEntity, 'id'>[]): Promise<DynamicEntity[]> => {
      const results: DynamicEntity[] = [];
      for (const item of items) {
        const result = await this.create(item);
        results.push(result);
      }
      return results;
    },

    update: async (updates: Array<{ id: string; data: Partial<DynamicEntity> }>): Promise<DynamicEntity[]> => {
      const results: DynamicEntity[] = [];
      for (const update of updates) {
        const result = await this.update(update.id, update.data);
        results.push(result);
      }
      return results;
    },

    delete: async (ids: string[]): Promise<void> => {
      for (const id of ids) {
        await this.delete(id);
      }
    }
  };
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a schema-aware Supabase repository
 */
export const createSchemaAwareSupabaseRepository = <T extends LocalFirstEntity = LocalFirstEntity>(
  schemaManager?: TableConfigManager,
  config?: SchemaAwareSupabaseConfig
): SchemaAwareSupabaseRepository<T> => {
  return new SchemaAwareSupabaseRepository<T>(schemaManager, config);
};

/**
 * Create a dynamic Supabase storage provider
 */
export const createDynamicSupabaseProvider = (
  schemaManager: TableConfigManager,
  config?: SchemaAwareSupabaseConfig
): IStorageProvider<DynamicEntity> => {
  return new DynamicSupabaseStorageProvider(schemaManager, config);
};