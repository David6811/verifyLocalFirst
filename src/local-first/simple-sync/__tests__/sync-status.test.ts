/**
 * Unit tests for sync-status module
 * Tests status tracking and management functionality
 */

import {
  getSyncStatus,
  isSyncRunning,
  getLastSyncResult,
  clearSyncStatus,
  updateSyncStatus
} from '../sync-status';
import { SyncResult } from '../types';

describe('sync-status', () => {
  beforeEach(() => {
    clearSyncStatus(); // Reset state before each test
  });

  describe('initial state', () => {
    it('should have correct initial status', () => {
      const status = getSyncStatus();
      expect(status.isRunning).toBe(false);
      expect(status.lastResult).toBeUndefined();
      expect(status.lastSync).toBeUndefined();
      expect(status.error).toBeUndefined();
    });

    it('should return false for isSyncRunning initially', () => {
      expect(isSyncRunning()).toBe(false);
    });

    it('should return undefined for getLastSyncResult initially', () => {
      expect(getLastSyncResult()).toBeUndefined();
    });
  });

  describe('updateSyncStatus', () => {
    it('should update isRunning status', () => {
      updateSyncStatus({ isRunning: true });
      
      expect(isSyncRunning()).toBe(true);
      expect(getSyncStatus().isRunning).toBe(true);
    });

    it('should update lastSync timestamp', () => {
      const testDate = new Date('2024-01-01T12:00:00Z');
      updateSyncStatus({ lastSync: testDate });
      
      const status = getSyncStatus();
      expect(status.lastSync).toEqual(testDate);
    });

    it('should update error message', () => {
      const errorMsg = 'Test sync error';
      updateSyncStatus({ error: errorMsg });
      
      const status = getSyncStatus();
      expect(status.error).toBe(errorMsg);
    });

    it('should update lastResult', () => {
      const mockResult: SyncResult = {
        success: true,
        localCount: 5,
        remoteCount: 3,
        syncedCount: 8,
        errors: [],
        timestamp: new Date(),
        direction: 'bidirectional'
      };

      updateSyncStatus({ lastResult: mockResult });
      
      expect(getLastSyncResult()).toEqual(mockResult);
      expect(getSyncStatus().lastResult).toEqual(mockResult);
    });

    it('should partially update status', () => {
      // Set initial state
      updateSyncStatus({
        isRunning: true,
        error: 'Initial error'
      });

      // Partial update
      updateSyncStatus({ isRunning: false });

      const status = getSyncStatus();
      expect(status.isRunning).toBe(false);
      expect(status.error).toBe('Initial error'); // Should preserve existing values
    });

    it('should handle multiple updates', () => {
      const mockResult: SyncResult = {
        success: false,
        localCount: 2,
        remoteCount: 4,
        syncedCount: 0,
        errors: ['Network error'],
        timestamp: new Date(),
        direction: 'bidirectional'
      };

      // First update
      updateSyncStatus({ isRunning: true });
      expect(isSyncRunning()).toBe(true);

      // Second update with result
      updateSyncStatus({
        isRunning: false,
        lastResult: mockResult,
        lastSync: mockResult.timestamp,
        error: 'Sync failed'
      });

      const status = getSyncStatus();
      expect(status.isRunning).toBe(false);
      expect(status.lastResult).toEqual(mockResult);
      expect(status.lastSync).toEqual(mockResult.timestamp);
      expect(status.error).toBe('Sync failed');
    });
  });

  describe('clearSyncStatus', () => {
    it('should reset status to initial state', () => {
      // Set some state
      const mockResult: SyncResult = {
        success: true,
        localCount: 1,
        remoteCount: 1,
        syncedCount: 2,
        errors: [],
        timestamp: new Date(),
        direction: 'bidirectional'
      };

      updateSyncStatus({
        isRunning: true,
        lastResult: mockResult,
        lastSync: new Date(),
        error: 'Some error'
      });

      // Clear status
      clearSyncStatus();

      // Verify reset
      const status = getSyncStatus();
      expect(status.isRunning).toBe(false);
      expect(status.lastResult).toBeUndefined();
      expect(status.lastSync).toBeUndefined();
      expect(status.error).toBeUndefined();
      
      expect(isSyncRunning()).toBe(false);
      expect(getLastSyncResult()).toBeUndefined();
    });
  });

  describe('state isolation', () => {
    it('should return copies of status to prevent external mutation', () => {
      const mockResult: SyncResult = {
        success: true,
        localCount: 1,
        remoteCount: 1,
        syncedCount: 2,
        errors: [],
        timestamp: new Date(),
        direction: 'bidirectional'
      };

      updateSyncStatus({ lastResult: mockResult });

      const status1 = getSyncStatus();
      const status2 = getSyncStatus();

      // Should be equal but different objects
      expect(status1).toEqual(status2);
      expect(status1).not.toBe(status2);

      // Mutating returned status should not affect internal state
      status1.isRunning = true;
      expect(getSyncStatus().isRunning).toBe(false);
    });
  });
});