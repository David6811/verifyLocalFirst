import { useState } from 'react';
import StatusMessage from './StatusMessage';
import AuthSection from './AuthSection';
import SyncControls from './SyncControls';
import BookmarkList from './BookmarkList';

function LocalfirstTest() {
  const [message, setMessage] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [bookmarkRefreshTrigger, setBookmarkRefreshTrigger] = useState<number>(0);

  // Handle user changes from AuthSection
  const handleUserChange = (user: any) => {
    setCurrentUser(user);
    
    // Clear bookmarks when user logs out
    if (!user) {
      setBookmarkRefreshTrigger(prev => prev + 1);
    }
  };

  // Handle bookmark changes from SyncControls
  const handleBookmarkChange = () => {
    setBookmarkRefreshTrigger(prev => prev + 1);
  };

  return (
    <div style={{ 
      width: '100%', 
      minWidth: '300px',
      maxWidth: '400px',
      height: '100vh', 
      background: 'white',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      overflow: 'hidden'
    }}>
      {/* Global Status Message */}
      <StatusMessage message={message} />
      
      {/* Authentication Section - handles its own login/logout */}
      <AuthSection 
        onUserChange={handleUserChange}
        onMessage={setMessage}
      />
      
      {/* Sync Controls Section - handles bookmark creation and sync */}
      <SyncControls
        currentUser={currentUser}
        onMessage={setMessage}
        onBookmarkChange={handleBookmarkChange}
      />

      {/* Bookmark List Section - handles bookmark display and deletion */}
      <BookmarkList
        currentUser={currentUser}
        onMessage={setMessage}
        refreshTrigger={bookmarkRefreshTrigger}
      />
    </div>
  );
}

export default LocalfirstTest;