/**
 * Comprehensive tests for StorageChangeDetector
 * Tests Chrome storage monitoring functionality only
 * (Periodic sync functionality is now in separate PeriodicSyncDetector)
 */

import { StorageChangeDetector, StorageChangeDetectorConfig } from '../storage-change-detector';

// Mock Chrome APIs
global.chrome = {
  storage: {
    onChanged: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    local: {
      get: jest.fn(),
      set: jest.fn(),
      clear: jest.fn()
    }
  }
} as any;

describe('StorageChangeDetector', () => {
  let storageChangeDetector: StorageChangeDetector;
  let mockOnStorageChange: jest.Mock;

  beforeEach(() => {
    // Create mocks
    mockOnStorageChange = jest.fn();
    
    // Create detector config (simplified)
    const config: StorageChangeDetectorConfig = {
      onStorageChange: mockOnStorageChange,
      storageArea: 'local'
    };
    
    // Create detector
    storageChangeDetector = new StorageChangeDetector(config);
    
    // Clear mock calls
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Cleanup detector
    storageChangeDetector.cleanup();
  });

  describe('Initialization', () => {
    it('should initialize correctly', () => {
      expect(storageChangeDetector).toBeDefined();
      expect(storageChangeDetector.isActive()).toBe(false);
    });
  });

  describe('Storage Change Detection Setup', () => {
    it('should set up storage change detection correctly', () => {
      storageChangeDetector.setupDetection();
      
      expect(chrome.storage.onChanged.addListener).toHaveBeenCalledTimes(1);
      expect(chrome.storage.onChanged.addListener).toHaveBeenCalledWith(expect.any(Function));
      expect(storageChangeDetector.isActive()).toBe(true);
    });
  });

  describe('Storage Change Handling', () => {
    let storageListener: Function;

    beforeEach(() => {
      storageChangeDetector.setupDetection();
      
      // Get the listener function that was registered with Chrome API
      storageListener = (chrome.storage.onChanged.addListener as jest.Mock).mock.calls[0][0];
    });

    it('should handle storage changes for local area', () => {
      jest.useFakeTimers();
      
      const changes = {
        'bookmarks': { newValue: 'test', oldValue: null }
      };
      
      storageListener(changes, 'local');
      
      // Fast forward to trigger batched processing
      jest.advanceTimersByTime(200);
      
      expect(mockOnStorageChange).toHaveBeenCalledTimes(1);
      expect(mockOnStorageChange).toHaveBeenCalledWith(['bookmarks']);
      
      jest.useRealTimers();
    });

    it('should ignore storage changes for non-local areas', () => {
      jest.useFakeTimers();
      
      const changes = {
        'bookmarks': { newValue: 'test', oldValue: null }
      };
      
      storageListener(changes, 'sync');
      storageListener(changes, 'managed');
      
      // Fast forward to trigger batched processing
      jest.advanceTimersByTime(200);
      
      expect(mockOnStorageChange).not.toHaveBeenCalled();
      
      jest.useRealTimers();
    });

    it('should batch multiple rapid storage changes', () => {
      jest.useFakeTimers();
      
      const changes1 = { 'bookmark1': { newValue: 'test1', oldValue: null } };
      const changes2 = { 'bookmark2': { newValue: 'test2', oldValue: null } };
      const changes3 = { 'bookmark3': { newValue: 'test3', oldValue: null } };
      
      storageListener(changes1, 'local');
      storageListener(changes2, 'local');
      storageListener(changes3, 'local');
      
      // Fast forward to trigger batched processing
      jest.advanceTimersByTime(200);
      
      // Should only call once with all keys
      expect(mockOnStorageChange).toHaveBeenCalledTimes(1);
      expect(mockOnStorageChange).toHaveBeenCalledWith(['bookmark1', 'bookmark2', 'bookmark3']);
      
      jest.useRealTimers();
    });

    it('should handle errors in storage change processing gracefully', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      mockOnStorageChange.mockImplementation(() => {
        throw new Error('Test error');
      });
      
      jest.useFakeTimers();
      
      const changes = {
        'bookmarks': { newValue: 'test', oldValue: null }
      };
      
      storageListener(changes, 'local');
      
      // Fast forward to trigger batched processing
      jest.advanceTimersByTime(200);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌ StorageChangeDetector: Error handling storage change:'),
        expect.any(Error)
      );
      
      jest.useRealTimers();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup storage change listener', () => {
      storageChangeDetector.setupDetection();
      storageChangeDetector.cleanup();
      
      // Verify Chrome API listener was removed
      expect(chrome.storage.onChanged.removeListener).toHaveBeenCalledTimes(1);
      expect(chrome.storage.onChanged.removeListener).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should set detector as inactive after cleanup', () => {
      storageChangeDetector.setupDetection();
      expect(storageChangeDetector.isActive()).toBe(true);
      
      storageChangeDetector.cleanup();
      expect(storageChangeDetector.isActive()).toBe(false);
    });

    it('should handle cleanup when not initialized', () => {
      // Should not throw error
      expect(() => storageChangeDetector.cleanup()).not.toThrow();
    });
  });

  describe('Status Methods', () => {
    it('should return correct active status', () => {
      expect(storageChangeDetector.isActive()).toBe(false);
      
      storageChangeDetector.setupDetection();
      expect(storageChangeDetector.isActive()).toBe(true);
      
      storageChangeDetector.cleanup();
      expect(storageChangeDetector.isActive()).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty storage changes', () => {
      jest.useFakeTimers();
      
      storageChangeDetector.setupDetection();
      const storageListener = chrome.storage.onChanged.addListener.mock.calls[0][0];
      
      const changes = {};
      
      storageListener(changes, 'local');
      
      // Fast forward to trigger batched processing
      jest.advanceTimersByTime(200);
      
      expect(mockOnStorageChange).toHaveBeenCalledTimes(1);
      expect(mockOnStorageChange).toHaveBeenCalledWith([]);
      
      jest.useRealTimers();
    });

    it('should handle multiple setup calls gracefully', () => {
      storageChangeDetector.setupDetection();
      storageChangeDetector.setupDetection();
      storageChangeDetector.setupDetection();
      
      // Should only add listener once per setup call (behavior depends on implementation)
      expect(chrome.storage.onChanged.addListener).toHaveBeenCalledTimes(3);
      expect(storageChangeDetector.isActive()).toBe(true);
    });
  });

  describe('Provider Interaction', () => {
    it('should work with any storage change provider', () => {
      // Test shows provider abstraction works
      storageChangeDetector.setupDetection();
      
      expect(chrome.storage.onChanged.addListener).toHaveBeenCalledTimes(1);
      expect(storageChangeDetector.isActive()).toBe(true);
      
      storageChangeDetector.cleanup();
      
      expect(chrome.storage.onChanged.removeListener).toHaveBeenCalledTimes(1);
      expect(storageChangeDetector.isActive()).toBe(false);
    });
  });
});