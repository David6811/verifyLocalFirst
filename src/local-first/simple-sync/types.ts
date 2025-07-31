/**
 * Type definitions for Simple Sync Operations
 */

export interface SyncResult {
  success: boolean;
  localCount: number;
  remoteCount: number;
  syncedCount: number;
  errors: string[];
  timestamp: Date;
  direction: 'push' | 'pull' | 'bidirectional';
}

export interface SyncStatus {
  isRunning: boolean;
  lastSync?: Date;
  lastResult?: SyncResult;
  error?: string;
}

export interface SyncData {
  localEntities: any[];
  remoteEntities: any[];
  localMap: Map<string, any>;
  remoteMap: Map<string, any>;
  lastKnownRemoteIds: string[];
  lastKnownLocalIds: string[];
  currentRemoteIds: string[];
  currentLocalIds: string[];
  allIds: Set<string>;
}