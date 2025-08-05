/**
 * Simple Bookmark Functions
 * Basic CRUD operations - no complex abstractions
 */

import * as LocalFirstOps from '../local-first-impl/local-first-operations';

export interface Bookmark {
  id: string;
  title: string;
  link?: string;
  summary?: string;
  user_id: string;
  created_at: string;
  status: number;
  type: number;
}

export interface CreateBookmarkData {
  title: string;
  link?: string;
  summary?: string;
  user_id: string;
  status?: number;
  type?: number;
  level?: number;
  sort_order?: number;
}

// Create a bookmark
export async function createBookmark(data: CreateBookmarkData): Promise<Bookmark> {
  const bookmarkData = {
    title: data.title,
    link: data.link || '',
    summary: data.summary || '',
    user_id: data.user_id,
    status: data.status || 1,
    type: data.type || 1,
    level: data.level || 0,
    sort_order: data.sort_order || Date.now(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  
  const entity = await LocalFirstOps.createEntity('bookmarks', bookmarkData);
  return {
    id: entity.id,
    title: entity.title,
    link: entity.link,
    summary: entity.summary,
    user_id: entity.user_id,
    created_at: entity.created_at,
    status: entity.status,
    type: entity.type,
  };
}

// Get bookmarks for a user
export async function getBookmarks(userId: string): Promise<Bookmark[]> {
  const entities = await LocalFirstOps.getEntities({
    user_id: userId,
    status: 1, // active bookmarks only
  });
  
  return entities.map(entity => ({
    id: entity.id,
    title: entity.title,
    link: entity.link,
    summary: entity.summary,
    user_id: entity.user_id,
    created_at: entity.created_at,
    status: entity.status,
    type: entity.type,
  }));
}

// Delete a bookmark
export async function deleteBookmark(id: string): Promise<void> {
  await LocalFirstOps.deleteEntity(id);
}

// Get single bookmark
export async function getBookmark(id: string): Promise<Bookmark | null> {
  const entity = await LocalFirstOps.getEntityById(id);
  if (!entity) return null;
  
  return {
    id: entity.id,
    title: entity.title,
    link: entity.link,
    summary: entity.summary,
    user_id: entity.user_id,
    created_at: entity.created_at,
    status: entity.status,
    type: entity.type,
  };
}

// Update bookmark
export async function updateBookmark(id: string, data: Partial<CreateBookmarkData>): Promise<Bookmark> {
  const updateData = {
    ...data,
    updated_at: new Date().toISOString(),
  };
  
  const entity = await LocalFirstOps.updateEntity(id, updateData);
  return {
    id: entity.id,
    title: entity.title,
    link: entity.link,
    summary: entity.summary,
    user_id: entity.user_id,
    created_at: entity.created_at,
    status: entity.status,
    type: entity.type,
  };
}