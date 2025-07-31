/**
 * Local-First Architecture Module (Simplified)
 * 
 * Core local-first architecture with sync engine and direct dependencies.
 * No longer uses provider abstraction - direct imports for simplicity.
 */

// =============================================================================
// Core Layer
// =============================================================================

// Core types, interfaces, and utilities
export * from './core';

// =============================================================================
// Configuration Layer
// =============================================================================

// Export table configuration system
export {
  SimpleConfigManager as TableConfigurationManager,
  getTableConfig
} from './schema';

// =============================================================================
// Sync Layer
// =============================================================================

// Export sync implementation classes
export { AutoSyncEngine, createAutoSyncEngine, createConfiguredAutoSyncEngine } from './sync-engine/auto-sync-engine';
export { SyncEngineFactory, checkSyncEngineDependencies, getSyncEngineMetadata, SyncMigrationUtils, SyncDevUtils } from './sync-engine';

// Export specific sync types to avoid conflicts
export type { SyncResult, SyncStatus } from './sync-engine';
export type { AutoSyncEvent, AutoSyncStatus, StatusListener } from './sync-engine/types';

// Export sync functions
export {
  bidirectionalSync,
  performManualSync,
  getSyncStatus,
  isSyncRunning,
  getLastSyncResult,
  clearSyncStatus
} from './sync-engine';

// =============================================================================
// Dependencies
// =============================================================================

// Central external dependencies for easy configuration
export { ExternalDependencies } from './external-dependencies';

// =============================================================================
// Detector Components (Simplified)
// =============================================================================

// Export simplified detector implementations
export { RemoteChangeDetector } from './sync-engine/detectors/remote-change-detector';
export { StorageChangeDetector } from './sync-engine/detectors/storage-change-detector';
export type { RemoteChangeCallback, RemoteChangePayload } from './sync-engine/detectors/remote-change-detector';
export type { StorageChangeCallback } from './sync-engine/detectors/storage-change-detector';