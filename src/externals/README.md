# Externals Layer - 业务操作抽象层

为 UI 组件提供简单易用的业务操作接口，封装底层 local-first 实现细节。

## 文件结构

```
src/externals/
├── auth-operations.ts      # 认证操作
├── sync-operations.ts      # 同步操作  
├── bookmark-operations.ts  # 书签操作
├── types.ts               # 类型定义
└── index.ts               # 统一导出
```

## 快速使用指南

### 🔐 认证操作 (Auth Operations)

```typescript
import { signIn, signOut, getCurrentUser, quickLogin } from '../externals/auth-operations';

// 用户登录
const loginResult = await Effect.runPromise(
  signIn({ email: 'user@example.com', password: 'password' })
);

if (loginResult.success) {
  console.log('登录成功！', loginResult.user);
} else {
  console.error('登录失败：', loginResult.error);
}

// 快速登录（测试账号）
const quickResult = await Effect.runPromise(quickLogin());

// 获取当前用户
const currentUser = await Effect.runPromise(getCurrentUser());

// 用户登出
const logoutResult = await Effect.runPromise(signOut());
```

### 🔄 同步操作 (Sync Operations)

```typescript
import { 
  performSync, 
  setupBookmarkSync, 
  startAutoSync,
  addStatusListener,
  cleanupAutoSync
} from '../externals/sync-operations';

// 手动同步
const syncResult = await Effect.runPromise(performSync());
console.log('同步结果：', syncResult);

// 设置自动同步
const engine = await Effect.runPromise(setupBookmarkSync());

// 监听状态变化
const removeListener = addStatusListener((status) => {
  console.log('同步状态：', {
    enabled: status.enabled,
    isRunning: status.isRunning,
    queueSize: status.queueSize
  });
});

// 启动自动同步
await Effect.runPromise(startAutoSync());

// 组件卸载时清理资源
useEffect(() => {
  return () => {
    removeListener();
    cleanupAutoSync();
  };
}, []);
```

### 📚 书签操作 (Bookmark Operations)

```typescript
import { 
  createBookmark, 
  getBookmarks, 
  updateBookmark, 
  deleteBookmark 
} from '../externals/bookmark-operations';

// 创建书签
const newBookmark = await Effect.runPromise(
  createBookmark({
    title: 'Claude Code',
    link: 'https://claude.ai/code',
    user_id: currentUser.id
  })
);

// 获取书签列表
const bookmarks = await Effect.runPromise(
  getBookmarks({ user_id: currentUser.id })
);

// 更新书签
const updatedBookmark = await Effect.runPromise(
  updateBookmark(bookmarkId, { title: 'New Title' })
);

// 删除书签
await Effect.runPromise(deleteBookmark(bookmarkId));
```

## React 组件使用示例

### 认证组件

```typescript
// AuthSection.tsx
import React, { useState, useEffect } from 'react';
import { signIn, signOut, getCurrentUser, type User } from '../externals/auth-operations';
import { Effect } from 'effect';

export function AuthSection() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  // 获取当前用户
  useEffect(() => {
    Effect.runPromise(getCurrentUser()).then(setUser);
  }, []);

  // 登录处理
  const handleLogin = async () => {
    setLoading(true);
    const result = await Effect.runPromise(
      signIn({ email: 'test@example.com', password: 'password' })
    );
    
    if (result.success && result.user) {
      setUser(result.user);
    }
    setLoading(false);
  };

  // 登出处理
  const handleLogout = async () => {
    await Effect.runPromise(signOut());
    setUser(null);
  };

  return (
    <div>
      {user ? (
        <div>
          <p>Welcome, {user.email}!</p>
          <button onClick={handleLogout}>Logout</button>
        </div>
      ) : (
        <button onClick={handleLogin} disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      )}
    </div>
  );
}
```

### 同步控制组件

```typescript
// SyncControls.tsx
import React, { useState, useEffect } from 'react';
import { 
  performSync, 
  setupBookmarkSync,
  startAutoSync,
  addStatusListener,
  cleanupAutoSync,
  type SimpleAutoSyncStatus
} from '../externals/sync-operations';
import { Effect } from 'effect';

export function SyncControls() {
  const [status, setStatus] = useState<SimpleAutoSyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    // 初始化自动同步
    const initSync = async () => {
      await Effect.runPromise(setupBookmarkSync());
      await Effect.runPromise(startAutoSync());
    };

    // 添加状态监听
    const removeListener = addStatusListener(setStatus);

    initSync();

    return () => {
      removeListener();
      cleanupAutoSync();
    };
  }, []);

  // 手动同步
  const handleManualSync = async () => {
    setSyncing(true);
    const result = await Effect.runPromise(performSync());
    console.log('Sync result:', result);
    setSyncing(false);
  };

  return (
    <div>
      <div>
        <h3>Sync Status</h3>
        {status && (
          <div>
            <p>Enabled: {status.enabled ? 'Yes' : 'No'}</p>
            <p>Running: {status.isRunning ? 'Yes' : 'No'}</p>
            <p>Queue Size: {status.queueSize}</p>
            {status.lastSyncTime && (
              <p>Last Sync: {new Date(status.lastSyncTime).toLocaleString()}</p>
            )}
          </div>
        )}
      </div>
      
      <button onClick={handleManualSync} disabled={syncing}>
        {syncing ? 'Syncing...' : 'Manual Sync'}
      </button>
    </div>
  );
}
```

## 设计原则

### ✅ 简单易用
- 提供直观的函数名和参数
- 统一的错误处理机制
- 完整的 TypeScript 类型支持

### ✅ 抽象恰当
- 隐藏底层实现复杂性
- 保持接口稳定性
- 支持未来扩展

### ✅ 资源管理
- 自动清理资源
- 避免内存泄漏
- 组件卸载时正确清理

## 迁移指南

### 从直接导入底层模块迁移

```typescript
// ❌ 旧方式 - 直接导入底层实现
import { signInLegacy } from '../local-first-impl/auth/auth';
import { performManualSync } from '../local-first/manual-sync';

// ✅ 新方式 - 使用抽象接口
import { signIn } from '../externals/auth-operations';
import { performSync } from '../externals/sync-operations';
```

### 错误处理改进

```typescript
// ❌ 旧方式 - 需要手动处理各种错误
try {
  const user = await signInLegacy(email, password);
  // 手动处理用户数据格式
} catch (error) {
  // 手动错误处理
}

// ✅ 新方式 - 统一的错误处理
const result = await Effect.runPromise(signIn({ email, password }));
if (result.success) {
  // 使用标准化的用户数据
  console.log(result.user);
} else {
  // 统一的错误信息
  console.error(result.error);
}
```

这样组件层的代码会更加简洁，易于理解和维护！