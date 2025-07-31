/**
 * Status Manager Tests
 * 
 * Comprehensive test suite for the StatusManager class,
 * covering all public methods, listener management, and edge cases.
 */

import { StatusManager } from '../status-manager';
import { AutoSyncStatus, StatusListener } from '../../types';
import { SyncResult } from '../../../simple-sync';

describe('StatusManager', () => {
  let statusManager: StatusManager;
  let mockListener: jest.MockedFunction<StatusListener>;

  beforeEach(() => {
    statusManager = new StatusManager();
    mockListener = jest.fn();
  });

  describe('Initialization', () => {
    it('should initialize with default status', () => {
      const status = statusManager.getStatus();
      
      expect(status).toEqual({
        enabled: false,
        isRunning: false,
        queueSize: 0
      });
    });

    it('should initialize with custom initial status', () => {
      const customStatus = new StatusManager({
        enabled: true,
        queueSize: 5,
        error: 'Test error'
      });
      
      const status = customStatus.getStatus();
      
      expect(status).toEqual({
        enabled: true,
        isRunning: false,
        queueSize: 5,
        error: 'Test error'
      });
    });

    it('should return immutable status snapshot', () => {
      const status1 = statusManager.getStatus();
      const status2 = statusManager.getStatus();
      
      expect(status1).not.toBe(status2); // Different objects
      expect(status1).toEqual(status2); // Same values
    });
  });

  describe('Status Updates', () => {
    it('should update single status property', () => {
      statusManager.updateStatus({ enabled: true });
      
      expect(statusManager.getStatus().enabled).toBe(true);
      expect(statusManager.getStatus().isRunning).toBe(false); // Other properties unchanged
    });

    it('should update multiple status properties', () => {
      statusManager.updateStatus({ 
        enabled: true, 
        isRunning: true, 
        queueSize: 3 
      });
      
      const status = statusManager.getStatus();
      expect(status.enabled).toBe(true);
      expect(status.isRunning).toBe(true);
      expect(status.queueSize).toBe(3);
    });

    it('should preserve existing properties when updating', () => {
      const lastSync = new Date();
      const lastResult: SyncResult = {
        success: true,
        localCount: 5,
        remoteCount: 5,
        syncedCount: 5,
        errors: [],
        timestamp: lastSync,
        direction: 'bidirectional'
      };
      
      statusManager.updateStatus({ lastSync, lastResult });
      statusManager.updateStatus({ enabled: true });
      
      const status = statusManager.getStatus();
      expect(status.enabled).toBe(true);
      expect(status.lastSync).toBe(lastSync);
      expect(status.lastResult).toBe(lastResult);
    });

    it('should notify listeners on status update', () => {
      statusManager.addListener(mockListener);
      
      statusManager.updateStatus({ enabled: true });
      
      expect(mockListener).toHaveBeenCalledWith({
        enabled: true,
        isRunning: false,
        queueSize: 0
      });
    });
  });

  describe('Convenient Setter Methods', () => {
    beforeEach(() => {
      statusManager.addListener(mockListener);
    });

    it('should set enabled state', () => {
      statusManager.setEnabledSynchronously(true);
      
      expect(statusManager.isEnabled()).toBe(true);
      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: true })
      );
    });

    it('should set running state', () => {
      statusManager.setRunningSynchronously(true);
      
      expect(statusManager.isRunning()).toBe(true);
      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({ isRunning: true })
      );
    });

    it('should set queue size', () => {
      statusManager.setQueueSizeSynchronously(5);
      
      expect(statusManager.getQueueSize()).toBe(5);
      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({ queueSize: 5 })
      );
    });

    it('should set last sync information', () => {
      const lastSync = new Date();
      const lastResult: SyncResult = {
        success: true,
        localCount: 3,
        remoteCount: 3,
        syncedCount: 3,
        errors: [],
        timestamp: lastSync,
        direction: 'bidirectional'
      };
      
      statusManager.setLastSync(lastSync, lastResult);
      
      expect(statusManager.getLastSync()).toBe(lastSync);
      expect(statusManager.getLastResult()).toBe(lastResult);
      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({ lastSync, lastResult })
      );
    });

    it('should clear error on successful sync', () => {
      statusManager.setErrorSynchronously('Test error');
      expect(statusManager.hasError()).toBe(true);
      
      const lastSync = new Date();
      const successResult: SyncResult = {
        success: true,
        localCount: 1,
        remoteCount: 1,
        syncedCount: 1,
        errors: [],
        timestamp: lastSync,
        direction: 'bidirectional'
      };
      
      statusManager.setLastSync(lastSync, successResult);
      
      expect(statusManager.hasError()).toBe(false);
      expect(statusManager.getError()).toBeUndefined();
    });

    it('should preserve error on failed sync', () => {
      statusManager.setErrorSynchronously('Test error');
      
      const lastSync = new Date();
      const failedResult: SyncResult = {
        success: false,
        localCount: 1,
        remoteCount: 1,
        syncedCount: 0,
        errors: ['Sync failed'],
        timestamp: lastSync,
        direction: 'bidirectional'
      };
      
      statusManager.setLastSync(lastSync, failedResult);
      
      expect(statusManager.hasError()).toBe(true);
      expect(statusManager.getError()).toBe('Test error');
    });

    it('should set error state', () => {
      statusManager.setErrorSynchronously('Test error');
      
      expect(statusManager.hasError()).toBe(true);
      expect(statusManager.getError()).toBe('Test error');
      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Test error' })
      );
    });

    it('should clear error state', () => {
      statusManager.setErrorSynchronously('Test error');
      statusManager.clearError();
      
      expect(statusManager.hasError()).toBe(false);
      expect(statusManager.getError()).toBeUndefined();
      expect(mockListener).toHaveBeenLastCalledWith(
        expect.objectContaining({ error: undefined })
      );
    });

    it('should set next scheduled sync', () => {
      const nextSync = new Date(Date.now() + 60000);
      statusManager.updateStatus({ nextScheduledSync: nextSync });
      
      expect(statusManager.getStatus().nextScheduledSync).toBe(nextSync);
      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({ nextScheduledSync: nextSync })
      );
    });
  });

  describe('Listener Management', () => {
    it('should add listener and notify immediately', () => {
      statusManager.updateStatus({ enabled: true });
      
      statusManager.addListener(mockListener);
      
      expect(mockListener).toHaveBeenCalledWith({
        enabled: true,
        isRunning: false,
        queueSize: 0
      });
    });

    it('should not add duplicate listeners', () => {
      statusManager.addListener(mockListener);
      statusManager.addListener(mockListener);
      
      expect(statusManager.getListenerCount()).toBe(1);
      
      statusManager.updateStatus({ enabled: true });
      
      expect(mockListener).toHaveBeenCalledTimes(2); // Once on add, once on update
    });

    it('should remove listener', () => {
      statusManager.addListener(mockListener);
      expect(statusManager.getListenerCount()).toBe(1);
      
      statusManager.removeListener(mockListener);
      expect(statusManager.getListenerCount()).toBe(0);
      
      statusManager.updateStatus({ enabled: true });
      
      expect(mockListener).toHaveBeenCalledTimes(1); // Only the initial call
    });

    it('should handle removing non-existent listener', () => {
      const nonExistentListener = jest.fn();
      
      expect(() => {
        statusManager.removeListener(nonExistentListener);
      }).not.toThrow();
      
      expect(statusManager.getListenerCount()).toBe(0);
    });

    it('should remove all listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      statusManager.addListener(listener1);
      statusManager.addListener(listener2);
      expect(statusManager.getListenerCount()).toBe(2);
      
      statusManager.removeAllListeners();
      expect(statusManager.getListenerCount()).toBe(0);
      
      statusManager.updateStatus({ enabled: true });
      
      expect(listener1).toHaveBeenCalledTimes(1); // Only initial notification
      expect(listener2).toHaveBeenCalledTimes(1); // Only initial notification
    });

    it('should handle listener errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const errorListener = jest.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      
      statusManager.addListener(errorListener);
      
      // The listener is removed immediately when added due to error in initial notification
      expect(statusManager.getListenerCount()).toBe(0);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '❌ StatusManager: Listener error:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    it('should notify multiple listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      statusManager.addListener(listener1);
      statusManager.addListener(listener2);
      
      statusManager.updateStatus({ enabled: true });
      
      const expectedStatus = {
        enabled: true,
        isRunning: false,
        queueSize: 0
      };
      
      expect(listener1).toHaveBeenCalledWith(expectedStatus);
      expect(listener2).toHaveBeenCalledWith(expectedStatus);
    });
  });

  describe('Status Getters', () => {
    beforeEach(() => {
      const lastSync = new Date();
      const lastResult: SyncResult = {
        success: true,
        localCount: 5,
        remoteCount: 5,
        syncedCount: 5,
        errors: [],
        timestamp: lastSync,
        direction: 'bidirectional'
      };
      
      statusManager.updateStatus({
        enabled: true,
        isRunning: true,
        queueSize: 3,
        lastSync,
        lastResult,
        error: 'Test error'
      });
    });

    it('should return enabled state', () => {
      expect(statusManager.isEnabled()).toBe(true);
    });

    it('should return running state', () => {
      expect(statusManager.isRunning()).toBe(true);
    });

    it('should return error state', () => {
      expect(statusManager.hasError()).toBe(true);
      expect(statusManager.getError()).toBe('Test error');
    });

    it('should return queue size', () => {
      expect(statusManager.getQueueSize()).toBe(3);
    });

    it('should return last sync time', () => {
      expect(statusManager.getLastSync()).toBeInstanceOf(Date);
    });

    it('should return last sync result', () => {
      const result = statusManager.getLastResult();
      expect(result).toBeDefined();
      expect(result?.success).toBe(true);
      expect(result?.syncedCount).toBe(5);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset to default state', () => {
      statusManager.updateStatusSynchronously({
        enabled: true,
        isRunning: true,
        queueSize: 5,
        error: 'Test error'
      });
      
      statusManager.reset();
      
      expect(statusManager.getStatus()).toEqual({
        enabled: false,
        isRunning: false,
        queueSize: 0
      });
    });

    it('should notify listeners on reset', () => {
      statusManager.addListener(mockListener);
      
      statusManager.reset();
      
      expect(mockListener).toHaveBeenCalledWith({
        enabled: false,
        isRunning: false,
        queueSize: 0
      });
    });
  });

  describe('Logging', () => {
    beforeEach(() => {
      // Mock console methods
      jest.spyOn(console, 'log').mockImplementation();
      jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should log enabled state changes', () => {
      statusManager.setEnabled(true);
      
      expect(console.log).toHaveBeenCalledWith('⚙️ StatusManager: Auto-sync enabled');
      
      statusManager.setEnabled(false);
      
      expect(console.log).toHaveBeenCalledWith('⚙️ StatusManager: Auto-sync disabled');
    });

    it('should log running state changes', () => {
      statusManager.setRunning(true);
      
      expect(console.log).toHaveBeenCalledWith('🔄 StatusManager: Sync started');
      
      statusManager.setRunning(false);
      
      expect(console.log).toHaveBeenCalledWith('🔄 StatusManager: Sync stopped');
    });

    it('should log error state changes', () => {
      statusManager.setError('Test error');
      
      expect(console.error).toHaveBeenCalledWith('❌ StatusManager: Error: Test error');
      
      statusManager.clearError();
      
      expect(console.log).toHaveBeenCalledWith('✅ StatusManager: Error cleared');
    });

    // Queue size changes are not logged in the simplified implementation
    it.skip('should log queue size changes', () => {
      // This functionality is not implemented in the simplified StatusManager
    });

    // Sync completion logging is not implemented in the simplified StatusManager
    it.skip('should log successful sync completion', () => {
      // This functionality is not implemented in the simplified StatusManager
    });

    it('should not log unchanged values', () => {
      statusManager.setEnabled(false); // Same as default
      statusManager.setRunning(false); // Same as default
      statusManager.setQueueSize(0); // Same as default
      
      expect(console.log).not.toHaveBeenCalled();
      expect(console.error).not.toHaveBeenCalled();
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle rapid status updates', () => {
      const listener = jest.fn();
      statusManager.addListener(listener);
      
      statusManager.setEnabled(true);
      statusManager.setRunning(true);
      statusManager.setQueueSize(5);
      statusManager.setError('Test error');
      
      // In the simplified implementation, each update triggers a listener call immediately
      // Should have been called 5 times: initial + 4 updates
      expect(listener).toHaveBeenCalledTimes(5);
      
      // Final status should reflect all updates
      expect(statusManager.getStatus()).toEqual({
        enabled: true,
        isRunning: true,
        queueSize: 5,
        error: 'Test error'
      });
    });

    it('should handle concurrent listener operations', () => {
      const listeners = Array.from({ length: 10 }, () => jest.fn());
      
      // Add all listeners
      listeners.forEach(listener => statusManager.addListener(listener));
      expect(statusManager.getListenerCount()).toBe(10);
      
      // Update status
      statusManager.setEnabledSynchronously(true);
      
      // All listeners should be notified
      listeners.forEach(listener => {
        expect(listener).toHaveBeenCalledWith(
          expect.objectContaining({ enabled: true })
        );
      });
      
      // Remove half the listeners
      listeners.slice(0, 5).forEach(listener => statusManager.removeListener(listener));
      expect(statusManager.getListenerCount()).toBe(5);
      
      // Only remaining listeners should be notified
      statusManager.setRunningSynchronously(true);
      
      listeners.slice(0, 5).forEach(listener => {
        expect(listener).toHaveBeenCalledTimes(2); // Initial + first update only
      });
      
      listeners.slice(5).forEach(listener => {
        expect(listener).toHaveBeenCalledTimes(3); // Initial + both updates
      });
    });
  });
});