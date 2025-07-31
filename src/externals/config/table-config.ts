/**
 * 📊 Table Configuration - 用户编辑这个文件来配置任意数据库表
 * Table Configuration - Users edit this file to configure any database table
 * 
 * 🎯 核心理念：只需配置这一个文件，就能让local-first引擎适配任意数据表！
 * Core Concept: Configure just this one file to make local-first engine work with any table!
 */

import { TableConfig } from '../../local-first/schema/dynamic-entity';

export const TABLE_CONFIG: TableConfig = {
  tableName: 'bookmarks',
  fields: {
    // 引擎字段名: 数据库字段名 (以Supabase实际表结构为准)
    'id': 'uuid',               // 主键 (Supabase使用uuid)
    'title': 'title',           // 标题
    'url': 'link',              // 链接 (Supabase字段名是link)
    'description': 'summary',   // 描述 (Supabase字段名是summary)
    'tags': 'tags',             // 标签
    'userId': 'user_id',        // 用户ID
    'createdAt': 'created_at',  // 创建时间
    'updatedAt': 'updated_at',  // 更新时间
    'isDeleted': 'status'       // 删除标记 (Supabase使用status字段: 1=active, 3=deleted)
  }
};

// Default configuration for Schema-Aware Supabase Repository
import type { SchemaAwareSupabaseConfig } from '../../local-first-impl/repositories/schema-aware-supabase-repository';

export const DEFAULT_SUPABASE_CONFIG: Required<SchemaAwareSupabaseConfig> = {
  defaultTableName: 'bookmarks',
  autoDetectTable: true,
  maxRetries: 3
};

