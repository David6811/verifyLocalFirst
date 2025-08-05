/**
 * Simple Sync Functions
 * Just basic sync operations - no complex abstractions
 */

import { performManualSync } from '../local-first/manual-sync';

// Simple manual sync - just syncs and returns success message
export async function sync(): Promise<string> {
  try {
    await performManualSync();
    return 'Sync completed successfully';
  } catch (error) {
    throw new Error(`Sync failed: ${(error as Error).message}`);
  }
}

// Auto sync status (simplified)
export interface SyncStatus {
  enabled: boolean;
  lastSync?: Date;
}

// Global sync state (keep it simple)
let syncEnabled = false;
let lastSyncTime: Date | null = null;

// Enable auto sync
export function enableAutoSync(): void {
  syncEnabled = true;
}

// Disable auto sync  
export function disableAutoSync(): void {
  syncEnabled = false;
}

// Get sync status
export function getSyncStatus(): SyncStatus {
  return {
    enabled: syncEnabled,
    lastSync: lastSyncTime || undefined
  };
}

// Update last sync time (call this after successful sync)
export function updateLastSyncTime(): void {
  lastSyncTime = new Date();
}