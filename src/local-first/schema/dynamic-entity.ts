/**
 * 动态实体系统 - 表配置管理和动态实体
 * Dynamic Entity System - Table configuration management and dynamic entities
 */

import { LocalFirstEntity } from '../core/types';

// =============================================================================
// 核心类型定义
// =============================================================================

/**
 * 表配置接口 - 完全通用，支持任意表和字段
 * Table Configuration Interface - Completely generic, supports any table and fields
 */
export interface TableConfig {
  /** 表名 */
  tableName: string;
  /** 字段映射 (用户自定义任意字段) */
  fields: Record<string, string>;
}

/**
 * 动态实体接口 - 扩展基础实体
 * Dynamic Entity Interface - Extends base entity
 */
export interface DynamicEntity extends LocalFirstEntity {
  /** 实体类型（对应表名） */
  entityType: string;
  /** 动态数据字段 */
  data: Record<string, any>;
}

// =============================================================================
// 表配置管理器
// =============================================================================

/**
 * 表配置管理器 - 简化版本，提供配置访问
 * Table Configuration Manager - Simplified version for configuration access
 */
export class TableConfigManager {
  constructor(private readonly config: TableConfig) {}

  /**
   * 获取表名
   */
  getTableName(): string {
    return this.config.tableName;
  }

  /**
   * 获取字段映射
   */
  getField(field: string): string {
    return this.config.fields[field];
  }

  /**
   * 获取存储键名
   */
  getStorageKey(purpose: string): string {
    return `${this.config.tableName}_${purpose}`;
  }
}

// =============================================================================
// 便利函数
// =============================================================================

/**
 * 创建表配置管理器实例
 * Create table configuration manager instance
 */
export const getTableConfig = (config: TableConfig): TableConfigManager => {
  return new TableConfigManager(config);
};

// =============================================================================
// 向后兼容（保留必要的别名）
// =============================================================================

/** @deprecated 使用 TableConfigManager */
export const SimpleConfigManager = TableConfigManager;

/** @deprecated 使用 TableConfigManager */
export const TableConfigurationManager = TableConfigManager;

// =============================================================================
// 动态实体生成器（用于特定存储适配器）
// =============================================================================

/**
 * 简化的实体生成器 - 仅保留必要的存储转换功能
 * Simplified Entity Generator - Only keeps essential storage conversion features
 */
export class SimpleEntityGenerator {
  /**
   * 创建动态实体（简化版本）
   * Create dynamic entity (simplified version)
   */
  static createEntity(
    tableName: string,
    data: Record<string, any>, 
    userId?: string,
    entityId?: string
  ): DynamicEntity {
    // 创建基础实体
    const baseEntity = {
      id: entityId || crypto.randomUUID(),
      created_at: new Date(),
      updated_at: new Date(),
      is_deleted: false,
      sync_version: 1,
      user_id: userId || ''
    };
    
    // 创建动态实体
    return {
      ...baseEntity,
      entityType: tableName,
      data
    };
  }

  /**
   * 从存储格式转换为动态实体
   * Convert from storage format to dynamic entity
   */
  static fromStorageFormat(stored: Record<string, any>): DynamicEntity {
    const { id, created_at, updated_at, is_deleted, sync_version, user_id, entity_type, ...data } = stored;
    
    return {
      id,
      created_at: new Date(created_at),
      updated_at: new Date(updated_at),
      is_deleted: Boolean(is_deleted),
      sync_version: Number(sync_version),
      user_id,
      entityType: entity_type,
      data
    };
  }

  /**
   * 转换为存储格式
   * Convert to storage format
   */
  static toStorageFormat(entity: DynamicEntity): Record<string, any> {
    return {
      id: entity.id,
      created_at: entity.created_at,
      updated_at: entity.updated_at,
      is_deleted: entity.is_deleted,
      sync_version: entity.sync_version,
      user_id: entity.user_id,
      entity_type: entity.entityType,
      ...entity.data
    };
  }
}

/** @deprecated 使用 SimpleEntityGenerator */
export const DynamicEntityGenerator = SimpleEntityGenerator;

// =============================================================================
// 通用操作数据类型 - 让 local-first 层保持业务无关
// =============================================================================

/**
 * 通用创建数据接口 - 适用于任何实体类型
 * Generic Create Data Interface - Works with any entity type
 */
export interface GenericEntityCreateData {
  /** 用户ID */
  user_id?: string;
  /** 实体ID (可选，用于指定特定ID) */
  uuid?: string;
  /** 实体数据 - 完全动态，由具体业务层决定结构 */
  data: Record<string, any>;
}

/**
 * 通用更新数据接口 - 适用于任何实体类型
 * Generic Update Data Interface - Works with any entity type
 */
export interface GenericEntityUpdateData {
  /** 要更新的数据字段 */
  data: Record<string, any>;
}

/**
 * 通用查询选项接口 - 适用于任何实体类型
 * Generic Query Options Interface - Works with any entity type
 */
export interface GenericEntityQueryOptions {
  /** 用户ID过滤 */
  user_id?: string;
  /** 搜索字段列表 (如: ['data.title', 'data.url']) */
  search_fields?: string[];
  /** 搜索词 */
  search_term?: string;
  /** 限制结果数量 */
  limit?: number;
  /** 结果偏移量 */
  offset?: number;
  /** 其他查询条件 */
  [key: string]: any;
}

/**
 * 通用实体结果接口 - local-first 层的标准返回格式
 * Generic Entity Result Interface - Standard return format for local-first layer
 */
export interface GenericEntityResult extends DynamicEntity {
  // 继承 DynamicEntity 的所有属性，无需额外定义
}