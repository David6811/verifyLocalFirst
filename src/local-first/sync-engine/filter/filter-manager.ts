/**
 * Filter Manager for Auto-Sync Engine
 * 
 * Implements the four-layer protection logic to prevent unnecessary sync operations
 * and avoid sync loops. Provides comprehensive filtering for both local and remote changes.
 * 
 * Four-Layer Protection:
 * 1. Data Relevance Filter: Only sync relevant data changes (entity data)
 * 2. Self-Change Filter: Ignore changes caused by sync operations
 * 3. Processing State Filter: Don't trigger sync if already processing
 * 4. Queue State Filter: Don't trigger sync if queue already has pending items
 */

import { ConfigurationManager } from '../config';
import { StatusManager } from '../status';

export enum FilterLayer {
  DATA_RELEVANCE = 'data-relevance',
  SELF_CHANGE = 'self-change',
  PROCESSING_STATE = 'processing-state',
  QUEUE_STATE = 'queue-state',
  CONFIG = 'config'
}

export interface FilterResult {
  allowed: boolean;
  reason?: string;
  layer?: FilterLayer;
}

export interface FilterContext {
  isEnabled: boolean;
  isRunning: boolean;
  queueSize: number;
  lastLocalChangeTime: Date | null;
  isPerformingSyncOperation: boolean;
}

export class FilterManager {
  private configManager: ConfigurationManager;
  private statusManager: StatusManager;
  private lastLocalChangeTime: Date | null = null;
  private isPerformingSyncOperation: boolean = false;
  // Performance optimization: Bounded timeout collection
  private syncOperationTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private static readonly MAX_TIMEOUTS = 50;

  constructor(configManager: ConfigurationManager, statusManager: StatusManager) {
    this.configManager = configManager;
    this.statusManager = statusManager;
  }

  /**
   * Filter Chrome storage changes using four-layer protection
   */
  filterStorageChange(changedKeys: string[]): FilterResult {
    // Layer 1: Data Relevance Filter
    const relevantChanges = this.filterRelevantStorageKeys(changedKeys);
    if (relevantChanges.length === 0) {
      return {
        allowed: false,
        reason: 'No relevant data changes detected',
        layer: FilterLayer.DATA_RELEVANCE
      };
    }

    // Layer 2: Configuration Filter  
    if (!this.configManager.isEnabled()) {
      return {
        allowed: false,
        reason: 'Auto-sync disabled',
        layer: FilterLayer.CONFIG
      };
    }

    // Layer 3: Self-Change Filter
    if (this.isPerformingSyncOperation) {
      return {
        allowed: false,
        reason: 'Ignoring changes during sync operation',
        layer: FilterLayer.SELF_CHANGE
      };
    }

    // Layer 4: Processing State Filter
    if (this.statusManager.isRunning()) {
      return {
        allowed: false,
        reason: 'Sync already processing',
        layer: FilterLayer.PROCESSING_STATE
      };
    }

    // Layer 5: Queue State Filter
    if (this.statusManager.getQueueSize() > 0) {
      return {
        allowed: false,
        reason: 'Sync already queued',
        layer: FilterLayer.QUEUE_STATE
      };
    }

    // All filters passed
    return {
      allowed: true,
      reason: 'All filters passed - storage change allowed'
    };
  }

  /**
   * Filter remote changes using four-layer protection
   */
  filterRemoteChange(payload: any): FilterResult {
    // Layer 1: Configuration Filter
    if (!this.configManager.isEnabled()) {
      return {
        allowed: false,
        reason: 'Auto-sync disabled',
        layer: FilterLayer.CONFIG
      };
    }

    // Layer 2: Self-Change Filter
    if (this.isSelfChange(payload)) {
      return {
        allowed: false,
        reason: 'Filtered out self-change',
        layer: FilterLayer.SELF_CHANGE
      };
    }

    // Layer 3: Processing State Filter
    if (this.statusManager.isRunning()) {
      return {
        allowed: false,
        reason: 'Sync already processing',
        layer: FilterLayer.PROCESSING_STATE
      };
    }

    // Layer 4: Queue State Filter
    if (this.statusManager.getQueueSize() > 0) {
      return {
        allowed: false,
        reason: 'Sync already queued',
        layer: FilterLayer.QUEUE_STATE
      };
    }

    // All filters passed
    return {
      allowed: true,
      reason: 'All filters passed - remote change allowed'
    };
  }

  /**
   * Filter relevant storage keys (Data Relevance Layer)
   */
  private filterRelevantStorageKeys(changedKeys: string[]): string[] {
    // First exclude all internal/tracking keys to prevent sync loops
    const cleanKeys = changedKeys.filter(key => 
      !key.startsWith('last_known_') &&           // Exclude sync tracking keys
      !key.startsWith('mateme_sync_') &&          // Exclude sync state
      !key.startsWith('mateme_localfirst_') &&    // Exclude internal state
      !key.startsWith('mateme_metadata') &&       // Exclude repository metadata
      !key.includes('_last_update') &&            // Exclude UI refresh triggers
      !key.includes('_ids_')                      // Additional safety for tracking keys
    );
    
    // Then check for valid data keys only
    return cleanKeys.filter(key => 
      key.startsWith('mateme_entity_') ||         // Only actual entity data changes
      key === 'mateme_index'                      // Repository index changes
    );
  }

  /**
   * Determine if a remote change is actually from this client (Self-Change Layer)
   */
  private isSelfChange(_payload: any): boolean {
    // If no recent local changes, it's definitely a remote change
    if (!this.lastLocalChangeTime) {
      return false;
    }
    
    // Check if the change occurred within the self-change filter window
    const now = new Date();
    const timeSinceLocalChange = now.getTime() - this.lastLocalChangeTime.getTime();
    
    if (timeSinceLocalChange > this.configManager.getSelfChangeFilterWindow()) {
      return false;
    }
    
    // Additional filtering could be added here (e.g., checking user_id from payload)
    // For now, assume changes within the window might be self-changes
    const isLikelySelfChange = timeSinceLocalChange < 2000; // 2 seconds
    
    if (isLikelySelfChange) {
      console.log('🔍 FilterManager: Potential self-change detected (within 2s of local change)');
    }
    
    return isLikelySelfChange;
  }

  /**
   * Mark that a sync operation is starting (Self-Change Layer)
   */
  setSyncOperationInProgress(inProgress: boolean): void {
    this.isPerformingSyncOperation = inProgress;
    
    if (inProgress) {
      console.log('🔒 FilterManager: Self-change filtering enabled during sync');
    } else {
      console.log('🔓 FilterManager: Self-change filtering disabled after sync');
    }
  }

  /**
   * Set sync operation in progress with automatic timeout cleanup and bounded collection
   */
  setSyncOperationInProgressWithTimeout(inProgress: boolean, timeoutMs: number = 2000): void {
    if (inProgress) {
      this.setSyncOperationInProgress(true);
    } else {
      // Clean up oldest timeouts if we're at capacity
      if (this.syncOperationTimeouts.size >= FilterManager.MAX_TIMEOUTS) {
        const oldestKey = this.syncOperationTimeouts.keys().next().value;
        if (oldestKey) {
          const oldTimeout = this.syncOperationTimeouts.get(oldestKey);
          if (oldTimeout) clearTimeout(oldTimeout);
          this.syncOperationTimeouts.delete(oldestKey);
        }
      }
      
      // Add delay to ensure all storage changes are processed
      const timeoutKey = `timeout-${Date.now()}-${Math.random()}`;
      const timeout = setTimeout(() => {
        this.setSyncOperationInProgress(false);
        this.syncOperationTimeouts.delete(timeoutKey);
      }, timeoutMs);
      
      this.syncOperationTimeouts.set(timeoutKey, timeout);
    }
  }

  /**
   * Track when local changes occur (Self-Change Layer)
   */
  recordLocalChange(): void {
    this.lastLocalChangeTime = new Date();
    console.log('📝 FilterManager: Local change recorded for self-change filtering');
  }

  /**
   * Get current filter context for debugging
   */
  getFilterContext(): FilterContext {
    return {
      isEnabled: this.configManager.isEnabled(),
      isRunning: this.statusManager.isRunning(),
      queueSize: this.statusManager.getQueueSize(),
      lastLocalChangeTime: this.lastLocalChangeTime,
      isPerformingSyncOperation: this.isPerformingSyncOperation
    };
  }

  /**
   * Reset filter state (useful for testing)
   */
  reset(): void {
    this.lastLocalChangeTime = null;
    this.isPerformingSyncOperation = false;
    this.clearAllTimeouts();
  }

  /**
   * Clear all sync operation timeouts
   */
  private clearAllTimeouts(): void {
    this.syncOperationTimeouts.forEach(timeout => clearTimeout(timeout));
    this.syncOperationTimeouts.clear();
  }

  /**
   * Clean up filter manager resources
   */
  cleanup(): void {
    console.log('🧹 FilterManager: Cleaning up filter manager');
    this.clearAllTimeouts();
    this.reset();
  }

  /**
   * Get filter statistics for debugging
   */
  getFilterStats(): {
    lastLocalChangeTime: Date | null;
    isPerformingSyncOperation: boolean;
    activeTimeouts: number;
    filterContext: FilterContext;
  } {
    return {
      lastLocalChangeTime: this.lastLocalChangeTime,
      isPerformingSyncOperation: this.isPerformingSyncOperation,
      activeTimeouts: this.syncOperationTimeouts.size,
      filterContext: this.getFilterContext()
    };
  }
}