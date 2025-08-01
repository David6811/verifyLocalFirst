import { useState, useEffect } from 'react';
import { createBookmark } from '../externals/bookmark-operations';
import { BookmarkStatus, BookmarkType } from '../externals/types';
import { performManualSync } from '../local-first/manual-sync';
import { AutoSyncEngine } from '../local-first/sync-engine';
import { ConfigurationManager } from '../local-first/sync-engine/config';
import type { AutoSyncStatus } from '../local-first/sync-engine/types';
import { Effect } from 'effect';

interface SyncControlsProps {
  currentUser: any;
  onMessage: (message: string) => void;
  onBookmarkChange: () => void; // Notify parent when bookmarks change
}

export default function SyncControls({ currentUser, onMessage, onBookmarkChange }: SyncControlsProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [autoSyncEngine, setAutoSyncEngine] = useState<AutoSyncEngine | null>(null);
  const [autoSyncStatus, setAutoSyncStatus] = useState<AutoSyncStatus | null>(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(false);

  // Initialize auto-sync engine on mount
  useEffect(() => {
    initializeAutoSync();
    return () => {
      if (autoSyncEngine) {
        console.log('🧹 Cleaning up auto-sync engine...');
        autoSyncEngine.cleanup();
      }
    };
  }, []);

  // Handle user changes for auto-sync
  useEffect(() => {
    if (currentUser && autoSyncEngine) {
      enableAutoSyncForUser();
    } else if (!currentUser && autoSyncEngine) {
      disableAutoSyncForLogout();
    }
  }, [currentUser, autoSyncEngine]);

  const initializeAutoSync = async () => {
    try {
      console.log('🔄 Initializing auto-sync engine...');
      
      const configManager = new ConfigurationManager({
        tableName: 'bookmarks',
        storageKeyPrefix: 'mateme_autosync'
      });
      
      const engine = new AutoSyncEngine(configManager);
      
      const statusListener = (status: AutoSyncStatus) => {
        console.log('📊 Auto-sync status updated:', status);
        setAutoSyncStatus(status);
        setAutoSyncEnabled(status.enabled);
        
        // Refresh bookmark list when sync completes successfully
        if (!status.isRunning && status.queueSize === 0 && status.lastSync) {
          setTimeout(() => {
            console.log('🔄 Auto-sync completed, refreshing bookmark list...');
            onBookmarkChange();
          }, 500);
        }
      };
      
      engine.addStatusListener(statusListener);
      await engine.initialize();
      
      setAutoSyncEngine(engine);
      console.log('✅ Auto-sync engine initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize auto-sync:', error);
      onMessage('⚠️ Auto-sync initialization failed');
    }
  };

  const enableAutoSyncForUser = async () => {
    if (!autoSyncEngine || !currentUser) return;
    
    try {
      console.log('🔄 Enabling auto-sync for user:', currentUser.email);
      await autoSyncEngine.setEnabled(true);
      await autoSyncEngine.refreshRemoteChangeDetection();
      console.log('✅ Auto-sync enabled');
    } catch (syncError) {
      console.error('⚠️ Auto-sync enable failed:', syncError);
    }
  };

  const disableAutoSyncForLogout = async () => {
    if (!autoSyncEngine) return;
    
    try {
      console.log('🔄 Disabling auto-sync...');
      await autoSyncEngine.setEnabled(false);
      console.log('✅ Auto-sync disabled');
      setAutoSyncEnabled(false);
    } catch (syncError) {
      console.error('⚠️ Auto-sync disable failed:', syncError);
    }
  };

  const handleAddBookmark = async () => {
    if (!currentUser) {
      onMessage('❌ Please login first to add bookmarks');
      return;
    }

    setIsLoading(true);
    onMessage('');
    
    try {
      const newBookmark = await Effect.runPromise(createBookmark({
        title: 'Sample Bookmark',
        link: 'https://example.com',
        summary: 'This is a sample bookmark created from the extension',
        status: BookmarkStatus.ACTIVE,
        type: BookmarkType.BOOKMARK,
        user_id: currentUser.id,
        level: 0,
        sort_order: Date.now()
      }));
      
      onMessage(`✅ Bookmark added successfully: ${newBookmark.title}`);
      
      // Trigger manual sync to push to Supabase - COMMENTED OUT FOR TESTING
      // try {
      //   console.log('🔄 Triggering manual sync to Supabase...');
      //   const syncResult = await performManualSync();
      //   console.log('✅ Sync completed:', syncResult);
      //   onMessage(`✅ Bookmark added and synced! ${newBookmark.title}`);
      // } catch (syncError) {
      //   console.log('⚠️ Sync failed but bookmark saved locally:', syncError);
      //   onMessage(`✅ Bookmark added locally: ${newBookmark.title} (sync pending)`);
      // }
      
      // Notify parent to refresh bookmark list
      onBookmarkChange();
    } catch (error) {
      onMessage(`❌ Add bookmark failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSync = async () => {
    if (!currentUser) {
      onMessage('❌ Please login first to sync');
      return;
    }

    setIsLoading(true);
    onMessage('🔄 Syncing with Supabase...');
    
    try {
      const syncResult = await performManualSync();
      console.log('✅ Manual sync completed:', syncResult);
      onMessage(`✅ Sync completed! Synced: ${syncResult.syncedCount || 0} items`);
      
      // Notify parent to refresh bookmark list
      onBookmarkChange();
    } catch (error) {
      console.error('❌ Manual sync failed:', error);
      onMessage(`❌ Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAutoSync = async () => {
    if (!currentUser || !autoSyncEngine) {
      onMessage('❌ Please login first to toggle auto-sync');
      return;
    }

    setIsLoading(true);
    const newState = !autoSyncEnabled;
    
    try {
      console.log(`🔄 ${newState ? 'Enabling' : 'Disabling'} auto-sync...`);
      await autoSyncEngine.setEnabled(newState);
      
      if (newState) {
        await autoSyncEngine.refreshRemoteChangeDetection();
      }
      
      setAutoSyncEnabled(newState);
      onMessage(`✅ Auto-sync ${newState ? 'enabled' : 'disabled'}!`);
      console.log(`✅ Auto-sync ${newState ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('❌ Auto-sync toggle failed:', error);
      onMessage(`❌ Failed to ${newState ? 'enable' : 'disable'} auto-sync`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        width: '100%'
      }}>
        <button
          onClick={handleAddBookmark}
          disabled={isLoading || !currentUser}
          style={{
            padding: '10px 16px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: (isLoading || !currentUser) ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            opacity: (isLoading || !currentUser) ? 0.6 : 1
          }}
        >
          Add Bookmark
        </button>

        <button
          onClick={handleManualSync}
          disabled={isLoading || !currentUser}
          style={{
            padding: '10px 16px',
            backgroundColor: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: (isLoading || !currentUser) ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            opacity: (isLoading || !currentUser) ? 0.6 : 1
          }}
        >
          Manual Sync
        </button>

        <button
          onClick={handleToggleAutoSync}
          disabled={isLoading || !currentUser || !autoSyncEngine}
          style={{
            padding: '10px 16px',
            backgroundColor: autoSyncEnabled ? '#28a745' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: (isLoading || !currentUser || !autoSyncEngine) ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            opacity: (isLoading || !currentUser || !autoSyncEngine) ? 0.6 : 1
          }}
        >
          Auto-Sync: {autoSyncEnabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Auto-Sync Status */}
      {currentUser && autoSyncEngine && (
        <div style={{
          padding: '10px',
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '4px',
          fontSize: '11px',
          color: '#495057',
          wordBreak: 'break-word'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Auto-Sync Status:</div>
          <div>• Enabled: {autoSyncEnabled ? '✅ Yes' : '❌ No'}</div>
          {autoSyncStatus && (
            <>
              <div>• Running: {autoSyncStatus.isRunning ? '🔄 Yes' : '⏸️ No'}</div>
              <div>• Queue Size: {autoSyncStatus.queueSize || 0}</div>
              <div>• Last Sync: {autoSyncStatus.lastSync ? new Date(autoSyncStatus.lastSync).toLocaleString() : 'Never'}</div>
              {autoSyncStatus.error && (
                <div style={{ color: '#dc3545' }}>• Error: {autoSyncStatus.error}</div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}