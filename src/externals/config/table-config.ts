/**
 * Simple table configuration for local-first operations
 */

export const TABLE_CONFIG = {
  bookmarks: {
    tableName: 'bookmarks',
    schema: 'public'
  }
} as const;

export const DEFAULT_SUPABASE_CONFIG = {
  defaultTable: 'bookmarks',
  schema: 'public'
} as const;

export type TableName = keyof typeof TABLE_CONFIG;

export function getTableConfig(tableName: TableName) {
  return TABLE_CONFIG[tableName];
}