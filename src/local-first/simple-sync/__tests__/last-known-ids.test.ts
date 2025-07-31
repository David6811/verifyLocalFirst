/**
 * Unit tests for last-known-ids module
 * Tests ID tracking functionality for delete detection
 */

import {
  getLastKnownRemoteIds,
  getLastKnownLocalIds,
  saveLastKnownRemoteIds,
  saveLastKnownLocalIds
} from '../last-known-ids';

// Mock Chrome storage
const mockStorageData: Record<string, any> = {};

const mockChromeStorage = {
  get: jest.fn().mockImplementation((keys: string[]) => {
    const result: Record<string, any> = {};
    keys.forEach(key => {
      if (key in mockStorageData) {
        result[key] = mockStorageData[key];
      }
    });
    return Promise.resolve(result);
  }),
  set: jest.fn().mockImplementation((items: Record<string, any>) => {
    Object.assign(mockStorageData, items);
    return Promise.resolve();
  }),
  clear: jest.fn().mockImplementation(() => {
    Object.keys(mockStorageData).forEach(key => delete mockStorageData[key]);
    return Promise.resolve();
  })
};

// Setup global chrome mock
global.chrome = {
  storage: {
    local: mockChromeStorage
  }
} as any;

describe('last-known-ids', () => {
  const testUserId = 'test-user-123';
  const anotherUserId = 'another-user-456';

  beforeEach(async () => {
    // Clear mock storage and reset mocks
    await mockChromeStorage.clear();
    jest.clearAllMocks();
  });

  describe('getLastKnownRemoteIds', () => {
    it('should return empty array for new user', async () => {
      const ids = await getLastKnownRemoteIds(testUserId);
      expect(ids).toEqual([]);
    });

    it('should return previously saved remote IDs', async () => {
      const testIds = ['remote-1', 'remote-2', 'remote-3'];
      await saveLastKnownRemoteIds(testUserId, testIds);

      const retrieved = await getLastKnownRemoteIds(testUserId);
      expect(retrieved).toEqual(testIds);
    });

    it('should return empty array when storage get fails', async () => {
      mockChromeStorage.get.mockRejectedValueOnce(new Error('Storage error'));
      
      const ids = await getLastKnownRemoteIds(testUserId);
      expect(ids).toEqual([]);
    });

    it('should maintain user isolation', async () => {
      const user1Ids = ['user1-remote-1', 'user1-remote-2'];
      const user2Ids = ['user2-remote-1'];

      await saveLastKnownRemoteIds(testUserId, user1Ids);
      await saveLastKnownRemoteIds(anotherUserId, user2Ids);

      const retrieved1 = await getLastKnownRemoteIds(testUserId);
      const retrieved2 = await getLastKnownRemoteIds(anotherUserId);

      expect(retrieved1).toEqual(user1Ids);
      expect(retrieved2).toEqual(user2Ids);
    });
  });

  describe('getLastKnownLocalIds', () => {
    it('should return empty array for new user', async () => {
      const ids = await getLastKnownLocalIds(testUserId);
      expect(ids).toEqual([]);
    });

    it('should return previously saved local IDs', async () => {
      const testIds = ['local-1', 'local-2', 'local-3'];
      await saveLastKnownLocalIds(testUserId, testIds);

      const retrieved = await getLastKnownLocalIds(testUserId);
      expect(retrieved).toEqual(testIds);
    });

    it('should handle storage errors gracefully', async () => {
      mockChromeStorage.get.mockRejectedValueOnce(new Error('Storage error'));
      
      const ids = await getLastKnownLocalIds(testUserId);
      expect(ids).toEqual([]);
    });
  });

  describe('saveLastKnownRemoteIds', () => {
    it('should save remote IDs with timestamp', async () => {
      const testIds = ['remote-1', 'remote-2'];
      const beforeSave = Date.now();
      
      await saveLastKnownRemoteIds(testUserId, testIds);
      
      const afterSave = Date.now();
      const key = `last_known_remote_ids_${testUserId}`;
      const timestampKey = `${key}_timestamp`;

      expect(mockChromeStorage.set).toHaveBeenCalledWith({
        [key]: testIds,
        [timestampKey]: expect.any(Number)
      });

      // Verify timestamp is reasonable
      const savedData = mockChromeStorage.set.mock.calls[0][0];
      const timestamp = savedData[timestampKey];
      expect(timestamp).toBeGreaterThanOrEqual(beforeSave);
      expect(timestamp).toBeLessThanOrEqual(afterSave);
    });

    it('should handle save errors gracefully', async () => {
      mockChromeStorage.set.mockRejectedValueOnce(new Error('Storage full'));
      
      // Should not throw
      await expect(saveLastKnownRemoteIds(testUserId, ['id1'])).resolves.toBeUndefined();
    });

    it('should save empty array', async () => {
      await saveLastKnownRemoteIds(testUserId, []);
      
      const key = `last_known_remote_ids_${testUserId}`;
      expect(mockChromeStorage.set).toHaveBeenCalledWith({
        [key]: [],
        [`${key}_timestamp`]: expect.any(Number)
      });
    });

    it('should overwrite previous data', async () => {
      const firstIds = ['id1', 'id2'];
      const secondIds = ['id3', 'id4', 'id5'];

      await saveLastKnownRemoteIds(testUserId, firstIds);
      await saveLastKnownRemoteIds(testUserId, secondIds);

      const retrieved = await getLastKnownRemoteIds(testUserId);
      expect(retrieved).toEqual(secondIds);
    });
  });

  describe('saveLastKnownLocalIds', () => {
    it('should save local IDs with timestamp', async () => {
      const testIds = ['local-1', 'local-2', 'local-3'];
      
      await saveLastKnownLocalIds(testUserId, testIds);
      
      const key = `last_known_local_ids_${testUserId}`;
      const timestampKey = `${key}_timestamp`;

      expect(mockChromeStorage.set).toHaveBeenCalledWith({
        [key]: testIds,
        [timestampKey]: expect.any(Number)
      });
    });

    it('should handle large ID arrays', async () => {
      const largeIdArray = Array.from({ length: 1000 }, (_, i) => `id-${i}`);
      
      await saveLastKnownLocalIds(testUserId, largeIdArray);
      const retrieved = await getLastKnownLocalIds(testUserId);
      
      expect(retrieved).toEqual(largeIdArray);
    });

    it('should handle save errors gracefully', async () => {
      mockChromeStorage.set.mockRejectedValueOnce(new Error('Storage error'));
      
      // Should not throw
      await expect(saveLastKnownLocalIds(testUserId, ['id1'])).resolves.toBeUndefined();
    });
  });

  describe('data persistence and retrieval', () => {
    it('should persist data across function calls', async () => {
      const remoteIds = ['r1', 'r2', 'r3'];
      const localIds = ['l1', 'l2'];

      // Save data
      await saveLastKnownRemoteIds(testUserId, remoteIds);
      await saveLastKnownLocalIds(testUserId, localIds);

      // Retrieve data in separate calls
      const retrievedRemote = await getLastKnownRemoteIds(testUserId);
      const retrievedLocal = await getLastKnownLocalIds(testUserId);

      expect(retrievedRemote).toEqual(remoteIds);
      expect(retrievedLocal).toEqual(localIds);
    });

    it('should maintain separate storage for different users', async () => {
      const user1RemoteIds = ['u1-r1', 'u1-r2'];
      const user1LocalIds = ['u1-l1'];
      const user2RemoteIds = ['u2-r1', 'u2-r2', 'u2-r3'];
      const user2LocalIds = ['u2-l1', 'u2-l2'];

      // Save data for both users
      await saveLastKnownRemoteIds(testUserId, user1RemoteIds);
      await saveLastKnownLocalIds(testUserId, user1LocalIds);
      await saveLastKnownRemoteIds(anotherUserId, user2RemoteIds);
      await saveLastKnownLocalIds(anotherUserId, user2LocalIds);

      // Verify isolation
      expect(await getLastKnownRemoteIds(testUserId)).toEqual(user1RemoteIds);
      expect(await getLastKnownLocalIds(testUserId)).toEqual(user1LocalIds);
      expect(await getLastKnownRemoteIds(anotherUserId)).toEqual(user2RemoteIds);
      expect(await getLastKnownLocalIds(anotherUserId)).toEqual(user2LocalIds);
    });

    it('should handle special characters in user IDs', async () => {
      const specialUserId = 'user@example.com-123_test';
      const testIds = ['id1', 'id2'];

      await saveLastKnownRemoteIds(specialUserId, testIds);
      const retrieved = await getLastKnownRemoteIds(specialUserId);

      expect(retrieved).toEqual(testIds);
    });
  });
});