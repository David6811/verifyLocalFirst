/**
 * Simplified Auto-Sync Engine
 * 
 * Self-contained auto-sync engine with essential functionality only.
 */

import { bidirectionalSync } from '../simple-sync';
import { ConfigurationManager } from './config';
import { StatusManager } from './status';
import { FilterManager } from './filter';
import { QueueManager } from './queue';
import { 
  StorageChangeDetector,
  PeriodicSyncDetector, 
  RemoteChangeDetector
} from './detectors';
import { 
  AutoSyncEvent, 
  AutoSyncStatus,
  AutoSyncEventType
} from './types';
import { performanceMetrics } from './metrics/performance-metrics';

class AutoSyncEngine {
  private configManager: ConfigurationManager;
  private statusManager: StatusManager;
  private filterManager: FilterManager;
  private queueManager: QueueManager;
  private storageChangeDetector: StorageChangeDetector;
  private periodicSyncDetector: PeriodicSyncDetector;
  private remoteChangeDetector: RemoteChangeDetector;

  constructor(configManager?: ConfigurationManager) {
    this.configManager = configManager || new ConfigurationManager();
    this.statusManager = new StatusManager();
    this.filterManager = new FilterManager(this.configManager, this.statusManager);
    this.queueManager = new QueueManager(
      this.configManager, 
      this.statusManager, 
      () => this.executeBidirectionalSync()
    );
    
    // Initialize detectors
    this.storageChangeDetector = new StorageChangeDetector({
      onStorageChange: (changedKeys) => this.handleStorageChange(changedKeys)
    });
    
    this.periodicSyncDetector = new PeriodicSyncDetector({
      onPeriodicSync: () => this.handlePeriodicSync(),
      configManager: this.configManager
    });
    
    this.remoteChangeDetector = new RemoteChangeDetector({
      tableName: this.configManager.getTableName(),
      onRemoteChange: (payload) => this.handleRemoteChange(payload)
    });
  }

  /**
   * Initialize auto-sync engine
   */
  async initialize(): Promise<void> {
    console.log('🔄 AutoSyncEngine: Initializing auto-sync engine');
    
    // Load configuration
    await this.configManager.loadSettings();
    this.statusManager.setEnabled(this.configManager.isEnabled());
    
    // Set up detectors
    this.storageChangeDetector.setupDetection();
    this.periodicSyncDetector.setupDetection();
    await this.remoteChangeDetector.setupDetection();
    
    console.log('✅ AutoSyncEngine: Auto-sync engine initialized');
  }

  /**
   * Handle Chrome storage changes
   */
  private handleStorageChange(changedKeys: string[]): void {
    const filterResult = this.filterManager.filterStorageChange(changedKeys);
    
    if (!filterResult.allowed) {
      return;
    }
    
    this.filterManager.recordLocalChange();
    this.enqueueSync({
      type: AutoSyncEventType.DATA_CHANGE,
      source: 'local',
      timestamp: new Date(),
      priority: 'high'
    });
  }

  /**
   * Handle periodic sync triggers
   */
  private handlePeriodicSync(): void {
    if (this.configManager.isEnabled() && !this.statusManager.isRunning()) {
      this.enqueueSync({
        type: AutoSyncEventType.TIMER_TRIGGER,
        timestamp: new Date(),
        priority: 'low'
      });
    }
  }

  /**
   * Add sync event to internal queue
   */
  enqueueSync(event: AutoSyncEvent): void {
    this.queueManager.enqueueSync(event);
  }

  /**
   * Execute bidirectional sync
   */
  private async executeBidirectionalSync(): Promise<void> {
    console.log('🔄 AutoSyncEngine: Executing sync');
    
    try {
      this.filterManager.setSyncOperationInProgress(true);
      const result = await bidirectionalSync();
      this.statusManager.setLastSync(new Date(), result);
      
      console.log('✅ AutoSyncEngine: Sync completed:', {
        success: result.success,
        synced: result.syncedCount,
        errors: result.errors.length
      });
      
    } catch (error) {
      console.error('❌ AutoSyncEngine: Sync failed:', error);
      throw error;
    } finally {
      this.filterManager.setSyncOperationInProgressWithTimeout(false, 2000);
    }
  }

  /**
   * Handle remote database changes
   */
  private handleRemoteChange(payload: any): void {
    const filterResult = this.filterManager.filterRemoteChange(payload);
    
    if (!filterResult.allowed) {
      return;
    }
    
    this.enqueueSync({
      type: AutoSyncEventType.REMOTE_CHANGE,
      source: 'remote',
      entityId: payload.new?.id || payload.old?.id,
      timestamp: new Date(),
      priority: 'high'
    });
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.storageChangeDetector.cleanup();
    this.periodicSyncDetector.cleanup();
    this.remoteChangeDetector.cleanup();
    this.queueManager.cleanup();
    this.filterManager.cleanup();
  }

  /**
   * Enable or disable auto-sync
   */
  async setEnabled(enabled: boolean): Promise<void> {
    await this.configManager.setEnabled(enabled);
    
    if (enabled) {
      this.periodicSyncDetector.setupDetection();
      await this.remoteChangeDetector.setupDetection();
    } else {
      this.periodicSyncDetector.cleanup();
      this.remoteChangeDetector.cleanup();
    }
    
    this.statusManager.setEnabled(enabled);
  }

  /**
   * Get current auto-sync status
   */
  getStatus(): AutoSyncStatus {
    return this.statusManager.getStatus();
  }

  /**
   * Manually trigger sync
   */
  triggerSync(): void {
    this.enqueueSync({
      type: AutoSyncEventType.MANUAL_TRIGGER,
      timestamp: new Date(),
      priority: 'high'
    });
  }

  /**
   * Add status listener
   */
  addStatusListener(listener: (status: AutoSyncStatus) => void): void {
    this.statusManager.addListener(listener);
  }

  /**
   * Remove status listener
   */
  removeStatusListener(listener: (status: AutoSyncStatus) => void): void {
    this.statusManager.removeListener(listener);
  }

  /**
   * Get sync queue size for debugging
   */
  getQueueSize(): number {
    return this.queueManager.getQueueSize();
  }

  /**
   * Clear sync queue (for testing/debugging)
   */
  clearQueue(): void {
    this.queueManager.clearQueue();
  }

  /**
   * Refresh remote change detection (called when user signs in/out)
   */
  async refreshRemoteChangeDetection(): Promise<void> {
    await this.remoteChangeDetector.refreshDetection();
  }

  /**
   * Get remote subscription status
   */
  getRemoteSubscriptionStatus(): any {
    return this.remoteChangeDetector.getSubscriptionStatus();
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): {
    basicReport: Record<string, number>;
    systemMetrics: {
      queueSize: number;
      isEnabled: boolean;
      isRunning: boolean;
      lastSync: Date | undefined;
    };
  } {
    const basicReport = performanceMetrics.getBasicReport();
    const status = this.getStatus();
    
    return {
      basicReport,
      systemMetrics: {
        queueSize: this.getQueueSize(),
        isEnabled: status.enabled,
        isRunning: status.isRunning,
        lastSync: status.lastSync
      }
    };
  }
}

/**
 * Create an AutoSyncEngine with table configuration
 */
export function createAutoSyncEngine(tableName?: string): AutoSyncEngine {
  if (tableName) {
    const configManager = new ConfigurationManager({ tableName });
    return new AutoSyncEngine(configManager);
  }
  return new AutoSyncEngine();
}

/**
 * Create an AutoSyncEngine with full table configuration (alias for backward compatibility)
 */
export function createConfiguredAutoSyncEngine(
  tableConfig: { tableName?: string; storageKeyPrefix?: string } = {}
): AutoSyncEngine {
  const configManager = new ConfigurationManager(tableConfig);
  return new AutoSyncEngine(configManager);
}

/**
 * Auto-sync service singleton
 */
export const autoSyncService = new AutoSyncEngine();

export { AutoSyncEngine };
export type { AutoSyncEvent, AutoSyncStatus, QueueItem } from './types';