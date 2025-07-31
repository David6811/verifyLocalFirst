/**
 * Unit tests for conflict-resolution module
 * Tests conflict resolution logic for sync operations
 */

import {
  resolveUpdateConflict,
  handleLocalOnlyEntity,
  handleRemoteOnlyEntity,
  syncSingleEntity
} from '../conflict-resolution';
import * as RemoteOps from '../../../local-first-impl/supabase-operations';
import * as LocalOps from '../../../local-first-impl/local-first-operations';

// Mock the operations
jest.mock('../../../local-first-impl/supabase-operations');
jest.mock('../../../local-first-impl/local-first-operations');

const mockRemoteOps = RemoteOps as jest.Mocked<typeof RemoteOps>;
const mockLocalOps = LocalOps as jest.Mocked<typeof LocalOps>;

describe('conflict-resolution', () => {
  const testUserId = 'test-user-123';
  const testEntityId = 'entity-123';
  
  const baseLocalEntity = {
    id: testEntityId,
    data: { title: 'Local Title', url: 'https://local.example.com' },
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T12:00:00Z'
  };

  const baseRemoteEntity = {
    id: testEntityId,
    data: { title: 'Remote Title', url: 'https://remote.example.com' },
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T11:00:00Z'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRemoteOps.updateEntityLegacy.mockResolvedValue();
    mockLocalOps.updateEntity.mockResolvedValue();
    mockRemoteOps.createEntityLegacy.mockResolvedValue();
    mockLocalOps.createEntity.mockResolvedValue();
    mockRemoteOps.deleteEntityLegacy.mockResolvedValue();
    mockLocalOps.deleteEntity.mockResolvedValue();
  });

  describe('resolveUpdateConflict', () => {
    it('should update remote when local is newer', async () => {
      const localEntity = {
        ...baseLocalEntity,
        updated_at: '2024-01-01T13:00:00Z' // Newer than remote
      };

      const remoteEntity = {
        ...baseRemoteEntity,
        updated_at: '2024-01-01T12:00:00Z' // Older than local
      };

      await resolveUpdateConflict(testEntityId, localEntity, remoteEntity);

      expect(mockRemoteOps.updateEntityLegacy).toHaveBeenCalledWith(testEntityId, {
        data: localEntity.data
      });
      expect(mockLocalOps.updateEntity).not.toHaveBeenCalled();
    });

    it('should update local when remote is newer', async () => {
      const localEntity = {
        ...baseLocalEntity,
        updated_at: '2024-01-01T11:00:00Z' // Older than remote
      };

      const remoteEntity = {
        ...baseRemoteEntity,
        updated_at: '2024-01-01T13:00:00Z' // Newer than local
      };

      await resolveUpdateConflict(testEntityId, localEntity, remoteEntity);

      expect(mockLocalOps.updateEntity).toHaveBeenCalledWith(testEntityId, {
        data: remoteEntity.data
      });
      expect(mockRemoteOps.updateEntityLegacy).not.toHaveBeenCalled();
    });

    it('should do nothing when timestamps are equal', async () => {
      const sameTimestamp = '2024-01-01T12:00:00Z';
      const localEntity = {
        ...baseLocalEntity,
        updated_at: sameTimestamp
      };

      const remoteEntity = {
        ...baseRemoteEntity,
        updated_at: sameTimestamp
      };

      await resolveUpdateConflict(testEntityId, localEntity, remoteEntity);

      expect(mockRemoteOps.updateEntityLegacy).not.toHaveBeenCalled();
      expect(mockLocalOps.updateEntity).not.toHaveBeenCalled();
    });

    it('should fallback to created_at when updated_at is missing', async () => {
      const localEntity = {
        ...baseLocalEntity,
        created_at: '2024-01-01T13:00:00Z',
        updated_at: undefined
      };

      const remoteEntity = {
        ...baseRemoteEntity,
        created_at: '2024-01-01T12:00:00Z',
        updated_at: undefined
      };

      await resolveUpdateConflict(testEntityId, localEntity, remoteEntity);

      expect(mockRemoteOps.updateEntityLegacy).toHaveBeenCalledWith(testEntityId, {
        data: localEntity.data
      });
    });

    it('should handle mixed timestamp formats', async () => {
      const localEntity = {
        ...baseLocalEntity,
        updated_at: '2024-01-01T12:30:00Z'
      };

      const remoteEntity = {
        ...baseRemoteEntity,
        created_at: '2024-01-01T12:00:00Z',
        updated_at: undefined // Will fallback to created_at
      };

      await resolveUpdateConflict(testEntityId, localEntity, remoteEntity);

      expect(mockRemoteOps.updateEntityLegacy).toHaveBeenCalledWith(testEntityId, {
        data: localEntity.data
      });
    });

    it('should handle entities without titles gracefully', async () => {
      const localEntity = {
        ...baseLocalEntity,
        data: { url: 'https://notitle.example.com' }, // No title
        updated_at: '2024-01-01T13:00:00Z'
      };

      const remoteEntity = {
        ...baseRemoteEntity,
        data: { url: 'https://remote.example.com' }, // No title
        updated_at: '2024-01-01T12:00:00Z'
      };

      await resolveUpdateConflict(testEntityId, localEntity, remoteEntity);

      expect(mockRemoteOps.updateEntityLegacy).toHaveBeenCalledWith(testEntityId, {
        data: localEntity.data
      });
    });
  });

  describe('handleLocalOnlyEntity', () => {
    it('should delete locally when entity was known remotely', async () => {
      const wasKnownRemotely = true;

      await handleLocalOnlyEntity(testEntityId, baseLocalEntity, wasKnownRemotely, testUserId);

      expect(mockLocalOps.deleteEntity).toHaveBeenCalledWith(testEntityId);
      expect(mockRemoteOps.createEntityLegacy).not.toHaveBeenCalled();
    });

    it('should push to remote when entity was never known remotely', async () => {
      const wasKnownRemotely = false;

      await handleLocalOnlyEntity(testEntityId, baseLocalEntity, wasKnownRemotely, testUserId);

      expect(mockRemoteOps.createEntityLegacy).toHaveBeenCalledWith({
        uuid: baseLocalEntity.id,
        user_id: testUserId,
        data: baseLocalEntity.data
      });
      expect(mockLocalOps.deleteEntity).not.toHaveBeenCalled();
    });

    it('should handle entities without titles', async () => {
      const entityWithoutTitle = {
        ...baseLocalEntity,
        data: { url: 'https://example.com' } // No title
      };

      await handleLocalOnlyEntity(testEntityId, entityWithoutTitle, false, testUserId);

      expect(mockRemoteOps.createEntityLegacy).toHaveBeenCalledWith({
        uuid: entityWithoutTitle.id,
        user_id: testUserId,
        data: entityWithoutTitle.data
      });
    });
  });

  describe('handleRemoteOnlyEntity', () => {
    it('should delete from remote when entity was known locally', async () => {
      const wasKnownLocally = true;

      await handleRemoteOnlyEntity(testEntityId, baseRemoteEntity, wasKnownLocally, testUserId);

      expect(mockRemoteOps.deleteEntityLegacy).toHaveBeenCalledWith(testEntityId);
      expect(mockLocalOps.createEntity).not.toHaveBeenCalled();
    });

    it('should pull to local when entity was never known locally', async () => {
      const wasKnownLocally = false;

      await handleRemoteOnlyEntity(testEntityId, baseRemoteEntity, wasKnownLocally, testUserId);

      expect(mockLocalOps.createEntity).toHaveBeenCalledWith(baseRemoteEntity.entityType, {
        uuid: baseRemoteEntity.id,
        user_id: testUserId,
        data: baseRemoteEntity.data
      });
      expect(mockRemoteOps.deleteEntityLegacy).not.toHaveBeenCalled();
    });

    it('should handle entities without entityType', async () => {
      const entityWithoutType = {
        ...baseRemoteEntity,
        entityType: undefined
      };

      await handleRemoteOnlyEntity(testEntityId, entityWithoutType, false, testUserId);

      expect(mockLocalOps.createEntity).toHaveBeenCalledWith(undefined, {
        uuid: entityWithoutType.id,
        user_id: testUserId,
        data: entityWithoutType.data
      });
    });
  });

  describe('syncSingleEntity', () => {
    it('should resolve conflict when both entities exist', async () => {
      const localEntity = {
        ...baseLocalEntity,
        updated_at: '2024-01-01T13:00:00Z'
      };

      const remoteEntity = {
        ...baseRemoteEntity,
        updated_at: '2024-01-01T12:00:00Z'
      };

      await syncSingleEntity(testEntityId, localEntity, remoteEntity, true, true, testUserId);

      expect(mockRemoteOps.updateEntityLegacy).toHaveBeenCalledWith(testEntityId, {
        data: localEntity.data
      });
    });

    it('should handle local-only entity', async () => {
      const wasKnownRemotely = false;
      const wasKnownLocally = true;

      await syncSingleEntity(testEntityId, baseLocalEntity, undefined, wasKnownRemotely, wasKnownLocally, testUserId);

      expect(mockRemoteOps.createEntityLegacy).toHaveBeenCalledWith({
        uuid: baseLocalEntity.id,
        user_id: testUserId,
        data: baseLocalEntity.data
      });
    });

    it('should handle remote-only entity', async () => {
      const wasKnownRemotely = true;
      const wasKnownLocally = false;

      await syncSingleEntity(testEntityId, undefined, baseRemoteEntity, wasKnownRemotely, wasKnownLocally, testUserId);

      expect(mockLocalOps.createEntity).toHaveBeenCalledWith(baseRemoteEntity.entityType, {
        uuid: baseRemoteEntity.id,
        user_id: testUserId,
        data: baseRemoteEntity.data
      });
    });

    it('should handle entity deleted from both sides', async () => {
      const wasKnownRemotely = true;
      const wasKnownLocally = true;

      await syncSingleEntity(testEntityId, undefined, undefined, wasKnownRemotely, wasKnownLocally, testUserId);

      // Should not call any operations - entity was deleted from both sides
      expect(mockRemoteOps.updateEntityLegacy).not.toHaveBeenCalled();
      expect(mockLocalOps.updateEntity).not.toHaveBeenCalled();
      expect(mockRemoteOps.createEntityLegacy).not.toHaveBeenCalled();
      expect(mockLocalOps.createEntity).not.toHaveBeenCalled();
      expect(mockRemoteOps.deleteEntityLegacy).not.toHaveBeenCalled();
      expect(mockLocalOps.deleteEntity).not.toHaveBeenCalled();
    });

    it('should handle entity that never existed', async () => {
      const wasKnownRemotely = false;
      const wasKnownLocally = false;

      await syncSingleEntity(testEntityId, undefined, undefined, wasKnownRemotely, wasKnownLocally, testUserId);

      // Should not call any operations - entity never existed
      expect(mockRemoteOps.updateEntityLegacy).not.toHaveBeenCalled();
      expect(mockLocalOps.updateEntity).not.toHaveBeenCalled();
      expect(mockRemoteOps.createEntityLegacy).not.toHaveBeenCalled();
      expect(mockLocalOps.createEntity).not.toHaveBeenCalled();
      expect(mockRemoteOps.deleteEntityLegacy).not.toHaveBeenCalled();
      expect(mockLocalOps.deleteEntity).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should propagate remote update errors', async () => {
      const updateError = new Error('Remote update failed');
      mockRemoteOps.updateEntityLegacy.mockRejectedValue(updateError);

      const localEntity = {
        ...baseLocalEntity,
        updated_at: '2024-01-01T13:00:00Z'
      };

      await expect(resolveUpdateConflict(testEntityId, localEntity, baseRemoteEntity))
        .rejects.toThrow('Remote update failed');
    });

    it('should propagate local update errors', async () => {
      const updateError = new Error('Local update failed');
      mockLocalOps.updateEntity.mockRejectedValue(updateError);

      const remoteEntity = {
        ...baseRemoteEntity,
        updated_at: '2024-01-01T13:00:00Z'
      };

      await expect(resolveUpdateConflict(testEntityId, baseLocalEntity, remoteEntity))
        .rejects.toThrow('Local update failed');
    });

    it('should propagate create errors', async () => {
      const createError = new Error('Create failed');
      mockRemoteOps.createEntityLegacy.mockRejectedValue(createError);

      await expect(handleLocalOnlyEntity(testEntityId, baseLocalEntity, false, testUserId))
        .rejects.toThrow('Create failed');
    });

    it('should propagate delete errors', async () => {
      const deleteError = new Error('Delete failed');
      mockLocalOps.deleteEntity.mockRejectedValue(deleteError);

      await expect(handleLocalOnlyEntity(testEntityId, baseLocalEntity, true, testUserId))
        .rejects.toThrow('Delete failed');
    });
  });

  describe('logging behavior', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should log conflict resolution details', async () => {
      const localEntity = {
        ...baseLocalEntity,
        updated_at: '2024-01-01T13:00:00Z'
      };

      const remoteEntity = {
        ...baseRemoteEntity,
        updated_at: '2024-01-01T12:00:00Z'
      };

      await resolveUpdateConflict(testEntityId, localEntity, remoteEntity);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SimpleSync] Resolving update conflict')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Local timestamp:')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Remote timestamp:')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('CONFLICT RESOLVED: Local wins')
      );
    });

    it('should log entity operations', async () => {
      await handleLocalOnlyEntity(testEntityId, baseLocalEntity, false, testUserId);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SimpleSync] Pushing new local entity')
      );

      consoleSpy.mockClear();

      await handleRemoteOnlyEntity(testEntityId, baseRemoteEntity, true, testUserId);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SimpleSync] Deleting from remote')
      );
    });

    it('should log when entities are deleted from both sides', async () => {
      await syncSingleEntity(testEntityId, undefined, undefined, true, true, testUserId);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SimpleSync] Item')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('was deleted from both sides')
      );
    });
  });
});