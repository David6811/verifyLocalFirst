/**
 * Configuration Manager Tests
 * 
 * Comprehensive test suite for the ConfigurationManager class,
 * covering all public methods and edge cases.
 */

import { ConfigurationManager } from '../configuration-manager';

// Mock Chrome storage API
const mockChromeStorageLocal = {
  get: jest.fn(),
  set: jest.fn(),
  clear: jest.fn(),
  remove: jest.fn()
};

// Mock Chrome API
Object.defineProperty(global, 'chrome', {
  value: {
    storage: {
      local: mockChromeStorageLocal
    }
  },
  writable: true
});

describe('ConfigurationManager', () => {
  let configManager: ConfigurationManager;

  beforeEach(() => {
    configManager = new ConfigurationManager();
    jest.clearAllMocks();
  });

  describe('Constants', () => {
    it('should have correct default timing values', () => {
      expect(configManager.DEBOUNCE_DELAY).toBe(1000);
      expect(configManager.SELF_CHANGE_FILTER_WINDOW).toBe(10000);
      expect(configManager.PERIODIC_SYNC_INTERVAL).toBe(5 * 60 * 1000);
    });

  });

  describe('Configuration Snapshot', () => {
    it('should return complete configuration snapshot', () => {
      const config = configManager.getConfiguration();
      
      expect(config).toEqual({
        debounceDelay: 1000,
        selfChangeFilterWindow: 10000,
        periodicSyncInterval: 5 * 60 * 1000,
        enabled: true, // Default state
        tableName: 'bookmarks'
      });
    });

    it('should reflect enabled state changes in configuration', async () => {
      mockChromeStorageLocal.set.mockResolvedValue(undefined);
      
      await configManager.setEnabled(true);
      const config = configManager.getConfiguration();
      
      expect(config.enabled).toBe(true);
    });
  });

  describe('Settings Loading', () => {
    it('should load enabled=true from Chrome storage', async () => {
      mockChromeStorageLocal.get.mockResolvedValue({ auto_sync_enabled: true });
      
      await configManager.loadSettings();
      
      expect(configManager.isEnabled()).toBe(true);
      expect(configManager.isInitialized()).toBe(true);
    });

    it('should load enabled=false from Chrome storage', async () => {
      mockChromeStorageLocal.get.mockResolvedValue({ auto_sync_enabled: false });
      
      await configManager.loadSettings();
      
      expect(configManager.isEnabled()).toBe(false);
      expect(configManager.isInitialized()).toBe(true);
    });

    it('should default to true when no settings exist', async () => {
      mockChromeStorageLocal.get.mockResolvedValue({});
      
      await configManager.loadSettings();
      
      expect(configManager.isEnabled()).toBe(true);
      expect(configManager.isInitialized()).toBe(true);
    });

    it('should handle Chrome storage errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockChromeStorageLocal.get.mockRejectedValue(new Error('Storage error'));
      
      await configManager.loadSettings();
      
      expect(configManager.isEnabled()).toBe(true);
      expect(configManager.isInitialized()).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        '❌ ConfigurationManager: Failed to load settings:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    it('should log settings when loaded successfully', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      mockChromeStorageLocal.get.mockResolvedValue({ auto_sync_enabled: true });
      
      await configManager.loadSettings();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '⚙️ ConfigurationManager: Settings loaded:',
        {
          enabled: true,
          debounceDelay: 1000,
          selfChangeFilterWindow: 10000
        }
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Settings Saving', () => {
    it('should save enabled state to Chrome storage', async () => {
      mockChromeStorageLocal.set.mockResolvedValue(undefined);
      
      await configManager.setEnabled(false);
      
      expect(mockChromeStorageLocal.set).toHaveBeenCalledWith({
        auto_sync_enabled: false
      });
    });

    it('should log when settings are saved', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      mockChromeStorageLocal.set.mockResolvedValue(undefined);
      
      await configManager.setEnabled(false);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '⚙️ ConfigurationManager: Settings saved:',
        { enabled: false }
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle Chrome storage save errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const storageError = new Error('Storage save error');
      mockChromeStorageLocal.set.mockRejectedValue(storageError);
      
      await expect(configManager.setEnabled(false)).rejects.toThrow('Storage save error');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '❌ ConfigurationManager: Failed to save settings:',
        storageError
      );
      
      consoleSpy.mockRestore();
    });

    it('should call saveSettings directly', async () => {
      mockChromeStorageLocal.set.mockResolvedValue(undefined);
      
      await configManager.saveSettings();
      
      expect(mockChromeStorageLocal.set).toHaveBeenCalledWith({
        auto_sync_enabled: true // Default value
      });
    });
  });

  describe('Enable/Disable State Management', () => {
    it('should enable auto-sync', async () => {
      mockChromeStorageLocal.set.mockResolvedValue(undefined);
      
      await configManager.setEnabled(true);
      
      expect(configManager.isEnabled()).toBe(true);
    });

    it('should disable auto-sync', async () => {
      mockChromeStorageLocal.set.mockResolvedValue(undefined);
      
      // First enable
      await configManager.setEnabled(true);
      expect(configManager.isEnabled()).toBe(true);
      
      // Then disable
      await configManager.setEnabled(false);
      expect(configManager.isEnabled()).toBe(false);
    });

    it('should not save if state is unchanged', async () => {
      mockChromeStorageLocal.set.mockResolvedValue(undefined);
      
      // Set to true (same as default)
      await configManager.setEnabled(true);
      
      expect(mockChromeStorageLocal.set).not.toHaveBeenCalled();
    });

    it('should save when state changes', async () => {
      mockChromeStorageLocal.set.mockResolvedValue(undefined);
      
      await configManager.setEnabled(false);
      
      expect(mockChromeStorageLocal.set).toHaveBeenCalledTimes(1);
    });
  });

  describe('Getter Methods', () => {
    it('should return correct debounce delay', () => {
      expect(configManager.getDebounceDelay()).toBe(1000);
    });

    it('should return correct self-change filter window', () => {
      expect(configManager.getSelfChangeFilterWindow()).toBe(10000);
    });

    it('should return correct periodic sync interval', () => {
      expect(configManager.getPeriodicSyncInterval()).toBe(5 * 60 * 1000);
    });

  });

  describe('Initialization State', () => {
    it('should start as not initialized', () => {
      expect(configManager.isInitialized()).toBe(false);
    });

    it('should be initialized after loading settings', async () => {
      mockChromeStorageLocal.get.mockResolvedValue({});
      
      await configManager.loadSettings();
      
      expect(configManager.isInitialized()).toBe(true);
    });

    it('should be initialized even after load error', async () => {
      mockChromeStorageLocal.get.mockRejectedValue(new Error('Load error'));
      
      await configManager.loadSettings();
      
      expect(configManager.isInitialized()).toBe(true);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset to default state', async () => {
      mockChromeStorageLocal.get.mockResolvedValue({ auto_sync_enabled: false });
      mockChromeStorageLocal.set.mockResolvedValue(undefined);
      
      // Initialize with disabled state
      await configManager.loadSettings();
      await configManager.setEnabled(false);
      
      expect(configManager.isEnabled()).toBe(false);
      expect(configManager.isInitialized()).toBe(true);
      
      // Reset
      configManager.reset();
      
      expect(configManager.isEnabled()).toBe(true);
      expect(configManager.isInitialized()).toBe(false);
    });

    it('should allow reinitialization after reset', async () => {
      mockChromeStorageLocal.get.mockResolvedValue({ auto_sync_enabled: true });
      
      configManager.reset();
      await configManager.loadSettings();
      
      expect(configManager.isEnabled()).toBe(true);
      expect(configManager.isInitialized()).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined storage values', async () => {
      mockChromeStorageLocal.get.mockResolvedValue({ auto_sync_enabled: undefined });
      
      await configManager.loadSettings();
      
      expect(configManager.isEnabled()).toBe(true);
    });

    it('should handle null storage values', async () => {
      mockChromeStorageLocal.get.mockResolvedValue({ auto_sync_enabled: null });
      
      await configManager.loadSettings();
      
      expect(configManager.isEnabled()).toBe(true);
    });

    it('should handle non-boolean storage values', async () => {
      mockChromeStorageLocal.get.mockResolvedValue({ auto_sync_enabled: 'true' });
      
      await configManager.loadSettings();
      
      expect(configManager.isEnabled()).toBe(true);
    });
  });

  describe('Multiple Operations', () => {
    it('should handle rapid enable/disable calls', async () => {
      mockChromeStorageLocal.set.mockResolvedValue(undefined);
      
      await Promise.all([
        configManager.setEnabled(false),
        configManager.setEnabled(true),
        configManager.setEnabled(false)
      ]);
      
      expect(configManager.isEnabled()).toBe(false);
      expect(mockChromeStorageLocal.set).toHaveBeenCalledTimes(3);
    });

    it('should handle concurrent load and save operations', async () => {
      mockChromeStorageLocal.get.mockResolvedValue({ auto_sync_enabled: false });
      mockChromeStorageLocal.set.mockResolvedValue(undefined);
      
      await Promise.all([
        configManager.loadSettings(),
        configManager.setEnabled(true)
      ]);
      
      // The final state depends on operation order, but should be consistent
      expect(typeof configManager.isEnabled()).toBe('boolean');
      expect(configManager.isInitialized()).toBe(true);
    });
  });
});