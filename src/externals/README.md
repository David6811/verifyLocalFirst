# Simple Externals API

Super simple functions for the app. No complexity, no confusion.

## 🔐 Auth

```typescript
import { login, logout, getCurrentUser, quickLogin } from '../externals';

// Login with email/password
const user = await login('email@example.com', 'password');

// Quick test login
const user = await quickLogin();

// Get current user (returns null if not logged in)
const user = await getCurrentUser();

// Logout
await logout();
```

## 📚 Bookmarks

```typescript
import { getBookmarks, createBookmark, deleteBookmark } from '../externals';

// Get all bookmarks for a user
const bookmarks = await getBookmarks(userId);

// Create a new bookmark
const bookmark = await createBookmark({
  title: 'My Bookmark',
  link: 'https://example.com',
  user_id: userId
});

// Delete a bookmark
await deleteBookmark(bookmarkId);
```

## 🔄 Sync

```typescript
import { sync, enableAutoSync, disableAutoSync, getSyncStatus } from '../externals';

// Manual sync
const result = await sync(); // Returns "Sync completed successfully"

// Auto sync controls
enableAutoSync();
disableAutoSync();

// Check status
const status = getSyncStatus(); // { enabled: boolean, lastSync?: Date }
```

That's it! Simple and easy. 🎉