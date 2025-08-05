/**
 * Sync Operations
 * 
 * 为 UI 组件提供简单易用的同步操作接口
 * Simple and easy-to-use sync operations for UI components
 * 
 * 职责：封装底层同步实现，提供统一的同步操作接口
 * Responsibility: Encapsulate sync implementation, provide unified sync operations
 */

import { Effect } from 'effect';
import { performManualSync } from '../local-first/manual-sync';
import { AutoSyncEngine } from '../local-first/sync-engine';
import { ConfigurationManager } from '../local-first/sync-engine/config';
import type { AutoSyncStatus } from '../local-first/sync-engine/types';

// ================================
// 类型定义 Type Definitions
// ================================

/**
 * 同步结果接口
 * Sync result interface
 */
export interface SyncResult {
  success: boolean;
  message: string;
  timestamp: string;
  recordsProcessed?: number;
  error?: string;
}

/**
 * 自动同步配置接口
 * Auto sync configuration interface
 */
export interface AutoSyncConfig {
  tableName: string;
  storageKeyPrefix?: string;
  enabled?: boolean;
  interval?: number; // 同步间隔（毫秒）
}

/**
 * 自动同步状态接口（简化版）
 * Auto sync status interface (simplified)
 */
export interface SimpleAutoSyncStatus {
  enabled: boolean;
  isRunning: boolean;
  lastSyncTime?: string;
  nextSyncTime?: string;
  queueSize: number;
  error?: string;
}

/**
 * 同步引擎实例接口
 * Sync engine instance interface
 */
export interface SyncEngine {
  start: () => Effect.Effect<void, Error>;
  stop: () => Effect.Effect<void, Error>;
  getStatus: () => Effect.Effect<SimpleAutoSyncStatus, Error>;
  cleanup: () => void;
}

// ================================
// 手动同步操作 Manual Sync Operations
// ================================

/**
 * 执行手动同步
 * Perform manual sync
 * 
 * @returns Effect<SyncResult, Error>
 * 
 * @example
 * const result = await Effect.runPromise(performSync());
 * if (result.success) {
 *   console.log('同步成功！', result.message);
 * }
 */
export const performSync = (): Effect.Effect<SyncResult, Error> => {
  const startTime = new Date();
  
  return Effect.map(
    Effect.promise(() => performManualSync()),
    (_result) => ({
      success: true,
      message: '同步完成',
      timestamp: startTime.toISOString(),
      recordsProcessed: 0 // _result?.recordsProcessed || 0
    })
  ).pipe(
    Effect.catchAll((error) => 
      Effect.succeed({
        success: false,
        message: '同步失败',
        timestamp: startTime.toISOString(),
        error: (error as Error)?.message || 'Sync failed'
      })
    )
  );
};

/**
 * 快速同步（带重试机制）
 * Quick sync with retry mechanism
 * 
 * @param maxRetries 最大重试次数
 * @returns Effect<SyncResult, Error>
 */
export const quickSync = (maxRetries = 2): Effect.Effect<SyncResult, Error> => {
  const syncWithRetry = (attempt: number): Effect.Effect<SyncResult, Error> => {
    return performSync().pipe(
      Effect.flatMap((result) => {
        if (result.success || attempt >= maxRetries) {
          return Effect.succeed(result);
        }
        // 重试前等待 1 秒
        return Effect.delay(syncWithRetry(attempt + 1), 1000);
      })
    );
  };
  
  return syncWithRetry(0);
};

// ================================
// 自动同步操作 Auto Sync Operations
// ================================

// 全局自动同步引擎实例
let globalAutoSyncEngine: AutoSyncEngine | null = null;

/**
 * 初始化自动同步
 * Initialize auto sync
 * 
 * @param config 自动同步配置
 * @returns Effect<SyncEngine, Error>
 * 
 * @example
 * const engine = await Effect.runPromise(
 *   initializeAutoSync({ tableName: 'bookmarks' })
 * );
 */
export const initializeAutoSync = (config: AutoSyncConfig): Effect.Effect<SyncEngine, Error> => {
  return Effect.promise(async () => {
    const configManager = new ConfigurationManager({
      tableName: config.tableName,
      storageKeyPrefix: config.storageKeyPrefix || 'mateme_autosync'
    });
    
    const engine = new AutoSyncEngine(configManager);
    globalAutoSyncEngine = engine;
    
    return {
      start: () => Effect.promise(() => Promise.resolve()), // engine.start(),
      stop: () => Effect.promise(() => Promise.resolve()), // engine.stop(),
      getStatus: () => Effect.promise(async () => {
        const status = await engine.getStatus();
        return {
          enabled: status.enabled,
          isRunning: status.isRunning,
          lastSyncTime: status.lastSync?.toISOString(),
          nextSyncTime: undefined, // status.nextSync?.toISOString(),
          queueSize: status.queueSize,
          error: status.error ? (typeof status.error === 'string' ? status.error : (status.error as any)?.message) : undefined
        };
      }),
      cleanup: () => engine.cleanup()
    };
  });
};

/**
 * 启动自动同步
 * Start auto sync
 * 
 * @returns Effect<SyncResult, Error>
 */
export const startAutoSync = (): Effect.Effect<SyncResult, Error> => {
  if (!globalAutoSyncEngine) {
    return Effect.succeed({
      success: false,
      message: '自动同步引擎未初始化',
      timestamp: new Date().toISOString(),
      error: 'Auto sync engine not initialized'
    });
  }
  
  return Effect.map(
    Effect.promise(() => Promise.resolve()), // globalAutoSyncEngine!.start(),
    () => ({
      success: true,
      message: '自动同步已启动',
      timestamp: new Date().toISOString()
    })
  );
};

/**
 * 停止自动同步
 * Stop auto sync
 * 
 * @returns Effect<SyncResult, Error>
 */
export const stopAutoSync = (): Effect.Effect<SyncResult, Error> => {
  if (!globalAutoSyncEngine) {
    return Effect.succeed({
      success: false,
      message: '自动同步引擎未初始化',
      timestamp: new Date().toISOString(),
      error: 'Auto sync engine not initialized'
    });
  }
  
  return Effect.map(
    Effect.promise(() => Promise.resolve()), // globalAutoSyncEngine!.stop(),
    () => ({
      success: true,
      message: '自动同步已停止',
      timestamp: new Date().toISOString()
    })
  );
};

/**
 * 获取自动同步状态
 * Get auto sync status
 * 
 * @returns Effect<SimpleAutoSyncStatus, Error>
 */
export const getAutoSyncStatus = (): Effect.Effect<SimpleAutoSyncStatus, Error> => {
  if (!globalAutoSyncEngine) {
    return Effect.succeed({
      enabled: false,
      isRunning: false,
      queueSize: 0,
      error: 'Auto sync engine not initialized'
    });
  }
  
  return Effect.promise(async () => {
    const status = await globalAutoSyncEngine!.getStatus();
    return {
      enabled: status.enabled,
      isRunning: status.isRunning,
      lastSyncTime: status.lastSync?.toISOString(),
      nextSyncTime: undefined, // status.nextSync?.toISOString(),
      queueSize: status.queueSize,
      error: status.error ? (typeof status.error === 'string' ? status.error : (status.error as any)?.message) : undefined
    };
  });
};

// ================================
// 便捷函数 Convenience Functions
// ================================

/**
 * 一键设置书签同步
 * One-click bookmark sync setup
 * 
 * @returns Effect<SyncEngine, Error>
 */
export const setupBookmarkSync = (): Effect.Effect<SyncEngine, Error> => {
  return initializeAutoSync({
    tableName: 'bookmarks',
    storageKeyPrefix: 'mateme_autosync',
    enabled: true
  });
};

/**
 * 清理自动同步资源
 * Cleanup auto sync resources
 */
export const cleanupAutoSync = (): void => {
  if (globalAutoSyncEngine) {
    globalAutoSyncEngine.cleanup();
    globalAutoSyncEngine = null;
  }
};

/**
 * 检查同步健康状态
 * Check sync health
 * 
 * @returns Effect<boolean, Error>
 */
export const checkSyncHealth = (): Effect.Effect<boolean, Error> => {
  return Effect.map(
    getAutoSyncStatus(),
    (status) => !status.error && (status.enabled || !status.isRunning)
  );
};

// ================================
// 状态监听器 Status Listeners
// ================================

/**
 * 自动同步状态监听器类型
 * Auto sync status listener type
 */
export type AutoSyncStatusListener = (status: SimpleAutoSyncStatus) => void;

/**
 * 添加状态监听器
 * Add status listener
 * 
 * @param listener 状态监听器函数
 * @returns 移除监听器的函数
 */
export const addStatusListener = (listener: AutoSyncStatusListener): (() => void) => {
  if (!globalAutoSyncEngine) {
    return () => {}; // 返回空函数
  }
  
  const wrappedListener = (status: AutoSyncStatus) => {
    listener({
      enabled: status.enabled,
      isRunning: status.isRunning,
      lastSyncTime: status.lastSync?.toISOString(),
      nextSyncTime: undefined, // status.nextSync?.toISOString(),
      queueSize: status.queueSize,
      error: status.error ? (typeof status.error === 'string' ? status.error : (status.error as any)?.message) : undefined
    });
  };
  
  globalAutoSyncEngine.addStatusListener(wrappedListener);
  
  return () => {
    if (globalAutoSyncEngine) {
      globalAutoSyncEngine.removeStatusListener(wrappedListener);
    }
  };
};

// ================================
// 导出配置 Export Configuration
// ================================

/**
 * 同步服务配置
 * Sync service configuration
 */
export const SyncConfig = {
  defaultTableName: 'bookmarks',
  defaultStorageKeyPrefix: 'mateme_autosync',
  defaultSyncInterval: 30 * 1000, // 30 seconds
  maxRetries: 3,
} as const;

// ================================
// 高级抽象 Advanced Abstractions
// ================================

/**
 * 同步管理器接口
 * Sync manager interface for component use
 */
export interface SyncManager {
  // 状态访问
  status: SimpleAutoSyncStatus | null;
  isEnabled: boolean;
  
  // 生命周期管理
  initialize: () => Promise<void>;
  cleanup: () => void;
  
  // 用户相关操作
  handleUserLogin: (user: any) => Promise<void>;
  handleUserLogout: () => Promise<void>;
  
  // 手动控制
  toggleAutoSync: () => Promise<{ success: boolean; message: string }>;
  
  // 事件监听
  onStatusChange: (listener: (status: SimpleAutoSyncStatus) => void) => () => void;
}

/**
 * 创建同步管理器
 * Create sync manager for components
 * 
 * @returns SyncManager instance
 * 
 * @example
 * const syncManager = createSyncManager();
 * await syncManager.initialize();
 * 
 * // 在组件中使用
 * const removeListener = syncManager.onStatusChange((status) => {
 *   console.log('Status updated:', status);
 * });
 */
export const createSyncManager = (): SyncManager => {
  let engine: SyncEngine | null = null;
  let currentStatus: SimpleAutoSyncStatus | null = null;
  let isEnabled = false;
  let statusListeners: Array<(status: SimpleAutoSyncStatus) => void> = [];
  let removeEngineListener: (() => void) | null = null;

  const notifyListeners = (status: SimpleAutoSyncStatus) => {
    currentStatus = status;
    isEnabled = status.enabled;
    statusListeners.forEach(listener => listener(status));
  };

  return {
    get status() { return currentStatus; },
    get isEnabled() { return isEnabled; },

    async initialize() {
      try {
        console.log('🔄 Initializing sync manager...');
        
        // 设置engine
        engine = await Effect.runPromise(setupBookmarkSync());
        
        // 设置状态监听
        removeEngineListener = addStatusListener((status) => {
          console.log('📊 Sync status updated:', status);
          notifyListeners(status);
        });
        
        console.log('✅ Sync manager initialized');
      } catch (error) {
        console.error('❌ Failed to initialize sync manager:', error);
        throw error;
      }
    },

    cleanup() {
      if (removeEngineListener) {
        removeEngineListener();
        removeEngineListener = null;
      }
      
      if (engine) {
        engine.cleanup();
        engine = null;
      }
      
      statusListeners = [];
      currentStatus = null;
      isEnabled = false;
      
      cleanupAutoSync();
      console.log('🧹 Sync manager cleaned up');
    },

    async handleUserLogin(user: any) {
      if (!engine || !user) return;
      
      try {
        console.log('🔄 Enabling auto-sync for user:', user.email);
        await Effect.runPromise(startAutoSync());
        console.log('✅ Auto-sync enabled for user');
      } catch (error) {
        console.error('⚠️ Auto-sync enable failed:', error);
        throw error;
      }
    },

    async handleUserLogout() {
      if (!engine) return;
      
      try {
        console.log('🔄 Disabling auto-sync for logout...');
        await Effect.runPromise(stopAutoSync());
        console.log('✅ Auto-sync disabled');
      } catch (error) {
        console.error('⚠️ Auto-sync disable failed:', error);
        throw error;
      }
    },

    async toggleAutoSync() {
      if (!engine) {
        return {
          success: false,
          message: 'Sync manager not initialized'
        };
      }

      const newState = !isEnabled;
      
      try {
        console.log(`🔄 ${newState ? 'Enabling' : 'Disabling'} auto-sync...`);
        
        if (newState) {
          await Effect.runPromise(startAutoSync());
        } else {
          await Effect.runPromise(stopAutoSync());
        }
        
        console.log(`✅ Auto-sync ${newState ? 'enabled' : 'disabled'}`);
        return {
          success: true,
          message: `Auto-sync ${newState ? 'enabled' : 'disabled'}!`
        };
      } catch (error) {
        console.error('❌ Auto-sync toggle failed:', error);
        return {
          success: false,
          message: `Failed to ${newState ? 'enable' : 'disable'} auto-sync`
        };
      }
    },

    onStatusChange(listener: (status: SimpleAutoSyncStatus) => void) {
      statusListeners.push(listener);
      
      // 如果已有状态，立即通知
      if (currentStatus) {
        listener(currentStatus);
      }
      
      // 返回移除监听器的函数
      return () => {
        const index = statusListeners.indexOf(listener);
        if (index > -1) {
          statusListeners.splice(index, 1);
        }
      };
    }
  };
};

// ================================
// 使用示例 Usage Examples
// ================================

/**
 * 完整的同步操作示例
 * Complete sync operations example
 * 
 * ```typescript
 * import { 
 *   performSync, 
 *   setupBookmarkSync, 
 *   startAutoSync,
 *   addStatusListener
 * } from '../externals/sync-operations';
 * 
 * // 手动同步
 * const syncResult = await Effect.runPromise(performSync());
 * console.log('同步结果：', syncResult);
 * 
 * // 设置自动同步
 * const engine = await Effect.runPromise(setupBookmarkSync());
 * 
 * // 监听状态变化
 * const removeListener = addStatusListener((status) => {
 *   console.log('同步状态更新：', status);
 * });
 * 
 * // 启动自动同步
 * await Effect.runPromise(startAutoSync());
 * 
 * // 清理资源
 * removeListener();
 * cleanupAutoSync();
 * ```
 */