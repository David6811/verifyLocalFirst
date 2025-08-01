/**
 * Bookmark Type Converters - Local-First Configuration
 * 
 * Handles conversion between bookmark domain types and generic entity types.
 * This is part of the local-first configuration layer, keeping the local-first 
 * engine completely business-agnostic while enabling domain-specific operations.
 */

import {
  Bookmark,
  BookmarkCreateData,
  BookmarkUpdateData,
  BookmarkQueryOptions,
  BookmarkType,
  BookmarkStatus
} from '../types';
import { 
  GenericEntityCreateData,
  GenericEntityUpdateData,
  GenericEntityQueryOptions,
  GenericEntityResult
} from '../../local-first/schema/dynamic-entity';
import { getTableConfig } from '../../local-first/schema';
import { TABLE_CONFIG } from './table-config';
import { TableConfig } from '../../local-first/schema/dynamic-entity';

// ================================
// DOMAIN TO GENERIC CONVERTERS
// ================================

/**
 * Convert bookmark create data to generic entity create data
 */
export const bookmarkCreateDataToGeneric = (
  data: BookmarkCreateData & { uuid?: string },
  config: TableConfig = TABLE_CONFIG
): GenericEntityCreateData => {
  const tableConfig = getTableConfig(config);
  
  return {
    user_id: data.user_id || undefined,
    uuid: data.uuid,
    data: {
      [tableConfig.getField('title')]: data.title || 'Untitled Bookmark',
      [tableConfig.getField('url')]: data.link || '',
      [tableConfig.getField('description')]: data.summary,
      [tableConfig.getField('tags')]: data.tags || [],
      favicon_url: data.favicon_url,
    }
  };
};

/**
 * Convert bookmark update data to generic entity update data
 */
export const bookmarkUpdateDataToGeneric = (
  data: BookmarkUpdateData,
  config: TableConfig = TABLE_CONFIG
): GenericEntityUpdateData => {
  const tableConfig = getTableConfig(config);
  const schemaData: Record<string, any> = {};
  
  if (data.title !== undefined) {
    schemaData[tableConfig.getField('title')] = data.title;
  }
  if (data.link !== undefined) {
    schemaData[tableConfig.getField('url')] = data.link;
  }
  if (data.summary !== undefined) {
    schemaData[tableConfig.getField('description')] = data.summary;
  }
  if (data.tags !== undefined) {
    schemaData[tableConfig.getField('tags')] = data.tags;
  }
  if (data.favicon_url !== undefined) {
    schemaData.favicon_url = data.favicon_url;
  }
  
  return { data: schemaData };
};

/**
 * Convert bookmark query options to generic entity query options
 */
export const bookmarkQueryOptionsToGeneric = (
  options?: BookmarkQueryOptions,
  config: TableConfig = TABLE_CONFIG
): GenericEntityQueryOptions | undefined => {
  if (!options) return undefined;
  
  const tableConfig = getTableConfig(config);
  const genericOptions: GenericEntityQueryOptions = {
    user_id: options.user_id,
    limit: options.limit,
    offset: options.offset,
  };
  
  if (options.search) {
    genericOptions.search_fields = [
      `data.${tableConfig.getField('title')}`,
      `data.${tableConfig.getField('url')}`
    ];
    genericOptions.search_term = options.search;
  }
  
  return genericOptions;
};

// ================================
// GENERIC TO DOMAIN CONVERTERS
// ================================

/**
 * Convert generic entity result to bookmark
 */
export const genericEntityToBookmark = (
  entity: GenericEntityResult,
  config: TableConfig = TABLE_CONFIG
): Bookmark => {
  const tableConfig = getTableConfig(config);
  const data = entity.data || {};
  
  return {
    id: entity.id,
    created_at: entity.created_at.toISOString(),
    updated_at: entity.updated_at.toISOString(),
    parent_id: null,
    link: data[tableConfig.getField('url')] || null,
    title: data[tableConfig.getField('title')] || null,
    summary: data[tableConfig.getField('description')] || null,
    status: entity.is_deleted ? BookmarkStatus.DELETED : BookmarkStatus.ACTIVE,
    tags: data[tableConfig.getField('tags')] || null,
    type: BookmarkType.BOOKMARK,
    path: null,
    level: 0,
    sort_order: entity.sync_version,
    image_url: null,
    favicon_url: data.favicon_url || null,
    metadata: {
      sync_version: entity.sync_version,
      local_first: true,
      last_modified: entity.updated_at.toISOString()
    },
    user_id: entity.user_id || null,
  };
};

/**
 * Convert array of generic entities to bookmarks
 */
export const genericEntitiesToBookmarks = (
  entities: GenericEntityResult[],
  config: TableConfig = TABLE_CONFIG
): Bookmark[] =>
  entities.map(entity => genericEntityToBookmark(entity, config));

// ================================
// CONVENIENCE FUNCTIONS
// ================================

/**
 * Simplified converter functions that use the unified TABLE_CONFIG
 * No need for separate Supabase config - TABLE_CONFIG now matches Supabase structure
 */
export const bookmarkCreateDataToGenericSimple = (data: BookmarkCreateData & { uuid?: string }): GenericEntityCreateData =>
  bookmarkCreateDataToGeneric(data);

export const bookmarkUpdateDataToGenericSimple = (data: BookmarkUpdateData): GenericEntityUpdateData =>
  bookmarkUpdateDataToGeneric(data);

export const bookmarkQueryOptionsToGenericSimple = (options?: BookmarkQueryOptions): GenericEntityQueryOptions | undefined =>
  bookmarkQueryOptionsToGeneric(options);

export const genericEntityToBookmarkSimple = (entity: GenericEntityResult): Bookmark =>
  genericEntityToBookmark(entity);

export const genericEntitiesToBookmarksSimple = (entities: GenericEntityResult[]): Bookmark[] =>
  genericEntitiesToBookmarks(entities);