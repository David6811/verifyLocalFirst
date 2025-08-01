import { useState, useEffect } from 'react';
import { signInLegacy, signOutLegacy, getCurrentUserLegacy } from '../local-first-impl/auth/auth';
import { createBookmark, getBookmarks, deleteBookmark } from '../externals/bookmark-operations';
import { BookmarkStatus, BookmarkType, type Bookmark } from '../externals/types';
import { performManualSync } from '../local-first/manual-sync';
import { AutoSyncEngine } from '../local-first/sync-engine';
import { ConfigurationManager } from '../local-first/sync-engine/config';
import type { AutoSyncStatus } from '../local-first/sync-engine/types';
import { Effect } from 'effect';

function LocalfirstTest() {
  const [message, setMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [autoSyncEngine, setAutoSyncEngine] = useState<AutoSyncEngine | null>(null);
  const [autoSyncStatus, setAutoSyncStatus] = useState<AutoSyncStatus | null>(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(false);

  // Load current user and bookmarks on component mount
  useEffect(() => {
    loadCurrentUser();
    loadBookmarks();
    initializeAutoSync();

    // Cleanup on unmount
    return () => {
      if (autoSyncEngine) {
        console.log('🧹 Cleaning up auto-sync engine...');
        autoSyncEngine.cleanup();
      }
    };
  }, []);

  const initializeAutoSync = async () => {
    try {
      console.log('🔄 Initializing auto-sync engine...');
      
      // Create configuration manager for bookmarks table
      const configManager = new ConfigurationManager({
        tableName: 'bookmarks',
        storageKeyPrefix: 'mateme_autosync'
      });
      
      // Create auto-sync engine
      const engine = new AutoSyncEngine(configManager);
      
      // Add status listener with bookmark refresh
      const statusListener = (status: AutoSyncStatus) => {
        console.log('📊 Auto-sync status updated:', status);
        setAutoSyncStatus(status);
        setAutoSyncEnabled(status.enabled);
        
        // Refresh bookmark list when sync completes successfully
        if (!status.isRunning && status.queueSize === 0 && status.lastSync) {
          // Add small delay to ensure storage operations are complete
          setTimeout(() => {
            console.log('🔄 Auto-sync completed, refreshing bookmark list...');
            loadBookmarks().catch(error => {
              console.error('Failed to refresh bookmarks after auto-sync:', error);
            });
          }, 500); // 500ms delay
        }
      };
      
      engine.addStatusListener(statusListener);
      
      // Initialize the engine
      await engine.initialize();
      
      setAutoSyncEngine(engine);
      console.log('✅ Auto-sync engine initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize auto-sync:', error);
      setMessage('⚠️ Auto-sync initialization failed');
    }
  };

  const loadCurrentUser = async () => {
    try {
      const user = await getCurrentUserLegacy();
      setCurrentUser(user);
    } catch (error) {
      console.log('No user logged in');
    }
  };

  const loadBookmarks = async () => {
    try {
      const user = await getCurrentUserLegacy();
      if (user) {
        const bookmarksResult = await Effect.runPromise(getBookmarks({ user_id: user.id }));
        setBookmarks(bookmarksResult);
      }
    } catch (error) {
      console.log('Failed to load bookmarks:', error);
    }
  };

  const handleLogin = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const user = await signInLegacy({
        email: 'weixu.craftsman@gmail.com',
        password: '123456'
      });
      
      setCurrentUser(user);
      setMessage(`✅ Login successful! Welcome ${user.email}`);
      
      // Enable auto-sync after successful login
      if (autoSyncEngine) {
        try {
          console.log('🔄 Enabling auto-sync for user:', user.email);
          await autoSyncEngine.setEnabled(true);
          
          // Refresh remote change detection with new user context
          await autoSyncEngine.refreshRemoteChangeDetection();
          
          console.log('✅ Auto-sync enabled');
          setMessage(`✅ Login successful! Auto-sync enabled for ${user.email}`);
        } catch (syncError) {
          console.error('⚠️ Auto-sync enable failed:', syncError);
          setMessage(`✅ Login successful! Auto-sync setup pending`);
        }
      }
      
      // Load bookmarks after successful login
      await loadBookmarks();
    } catch (error) {
      setMessage(`❌ Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      // Disable auto-sync before logout
      if (autoSyncEngine) {
        try {
          console.log('🔄 Disabling auto-sync...');
          await autoSyncEngine.setEnabled(false);
          console.log('✅ Auto-sync disabled');
        } catch (syncError) {
          console.error('⚠️ Auto-sync disable failed:', syncError);
        }
      }
      
      await signOutLegacy();
      setCurrentUser(null);
      setBookmarks([]);
      setAutoSyncEnabled(false);
      setMessage('✅ Logout successful! Auto-sync disabled');
    } catch (error) {
      setMessage(`❌ Logout failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAutoSync = async () => {
    if (!currentUser || !autoSyncEngine) {
      setMessage('❌ Please login first to toggle auto-sync');
      return;
    }

    setIsLoading(true);
    const newState = !autoSyncEnabled;
    
    try {
      console.log(`🔄 ${newState ? 'Enabling' : 'Disabling'} auto-sync...`);
      await autoSyncEngine.setEnabled(newState);
      
      if (newState) {
        // Refresh remote change detection when enabling
        await autoSyncEngine.refreshRemoteChangeDetection();
      }
      
      setAutoSyncEnabled(newState);
      setMessage(`✅ Auto-sync ${newState ? 'enabled' : 'disabled'}!`);
      console.log(`✅ Auto-sync ${newState ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('❌ Auto-sync toggle failed:', error);
      setMessage(`❌ Failed to ${newState ? 'enable' : 'disable'} auto-sync`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSync = async () => {
    if (!currentUser) {
      setMessage('❌ Please login first to sync');
      return;
    }

    setIsLoading(true);
    setMessage('🔄 Syncing with Supabase...');
    
    try {
      const syncResult = await performManualSync();
      console.log('✅ Manual sync completed:', syncResult);
      setMessage(`✅ Sync completed! Synced: ${syncResult.syncedCount || 0} items`);
      
      // Refresh bookmark list after sync
      await loadBookmarks();
    } catch (error) {
      console.error('❌ Manual sync failed:', error);
      setMessage(`❌ Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBookmark = async (bookmarkId: string, bookmarkTitle: string) => {
    if (!currentUser) {
      setMessage('❌ Please login first to delete bookmarks');
      return;
    }

    setIsLoading(true);
    setMessage('🗑️ Deleting bookmark...');
    
    try {
      await Effect.runPromise(deleteBookmark(bookmarkId));
      setMessage(`✅ Bookmark deleted: ${bookmarkTitle}`);
      
      // Trigger manual sync to push deletion to Supabase
      try {
        console.log('🔄 Triggering manual sync for deletion...');
        const syncResult = await performManualSync();
        console.log('✅ Delete sync completed:', syncResult);
        setMessage(`✅ Bookmark deleted and synced: ${bookmarkTitle}`);
      } catch (syncError) {
        console.log('⚠️ Delete sync failed but bookmark deleted locally:', syncError);
        setMessage(`✅ Bookmark deleted locally: ${bookmarkTitle} (sync pending)`);
      }
      
      // Refresh bookmark list
      await loadBookmarks();
    } catch (error) {
      setMessage(`❌ Delete bookmark failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddBookmark = async () => {
    if (!currentUser) {
      setMessage('❌ Please login first to add bookmarks');
      return;
    }

    setIsLoading(true);
    setMessage('');
    
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
      
      setMessage(`✅ Bookmark added successfully: ${newBookmark.title}`);
      
      // Trigger manual sync to push to Supabase
      try {
        console.log('🔄 Triggering manual sync to Supabase...');
        const syncResult = await performManualSync();
        console.log('✅ Sync completed:', syncResult);
        setMessage(`✅ Bookmark added and synced! ${newBookmark.title}`);
      } catch (syncError) {
        console.log('⚠️ Sync failed but bookmark saved locally:', syncError);
        setMessage(`✅ Bookmark added locally: ${newBookmark.title} (sync pending)`);
      }
      
      // Refresh bookmark list
      await loadBookmarks();
    } catch (error) {
      setMessage(`❌ Add bookmark failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ 
      width: '100%', 
      minWidth: '300px', // Ensure minimum width for sidebar
      maxWidth: '400px', // Limit maximum width
      height: '100vh', 
      background: 'white',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      overflow: 'hidden' // Prevent horizontal overflow
    }}>
      {/* Success/Error Message */}
      {message && (
        <div style={{
          padding: '12px',
          borderRadius: '4px',
          backgroundColor: message.includes('✅') ? '#d4edda' : '#f8d7da',
          color: message.includes('✅') ? '#155724' : '#721c24',
          border: `1px solid ${message.includes('✅') ? '#c3e6cb' : '#f5c6cb'}`,
          fontSize: '14px'
        }}>
          {message}
        </div>
      )}

      {/* Buttons */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        width: '100%'
      }}>
        <button
          onClick={handleLogin}
          disabled={isLoading}
          style={{
            padding: '10px 16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            opacity: isLoading ? 0.6 : 1
          }}
        >
          {isLoading ? 'Loading...' : 'Login'}
        </button>

        <button
          onClick={handleLogout}
          disabled={isLoading}
          style={{
            padding: '10px 16px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            opacity: isLoading ? 0.6 : 1
          }}
        >
          {isLoading ? 'Loading...' : 'Logout'}
        </button>

        <button
          onClick={handleAddBookmark}
          disabled={isLoading}
          style={{
            padding: '10px 16px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            opacity: isLoading ? 0.6 : 1
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

      {/* Bookmark List */}
      {currentUser && (
        <div style={{
          marginTop: '12px',
          flex: 1,
          overflow: 'auto',
          minHeight: 0 // Allow flex item to shrink
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#333' }}>
            My Bookmarks ({bookmarks.length})
          </h3>
          
          {bookmarks.length === 0 ? (
            <p style={{ color: '#666', fontSize: '14px', fontStyle: 'italic' }}>
              No bookmarks yet. Click "Add Bookmark" to create your first one!
            </p>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              {bookmarks.map((bookmark) => (
                <div
                  key={bookmark.id}
                  style={{
                    padding: '10px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px',
                    backgroundColor: '#f9f9f9'
                  }}
                >
                  {/* Title Row with Delete Button */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '6px',
                    gap: '8px'
                  }}>
                    <div style={{ 
                      fontWeight: 'bold', 
                      fontSize: '14px', 
                      color: '#333',
                      flex: 1,
                      minWidth: 0, // Allow text to shrink
                      wordBreak: 'break-word'
                    }}>
                      {bookmark.title || 'Untitled'}
                    </div>
                    
                    {/* Compact Delete Button */}
                    <button
                      onClick={() => handleDeleteBookmark(bookmark.id, bookmark.title || 'Untitled')}
                      disabled={isLoading}
                      style={{
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        padding: '2px 6px',
                        fontSize: '10px',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        opacity: isLoading ? 0.6 : 1,
                        flexShrink: 0, // Prevent button from shrinking
                        minWidth: '24px',
                        height: '20px',
                        lineHeight: '1'
                      }}
                      title="Delete bookmark"
                    >
                      ×
                    </button>
                  </div>
                  
                  {bookmark.link && (
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#007bff',
                      marginBottom: '4px',
                      wordBreak: 'break-all'
                    }}>
                      <a 
                        href={bookmark.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ color: '#007bff', textDecoration: 'none' }}
                      >
                        {bookmark.link}
                      </a>
                    </div>
                  )}
                  
                  {bookmark.summary && (
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#666',
                      marginBottom: '4px'
                    }}>
                      {bookmark.summary}
                    </div>
                  )}
                  
                  <div style={{ 
                    fontSize: '11px', 
                    color: '#888'
                  }}>
                    Created: {new Date(bookmark.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default LocalfirstTest;