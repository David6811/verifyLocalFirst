/**
 * Integration tests for manual sync functionality
 * Tests the complete sync flow from UI trigger to data synchronization
 */

import { performManualSync } from '../../../manual-sync';
import { getSyncStatus, isSyncRunning, clearSyncStatus } from '../../sync-status';
import { TestEnvironment, createMockSyncResult, expectSyncSuccess } from '../../testing-utils/test-helpers';

// Mock the dependencies
jest.mock('../../bidirectional-operations', () => ({
  bidirectionalSync: jest.fn()
}));

const mockBidirectionalSync = require('../../bidirectional-operations').bidirectionalSync;

describe('Manual Sync Integration', () => {
  let testEnv: TestEnvironment;

  beforeEach(() => {
    testEnv = new TestEnvironment();
    clearSyncStatus();
    jest.clearAllMocks();
  });

  afterEach(() => {
    testEnv.cleanup();
  });

  describe('successful sync flow', () => {
    it('should complete full manual sync workflow', async () => {
      // Setup successful sync result
      const expectedResult = createMockSyncResult({
        success: true,
        syncedCount: 5,
        errors: []
      });
      mockBidirectionalSync.mockResolvedValue(expectedResult);

      // Verify initial state
      expect(isSyncRunning()).toBe(false);

      // Perform manual sync
      const result = await performManualSync();

      // Verify sync completed successfully
      expectSyncSuccess(result);
      expect(result).toEqual(expectedResult);

      // Verify final state
      expect(isSyncRunning()).toBe(false);
      const status = getSyncStatus();
      expect(status.lastResult).toEqual(expectedResult);
      expect(status.lastSync).toEqual(expectedResult.timestamp);
      expect(status.error).toBeUndefined();
    });

    it('should update status during sync execution', async () => {
      // Create a promise that we can control
      let resolveBidirectionalSync: (result: any) => void;
      const syncPromise = new Promise(resolve => {
        resolveBidirectionalSync = resolve;
      });
      mockBidirectionalSync.mockReturnValue(syncPromise);

      // Start sync (don't await yet)
      const syncResultPromise = performManualSync();

      // Verify sync is running
      expect(isSyncRunning()).toBe(true);
      const runningStatus = getSyncStatus();
      expect(runningStatus.isRunning).toBe(true);
      expect(runningStatus.error).toBeUndefined();

      // Complete the sync
      const expectedResult = createMockSyncResult({ success: true });
      resolveBidirectionalSync!(expectedResult);

      // Wait for sync to complete
      const result = await syncResultPromise;

      // Verify final state
      expect(isSyncRunning()).toBe(false);
      expectSyncSuccess(result);
    });
  });

  describe('error handling', () => {
    it('should handle bidirectional sync errors', async () => {
      const syncError = new Error('Network connection failed');
      mockBidirectionalSync.mockRejectedValue(syncError);

      // Attempt sync and expect it to throw
      await expect(performManualSync()).rejects.toThrow('Network connection failed');

      // Verify error state
      expect(isSyncRunning()).toBe(false);
      const status = getSyncStatus();
      expect(status.error).toBe('Network connection failed');
      expect(status.lastSync).toBeDefined();
    });

    it('should handle sync failures with error results', async () => {
      const failedResult = createMockSyncResult({
        success: false,
        errors: ['Failed to sync entity 1', 'Failed to sync entity 2']
      });
      mockBidirectionalSync.mockResolvedValue(failedResult);

      const result = await performManualSync();

      // Verify failed result is handled correctly
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(2);

      const status = getSyncStatus();
      expect(status.error).toBe('Failed to sync entity 1; Failed to sync entity 2');
      expect(status.lastResult).toEqual(failedResult);
    });

    it('should prevent concurrent sync operations', async () => {
      // Setup a slow sync
      let resolveFirstSync: (result: any) => void;
      const firstSyncPromise = new Promise(resolve => {
        resolveFirstSync = resolve;
      });
      mockBidirectionalSync.mockReturnValue(firstSyncPromise);

      // Start first sync
      const firstSyncResultPromise = performManualSync();
      expect(isSyncRunning()).toBe(true);

      // Try to start second sync - should throw immediately
      await expect(performManualSync()).rejects.toThrow('Sync already in progress');

      // Complete first sync
      const expectedResult = createMockSyncResult({ success: true });
      resolveFirstSync!(expectedResult);
      
      const firstResult = await firstSyncResultPromise;
      expectSyncSuccess(firstResult);

      // Now second sync should be allowed
      mockBidirectionalSync.mockResolvedValue(createMockSyncResult({ success: true }));
      const secondResult = await performManualSync();
      expectSyncSuccess(secondResult);
    });
  });

  describe('logging and console output', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should log sync start and completion', async () => {
      const successResult = createMockSyncResult({ success: true });
      mockBidirectionalSync.mockResolvedValue(successResult);

      await performManualSync();

      expect(consoleSpy).toHaveBeenCalledWith('[SimpleSync] Starting manual sync');
      expect(consoleSpy).toHaveBeenCalledWith('[SimpleSync] Manual sync completed:', successResult);
    });

    it('should log sync errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const syncError = new Error('Test error');
      mockBidirectionalSync.mockRejectedValue(syncError);

      await expect(performManualSync()).rejects.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith('[SimpleSync] Manual sync failed:', syncError);
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('state consistency', () => {
    it('should maintain consistent state across multiple sync operations', async () => {
      // First sync - successful
      const firstResult = createMockSyncResult({ 
        success: true, 
        syncedCount: 3,
        timestamp: new Date('2024-01-01T10:00:00Z')
      });
      mockBidirectionalSync.mockResolvedValue(firstResult);

      const result1 = await performManualSync();
      expectSyncSuccess(result1);

      const status1 = getSyncStatus();
      expect(status1.lastResult).toEqual(firstResult);
      expect(status1.error).toBeUndefined();

      // Second sync - failed
      const secondResult = createMockSyncResult({
        success: false,
        errors: ['Sync error'],
        timestamp: new Date('2024-01-01T11:00:00Z')
      });
      mockBidirectionalSync.mockResolvedValue(secondResult);

      const result2 = await performManualSync();
      expect(result2.success).toBe(false);

      const status2 = getSyncStatus();
      expect(status2.lastResult).toEqual(secondResult);
      expect(status2.error).toBe('Sync error');

      // Third sync - successful again
      const thirdResult = createMockSyncResult({
        success: true,
        syncedCount: 1,
        timestamp: new Date('2024-01-01T12:00:00Z')
      });
      mockBidirectionalSync.mockResolvedValue(thirdResult);

      const result3 = await performManualSync();
      expectSyncSuccess(result3);

      const status3 = getSyncStatus();
      expect(status3.lastResult).toEqual(thirdResult);
      expect(status3.error).toBeUndefined(); // Error should be cleared on success
    });

    it('should properly clean up state on status clear', async () => {
      // Perform a sync to set some state
      const result = createMockSyncResult({ success: true });
      mockBidirectionalSync.mockResolvedValue(result);
      
      await performManualSync();
      
      // Verify state is set
      const statusBefore = getSyncStatus();
      expect(statusBefore.lastResult).toBeDefined();
      expect(statusBefore.lastSync).toBeDefined();

      // Clear status
      clearSyncStatus();

      // Verify state is cleared
      const statusAfter = getSyncStatus();
      expect(statusAfter.lastResult).toBeUndefined();
      expect(statusAfter.lastSync).toBeUndefined();
      expect(statusAfter.error).toBeUndefined();
      expect(statusAfter.isRunning).toBe(false);

      // Should be able to sync again after clear
      const newResult = createMockSyncResult({ success: true });
      mockBidirectionalSync.mockResolvedValue(newResult);
      
      const syncResult = await performManualSync();
      expectSyncSuccess(syncResult);
    });
  });
});