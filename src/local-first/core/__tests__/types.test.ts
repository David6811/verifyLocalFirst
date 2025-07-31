/**
 * Tests for Local-First Core Types (Generic Engine)
 */

import {
  LocalFirstEntity,
  FilterOptions,
  QueryCriteria,
  BatchOperation,
  Change,
  SyncOptions,
  SyncResult
} from '../types';

describe('Local-First Core Types', () => {
  describe('LocalFirstEntity', () => {
    const mockEntity: LocalFirstEntity = {
      id: '1',
      created_at: new Date(),
      updated_at: new Date(),
      is_deleted: false,
      sync_version: 1,
      user_id: 'user-1'
    };

    it('should have all required sync fields', () => {
      expect(mockEntity.id).toBe('1');
      expect(mockEntity.created_at).toBeInstanceOf(Date);
      expect(mockEntity.updated_at).toBeInstanceOf(Date);
      expect(mockEntity.is_deleted).toBe(false);
      expect(mockEntity.sync_version).toBe(1);
      expect(mockEntity.user_id).toBe('user-1');
    });

    it('should allow optional user_id', () => {
      const entityWithoutUser: LocalFirstEntity = {
        id: '2',
        created_at: new Date(),
        updated_at: new Date(),
        is_deleted: false,
        sync_version: 1
      };
      expect(entityWithoutUser.user_id).toBeUndefined();
    });
  });

  describe('FilterOptions', () => {
    it('should support basic filtering', () => {
      const filter: FilterOptions = {
        user_id: 'user-1',
        is_deleted: false,
        created_after: new Date('2023-01-01'),
        updated_after: new Date('2023-06-01')
      };
      
      expect(filter.user_id).toBe('user-1');
      expect(filter.is_deleted).toBe(false);
      expect(filter.created_after).toBeInstanceOf(Date);
      expect(filter.updated_after).toBeInstanceOf(Date);
    });
  });

  describe('QueryCriteria', () => {
    it('should support advanced querying', () => {
      const criteria: QueryCriteria = {
        limit: 10,
        offset: 0,
        sort_by: 'created_at',
        sort_order: 'desc'
      };
      
      expect(criteria.limit).toBe(10);
      expect(criteria.offset).toBe(0);
      expect(criteria.sort_by).toBe('created_at');
      expect(criteria.sort_order).toBe('desc');
    });
  });

  describe('Type Structure', () => {
    it('should support generic entity extensions', () => {
      // Example of how users can extend LocalFirstEntity
      interface CustomEntity extends LocalFirstEntity {
        name: string;
        value: number;
      }
      
      const custom: CustomEntity = {
        id: 'custom-1',
        name: 'Custom Entity',
        value: 42,
        created_at: new Date(),
        updated_at: new Date(),
        is_deleted: false,
        sync_version: 1,
        user_id: 'user-1'
      };
      
      expect(custom.name).toBe('Custom Entity');
      expect(custom.value).toBe(42);
      // Should have all LocalFirstEntity properties
      expect(custom.id).toBe('custom-1');
      expect(custom.sync_version).toBe(1);
    });
  });
});