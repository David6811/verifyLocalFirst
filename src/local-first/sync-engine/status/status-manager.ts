/**
 * Simplified Status Manager for Auto-Sync Engine
 * 
 * Simplified status tracking with immediate updates and essential functionality only.
 */

import { AutoSyncStatus, StatusListener } from '../types';
import { SyncResult } from '../../simple-sync';

export class StatusManager {
  private status: AutoSyncStatus;
  private listeners: StatusListener[] = [];

  constructor(initialStatus?: Partial<AutoSyncStatus>) {
    this.status = {
      enabled: false,
      isRunning: false,
      queueSize: 0,
      ...initialStatus
    };
  }

  /**
   * Get the current status snapshot
   */
  getStatus(): AutoSyncStatus {
    return { ...this.status };
  }

  /**
   * Update the status with new values and notify listeners immediately
   */
  updateStatus(updates: Partial<AutoSyncStatus>): void {
    const previousStatus = { ...this.status };
    
    // Apply updates immediately
    this.status = {
      ...this.status,
      ...updates
    };

    // Log important status changes
    this.logStatusChange(previousStatus, this.status);

    // Notify all listeners
    this.notifyListeners();
  }

  /**
   * Set the enabled state
   */
  setEnabled(enabled: boolean): void {
    this.updateStatus({ enabled });
  }

  /**
   * Set the enabled state synchronously (for testing)
   */
  setEnabledSynchronously(enabled: boolean): void {
    this.status.enabled = enabled;
    this.notifyListeners();
  }

  /**
   * Set the running state
   */
  setRunning(isRunning: boolean): void {
    this.updateStatus({ isRunning });
  }

  /**
   * Set the running state synchronously (for testing)
   */
  setRunningSynchronously(isRunning: boolean): void {
    this.status.isRunning = isRunning;
    this.notifyListeners();
  }

  /**
   * Set the queue size
   */
  setQueueSize(queueSize: number): void {
    this.updateStatus({ queueSize });
  }

  /**
   * Set the queue size synchronously (for testing)
   */
  setQueueSizeSynchronously(queueSize: number): void {
    this.status.queueSize = queueSize;
    this.notifyListeners();
  }

  /**
   * Set the last sync information
   */
  setLastSync(lastSync: Date, lastResult: SyncResult): void {
    this.updateStatus({ 
      lastSync, 
      lastResult,
      // Clear error on successful sync
      error: lastResult.success ? undefined : this.status.error
    });
  }

  /**
   * Set an error state
   */
  setError(error: string): void {
    this.updateStatus({ error });
  }

  /**
   * Set an error state synchronously (for testing)
   */
  setErrorSynchronously(error: string): void {
    this.status.error = error;
    this.notifyListeners();
  }

  /**
   * Clear the error state
   */
  clearError(): void {
    this.updateStatus({ error: undefined });
  }

  /**
   * Add a status listener
   */
  addListener(listener: StatusListener): void {
    if (!this.listeners.includes(listener)) {
      this.listeners.push(listener);
      
      // Immediately notify new listener of current status
      this.notifyListener(listener);
    }
  }

  /**
   * Remove a status listener
   */
  removeListener(listener: StatusListener): void {
    const index = this.listeners.indexOf(listener);
    if (index >= 0) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Check if the engine is enabled
   */
  isEnabled(): boolean {
    return this.status.enabled;
  }

  /**
   * Check if the engine is currently running
   */
  isRunning(): boolean {
    return this.status.isRunning;
  }

  /**
   * Get the current queue size
   */
  getQueueSize(): number {
    return this.status.queueSize;
  }

  /**
   * Check if there is an error
   */
  hasError(): boolean {
    return this.status.error !== undefined;
  }

  /**
   * Get the current error
   */
  getError(): string | undefined {
    return this.status.error;
  }

  /**
   * Get the last sync time
   */
  getLastSync(): Date | undefined {
    return this.status.lastSync;
  }

  /**
   * Get the last sync result
   */
  getLastResult(): SyncResult | undefined {
    return this.status.lastResult;
  }

  /**
   * Get the number of listeners (for testing)
   */
  getListenerCount(): number {
    return this.listeners.length;
  }

  /**
   * Remove all listeners
   */
  removeAllListeners(): void {
    this.listeners = [];
  }

  /**
   * Clear error state synchronously (for testing)
   */
  clearErrorSynchronously(): void {
    this.status.error = undefined;
    this.notifyListeners();
  }

  /**
   * Set last sync synchronously (for testing)
   */
  setLastSyncSynchronously(lastSync: Date, lastResult: SyncResult): void {
    this.status.lastSync = lastSync;
    this.status.lastResult = lastResult;
    // Clear error on successful sync
    if (lastResult.success) {
      this.status.error = undefined;
    }
    this.notifyListeners();
  }

  /**
   * Update status synchronously (for testing)
   */
  updateStatusSynchronously(updates: Partial<AutoSyncStatus>): void {
    this.status = {
      ...this.status,
      ...updates
    };
    this.notifyListeners();
  }

  /**
   * Reset status to default state
   */
  reset(): void {
    this.status = {
      enabled: false,
      isRunning: false,
      queueSize: 0
    };
    this.notifyListeners();
  }

  /**
   * Notify all listeners of the current status
   */
  private notifyListeners(): void {
    const statusSnapshot = this.getStatus();
    
    this.listeners.forEach(listener => {
      this.notifyListener(listener, statusSnapshot);
    });
  }

  /**
   * Notify a single listener, with error handling
   */
  private notifyListener(listener: StatusListener, status?: AutoSyncStatus): void {
    try {
      listener(status || this.getStatus());
    } catch (error) {
      console.error('❌ StatusManager: Listener error:', error);
      this.removeListener(listener);
    }
  }

  /**
   * Log important status changes for debugging
   */
  private logStatusChange(previous: AutoSyncStatus, current: AutoSyncStatus): void {
    // Log enabled state changes
    if (previous.enabled !== current.enabled) {
      console.log(`⚙️ StatusManager: Auto-sync ${current.enabled ? 'enabled' : 'disabled'}`);
    }

    // Log running state changes
    if (previous.isRunning !== current.isRunning) {
      console.log(`🔄 StatusManager: Sync ${current.isRunning ? 'started' : 'stopped'}`);
    }

    // Log error state changes
    if (previous.error !== current.error) {
      if (current.error) {
        console.error(`❌ StatusManager: Error: ${current.error}`);
      } else if (previous.error) {
        console.log('✅ StatusManager: Error cleared');
      }
    }
  }
  
  /**
   * Clean up status manager resources
   */
  cleanup(): void {
    this.listeners = [];
  }
}