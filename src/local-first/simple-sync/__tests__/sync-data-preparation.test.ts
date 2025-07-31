/**
 * Unit tests for sync-data-preparation module
 * Tests data collection and structure preparation for sync operations
 */

import { prepareSyncData } from '../sync-data-preparation';
import * as RemoteOps from '../../../local-first-impl/supabase-operations';
import * as LocalOps from '../../../local-first-impl/local-first-operations';
import * as LastKnownIds from '../last-known-ids';

// Mock the dependencies
jest.mock('../../../local-first-impl/supabase-operations');
jest.mock('../../../local-first-impl/local-first-operations');
jest.mock('../last-known-ids');

const mockRemoteOps = RemoteOps as jest.Mocked<typeof RemoteOps>;
const mockLocalOps = LocalOps as jest.Mocked<typeof LocalOps>;
const mockLastKnownIds = LastKnownIds as jest.Mocked<typeof LastKnownIds>;

describe('sync-data-preparation', () => {
  const testUserId = 'test-user-123';
  
  const mockLocalEntities = [
    {
      id: 'local-1',
      title: 'Local Bookmark 1',
      url: 'https://local1.example.com',
      user_id: testUserId,
      created_at: '2024-01-01T10:00:00Z'
    },
    {
      id: 'local-2', 
      title: 'Local Bookmark 2',
      url: 'https://local2.example.com',
      user_id: testUserId,
      created_at: '2024-01-01T11:00:00Z'
    },
    {
      id: 'common-1',
      title: 'Common Bookmark',
      url: 'https://common.example.com',
      user_id: testUserId,
      created_at: '2024-01-01T09:00:00Z'
    }
  ];

  const mockRemoteEntities = [
    {
      id: 'remote-1',
      title: 'Remote Bookmark 1',
      url: 'https://remote1.example.com',
      user_id: testUserId,
      created_at: '2024-01-01T12:00:00Z'
    },
    {
      id: 'remote-2',
      title: 'Remote Bookmark 2',
      url: 'https://remote2.example.com',
      user_id: testUserId,
      created_at: '2024-01-01T13:00:00Z'
    },
    {
      id: 'common-1',
      title: 'Common Bookmark (Remote)',
      url: 'https://common.example.com',
      user_id: testUserId,
      created_at: '2024-01-01T09:00:00Z'
    }
  ];

  const mockLastKnownRemoteIds = ['remote-1', 'common-1', 'deleted-remote-1'];
  const mockLastKnownLocalIds = ['local-1', 'common-1', 'deleted-local-1'];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockLocalOps.getEntities.mockResolvedValue(mockLocalEntities);
    mockRemoteOps.getEntitiesLegacy.mockResolvedValue(mockRemoteEntities);
    mockLastKnownIds.getLastKnownRemoteIds.mockResolvedValue(mockLastKnownRemoteIds);
    mockLastKnownIds.getLastKnownLocalIds.mockResolvedValue(mockLastKnownLocalIds);
  });

  describe('successful data preparation', () => {
    it('should prepare complete sync data structure', async () => {
      const result = await prepareSyncData(testUserId);

      expect(result).toEqual({
        localEntities: mockLocalEntities,
        remoteEntities: mockRemoteEntities,
        localMap: new Map([
          ['local-1', mockLocalEntities[0]],
          ['local-2', mockLocalEntities[1]],
          ['common-1', mockLocalEntities[2]]
        ]),
        remoteMap: new Map([
          ['remote-1', mockRemoteEntities[0]],
          ['remote-2', mockRemoteEntities[1]],
          ['common-1', mockRemoteEntities[2]]
        ]),
        lastKnownRemoteIds: mockLastKnownRemoteIds,
        lastKnownLocalIds: mockLastKnownLocalIds,
        currentRemoteIds: ['remote-1', 'remote-2', 'common-1'],
        currentLocalIds: ['local-1', 'local-2', 'common-1'],
        allIds: new Set([
          'local-1', 'local-2', 'common-1', // From local
          'remote-1', 'remote-2', // From remote (common-1 already included)
          'deleted-remote-1', 'deleted-local-1' // From last known IDs
        ])
      });
    });

    it('should call all required operations with correct parameters', async () => {
      await prepareSyncData(testUserId);

      expect(mockLocalOps.getEntities).toHaveBeenCalledWith({ user_id: testUserId });
      expect(mockRemoteOps.getEntitiesLegacy).toHaveBeenCalledWith({ user_id: testUserId });
      expect(mockLastKnownIds.getLastKnownRemoteIds).toHaveBeenCalledWith(testUserId);
      expect(mockLastKnownIds.getLastKnownLocalIds).toHaveBeenCalledWith(testUserId);
    });

    it('should create correct lookup maps', async () => {
      const result = await prepareSyncData(testUserId);

      // Test local map
      expect(result.localMap.size).toBe(3);
      expect(result.localMap.get('local-1')).toEqual(mockLocalEntities[0]);
      expect(result.localMap.get('common-1')).toEqual(mockLocalEntities[2]);

      // Test remote map
      expect(result.remoteMap.size).toBe(3);
      expect(result.remoteMap.get('remote-1')).toEqual(mockRemoteEntities[0]);
      expect(result.remoteMap.get('common-1')).toEqual(mockRemoteEntities[2]);
    });

    it('should create comprehensive allIds set', async () => {
      const result = await prepareSyncData(testUserId);

      const expectedIds = [
        'local-1', 'local-2', 'common-1', // Current local
        'remote-1', 'remote-2', // Current remote (common-1 already counted)
        'deleted-remote-1', 'deleted-local-1' // Previously tracked but now missing
      ];

      expect(result.allIds.size).toBe(expectedIds.length);
      expectedIds.forEach(id => {
        expect(result.allIds.has(id)).toBe(true);
      });
    });

    it('should extract current ID arrays correctly', async () => {
      const result = await prepareSyncData(testUserId);

      expect(result.currentLocalIds).toEqual(['local-1', 'local-2', 'common-1']);
      expect(result.currentRemoteIds).toEqual(['remote-1', 'remote-2', 'common-1']);
    });
  });

  describe('edge cases', () => {
    it('should handle empty local entities', async () => {
      mockLocalOps.getEntities.mockResolvedValue([]);

      const result = await prepareSyncData(testUserId);

      expect(result.localEntities).toEqual([]);
      expect(result.localMap.size).toBe(0);
      expect(result.currentLocalIds).toEqual([]);
      expect(result.allIds.has('remote-1')).toBe(true); // Should still include remote IDs
    });

    it('should handle empty remote entities', async () => {
      mockRemoteOps.getEntitiesLegacy.mockResolvedValue([]);

      const result = await prepareSyncData(testUserId);

      expect(result.remoteEntities).toEqual([]);
      expect(result.remoteMap.size).toBe(0);
      expect(result.currentRemoteIds).toEqual([]);
      expect(result.allIds.has('local-1')).toBe(true); // Should still include local IDs
    });

    it('should handle empty last known IDs', async () => {
      mockLastKnownIds.getLastKnownRemoteIds.mockResolvedValue([]);
      mockLastKnownIds.getLastKnownLocalIds.mockResolvedValue([]);

      const result = await prepareSyncData(testUserId);

      expect(result.lastKnownRemoteIds).toEqual([]);
      expect(result.lastKnownLocalIds).toEqual([]);
      // allIds should only contain current entities
      expect(result.allIds.size).toBe(5); // 3 local + 2 unique remote
    });

    it('should handle completely empty state', async () => {
      mockLocalOps.getEntities.mockResolvedValue([]);
      mockRemoteOps.getEntitiesLegacy.mockResolvedValue([]);
      mockLastKnownIds.getLastKnownRemoteIds.mockResolvedValue([]);
      mockLastKnownIds.getLastKnownLocalIds.mockResolvedValue([]);

      const result = await prepareSyncData(testUserId);

      expect(result.localEntities).toEqual([]);
      expect(result.remoteEntities).toEqual([]);
      expect(result.localMap.size).toBe(0);
      expect(result.remoteMap.size).toBe(0);
      expect(result.lastKnownRemoteIds).toEqual([]);
      expect(result.lastKnownLocalIds).toEqual([]);
      expect(result.currentLocalIds).toEqual([]);
      expect(result.currentRemoteIds).toEqual([]);
      expect(result.allIds.size).toBe(0);
    });

    it('should handle duplicate IDs in last known lists', async () => {
      const duplicateRemoteIds = ['remote-1', 'remote-1', 'common-1'];
      const duplicateLocalIds = ['local-1', 'local-1', 'common-1'];
      
      mockLastKnownIds.getLastKnownRemoteIds.mockResolvedValue(duplicateRemoteIds);
      mockLastKnownIds.getLastKnownLocalIds.mockResolvedValue(duplicateLocalIds);

      const result = await prepareSyncData(testUserId);

      // allIds Set should automatically deduplicate
      expect(result.lastKnownRemoteIds).toEqual(duplicateRemoteIds);
      expect(result.lastKnownLocalIds).toEqual(duplicateLocalIds);
      
      // Check that duplicates don't affect the final set size
      const expectedUniqueIds = [
        'local-1', 'local-2', 'common-1', // Current local
        'remote-1', 'remote-2' // Current remote (common-1 already counted)
      ];
      expect(result.allIds.size).toBe(expectedUniqueIds.length);
    });

    it('should handle entities with missing or null IDs', async () => {
      const entitiesWithBadIds = [
        { id: null, title: 'Bad ID 1' },
        { id: undefined, title: 'Bad ID 2' },
        { id: '', title: 'Empty ID' },
        { id: 'valid-1', title: 'Valid ID' }
      ];

      mockLocalOps.getEntities.mockResolvedValue(entitiesWithBadIds as any);

      const result = await prepareSyncData(testUserId);

      // Should handle invalid IDs gracefully
      expect(result.localMap.has('valid-1')).toBe(true);
      expect(result.localMap.has(null as any)).toBe(true);
      expect(result.localMap.has(undefined as any)).toBe(true);
      expect(result.localMap.has('')).toBe(true);
    });

    it('should handle large datasets efficiently', async () => {
      const largeLocalEntities = Array.from({ length: 1000 }, (_, i) => ({
        id: `local-${i}`,
        title: `Local ${i}`,
        user_id: testUserId
      }));

      const largeRemoteEntities = Array.from({ length: 1000 }, (_, i) => ({
        id: `remote-${i}`,
        title: `Remote ${i}`,
        user_id: testUserId
      }));

      const largeLastKnownRemoteIds = Array.from({ length: 500 }, (_, i) => `old-remote-${i}`);
      const largeLastKnownLocalIds = Array.from({ length: 500 }, (_, i) => `old-local-${i}`);

      mockLocalOps.getEntities.mockResolvedValue(largeLocalEntities);
      mockRemoteOps.getEntitiesLegacy.mockResolvedValue(largeRemoteEntities);
      mockLastKnownIds.getLastKnownRemoteIds.mockResolvedValue(largeLastKnownRemoteIds);
      mockLastKnownIds.getLastKnownLocalIds.mockResolvedValue(largeLastKnownLocalIds);

      const result = await prepareSyncData(testUserId);

      expect(result.localEntities.length).toBe(1000);
      expect(result.remoteEntities.length).toBe(1000);
      expect(result.localMap.size).toBe(1000);
      expect(result.remoteMap.size).toBe(1000);
      expect(result.allIds.size).toBe(3000); // 1000 local + 1000 remote + 1000 old IDs
    });
  });

  describe('error handling', () => {
    it('should propagate local operations errors', async () => {
      const localError = new Error('Failed to get local entities');
      mockLocalOps.getEntities.mockRejectedValue(localError);

      await expect(prepareSyncData(testUserId)).rejects.toThrow('Failed to get local entities');
    });

    it('should propagate remote operations errors', async () => {
      const remoteError = new Error('Failed to get remote entities');
      mockRemoteOps.getEntitiesLegacy.mockRejectedValue(remoteError);

      await expect(prepareSyncData(testUserId)).rejects.toThrow('Failed to get remote entities');
    });

    it('should propagate last known IDs errors', async () => {
      const idsError = new Error('Failed to get last known remote IDs');
      mockLastKnownIds.getLastKnownRemoteIds.mockRejectedValue(idsError);

      await expect(prepareSyncData(testUserId)).rejects.toThrow('Failed to get last known remote IDs');
    });

    it('should handle partial failures in Promise.all', async () => {
      const localError = new Error('Local fetch failed');
      mockLocalOps.getEntities.mockRejectedValue(localError);

      // Promise.all should fail fast on first rejection
      await expect(prepareSyncData(testUserId)).rejects.toThrow('Local fetch failed');
      
      // Remote operation should not be waited for
      expect(mockRemoteOps.getEntitiesLegacy).toHaveBeenCalled();
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

    it('should log sync data preparation summary', async () => {
      await prepareSyncData(testUserId);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[SimpleSync] Sync data prepared: 3 local, 3 remote, 3 remote tracked, 3 local tracked'
      );
    });

    it('should log correct counts for empty data', async () => {
      mockLocalOps.getEntities.mockResolvedValue([]);
      mockRemoteOps.getEntitiesLegacy.mockResolvedValue([]);
      mockLastKnownIds.getLastKnownRemoteIds.mockResolvedValue([]);
      mockLastKnownIds.getLastKnownLocalIds.mockResolvedValue([]);

      await prepareSyncData(testUserId);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[SimpleSync] Sync data prepared: 0 local, 0 remote, 0 remote tracked, 0 local tracked'
      );
    });

    it('should log correct counts for different sized datasets', async () => {
      mockLocalOps.getEntities.mockResolvedValue([mockLocalEntities[0]]);
      mockRemoteOps.getEntitiesLegacy.mockResolvedValue(mockRemoteEntities);
      mockLastKnownIds.getLastKnownRemoteIds.mockResolvedValue(['id1']);
      mockLastKnownIds.getLastKnownLocalIds.mockResolvedValue(['id1', 'id2']);

      await prepareSyncData(testUserId);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[SimpleSync] Sync data prepared: 1 local, 3 remote, 1 remote tracked, 2 local tracked'
      );
    });
  });

  describe('data structure integrity', () => {
    it('should ensure Map keys match entity IDs', async () => {
      const result = await prepareSyncData(testUserId);

      // Check local map integrity
      for (const [key, entity] of result.localMap) {
        expect(key).toBe(entity.id);
      }

      // Check remote map integrity
      for (const [key, entity] of result.remoteMap) {
        expect(key).toBe(entity.id);
      }
    });

    it('should ensure current ID arrays match Map keys', async () => {
      const result = await prepareSyncData(testUserId);

      const localMapKeys = Array.from(result.localMap.keys()).sort();
      const currentLocalIdsSorted = [...result.currentLocalIds].sort();
      expect(localMapKeys).toEqual(currentLocalIdsSorted);

      const remoteMapKeys = Array.from(result.remoteMap.keys()).sort();
      const currentRemoteIdsSorted = [...result.currentRemoteIds].sort();
      expect(remoteMapKeys).toEqual(currentRemoteIdsSorted);
    });

    it('should ensure allIds contains all relevant IDs', async () => {
      const result = await prepareSyncData(testUserId);

      // Check that all current IDs are in allIds
      result.currentLocalIds.forEach(id => {
        expect(result.allIds.has(id)).toBe(true);
      });

      result.currentRemoteIds.forEach(id => {
        expect(result.allIds.has(id)).toBe(true);
      });

      // Check that all last known IDs are in allIds
      result.lastKnownRemoteIds.forEach(id => {
        expect(result.allIds.has(id)).toBe(true);
      });

      result.lastKnownLocalIds.forEach(id => {
        expect(result.allIds.has(id)).toBe(true);
      });
    });
  });
});