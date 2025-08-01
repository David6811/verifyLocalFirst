import { useState, useEffect } from 'react';
import { getBookmarks, deleteBookmark } from '../externals/bookmark-operations';
import { performManualSync } from '../local-first/manual-sync';
import { getCurrentUserLegacy } from '../local-first-impl/auth/auth';
import type { Bookmark } from '../externals/types';
import { Effect } from 'effect';

interface BookmarkListProps {
  currentUser: any;
  onMessage: (message: string) => void;
  refreshTrigger?: number; // External trigger to refresh bookmarks
}

export default function BookmarkList({ currentUser, onMessage, refreshTrigger }: BookmarkListProps) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Load bookmarks when user changes or refresh trigger changes
  useEffect(() => {
    if (currentUser) {
      loadBookmarks();
    } else {
      setBookmarks([]);
    }
  }, [currentUser, refreshTrigger]);

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

  const handleDeleteBookmark = async (bookmarkId: string, bookmarkTitle: string) => {
    if (!currentUser) {
      onMessage('❌ Please login first to delete bookmarks');
      return;
    }

    setIsLoading(true);
    onMessage('🗑️ Deleting bookmark...');
    
    try {
      await Effect.runPromise(deleteBookmark(bookmarkId));
      onMessage(`✅ Bookmark deleted: ${bookmarkTitle}`);
      
      // Trigger manual sync to push deletion to Supabase - COMMENTED OUT FOR TESTING  
      // try {
      //   console.log('🔄 Triggering manual sync for deletion...');
      //   const syncResult = await performManualSync();
      //   console.log('✅ Delete sync completed:', syncResult);
      //   onMessage(`✅ Bookmark deleted and synced: ${bookmarkTitle}`);
      // } catch (syncError) {
      //   console.log('⚠️ Delete sync failed but bookmark deleted locally:', syncError);
      //   onMessage(`✅ Bookmark deleted locally: ${bookmarkTitle} (sync pending)`);
      // }
      
      // Refresh bookmark list
      await loadBookmarks();
    } catch (error) {
      onMessage(`❌ Delete bookmark failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Public method to refresh bookmarks (can be called by parent)
  const refresh = () => {
    loadBookmarks();
  };

  if (!currentUser) return null;

  return (
    <div style={{
      marginTop: '12px',
      flex: 1,
      overflow: 'auto',
      minHeight: 0
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h3 style={{ margin: '0', fontSize: '16px', color: '#333' }}>
          My Bookmarks ({bookmarks.length})
        </h3>
        
        {/* Refresh Button */}
        <button
          onClick={loadBookmarks}
          disabled={isLoading}
          style={{
            padding: '4px 8px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '11px',
            opacity: isLoading ? 0.6 : 1
          }}
        >
          🔄 Refresh
        </button>
      </div>
      
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
                  minWidth: 0,
                  wordBreak: 'break-word'
                }}>
                  {bookmark.title || 'Untitled'}
                </div>
                
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
                    flexShrink: 0,
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
  );
}