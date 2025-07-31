/**
 * Storage Change Detector (Simplified)
 * 
 * Handles storage change detection using Chrome Storage API directly.
 * 
 * Key Features:
 * - Chrome storage change monitoring
 * - Batched change processing for performance
 * - Proper cleanup and resource management
 * - Callback-based event handling
 */

/**
 * Storage change information
 */
export interface StorageChange {
  /** The storage key that changed */
  key: string;
  /** Old value (if any) */
  oldValue?: any;
  /** New value (if any) */
  newValue?: any;
}

/**
 * Callback function signature for storage change events
 */
export type StorageChangeCallback = (changedKeys: string[]) => void;

/**
 * Storage change detector configuration (simplified)
 */
export interface StorageChangeDetectorConfig {
  /** Callback for storage change events */
  onStorageChange: StorageChangeCallback;
  /** Storage area to monitor (default: 'local') */
  storageArea?: string;
  /** Batch processing window in milliseconds (default: 100) */
  batchWindowMs?: number;
}

/**
 * Storage Change Detector Class (Simplified)
 * 
 * Monitors Chrome storage changes using direct Chrome APIs.
 * Provides clean callback-based interface for storage change events.
 */
export class StorageChangeDetector {
  private onStorageChange: StorageChangeCallback;
  private storageArea: string;
  private batchWindowMs: number;
  
  private storageListener: ((changes: any, areaName: string) => void) | null = null;

  // Performance optimization: Batch processing for rapid changes
  private changeBuffer: Map<string, Date> = new Map();
  private processingTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: StorageChangeDetectorConfig) {
    this.onStorageChange = config.onStorageChange;
    this.storageArea = config.storageArea || 'local';
    this.batchWindowMs = config.batchWindowMs || 100;
  }

  /**
   * Set up storage change detection
   */
  setupDetection(): void {
    this.setupStorageChangeDetection();
    console.log('🔍 StorageChangeDetector: Storage change detection setup complete');
  }

  /**
   * Monitor Chrome storage changes directly
   */
  private setupStorageChangeDetection(): void {
    // Create storage listener function for Chrome API
    this.storageListener = (changes: any, areaName: string) => {
      if (areaName === this.storageArea) {
        const changedKeys = Object.keys(changes);
        console.log('🔍 StorageChangeDetector: Storage change detected:', changedKeys);
        this.handleStorageChange(changedKeys);
      }
    };

    // Listen to Chrome storage changes directly
    if (chrome?.storage?.onChanged) {
      chrome.storage.onChanged.addListener(this.storageListener);
    } else {
      console.warn('⚠️ StorageChangeDetector: Chrome storage API not available');
    }
  }

  /**
   * Handle storage changes with batching optimization
   */
  private handleStorageChange(changedKeys: string[]): void {
    try {
      // Buffer changes for batch processing to reduce redundant operations
      changedKeys.forEach(key => this.changeBuffer.set(key, new Date()));
      
      // If processing timer is already active, just accumulate changes
      if (this.processingTimer) return;
      
      // Set up batch processing timer
      this.processingTimer = setTimeout(() => {
        try {
          const bufferedKeys = Array.from(this.changeBuffer.keys());
          this.changeBuffer.clear();
          this.processingTimer = null;
          
          // Process accumulated changes as a batch
          console.log('🔍 StorageChangeDetector: Processing batched changes:', bufferedKeys);
          this.onStorageChange(bufferedKeys);
        } catch (error) {
          console.error('❌ StorageChangeDetector: Error handling storage change:', error);
        }
      }, this.batchWindowMs);
      
    } catch (error) {
      console.error('❌ StorageChangeDetector: Error handling storage change:', error);
    }
  }

  /**
   * Clean up storage change detection
   */
  cleanup(): void {
    console.log('🧹 StorageChangeDetector: Cleaning up storage change detector');
    
    // Clean up Chrome storage listener
    if (this.storageListener && chrome?.storage?.onChanged) {
      chrome.storage.onChanged.removeListener(this.storageListener);
      this.storageListener = null;
    }
    
    // Clean up processing timer and buffer
    if (this.processingTimer) {
      clearTimeout(this.processingTimer);
      this.processingTimer = null;
    }
    this.changeBuffer.clear();
  }

  /**
   * Check if detector is active
   */
  isActive(): boolean {
    return this.storageListener !== null;
  }

  /**
   * Update batch processing window
   */
  updateBatchWindow(batchWindowMs: number): void {
    this.batchWindowMs = batchWindowMs;
    console.log('⚙️ StorageChangeDetector: Batch window updated to:', batchWindowMs);
  }

  /**
   * Get current batch window setting
   */
  getBatchWindow(): number {
    return this.batchWindowMs;
  }

  /**
   * Get current storage area being monitored
   */
  getStorageArea(): string {
    return this.storageArea;
  }

  /**
   * Get number of pending changes in buffer
   */
  getPendingChangesCount(): number {
    return this.changeBuffer.size;
  }
}