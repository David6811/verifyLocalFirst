/**
 * Configuration Manager for Auto-Sync Engine
 * 
 * Centralizes all configuration constants and settings management.
 * Handles persistence to Chrome storage and provides type-safe access to configuration values.
 * 
 * Now supports configurable table names for schema-agnostic operations.
 */

import { TABLE_CONFIG } from '../../../externals/config/table-config';

export interface SyncConfiguration {
  /** Debounce delay in milliseconds for batching sync operations */
  debounceDelay: number;
  /** Time window in milliseconds for self-change filtering */
  selfChangeFilterWindow: number;
  /** Periodic sync interval in milliseconds */
  periodicSyncInterval: number;
  /** Auto-sync enabled state */
  enabled: boolean;
  /** Database table name for sync operations */
  tableName: string;
}

export interface ConfigurationManagerOptions {
  /** Table name for sync operations (defaults to 'bookmarks' for backward compatibility) */
  tableName?: string;
  /** Chrome storage key prefix for settings (defaults to auto_sync) */
  storageKeyPrefix?: string;
}

export class ConfigurationManager {
  // Core timing configuration
  public readonly DEBOUNCE_DELAY = 1000; // 1 second
  public readonly SELF_CHANGE_FILTER_WINDOW = 10000; // 10 seconds
  public readonly PERIODIC_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
  
  // Database configuration (now configurable)
  private readonly tableName: string;
  
  // Chrome storage keys
  private readonly SETTINGS_KEY: string;
  
  // Runtime state
  private enabled: boolean = true;
  private initialized: boolean = false;

  constructor(options: ConfigurationManagerOptions = {}) {
    this.tableName = options.tableName || TABLE_CONFIG.tableName;
    const prefix = options.storageKeyPrefix || 'auto_sync';
    this.SETTINGS_KEY = `${prefix}_enabled`;
  }

  /**
   * Get current configuration snapshot
   */
  getConfiguration(): SyncConfiguration {
    return {
      debounceDelay: this.DEBOUNCE_DELAY,
      selfChangeFilterWindow: this.SELF_CHANGE_FILTER_WINDOW,
      periodicSyncInterval: this.PERIODIC_SYNC_INTERVAL,
      enabled: this.enabled,
      tableName: this.tableName
    };
  }

  /**
   * Load auto-sync settings from Chrome storage
   */
  async loadSettings(): Promise<void> {
    try {
      const result = await chrome.storage.local.get([this.SETTINGS_KEY]);
      this.enabled = Boolean(result[this.SETTINGS_KEY] ?? true);
      this.initialized = true;
      
      console.log('⚙️ ConfigurationManager: Settings loaded:', {
        enabled: this.enabled,
        debounceDelay: this.DEBOUNCE_DELAY,
        selfChangeFilterWindow: this.SELF_CHANGE_FILTER_WINDOW
      });
    } catch (error) {
      console.error('❌ ConfigurationManager: Failed to load settings:', error);
      this.enabled = true;
      this.initialized = true;
    }
  }

  /**
   * Save current settings to Chrome storage
   */
  private async saveSettings(): Promise<void> {
    try {
      await chrome.storage.local.set({ [this.SETTINGS_KEY]: this.enabled });
      console.log('⚙️ ConfigurationManager: Settings saved:', { enabled: this.enabled });
    } catch (error) {
      console.error('❌ ConfigurationManager: Failed to save settings:', error);
      throw error;
    }
  }

  /**
   * Check if auto-sync is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Enable or disable auto-sync
   */
  async setEnabled(enabled: boolean): Promise<void> {
    if (this.enabled === enabled) return;
    
    this.enabled = enabled;
    await this.saveSettings();
  }

  /**
   * Check if configuration has been initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get debounce delay in milliseconds
   */
  getDebounceDelay(): number {
    return this.DEBOUNCE_DELAY;
  }

  /**
   * Get self-change filter window in milliseconds
   */
  getSelfChangeFilterWindow(): number {
    return this.SELF_CHANGE_FILTER_WINDOW;
  }

  /**
   * Get periodic sync interval in milliseconds
   */
  getPeriodicSyncInterval(): number {
    return this.PERIODIC_SYNC_INTERVAL;
  }


  /**
   * Get database table name for sync operations
   */
  getTableName(): string {
    return this.tableName;
  }

  /**
   * Reset configuration to defaults (for testing only)
   */
  reset(): void {
    this.enabled = true;
    this.initialized = false;
  }
}