import { useState, useEffect } from 'react';
import { 
  createBookmark, 
  sync, 
  enableAutoSync, 
  disableAutoSync, 
  getSyncStatus, 
  updateLastSyncTime,
  SyncStatus 
} from '../externals';

interface SyncControlsProps {
  currentUser: any;
  onMessage: (message: string) => void;
  onBookmarkChange: () => void; // Notify parent when bookmarks change
}

export default function SyncControls({ currentUser, onMessage, onBookmarkChange }: SyncControlsProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ enabled: false });

  // Load sync status
  useEffect(() => {
    setSyncStatus(getSyncStatus());
  }, []);

  const handleAddBookmark = async () => {
    if (!currentUser) {
      onMessage('❌ Please login first to add bookmarks');
      return;
    }

    setIsLoading(true);
    onMessage('');
    
    try {
      const newBookmark = await createBookmark({
        title: 'Sample Bookmark',
        link: 'https://example.com',
        summary: 'This is a sample bookmark created from the extension',
        user_id: currentUser.id,
        status: 1,
        type: 1,
        level: 0,
        sort_order: Date.now()
      });
      
      onMessage(`✅ Bookmark added successfully: ${newBookmark.title}`);
      
      // Notify parent to refresh bookmark list
      onBookmarkChange();
    } catch (error) {
      onMessage(`❌ Add bookmark failed: ${(error as Error).message}`);
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
      const result = await sync();
      updateLastSyncTime();
      setSyncStatus(getSyncStatus());
      onMessage(`✅ ${result}`);
      
      // Notify parent to refresh bookmark list
      onBookmarkChange();
    } catch (error) {
      onMessage(`❌ Sync failed: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAutoSync = () => {
    if (!currentUser) {
      onMessage('❌ Please login first to toggle auto-sync');
      return;
    }

    if (syncStatus.enabled) {
      disableAutoSync();
      onMessage('✅ Auto-sync disabled!');
    } else {
      enableAutoSync();
      onMessage('✅ Auto-sync enabled!');
    }
    
    setSyncStatus(getSyncStatus());
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
          disabled={!currentUser}
          style={{
            padding: '10px 16px',
            backgroundColor: syncStatus.enabled ? '#28a745' : '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: !currentUser ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            opacity: !currentUser ? 0.6 : 1
          }}
        >
          Auto-Sync: {syncStatus.enabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Auto-Sync Status */}
      {currentUser && (
        <div style={{
          padding: '10px',
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '4px',
          fontSize: '11px',
          color: '#495057',
          wordBreak: 'break-word'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Sync Status:</div>
          <div>• Auto-Sync: {syncStatus.enabled ? '✅ Enabled' : '❌ Disabled'}</div>
          {syncStatus.lastSync && (
            <div>• Last Sync: {syncStatus.lastSync.toLocaleString()}</div>
          )}
        </div>
      )}
    </>
  );
}