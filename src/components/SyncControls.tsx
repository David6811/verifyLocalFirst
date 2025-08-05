import { useState, useEffect } from 'react';
import { createBookmark } from '../externals/bookmark-operations';
import { BookmarkStatus, BookmarkType } from '../externals/types';
import { 
  performSync,
  createSyncManager,
  type SimpleAutoSyncStatus,
  type SyncManager
} from '../externals/sync-operations';
import { Effect } from 'effect';

interface SyncControlsProps {
  currentUser: any;
  onMessage: (message: string) => void;
  onBookmarkChange: () => void; // Notify parent when bookmarks change
}

export default function SyncControls({ currentUser, onMessage, onBookmarkChange }: SyncControlsProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [syncManager, setSyncManager] = useState<SyncManager | null>(null);
  const [autoSyncStatus, setAutoSyncStatus] = useState<SimpleAutoSyncStatus | null>(null);

  // Initialize sync manager on mount
  useEffect(() => {
    const manager = createSyncManager();
    
    const initializeManager = async () => {
      try {
        await manager.initialize();
        setSyncManager(manager);
      } catch (error) {
        console.error('❌ Failed to initialize sync manager:', error);
        onMessage('⚠️ Sync manager initialization failed');
      }
    };
    
    // Set up status listener
    const removeStatusListener = manager.onStatusChange((status) => {
      setAutoSyncStatus(status);
      
      // Refresh bookmark list when sync completes successfully
      if (!status.isRunning && status.queueSize === 0 && status.lastSyncTime) {
        setTimeout(() => {
          console.log('🔄 Auto-sync completed, refreshing bookmark list...');
          onBookmarkChange();
        }, 500);
      }
    });
    
    initializeManager();
    
    return () => {
      removeStatusListener();
      manager.cleanup();
    };
  }, []);

  // Handle user changes for auto-sync
  useEffect(() => {
    if (!syncManager) return;
    
    if (currentUser) {
      syncManager.handleUserLogin(currentUser).catch(error => {
        console.error('⚠️ Failed to enable sync for user:', error);
      });
    } else {
      syncManager.handleUserLogout().catch(error => {
        console.error('⚠️ Failed to disable sync for logout:', error);
      });
    }
  }, [currentUser, syncManager]);


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
      const syncResult = await Effect.runPromise(performSync());
      console.log('✅ Manual sync completed:', syncResult);
      onMessage(`✅ Sync completed! ${syncResult.message}`);
      
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
    if (!currentUser || !syncManager) {
      onMessage('❌ Please login first to toggle auto-sync');
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await syncManager.toggleAutoSync();
      onMessage(result.success ? `✅ ${result.message}` : `❌ ${result.message}`);
    } catch (error) {
      console.error('❌ Auto-sync toggle failed:', error);
      onMessage('❌ Failed to toggle auto-sync');
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
          disabled={isLoading || !currentUser || !syncManager}
          style={{
            padding: '10px 16px',
            backgroundColor: (syncManager?.isEnabled) ? '#28a745' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: (isLoading || !currentUser || !syncManager) ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            opacity: (isLoading || !currentUser || !syncManager) ? 0.6 : 1
          }}
        >
          Auto-Sync: {(syncManager?.isEnabled) ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Auto-Sync Status */}
      {currentUser && syncManager && (
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
          <div>• Enabled: {syncManager.isEnabled ? '✅ Yes' : '❌ No'}</div>
          {autoSyncStatus && (
            <>
              <div>• Running: {autoSyncStatus.isRunning ? '🔄 Yes' : '⏸️ No'}</div>
              <div>• Queue Size: {autoSyncStatus.queueSize || 0}</div>
              <div>• Last Sync: {autoSyncStatus.lastSyncTime ? new Date(autoSyncStatus.lastSyncTime).toLocaleString() : 'Never'}</div>
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