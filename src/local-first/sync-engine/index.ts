/**
 * Sync Engine Module Index
 * 
 * Exports all sync engine components including the auto-sync engine,
 * queue management, filtering, status management, and detectors.
 * This module is ready for extraction as @mateme/local-first-sync package.
 */

// =============================================================================
// Main Sync Engine
// =============================================================================

export { AutoSyncEngine } from './auto-sync-engine';

// Export simple sync functions
export {
  bidirectionalSync,
  performManualSync,
  getSyncStatus,
  isSyncRunning,
  getLastSyncResult,
  clearSyncStatus
} from '../simple-sync';

export type { SyncResult, SyncStatus } from '../simple-sync';

// =============================================================================
// Engine Components
// =============================================================================

// Queue Management
export * from './queue';

// Filtering System
export * from './filter';

// Status Management
export * from './status';

// Configuration Management
export * from './config';

// Change Detectors
export * from './detectors';

// =============================================================================
// Types and Interfaces (Avoid namespace conflicts with core)
// =============================================================================

// Export specific types that don't conflict
export type { 
  AutoSyncEvent, 
  AutoSyncStatus, 
  StatusListener,
  StorageChangeCallback,
  RemoteChangeCallback,
  FilterResult
} from './types';

// =============================================================================
// Factory Functions (for easier instantiation)
// =============================================================================

/**
 * Factory for creating auto-sync engine instances with default configuration
 */
export class SyncEngineFactory {
  /**
   * Create an auto-sync engine with default components
   * Note: This requires provider configuration
   */
  static createAutoSyncEngine() {
    // This would create an auto-sync engine with default configuration
    // Implementation depends on having providers configured
    throw new Error('SyncEngineFactory.createAutoSyncEngine requires provider configuration. Use integration layer instead.');
  }

  /**
   * Create just the queue manager component
   */
  static createQueueManager() {
    const { QueueManager } = require('./queue/queue-manager');
    return new QueueManager();
  }

  /**
   * Create just the filter manager component
   */
  static createFilterManager() {
    const { FilterManager } = require('./filter/filter-manager');
    return new FilterManager();
  }

  /**
   * Create just the status manager component
   */
  static createStatusManager() {
    const { StatusManager } = require('./status/status-manager');
    return new StatusManager();
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if all sync engine dependencies are available
 */
export function checkSyncEngineDependencies(): {
  available: boolean;
  missing: string[];
} {
  const required = [
    './auto-sync-engine',
    './queue/queue-manager',
    './filter/filter-manager',
    './status/status-manager',
    './config/configuration-manager'
  ];

  const missing: string[] = [];

  for (const dep of required) {
    try {
      require(dep);
    } catch {
      missing.push(dep);
    }
  }

  return {
    available: missing.length === 0,
    missing
  };
}

/**
 * Get sync engine metadata
 */
export function getSyncEngineMetadata() {
  return {
    version: '1.0.0',
    components: [
      'AutoSyncEngine',
      'QueueManager', 
      'FilterManager',
      'StatusManager',
      'ConfigurationManager',
      'StorageChangeDetector',
      'RemoteChangeDetector',
      'PeriodicSyncDetector'
    ],
    interfaces: [
      'IRealtimeProvider',
      'IAuthProvider', 
      'IConfigProvider',
      'IStorageProvider'
    ],
    readyForExtraction: true
  };
}

// =============================================================================
// Migration Utilities
// =============================================================================

/**
 * Utilities for migrating from old sync implementations
 */
export class SyncMigrationUtils {
  /**
   * Check migration status of sync components
   */
  static checkMigrationStatus() {
    return {
      autoSyncEngine: 'ready', // Uses interfaces
      queueManager: 'ready',   // No external dependencies
      filterManager: 'ready',  // No external dependencies
      statusManager: 'ready',  // No external dependencies
      configManager: 'ready',  // Uses IConfigProvider interface
      storageChangeDetector: 'ready', // No external dependencies
      remoteChangeDetector: 'migrated', // Refactored version available
      periodicSyncDetector: 'ready', // No external dependencies
      simpleSyncOperations: 'needs_migration' // Still has direct dependencies
    };
  }

  /**
   * Get components that are ready for npm package extraction
   */
  static getReadyComponents() {
    const status = SyncMigrationUtils.checkMigrationStatus();
    return Object.entries(status)
      .filter(([_, status]) => status === 'ready' || status === 'migrated')
      .map(([component, _]) => component);
  }

  /**
   * Get components that still need migration work
   */
  static getPendingComponents() {
    const status = SyncMigrationUtils.checkMigrationStatus();
    return Object.entries(status)
      .filter(([_, status]) => status === 'needs_migration')
      .map(([component, _]) => component);
  }
}

// =============================================================================
// Development and Testing Utilities
// =============================================================================

/**
 * Development utilities for the sync engine
 */
export class SyncDevUtils {
  /**
   * Create a mock sync engine for testing
   */
  static createMockSyncEngine() {
    // This would return a mock implementation for testing
    // Implementation would depend on having mock providers
    return {
      initialize: async () => {},
      cleanup: () => {},
      performSync: async () => ({ success: true, syncedCount: 0, errors: [] }),
      isEnabled: () => false,
      isRunning: () => false
    };
  }

  /**
   * Validate sync engine configuration
   */
  static validateConfiguration(config: any) {
    const required = ['realtimeProvider', 'authProvider', 'configProvider'];
    const missing = required.filter(key => !config[key]);
    
    return {
      valid: missing.length === 0,
      missing,
      recommendations: missing.length > 0 
        ? ['Configure all required providers before initializing sync engine']
        : []
    };
  }

  /**
   * Log sync engine status
   */
  static logStatus() {
    const deps = checkSyncEngineDependencies();
    const migration = SyncMigrationUtils.checkMigrationStatus();
    const metadata = getSyncEngineMetadata();

    console.group('🔄 Sync Engine Status');
    console.log('Dependencies:', deps.available ? '✅ All available' : `❌ Missing: ${deps.missing.join(', ')}`);
    console.log('Migration Status:', migration);
    console.log('Metadata:', metadata);
    console.groupEnd();
  }
}

// =============================================================================
// Usage Examples (Documentation)
// =============================================================================

/**
 * Example usage of the sync engine module:
 * 
 * ```typescript
 * // 1. Check if ready for extraction
 * import { SyncMigrationUtils, getSyncEngineMetadata } from './sync';
 * 
 * const metadata = getSyncEngineMetadata();
 * console.log('Ready for extraction:', metadata.readyForExtraction);
 * 
 * const ready = SyncMigrationUtils.getReadyComponents();
 * const pending = SyncMigrationUtils.getPendingComponents();
 * console.log('Ready:', ready);
 * console.log('Pending:', pending);
 * 
 * // 2. Create individual components
 * import { SyncEngineFactory } from './sync';
 * 
 * const queueManager = SyncEngineFactory.createQueueManager();
 * const filterManager = SyncEngineFactory.createFilterManager();
 * 
 * // 3. Use simplified detectors directly
 * import { RemoteChangeDetector, StorageChangeDetector } from './detectors';
 * 
 * const remoteDetector = new RemoteChangeDetector({
 *   tableName: 'bookmarks',
 *   onRemoteChange: (payload) => console.log('Remote change:', payload)
 * });
 * 
 * const storageDetector = new StorageChangeDetector({
 *   onStorageChange: (keys) => console.log('Storage changed:', keys)
 * });
 * 
 * // 4. Development utilities
 * import { SyncDevUtils } from './sync';
 * 
 * SyncDevUtils.logStatus();
 * const mockEngine = SyncDevUtils.createMockSyncEngine();
 * ```
 */