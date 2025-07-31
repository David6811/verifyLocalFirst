/**
 * Unit tests for bidirectional-operations module
 * Tests the core sync logic that coordinates local and remote data
 */

import { bidirectionalSync } from '../bidirectional-operations';
import * as RemoteOps from '../../../local-first-impl/supabase-operations';
import * as LocalOps from '../../../local-first-impl/local-first-operations';
import * as Auth from '../../../local-first-impl/auth';
import * as LastKnownIds from '../last-known-ids';
import * as SyncDataPrep from '../sync-data-preparation';
import * as ConflictResolution from '../conflict-resolution';

// Mock all dependencies
jest.mock('../../../local-first-impl/supabase-operations');
jest.mock('../../../local-first-impl/local-first-operations');
jest.mock('../../../local-first-impl/auth');
jest.mock('../last-known-ids');
jest.mock('../sync-data-preparation');
jest.mock('../conflict-resolution');

const mockRemoteOps = RemoteOps as jest.Mocked<typeof RemoteOps>;
const mockLocalOps = LocalOps as jest.Mocked<typeof LocalOps>;
const mockAuth = Auth as jest.Mocked<typeof Auth>;
const mockLastKnownIds = LastKnownIds as jest.Mocked<typeof LastKnownIds>;
const mockSyncDataPrep = SyncDataPrep as jest.Mocked<typeof SyncDataPrep>;
const mockConflictResolution = ConflictResolution as jest.Mocked<typeof ConflictResolution>;

describe('bidirectional-operations', () => {
  const testUserId = 'test-user-123';
  
  const mockLocalEntity = {
    id: 'local-1',
    title: 'Local Bookmark',
    url: 'https://local.example.com',
    user_id: testUserId,
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T10:00:00Z'
  };

  const mockRemoteEntity = {
    id: 'remote-1',
    title: 'Remote Bookmark',
    url: 'https://remote.example.com',
    user_id: testUserId,
    created_at: '2024-01-01T11:00:00Z',
    updated_at: '2024-01-01T11:00:00Z'
  };

  const mockSyncData = {
    localEntities: [mockLocalEntity],
    remoteEntities: [mockRemoteEntity],
    allIds: new Set(['local-1', 'remote-1', 'common-1']),
    localMap: new Map([['local-1', mockLocalEntity]]),
    remoteMap: new Map([['remote-1', mockRemoteEntity]]),
    lastKnownRemoteIds: ['remote-1'],
    lastKnownLocalIds: ['local-1']
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockAuth.getCurrentUserIdLegacy.mockResolvedValue(testUserId);
    mockSyncDataPrep.prepareSyncData.mockResolvedValue(mockSyncData);
    mockConflictResolution.syncSingleEntity.mockResolvedValue();
    mockLocalOps.getEntities.mockResolvedValue([mockLocalEntity]);
    mockRemoteOps.getEntitiesLegacy.mockResolvedValue([mockRemoteEntity]);
    mockLastKnownIds.saveLastKnownRemoteIds.mockResolvedValue();
    mockLastKnownIds.saveLastKnownLocalIds.mockResolvedValue();
  });

  describe('successful bidirectional sync', () => {
    it('should complete full sync workflow successfully', async () => {
      const result = await bidirectionalSync();

      expect(result.success).toBe(true);
      expect(result.localCount).toBe(1);
      expect(result.remoteCount).toBe(1);
      expect(result.syncedCount).toBe(3); // All IDs from allIds set
      expect(result.errors).toEqual([]);
      expect(result.direction).toBe('bidirectional');
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should call all required steps in correct order', async () => {
      await bidirectionalSync();

      // Verify step order
      expect(mockAuth.getCurrentUserIdLegacy).toHaveBeenCalledTimes(1);
      expect(mockSyncDataPrep.prepareSyncData).toHaveBeenCalledWith(testUserId);
      expect(mockConflictResolution.syncSingleEntity).toHaveBeenCalledTimes(3);
      expect(mockLocalOps.getEntities).toHaveBeenCalledWith({ user_id: testUserId });
      expect(mockRemoteOps.getEntitiesLegacy).toHaveBeenCalledWith({ user_id: testUserId });
      expect(mockLastKnownIds.saveLastKnownRemoteIds).toHaveBeenCalledWith(testUserId, ['remote-1']);
      expect(mockLastKnownIds.saveLastKnownLocalIds).toHaveBeenCalledWith(testUserId, ['local-1']);
    });

    it('should process each entity with correct parameters', async () => {
      await bidirectionalSync();

      const syncCalls = mockConflictResolution.syncSingleEntity.mock.calls;
      expect(syncCalls).toHaveLength(3);

      // Check specific call parameters for each entity
      const callsMap = new Map(syncCalls.map(call => [call[0], call]));
      
      // local-1 entity
      const localCall = callsMap.get('local-1');
      expect(localCall).toEqual([
        'local-1',
        mockLocalEntity,
        undefined, // no remote entity
        false, // was not known remotely
        true,  // was known locally
        testUserId
      ]);

      // remote-1 entity
      const remoteCall = callsMap.get('remote-1');
      expect(remoteCall).toEqual([
        'remote-1',
        undefined, // no local entity
        mockRemoteEntity,
        true,  // was known remotely
        false, // was not known locally
        testUserId
      ]);
    });

    it('should save final state after successful sync', async () => {
      const finalLocal = [
        { id: 'final-local-1' },
        { id: 'final-local-2' }
      ];
      const finalRemote = [
        { id: 'final-remote-1' },
        { id: 'final-remote-2' },
        { id: 'final-remote-3' }
      ];

      mockLocalOps.getEntities.mockResolvedValue(finalLocal);
      mockRemoteOps.getEntitiesLegacy.mockResolvedValue(finalRemote);

      const result = await bidirectionalSync();

      expect(result.success).toBe(true);
      expect(mockLastKnownIds.saveLastKnownRemoteIds).toHaveBeenCalledWith(
        testUserId,
        ['final-remote-1', 'final-remote-2', 'final-remote-3']
      );
      expect(mockLastKnownIds.saveLastKnownLocalIds).toHaveBeenCalledWith(
        testUserId,
        ['final-local-1', 'final-local-2']
      );
    });
  });

  describe('error handling', () => {
    it('should handle auth errors', async () => {
      const authError = new Error('Authentication failed');
      mockAuth.getCurrentUserIdLegacy.mockRejectedValue(authError);

      const result = await bidirectionalSync();

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(['Bidirectional sync failed: Authentication failed']);
      expect(result.syncedCount).toBe(0);
      
      // Should not proceed to other steps
      expect(mockSyncDataPrep.prepareSyncData).not.toHaveBeenCalled();
    });

    it('should handle sync data preparation errors', async () => {
      const prepError = new Error('Failed to prepare sync data');
      mockSyncDataPrep.prepareSyncData.mockRejectedValue(prepError);

      const result = await bidirectionalSync();

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(['Bidirectional sync failed: Failed to prepare sync data']);
      expect(result.syncedCount).toBe(0);
    });

    it('should handle individual entity sync errors gracefully', async () => {
      const entityError = new Error('Failed to sync specific entity');
      mockConflictResolution.syncSingleEntity
        .mockResolvedValueOnce() // First entity succeeds
        .mockRejectedValueOnce(entityError) // Second entity fails
        .mockResolvedValueOnce(); // Third entity succeeds

      const result = await bidirectionalSync();

      expect(result.success).toBe(false);
      expect(result.syncedCount).toBe(2); // Only successful syncs counted
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Failed to sync specific entity');
      
      // Should still save state if some entities succeeded (but won't because errors.length > 0)
      expect(mockLastKnownIds.saveLastKnownRemoteIds).not.toHaveBeenCalled();
    });

    it('should handle multiple entity sync errors', async () => {
      const error1 = new Error('Entity 1 failed');
      const error2 = new Error('Entity 2 failed');
      
      mockConflictResolution.syncSingleEntity
        .mockRejectedValueOnce(error1)
        .mockRejectedValueOnce(error2)
        .mockResolvedValueOnce(); // Last one succeeds

      const result = await bidirectionalSync();

      expect(result.success).toBe(false);
      expect(result.syncedCount).toBe(1);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toContain('Entity 1 failed');
      expect(result.errors[1]).toContain('Entity 2 failed');
    });

    it('should handle unknown error types', async () => {
      const unknownError = 'String error instead of Error object';
      mockConflictResolution.syncSingleEntity.mockRejectedValue(unknownError);

      const result = await bidirectionalSync();

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('Unknown error');
    });

    it('should not save tracking state when sync has errors', async () => {
      const entityError = new Error('Sync failed');
      mockConflictResolution.syncSingleEntity.mockRejectedValue(entityError);

      const result = await bidirectionalSync();

      expect(result.success).toBe(false);
      expect(mockLastKnownIds.saveLastKnownRemoteIds).not.toHaveBeenCalled();
      expect(mockLastKnownIds.saveLastKnownLocalIds).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle empty sync data', async () => {
      const emptySyncData = {
        localEntities: [],
        remoteEntities: [],
        allIds: new Set<string>(),
        localMap: new Map(),
        remoteMap: new Map(),
        lastKnownRemoteIds: [],
        lastKnownLocalIds: []
      };

      mockSyncDataPrep.prepareSyncData.mockResolvedValue(emptySyncData);
      mockLocalOps.getEntities.mockResolvedValue([]);
      mockRemoteOps.getEntitiesLegacy.mockResolvedValue([]);

      const result = await bidirectionalSync();

      expect(result.success).toBe(true);
      expect(result.localCount).toBe(0);
      expect(result.remoteCount).toBe(0);
      expect(result.syncedCount).toBe(0);
      expect(mockConflictResolution.syncSingleEntity).not.toHaveBeenCalled();
      expect(mockLastKnownIds.saveLastKnownRemoteIds).toHaveBeenCalledWith(testUserId, []);
      expect(mockLastKnownIds.saveLastKnownLocalIds).toHaveBeenCalledWith(testUserId, []);
    });

    it('should handle large number of entities', async () => {
      const largeIdSet = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        largeIdSet.add(`entity-${i}`);
      }

      const largeSyncData = {
        ...mockSyncData,
        allIds: largeIdSet
      };

      mockSyncDataPrep.prepareSyncData.mockResolvedValue(largeSyncData);

      const result = await bidirectionalSync();

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(1000);
      expect(mockConflictResolution.syncSingleEntity).toHaveBeenCalledTimes(1000);
    });

    it('should handle sync data with missing maps', async () => {
      const incompleteSyncData = {
        ...mockSyncData,
        localMap: new Map(),
        remoteMap: new Map()
      };

      mockSyncDataPrep.prepareSyncData.mockResolvedValue(incompleteSyncData);

      const result = await bidirectionalSync();

      expect(result.success).toBe(true);
      
      // Verify syncSingleEntity called with undefined for missing entities
      const syncCalls = mockConflictResolution.syncSingleEntity.mock.calls;
      syncCalls.forEach(call => {
        const [id, local, remote] = call;
        if (id === 'local-1' || id === 'remote-1' || id === 'common-1') {
          expect(local).toBeUndefined();
          expect(remote).toBeUndefined();
        }
      });
    });
  });

  describe('performance and timing', () => {
    it('should track execution time', async () => {
      const beforeSync = Date.now();
      
      const result = await bidirectionalSync();
      
      const afterSync = Date.now();
      
      expect(result.timestamp.getTime()).toBeGreaterThanOrEqual(beforeSync);
      expect(result.timestamp.getTime()).toBeLessThanOrEqual(afterSync);
    });

    it('should handle concurrent entity processing', async () => {
      // Verify that syncSingleEntity is called sequentially (not in parallel)
      let callOrder: number[] = [];
      let callCount = 0;
      
      mockConflictResolution.syncSingleEntity.mockImplementation(async () => {
        callOrder.push(++callCount);
        await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
        return Promise.resolve();
      });

      await bidirectionalSync();

      // Should be called 3 times in sequence
      expect(callOrder).toEqual([1, 2, 3]);
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

    it('should log sync progress and completion', async () => {
      await bidirectionalSync();

      expect(consoleSpy).toHaveBeenCalledWith(
        `[SimpleSync] Starting bidirectional sync for user: ${testUserId}`
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        '[SimpleSync] Updated tracking: 1 local IDs, 1 remote IDs'
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        '[SimpleSync] Bidirectional sync completed: 3/3 entities processed'
      );
    });

    it('should log errors for individual entity failures', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const entityError = new Error('Entity sync failed');
      
      mockConflictResolution.syncSingleEntity
        .mockResolvedValueOnce()
        .mockRejectedValueOnce(entityError)
        .mockResolvedValueOnce();

      await bidirectionalSync();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SimpleSync] Failed to sync entity')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Entity sync failed')
      );
      
      consoleErrorSpy.mockRestore();
    });
  });
});