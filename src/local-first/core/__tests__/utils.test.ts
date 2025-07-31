/**
 * Tests for Local-First Core Utility Functions (Generic Engine)
 */

import {
  createEntityId,
  createTimestamp,
  createBaseEntity,
  updateEntity,
  markEntityDeleted,
  incrementSyncVersion,
  isValidSyncEntity,
  compareEntityTimestamps,
  isEntityNewer,
  mergeEntityMetadata,
  chunkArray,
} from '../utils';
import { LocalFirstEntity } from '../types';

// Mock UUID to make tests deterministic
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234'),
}));

describe('Local-First Core Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Entity ID Generation', () => {
    it('should generate unique entity IDs', () => {
      const id1 = createEntityId();
      const id2 = createEntityId();
      
      expect(id1).toBe('mock-uuid-1234');
      expect(id2).toBe('mock-uuid-1234');
      expect(typeof id1).toBe('string');
    });
  });

  describe('Timestamp Utilities', () => {
    it('should create valid timestamps', () => {
      const timestamp = createTimestamp();
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).toBeLessThanOrEqual(new Date().getTime());
    });
  });

  describe('Base Entity Creation', () => {
    it('should create valid base entity', () => {
      const userId = 'user-123';
      const entity = createBaseEntity(userId);

      expect(entity.id).toBe('mock-uuid-1234');
      expect(entity.user_id).toBe(userId);
      expect(entity.created_at).toBeInstanceOf(Date);
      expect(entity.updated_at).toBeInstanceOf(Date);
      expect(entity.is_deleted).toBe(false);
      expect(entity.sync_version).toBe(1);
    });

    it('should create base entity without user_id', () => {
      const entity = createBaseEntity();

      expect(entity.id).toBe('mock-uuid-1234');
      expect(entity.user_id).toBeUndefined();
      expect(entity.is_deleted).toBe(false);
      expect(entity.sync_version).toBe(1);
    });
  });

  describe('Entity Updates', () => {
    const mockEntity: LocalFirstEntity = {
      id: 'test-id',
      created_at: new Date('2023-01-01'),
      updated_at: new Date('2023-01-01'),
      is_deleted: false,
      sync_version: 1,
      user_id: 'user-1'
    };

    it('should update entity with new timestamp and version', () => {
      const updated = updateEntity(mockEntity);

      expect(updated.id).toBe(mockEntity.id);
      expect(updated.created_at).toBe(mockEntity.created_at);
      expect(updated.updated_at.getTime()).toBeGreaterThan(mockEntity.updated_at.getTime());
      expect(updated.sync_version).toBe(2);
      expect(updated.is_deleted).toBe(false);
    });

    it('should mark entity as deleted', () => {
      const deleted = markEntityDeleted(mockEntity);

      expect(deleted.is_deleted).toBe(true);
      expect(deleted.sync_version).toBe(2);
      expect(deleted.updated_at.getTime()).toBeGreaterThan(mockEntity.updated_at.getTime());
    });

    it('should increment sync version', () => {
      const incremented = incrementSyncVersion(mockEntity);

      expect(incremented.sync_version).toBe(2);
      expect(incremented.updated_at.getTime()).toBeGreaterThan(mockEntity.updated_at.getTime());
    });
  });

  describe('Entity Validation', () => {
    it('should validate valid sync entities', () => {
      const validEntity: LocalFirstEntity = {
        id: 'valid-id',
        created_at: new Date(),
        updated_at: new Date(),
        is_deleted: false,
        sync_version: 1
      };

      expect(isValidSyncEntity(validEntity)).toBe(true);
    });

    it('should reject invalid sync entities', () => {
      const invalidEntity = {
        id: '',
        created_at: null,
        updated_at: new Date(),
        is_deleted: false,
        sync_version: -1
      } as any;

      expect(isValidSyncEntity(invalidEntity)).toBe(false);
    });

    it('should reject entities with missing required fields', () => {
      const incomplete = {
        id: 'test-id'
        // Missing other required fields
      } as any;

      expect(isValidSyncEntity(incomplete)).toBe(false);
    });
  });

  describe('Entity Comparison', () => {
    const olderEntity: LocalFirstEntity = {
      id: 'entity-1',
      created_at: new Date('2023-01-01'),
      updated_at: new Date('2023-01-01'),
      is_deleted: false,
      sync_version: 1
    };

    const newerEntity: LocalFirstEntity = {
      id: 'entity-2',
      created_at: new Date('2023-02-01'),
      updated_at: new Date('2023-02-01'),
      is_deleted: false,
      sync_version: 2
    };

    it('should compare entity timestamps correctly', () => {
      expect(compareEntityTimestamps(olderEntity, newerEntity)).toBeLessThan(0);
      expect(compareEntityTimestamps(newerEntity, olderEntity)).toBeGreaterThan(0);
      expect(compareEntityTimestamps(olderEntity, olderEntity)).toBe(0);
    });

    it('should determine if entity is newer', () => {
      expect(isEntityNewer(newerEntity, olderEntity)).toBe(true);
      expect(isEntityNewer(olderEntity, newerEntity)).toBe(false);
      expect(isEntityNewer(olderEntity, olderEntity)).toBe(false);
    });
  });

  describe('Metadata Utilities', () => {
    const entity1: LocalFirstEntity = {
      id: 'entity-1',
      created_at: new Date('2023-01-01'),
      updated_at: new Date('2023-01-01'),
      is_deleted: false,
      sync_version: 1,
      user_id: 'user-1'
    };

    const entity2: LocalFirstEntity = {
      id: 'entity-2',
      created_at: new Date('2023-02-01'),
      updated_at: new Date('2023-02-01'),
      is_deleted: false,
      sync_version: 2,
      user_id: 'user-2'
    };

    it('should merge entity metadata correctly', () => {
      const merged = mergeEntityMetadata(entity1, entity2);

      // Should use newer entity's timestamp and increment version
      expect(merged.updated_at).toBe(entity2.updated_at);
      expect(merged.sync_version).toBe(3); // Max of (1, 2) + 1 = 3
      
      // Should preserve original ID
      expect(merged.id).toBe(entity1.id);
    });
  });

  describe('Array Utilities', () => {
    it('should chunk arrays correctly', () => {
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const chunks = chunkArray(array, 3);

      expect(chunks).toHaveLength(4);
      expect(chunks[0]).toEqual([1, 2, 3]);
      expect(chunks[1]).toEqual([4, 5, 6]);
      expect(chunks[2]).toEqual([7, 8, 9]);
      expect(chunks[3]).toEqual([10]);
    });

    it('should handle empty arrays', () => {
      const chunks = chunkArray([], 5);
      expect(chunks).toEqual([]);
    });

    it('should handle single chunk', () => {
      const array = [1, 2, 3];
      const chunks = chunkArray(array, 5);
      expect(chunks).toEqual([[1, 2, 3]]);
    });
  });
});