/**
 * Queue Manager for Auto-Sync Engine
 * 
 * Simplified queue implementation with only the features actually needed.
 * Single-file design with essential functionality.
 */

import { ConfigurationManager } from '../config';
import { StatusManager } from '../status';
import { AutoSyncEvent } from '../types';

export class QueueManager {
  private queue: AutoSyncEvent[] = [];
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private isProcessing: boolean = false;
  
  constructor(
    private configManager: ConfigurationManager,
    private statusManager: StatusManager,
    private syncExecutor: () => Promise<void>
  ) {}

  /**
   * Add sync event to queue
   */
  enqueueSync(event: AutoSyncEvent): void {
    if (!this.configManager.isEnabled()) {
      console.log('⏸️ QueueManager: Auto-sync disabled, ignoring sync event');
      return;
    }

    this.queue.push(event);
    console.log('📥 QueueManager: Enqueued sync event:', event.type, 'Queue size:', this.queue.length);

    // Update status
    this.statusManager.setQueueSizeSynchronously(this.queue.length);

    // Process with debouncing
    this.scheduleProcessing();
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Clear queue
   */
  clearQueue(): void {
    this.queue = [];
    this.statusManager.setQueueSizeSynchronously(0);
    console.log('🧹 QueueManager: Queue cleared');
  }

  /**
   * Schedule processing with debouncing
   */
  private scheduleProcessing(): void {
    // Clear existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Set new timer
    this.debounceTimer = setTimeout(() => {
      this.processQueue();
    }, this.configManager.getDebounceDelay());
  }

  /**
   * Process all items in queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    this.statusManager.setRunningSynchronously(true);
    this.statusManager.clearError();

    const itemCount = this.queue.length;
    console.log('🔄 QueueManager: Processing', itemCount, 'sync events');

    try {
      // Clear queue before processing (dequeue all)
      this.queue = [];
      
      // Execute sync
      await this.syncExecutor();
      
      console.log('✅ QueueManager: Successfully processed', itemCount, 'sync events');
      
    } catch (error) {
      console.error('❌ QueueManager: Sync processing failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.statusManager.setErrorSynchronously(errorMessage);
      
    } finally {
      this.isProcessing = false;
      this.statusManager.setRunningSynchronously(false);
      this.statusManager.setQueueSizeSynchronously(this.queue.length);
    }
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    console.log('🧹 QueueManager: Cleaning up queue');
    
    // Clear timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    
    // Clear queue and reset state
    this.queue = [];
    this.isProcessing = false;
    this.statusManager.setQueueSizeSynchronously(0);
    this.statusManager.setRunningSynchronously(false);
  }
}