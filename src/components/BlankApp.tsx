import { useState, useEffect } from 'react';
import { signInLegacy, signOutLegacy, getCurrentUserLegacy } from '../local-first-impl/auth/auth';
import { createBookmark, getBookmarks } from '../externals/bookmark-operations';
import { BookmarkStatus, BookmarkType, type Bookmark } from '../externals/types';
import { performManualSync } from '../local-first/manual-sync';
import { Effect } from 'effect';

function BlankApp() {
  const [message, setMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Load current user and bookmarks on component mount
  useEffect(() => {
    loadCurrentUser();
    loadBookmarks();
  }, []);

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
      await signOutLegacy();
      setCurrentUser(null);
      setBookmarks([]);
      setMessage('✅ Logout successful!');
    } catch (error) {
      setMessage(`❌ Logout failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      height: '100vh', 
      background: 'white',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
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
        gap: '12px',
        maxWidth: '200px'
      }}>
        <button
          onClick={handleLogin}
          disabled={isLoading}
          style={{
            padding: '12px 20px',
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
            padding: '12px 20px',
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
            padding: '12px 20px',
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
            padding: '12px 20px',
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
      </div>

      {/* Bookmark List */}
      {currentUser && (
        <div style={{
          marginTop: '20px',
          flex: 1,
          overflow: 'auto'
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
                    padding: '12px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px',
                    backgroundColor: '#f9f9f9'
                  }}
                >
                  <div style={{ 
                    fontWeight: 'bold', 
                    fontSize: '14px', 
                    marginBottom: '4px',
                    color: '#333'
                  }}>
                    {bookmark.title || 'Untitled'}
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

export default BlankApp;