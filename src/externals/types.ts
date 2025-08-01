import { Schema } from "effect";

// Enums for bookmark type and status
export const BookmarkStatus = {
  ACTIVE: 1,
  ARCHIVED: 2,
  DELETED: 3,
} as const;

export const BookmarkType = {
  BOOKMARK: 1,
  FOLDER: 2,
  SEPARATOR: 3,
} as const;

export type BookmarkStatus = typeof BookmarkStatus[keyof typeof BookmarkStatus];
export type BookmarkType = typeof BookmarkType[keyof typeof BookmarkType];

// Core bookmark interface using UUID strings for local-first storage
export interface Bookmark {
  readonly id: string; // UUID string for local-first compatibility
  readonly created_at: string;
  readonly updated_at: string | null;
  readonly parent_id: string | null; // UUID string reference
  readonly link: string | null;
  readonly title: string | null;
  readonly summary: string | null;
  readonly status: BookmarkStatus;
  readonly tags: string[] | null;
  readonly type: BookmarkType;
  readonly path: string | null;
  readonly level: number;
  readonly sort_order: number;
  readonly image_url: string | null;
  readonly favicon_url: string | null;
  readonly metadata: Record<string, unknown>;
  readonly user_id: string | null;
}

// Schema for bookmark validation
export const BookmarkSchema = Schema.Struct({
  id: Schema.String,
  created_at: Schema.String,
  updated_at: Schema.NullOr(Schema.String),
  parent_id: Schema.NullOr(Schema.String),
  link: Schema.NullOr(Schema.String),
  title: Schema.NullOr(Schema.String),
  summary: Schema.NullOr(Schema.String),
  status: Schema.Literal(BookmarkStatus.ACTIVE, BookmarkStatus.ARCHIVED, BookmarkStatus.DELETED),
  tags: Schema.NullOr(Schema.Array(Schema.String)),
  type: Schema.Literal(BookmarkType.BOOKMARK, BookmarkType.FOLDER, BookmarkType.SEPARATOR),
  path: Schema.NullOr(Schema.String),
  level: Schema.Number,
  sort_order: Schema.Number,
  image_url: Schema.NullOr(Schema.String),
  favicon_url: Schema.NullOr(Schema.String),
  metadata: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
  user_id: Schema.NullOr(Schema.String),
});

// Data types for bookmark operations
export interface BookmarkCreateData {
  readonly parent_id?: string | null;
  readonly link?: string | null;
  readonly title?: string | null;
  readonly summary?: string | null;
  readonly status?: BookmarkStatus;
  readonly tags?: string[] | null;
  readonly type?: BookmarkType;
  readonly path?: string | null;
  readonly level?: number;
  readonly sort_order?: number;
  readonly image_url?: string | null;
  readonly favicon_url?: string | null;
  readonly metadata?: Record<string, unknown>;
  readonly user_id?: string | null;
}

export interface BookmarkUpdateData {
  readonly parent_id?: string | null;
  readonly link?: string | null;
  readonly title?: string | null;
  readonly summary?: string | null;
  readonly status?: BookmarkStatus;
  readonly tags?: string[] | null;
  readonly type?: BookmarkType;
  readonly path?: string | null;
  readonly level?: number;
  readonly sort_order?: number;
  readonly image_url?: string | null;
  readonly favicon_url?: string | null;
  readonly metadata?: Record<string, unknown>;
  readonly updated_at?: string;
}

// Schema for create data validation
export const BookmarkCreateDataSchema = Schema.Struct({
  parent_id: Schema.optional(Schema.NullOr(Schema.String)),
  link: Schema.optional(Schema.NullOr(Schema.String)),
  title: Schema.optional(Schema.NullOr(Schema.String)),
  summary: Schema.optional(Schema.NullOr(Schema.String)),
  status: Schema.optional(Schema.Literal(BookmarkStatus.ACTIVE, BookmarkStatus.ARCHIVED, BookmarkStatus.DELETED)),
  tags: Schema.optional(Schema.NullOr(Schema.Array(Schema.String))),
  type: Schema.optional(Schema.Literal(BookmarkType.BOOKMARK, BookmarkType.FOLDER, BookmarkType.SEPARATOR)),
  path: Schema.optional(Schema.NullOr(Schema.String)),
  level: Schema.optional(Schema.Number),
  sort_order: Schema.optional(Schema.Number),
  image_url: Schema.optional(Schema.NullOr(Schema.String)),
  favicon_url: Schema.optional(Schema.NullOr(Schema.String)),
  metadata: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
  user_id: Schema.optional(Schema.NullOr(Schema.String)),
});

// Schema for update data validation
export const BookmarkUpdateDataSchema = Schema.Struct({
  parent_id: Schema.optional(Schema.NullOr(Schema.String)),
  link: Schema.optional(Schema.NullOr(Schema.String)),
  title: Schema.optional(Schema.NullOr(Schema.String)),
  summary: Schema.optional(Schema.NullOr(Schema.String)),
  status: Schema.optional(Schema.Literal(BookmarkStatus.ACTIVE, BookmarkStatus.ARCHIVED, BookmarkStatus.DELETED)),
  tags: Schema.optional(Schema.NullOr(Schema.Array(Schema.String))),
  type: Schema.optional(Schema.Literal(BookmarkType.BOOKMARK, BookmarkType.FOLDER, BookmarkType.SEPARATOR)),
  path: Schema.optional(Schema.NullOr(Schema.String)),
  level: Schema.optional(Schema.Number),
  sort_order: Schema.optional(Schema.Number),
  image_url: Schema.optional(Schema.NullOr(Schema.String)),
  favicon_url: Schema.optional(Schema.NullOr(Schema.String)),
  metadata: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
  updated_at: Schema.optional(Schema.String),
});

// Query options for bookmark filtering and sorting
export interface BookmarkQueryOptions {
  readonly parent_id?: string | null;
  readonly user_id?: string;
  readonly status?: BookmarkStatus;
  readonly type?: BookmarkType;
  readonly tags?: string[];
  readonly search?: string;
  readonly limit?: number;
  readonly offset?: number;
  readonly sort_by?: 'created_at' | 'updated_at' | 'title' | 'sort_order';
  readonly sort_order?: 'asc' | 'desc';
}

export const BookmarkQueryOptionsSchema = Schema.Struct({
  parent_id: Schema.optional(Schema.NullOr(Schema.String)),
  user_id: Schema.optional(Schema.String),
  status: Schema.optional(Schema.Literal(BookmarkStatus.ACTIVE, BookmarkStatus.ARCHIVED, BookmarkStatus.DELETED)),
  type: Schema.optional(Schema.Literal(BookmarkType.BOOKMARK, BookmarkType.FOLDER, BookmarkType.SEPARATOR)),
  tags: Schema.optional(Schema.Array(Schema.String)),
  search: Schema.optional(Schema.String),
  limit: Schema.optional(Schema.Number),
  offset: Schema.optional(Schema.Number),
  sort_by: Schema.optional(Schema.Literal('created_at', 'updated_at', 'title', 'sort_order')),
  sort_order: Schema.optional(Schema.Literal('asc', 'desc')),
});

// Utility types for hierarchical bookmarks
export interface BookmarkHierarchy extends Bookmark {
  readonly children: BookmarkHierarchy[];
}

export interface BookmarkPath {
  readonly id: string;
  readonly title: string | null;
  readonly level: number;
}

// Metadata extraction types
export interface BookmarkMetadata {
  readonly description?: string;
  readonly keywords?: string[];
  readonly author?: string;
  readonly site_name?: string;
  readonly article_published_time?: string;
  readonly article_modified_time?: string;
  readonly og_image?: string;
  readonly og_title?: string;
  readonly og_description?: string;
}

export const BookmarkMetadataSchema = Schema.Struct({
  description: Schema.optional(Schema.String),
  keywords: Schema.optional(Schema.Array(Schema.String)),
  author: Schema.optional(Schema.String),
  site_name: Schema.optional(Schema.String),
  article_published_time: Schema.optional(Schema.String),
  article_modified_time: Schema.optional(Schema.String),
  og_image: Schema.optional(Schema.String),
  og_title: Schema.optional(Schema.String),
  og_description: Schema.optional(Schema.String),
});