/**
 * Periodic Sync Detector
 * 
 * Handles periodic sync timer triggers for automatic synchronization.
 * Separated from StorageChangeDetector for better separation of concerns.
 * 
 * Key Features:
 * - Periodic sync timer management
 * - Configurable sync intervals
 * - Proper cleanup and resource management
 * - Callback-based event handling
 */

import { ConfigurationManager } from '../config';

/**
 * Callback function signature for periodic sync events
 */
export type PeriodicSyncCallback = () => void;

/**
 * Periodic sync detector configuration
 */
export interface PeriodicSyncDetectorConfig {
  onPeriodicSync: PeriodicSyncCallback;
  configManager: ConfigurationManager;
}

/**
 * Periodic Sync Detector Class
 * 
 * Manages periodic sync timer and triggers sync events at configured intervals.
 * Provides clean callback-based interface for periodic sync notifications.
 */
export class PeriodicSyncDetector {
  private onPeriodicSync: PeriodicSyncCallback;
  private configManager: ConfigurationManager;
  private periodicTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: PeriodicSyncDetectorConfig) {
    this.onPeriodicSync = config.onPeriodicSync;
    this.configManager = config.configManager;
  }

  /**
   * Set up periodic sync timer
   */
  setupDetection(): void {
    this.setupPeriodicSync();
    console.log('⏰ PeriodicSyncDetector: Periodic sync detection setup complete');
  }

  /**
   * Set up periodic sync timer
   */
  private setupPeriodicSync(): void {
    const interval = this.configManager.getPeriodicSyncInterval();
    
    this.periodicTimer = setInterval(() => {
      if (this.shouldTriggerPeriodicSync()) {
        console.log('⏰ PeriodicSyncDetector: Periodic sync triggered');
        this.onPeriodicSync();
      }
    }, interval);
    
    console.log('⏰ PeriodicSyncDetector: Periodic sync timer set up with interval:', interval);
  }

  /**
   * Check if periodic sync should be triggered
   */
  private shouldTriggerPeriodicSync(): boolean {
    return this.configManager.isEnabled();
  }

  /**
   * Clean up periodic sync timer
   */
  cleanup(): void {
    console.log('🧹 PeriodicSyncDetector: Cleaning up periodic sync detector');
    
    if (this.periodicTimer) {
      clearInterval(this.periodicTimer);
      this.periodicTimer = null;
    }
  }

  /**
   * Check if detector is active
   */
  isActive(): boolean {
    return this.periodicTimer !== null;
  }

  /**
   * Get current periodic sync interval
   */
  getPeriodicSyncInterval(): number {
    return this.configManager.getPeriodicSyncInterval();
  }

  /**
   * Update periodic sync interval
   */
  updatePeriodicSyncInterval(interval: number): void {
    if (this.periodicTimer) {
      clearInterval(this.periodicTimer);
      this.periodicTimer = setInterval(() => {
        if (this.shouldTriggerPeriodicSync()) {
          console.log('⏰ PeriodicSyncDetector: Periodic sync triggered');
          this.onPeriodicSync();
        }
      }, interval);
      
      console.log('⏰ PeriodicSyncDetector: Periodic sync interval updated to:', interval);
    }
  }
}