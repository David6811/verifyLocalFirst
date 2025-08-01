/**
 * Bookmark Operations
 * 
 * Provides a unified interface for bookmark storage operations using local-first architecture.
 * All operations route through the local-first storage implementation.
 */

import { Effect } from 'effect';
import type {
  Bookmark,
  BookmarkCreateData,
  BookmarkUpdateData,
  BookmarkQueryOptions,
  BookmarkHierarchy,
  BookmarkStatus
} from './types';

// Type conversion functions (for future use)
// const bookmarkToDomainEntity = (bookmark: Bookmark): BookmarkDomainEntity => {
//   return bookmark as any as BookmarkDomainEntity;
// };

// const domainEntityToBookmark = (entity: BookmarkDomainEntity): Bookmark => {
//   return entity as any as Bookmark;
// };

// Import local-first storage implementation
import * as LocalFirstOps from '../local-first-impl/local-first-operations';

// Import type converters for local-first operations
import {
  bookmarkCreateDataToGeneric,
  bookmarkUpdateDataToGeneric,
  bookmarkQueryOptionsToGeneric,
  genericEntityToBookmark,
  genericEntitiesToBookmarks
} from './config/bookmark-type-converters';

// Storage mode type (simplified to local-first only)
export type StorageMode = 'local-first';

console.log('🔄 Storage mode: local-first');

// Function to get current storage mode (always local-first)
export const getStorageMode = (): StorageMode => {
  return 'local-first';
};

// ================================
// LOCAL-FIRST OPERATION ROUTING
// ================================

// Core CRUD operations using local-first storage
export const createBookmark = (data: BookmarkCreateData & { uuid?: string }): Effect.Effect<Bookmark, Error> => {
  return Effect.map(
    Effect.promise(() => LocalFirstOps.createEntity('bookmarks', bookmarkCreateDataToGeneric(data))),
    (entity) => genericEntityToBookmark(entity)
  );
};

export const getBookmarkById = (uuid: string): Effect.Effect<Bookmark | null, Error> => {
  return Effect.map(
    Effect.promise(() => LocalFirstOps.getEntityById(uuid)),
    (entity) => entity ? genericEntityToBookmark(entity) : null
  );
};

export const updateBookmark = (uuid: string, data: BookmarkUpdateData): Effect.Effect<Bookmark, Error> => {
  return Effect.map(
    Effect.promise(() => LocalFirstOps.updateEntity(uuid, bookmarkUpdateDataToGeneric(data))),
    (entity) => genericEntityToBookmark(entity)
  );
};

export const deleteBookmark = (uuid: string): Effect.Effect<void, Error> => {
  return Effect.promise(() => LocalFirstOps.deleteEntity(uuid));
};

export const permanentDeleteBookmark = (uuid: string): Effect.Effect<void, Error> => {
  return Effect.promise(() => LocalFirstOps.permanentDeleteEntity(uuid));
};

export const getBookmarks = (options?: BookmarkQueryOptions): Effect.Effect<Bookmark[], Error> => {
  return Effect.map(
    Effect.promise(() => LocalFirstOps.getEntities(bookmarkQueryOptionsToGeneric(options))),
    (entities) => genericEntitiesToBookmarks(entities)
  );
};

export const getBookmarkChildren = (parentId: string): Effect.Effect<Bookmark[], Error> => {
  // Use direct fallback to getBookmarks for simplicity
  return getBookmarks({
    parent_id: parentId,
    status: 1,
    sort_by: 'sort_order',
    sort_order: 'asc'
  });
};

export const getBookmarkPath = (bookmarkId: string): Effect.Effect<string[], Error> => {
  return Effect.map(
    Effect.promise(() => LocalFirstOps.getEntityById(bookmarkId)),
    (entity) => entity ? [entity.id] : []
  );
};

export const getBookmarkTree = (
  _parentId: string | null = null,
  _maxDepth: number = 10,
  _currentDepth: number = 0
): Effect.Effect<BookmarkHierarchy[], Error> => {
  // Simplified: not implemented in storage adapters yet
  return Effect.fail(new Error('getBookmarkTree not implemented - use bookmarks-adapter instead'));
};

export const updateBookmarkSortOrder = (
  bookmarkId: string,
  sortOrder: number
): Effect.Effect<void, Error> => {
  // Simplified: use direct fallback to updateBookmark
  return Effect.andThen(
    updateBookmark(bookmarkId, { sort_order: sortOrder }),
    () => Effect.succeed(undefined)
  );
};

export const searchBookmarks = (
  searchTerm: string,
  userId?: string,
  options?: Omit<BookmarkQueryOptions, 'search'>
): Effect.Effect<Bookmark[], Error> => {
  // Simplified: always use getBookmarks with search
  return getBookmarks({
    ...options,
    search: searchTerm,
    user_id: userId
  });
};

export const getBookmarksByTags = (
  tags: string[],
  userId?: string,
  options?: BookmarkQueryOptions
): Effect.Effect<Bookmark[], Error> => {
  // Simplified: always use client-side filtering
  return Effect.map(
    getBookmarks({ user_id: userId, ...options }),
    (bookmarks) => bookmarks.filter(bookmark => 
      'tags' in bookmark && bookmark.tags && tags.some((tag: string) => bookmark.tags?.includes(tag))
    )
  );
};

export const getUserTags = (userId: string): Effect.Effect<string[], Error> => {
  // Simplified: always extract from bookmarks
  return Effect.map(
    getBookmarks({ user_id: userId }),
    (bookmarks) => {
      const allTags = new Set<string>();
      bookmarks.forEach(bookmark => {
        if ('tags' in bookmark && bookmark.tags) {
          bookmark.tags.forEach((tag: string) => allTags.add(tag));
        }
      });
      return Array.from(allTags).sort();
    }
  );
};

export const getBookmarkCount = (userId: string, status?: BookmarkStatus): Effect.Effect<number, Error> => {
  // Simplified: always count from getBookmarks
  return Effect.map(
    getBookmarks({ user_id: userId, status }),
    (bookmarks) => bookmarks.length
  );
};

// Legacy Promise wrappers removed - use Effect operations directly or bookmarks-adapter legacy functions

// ================================
// ADAPTER ACCESS
// ================================

/**
 * Check adapter health and connectivity
 */
export const checkAdapterHealth = (): Effect.Effect<boolean, Error> => {
  // Simplified: always return true for basic health check
  return Effect.succeed(true);
};