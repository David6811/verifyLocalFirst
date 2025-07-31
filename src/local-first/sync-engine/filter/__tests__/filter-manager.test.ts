/**
 * Filter Manager Tests
 * 
 * Comprehensive test suite for the FilterManager class,
 * covering all four-layer protection logic and edge cases.
 */

import { FilterManager, FilterResult, FilterContext } from '../filter-manager';
import { ConfigurationManager } from '../../config';
import { StatusManager } from '../../status';

// Mock Chrome storage API
const mockChrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  }
};

(global as any).chrome = mockChrome;

describe('FilterManager', () => {
  let filterManager: FilterManager;
  let configManager: ConfigurationManager;
  let statusManager: StatusManager;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Mock Chrome storage responses
    mockChrome.storage.local.get.mockResolvedValue({});
    mockChrome.storage.local.set.mockResolvedValue(undefined);
    
    // Create fresh instances
    configManager = new ConfigurationManager();
    statusManager = new StatusManager();
    filterManager = new FilterManager(configManager, statusManager);
  });

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const stats = filterManager.getFilterStats();
      
      expect(stats.lastLocalChangeTime).toBeNull();
      expect(stats.isPerformingSyncOperation).toBe(false);
      expect(stats.activeTimeouts).toBe(0);
    });

    it('should initialize with correct dependencies', () => {
      const context = filterManager.getFilterContext();
      
      expect(context.isEnabled).toBe(true); // Default config state
      expect(context.isRunning).toBe(false); // Default status state
      expect(context.queueSize).toBe(0); // Default queue size
    });
  });

  describe('Storage Change Filtering', () => {
    describe('Data Relevance Layer', () => {
      it('should allow relevant bookmark entity changes', () => {
        const changedKeys = ['mateme_entity_123', 'mateme_entity_456'];
        configManager.setEnabled(true);
        
        const result = filterManager.filterStorageChange(changedKeys);
        
        expect(result.allowed).toBe(true);
        expect(result.reason).toBe('All filters passed - storage change allowed');
      });

      it('should allow repository index changes', () => {
        const changedKeys = ['mateme_index'];
        configManager.setEnabled(true);
        
        const result = filterManager.filterStorageChange(changedKeys);
        
        expect(result.allowed).toBe(true);
        expect(result.reason).toBe('All filters passed - storage change allowed');
      });

      it('should filter out sync tracking data', () => {
        const changedKeys = ['mateme_sync_123', 'mateme_sync_456'];
        
        const result = filterManager.filterStorageChange(changedKeys);
        
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('No relevant data changes detected');
        expect(result.layer).toBe('data-relevance');
      });

      it('should filter out internal state data', () => {
        const changedKeys = ['mateme_localfirst_state', 'mateme_metadata'];
        
        const result = filterManager.filterStorageChange(changedKeys);
        
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('No relevant data changes detected');
        expect(result.layer).toBe('data-relevance');
      });

      it('should filter out UI refresh triggers', () => {
        const changedKeys = ['bookmarks_last_update', 'last_known_bookmark_ids'];
        
        const result = filterManager.filterStorageChange(changedKeys);
        
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('No relevant data changes detected');
        expect(result.layer).toBe('data-relevance');
      });

      it('should filter mixed relevant and irrelevant changes', () => {
        const changedKeys = [
          'mateme_entity_123',      // Relevant
          'mateme_sync_456',        // Irrelevant
          'mateme_index',           // Relevant
          'bookmarks_last_update'   // Irrelevant
        ];
        configManager.setEnabled(true);
        
        const result = filterManager.filterStorageChange(changedKeys);
        
        expect(result.allowed).toBe(true);
        expect(result.reason).toBe('All filters passed - storage change allowed');
      });
    });

    describe('Configuration Layer', () => {
      it('should block changes when auto-sync is disabled', () => {
        const changedKeys = ['mateme_entity_123'];
        configManager.setEnabled(false);
        
        const result = filterManager.filterStorageChange(changedKeys);
        
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('Auto-sync disabled');
        expect(result.layer).toBe('config');
      });

      it('should allow changes when auto-sync is enabled', () => {
        const changedKeys = ['mateme_entity_123'];
        configManager.setEnabled(true);
        
        const result = filterManager.filterStorageChange(changedKeys);
        
        expect(result.allowed).toBe(true);
      });
    });

    describe('Self-Change Layer', () => {
      it('should block changes during sync operation', () => {
        const changedKeys = ['mateme_entity_123'];
        configManager.setEnabled(true);
        filterManager.setSyncOperationInProgress(true);
        
        const result = filterManager.filterStorageChange(changedKeys);
        
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('Ignoring changes during sync operation');
        expect(result.layer).toBe('self-change');
      });

      it('should allow changes when sync operation is complete', () => {
        const changedKeys = ['mateme_entity_123'];
        configManager.setEnabled(true);
        filterManager.setSyncOperationInProgress(false);
        
        const result = filterManager.filterStorageChange(changedKeys);
        
        expect(result.allowed).toBe(true);
      });
    });

    describe('Processing State Layer', () => {
      it('should block changes when sync is already running', async () => {
        const changedKeys = ['mateme_entity_123'];
        await configManager.setEnabled(true);
        statusManager.setRunningSynchronously(true);
        
        const result = filterManager.filterStorageChange(changedKeys);
        
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('Sync already processing');
        expect(result.layer).toBe('processing-state');
      });

      it('should allow changes when sync is not running', async () => {
        const changedKeys = ['mateme_entity_123'];
        await configManager.setEnabled(true);
        statusManager.setRunningSynchronously(false);
        
        const result = filterManager.filterStorageChange(changedKeys);
        
        expect(result.allowed).toBe(true);
      });
    });

    describe('Queue State Layer', () => {
      it('should block changes when queue has pending items', async () => {
        const changedKeys = ['mateme_entity_123'];
        await configManager.setEnabled(true);
        statusManager.setQueueSizeSynchronously(2);
        
        const result = filterManager.filterStorageChange(changedKeys);
        
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('Sync already queued');
        expect(result.layer).toBe('queue-state');
      });

      it('should allow changes when queue is empty', async () => {
        const changedKeys = ['mateme_entity_123'];
        await configManager.setEnabled(true);
        statusManager.setQueueSizeSynchronously(0);
        
        const result = filterManager.filterStorageChange(changedKeys);
        
        expect(result.allowed).toBe(true);
      });
    });

    describe('Layer Priority', () => {
      it('should apply data relevance filter first', () => {
        const changedKeys = ['mateme_sync_123']; // Irrelevant data
        configManager.setEnabled(false); // Would fail config layer
        statusManager.setRunning(true); // Would fail processing layer
        
        const result = filterManager.filterStorageChange(changedKeys);
        
        expect(result.allowed).toBe(false);
        expect(result.layer).toBe('data-relevance'); // Should fail on first layer
      });

      it('should apply config filter after data relevance', () => {
        const changedKeys = ['mateme_entity_123']; // Relevant data
        configManager.setEnabled(false); // Config disabled
        statusManager.setRunning(true); // Would fail processing layer
        
        const result = filterManager.filterStorageChange(changedKeys);
        
        expect(result.allowed).toBe(false);
        expect(result.layer).toBe('config'); // Should fail on config layer
      });

      it('should apply self-change filter after config', () => {
        const changedKeys = ['mateme_entity_123']; // Relevant data
        configManager.setEnabled(true); // Config enabled
        filterManager.setSyncOperationInProgress(true); // Sync in progress
        statusManager.setRunning(true); // Would fail processing layer
        
        const result = filterManager.filterStorageChange(changedKeys);
        
        expect(result.allowed).toBe(false);
        expect(result.layer).toBe('self-change'); // Should fail on self-change layer
      });
    });
  });

  describe('Remote Change Filtering', () => {
    const mockPayload = {
      eventType: 'UPDATE',
      table: 'bookmarks',
      schema: 'public',
      new: { id: 123, title: 'Test Bookmark' },
      old: { id: 123, title: 'Old Title' }
    };

    describe('Configuration Layer', () => {
      it('should block remote changes when auto-sync is disabled', () => {
        configManager.setEnabled(false);
        
        const result = filterManager.filterRemoteChange(mockPayload);
        
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('Auto-sync disabled');
        expect(result.layer).toBe('config');
      });

      it('should allow remote changes when auto-sync is enabled', () => {
        configManager.setEnabled(true);
        
        const result = filterManager.filterRemoteChange(mockPayload);
        
        expect(result.allowed).toBe(true);
      });
    });

    describe('Self-Change Layer', () => {
      it('should block remote changes that are self-changes', () => {
        configManager.setEnabled(true);
        
        // Record a recent local change
        filterManager.recordLocalChange();
        
        const result = filterManager.filterRemoteChange(mockPayload);
        
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('Filtered out self-change');
        expect(result.layer).toBe('self-change');
      });

      it('should allow remote changes that are not self-changes', () => {
        configManager.setEnabled(true);
        
        // No recent local changes
        const result = filterManager.filterRemoteChange(mockPayload);
        
        expect(result.allowed).toBe(true);
      });

      it('should allow remote changes after self-change window expires', (done) => {
        configManager.setEnabled(true);
        
        // Record a local change
        filterManager.recordLocalChange();
        
        // Wait for self-change window to expire
        setTimeout(() => {
          const result = filterManager.filterRemoteChange(mockPayload);
          
          expect(result.allowed).toBe(true);
          done();
        }, 2100); // Wait longer than 2 second self-change window
      });
    });

    describe('Processing State Layer', () => {
      it('should block remote changes when sync is running', async () => {
        await configManager.setEnabled(true);
        statusManager.setRunningSynchronously(true);
        
        const result = filterManager.filterRemoteChange(mockPayload);
        
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('Sync already processing');
        expect(result.layer).toBe('processing-state');
      });

      it('should allow remote changes when sync is not running', async () => {
        await configManager.setEnabled(true);
        statusManager.setRunningSynchronously(false);
        
        const result = filterManager.filterRemoteChange(mockPayload);
        
        expect(result.allowed).toBe(true);
      });
    });

    describe('Queue State Layer', () => {
      it('should block remote changes when queue has pending items', async () => {
        await configManager.setEnabled(true);
        statusManager.setQueueSizeSynchronously(1);
        
        const result = filterManager.filterRemoteChange(mockPayload);
        
        expect(result.allowed).toBe(false);
        expect(result.reason).toBe('Sync already queued');
        expect(result.layer).toBe('queue-state');
      });

      it('should allow remote changes when queue is empty', () => {
        configManager.setEnabled(true);
        statusManager.setQueueSize(0);
        
        const result = filterManager.filterRemoteChange(mockPayload);
        
        expect(result.allowed).toBe(true);
      });
    });
  });

  describe('Self-Change Detection', () => {
    it('should record local changes with timestamp', () => {
      const beforeRecord = new Date();
      filterManager.recordLocalChange();
      const afterRecord = new Date();
      
      const stats = filterManager.getFilterStats();
      
      expect(stats.lastLocalChangeTime).toBeDefined();
      expect(stats.lastLocalChangeTime!.getTime()).toBeGreaterThanOrEqual(beforeRecord.getTime());
      expect(stats.lastLocalChangeTime!.getTime()).toBeLessThanOrEqual(afterRecord.getTime());
    });

    it('should detect self-changes within time window', () => {
      configManager.setEnabled(true);
      
      // Record a local change
      filterManager.recordLocalChange();
      
      // Immediately test remote change (should be filtered as self-change)
      const mockPayload = { eventType: 'UPDATE', new: { id: 123 } };
      const result = filterManager.filterRemoteChange(mockPayload);
      
      expect(result.allowed).toBe(false);
      expect(result.layer).toBe('self-change');
    });

    it('should allow remote changes outside time window', (done) => {
      configManager.setEnabled(true);
      
      // Record a local change
      filterManager.recordLocalChange();
      
      // Wait for self-change window to expire
      setTimeout(() => {
        const mockPayload = { eventType: 'UPDATE', new: { id: 123 } };
        const result = filterManager.filterRemoteChange(mockPayload);
        
        expect(result.allowed).toBe(true);
        done();
      }, 2100); // Wait longer than 2 second window
    });
  });

  describe('Sync Operation Management', () => {
    it('should set sync operation in progress', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      filterManager.setSyncOperationInProgress(true);
      
      const stats = filterManager.getFilterStats();
      expect(stats.isPerformingSyncOperation).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith('🔒 FilterManager: Self-change filtering enabled during sync');
      
      consoleSpy.mockRestore();
    });

    it('should clear sync operation in progress', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      filterManager.setSyncOperationInProgress(true);
      filterManager.setSyncOperationInProgress(false);
      
      const stats = filterManager.getFilterStats();
      expect(stats.isPerformingSyncOperation).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('🔓 FilterManager: Self-change filtering disabled after sync');
      
      consoleSpy.mockRestore();
    });

    it('should set sync operation with timeout', (done) => {
      filterManager.setSyncOperationInProgressWithTimeout(true);
      
      let stats = filterManager.getFilterStats();
      expect(stats.isPerformingSyncOperation).toBe(true);
      expect(stats.activeTimeouts).toBe(0);
      
      filterManager.setSyncOperationInProgressWithTimeout(false, 100);
      
      stats = filterManager.getFilterStats();
      expect(stats.isPerformingSyncOperation).toBe(true); // Still true during timeout
      expect(stats.activeTimeouts).toBe(1);
      
      setTimeout(() => {
        stats = filterManager.getFilterStats();
        expect(stats.isPerformingSyncOperation).toBe(false); // Should be false after timeout
        expect(stats.activeTimeouts).toBe(0);
        done();
      }, 150);
    });
  });

  describe('Filter Context and Statistics', () => {
    it('should provide current filter context', async () => {
      await configManager.setEnabled(true);
      statusManager.setRunningSynchronously(true);
      statusManager.setQueueSizeSynchronously(3);
      filterManager.recordLocalChange();
      filterManager.setSyncOperationInProgress(true);
      
      const context = filterManager.getFilterContext();
      
      expect(context.isEnabled).toBe(true);
      expect(context.isRunning).toBe(true);
      expect(context.queueSize).toBe(3);
      expect(context.lastLocalChangeTime).toBeDefined();
      expect(context.isPerformingSyncOperation).toBe(true);
    });

    it('should provide filter statistics', () => {
      filterManager.recordLocalChange();
      filterManager.setSyncOperationInProgress(true);
      
      const stats = filterManager.getFilterStats();
      
      expect(stats.lastLocalChangeTime).toBeDefined();
      expect(stats.isPerformingSyncOperation).toBe(true);
      expect(stats.activeTimeouts).toBe(0);
      expect(stats.filterContext).toBeDefined();
    });
  });

  describe('Reset and Cleanup', () => {
    it('should reset filter state', () => {
      // Set up some state
      filterManager.recordLocalChange();
      filterManager.setSyncOperationInProgress(true);
      
      // Reset
      filterManager.reset();
      
      const stats = filterManager.getFilterStats();
      expect(stats.lastLocalChangeTime).toBeNull();
      expect(stats.isPerformingSyncOperation).toBe(false);
      expect(stats.activeTimeouts).toBe(0);
    });

    it('should cleanup resources', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Set up some state
      filterManager.recordLocalChange();
      filterManager.setSyncOperationInProgress(true);
      
      // Cleanup
      filterManager.cleanup();
      
      const stats = filterManager.getFilterStats();
      expect(stats.lastLocalChangeTime).toBeNull();
      expect(stats.isPerformingSyncOperation).toBe(false);
      expect(stats.activeTimeouts).toBe(0);
      expect(consoleSpy).toHaveBeenCalledWith('🧹 FilterManager: Cleaning up filter manager');
      
      consoleSpy.mockRestore();
    });

    it('should clear all timeouts on cleanup', (done) => {
      // Set up multiple timeouts
      filterManager.setSyncOperationInProgressWithTimeout(false, 1000);
      filterManager.setSyncOperationInProgressWithTimeout(false, 2000);
      
      let stats = filterManager.getFilterStats();
      expect(stats.activeTimeouts).toBe(2);
      
      // Cleanup should clear all timeouts
      filterManager.cleanup();
      
      stats = filterManager.getFilterStats();
      expect(stats.activeTimeouts).toBe(0);
      
      // Verify timeouts were actually cleared (they shouldn't execute)
      setTimeout(() => {
        stats = filterManager.getFilterStats();
        expect(stats.isPerformingSyncOperation).toBe(false);
        done();
      }, 1100);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty changed keys array', () => {
      const changedKeys: string[] = [];
      
      const result = filterManager.filterStorageChange(changedKeys);
      
      expect(result.allowed).toBe(false);
      expect(result.layer).toBe('data-relevance');
    });

    it('should handle null payload in remote change filter', () => {
      configManager.setEnabled(true);
      
      const result = filterManager.filterRemoteChange(null);
      
      expect(result.allowed).toBe(true); // Should pass if no self-change detected
    });

    it('should handle multiple sync operation state changes', () => {
      filterManager.setSyncOperationInProgress(true);
      filterManager.setSyncOperationInProgress(true); // Double set
      filterManager.setSyncOperationInProgress(false);
      
      const stats = filterManager.getFilterStats();
      expect(stats.isPerformingSyncOperation).toBe(false);
    });

    it('should handle rapid local change recordings', () => {
      const initialTime = new Date();
      
      filterManager.recordLocalChange();
      const firstTime = filterManager.getFilterStats().lastLocalChangeTime!;
      
      // Record another change immediately
      filterManager.recordLocalChange();
      const secondTime = filterManager.getFilterStats().lastLocalChangeTime!;
      
      expect(secondTime.getTime()).toBeGreaterThanOrEqual(firstTime.getTime());
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete storage change workflow', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Enable auto-sync
      configManager.setEnabled(true);
      
      // Test relevant change
      let result = filterManager.filterStorageChange(['mateme_entity_123']);
      expect(result.allowed).toBe(true);
      
      // Start sync operation
      filterManager.setSyncOperationInProgress(true);
      
      // Test change during sync (should be blocked)
      result = filterManager.filterStorageChange(['mateme_entity_456']);
      expect(result.allowed).toBe(false);
      expect(result.layer).toBe('self-change');
      
      // End sync operation
      filterManager.setSyncOperationInProgress(false);
      
      // Test change after sync (should be allowed)
      result = filterManager.filterStorageChange(['mateme_entity_789']);
      expect(result.allowed).toBe(true);
      
      consoleSpy.mockRestore();
    });

    it('should handle complete remote change workflow', () => {
      const mockPayload = { eventType: 'UPDATE', new: { id: 123 } };
      
      // Enable auto-sync
      configManager.setEnabled(true);
      
      // Test remote change (should be allowed)
      let result = filterManager.filterRemoteChange(mockPayload);
      expect(result.allowed).toBe(true);
      
      // Record local change
      filterManager.recordLocalChange();
      
      // Test remote change (should be filtered as self-change)
      result = filterManager.filterRemoteChange(mockPayload);
      expect(result.allowed).toBe(false);
      expect(result.layer).toBe('self-change');
      
      // Set queue size
      statusManager.setQueueSizeSynchronously(1);
      
      // Reset local change time to avoid self-change filter
      filterManager.reset();
      
      // Test remote change (should be blocked by queue)
      result = filterManager.filterRemoteChange(mockPayload);
      expect(result.allowed).toBe(false);
      expect(result.layer).toBe('queue-state');
    });
  });
});