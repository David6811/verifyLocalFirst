/**
 * External Dependencies
 * 
 * 单一外部依赖入口 - 要切换数据库或存储只需修改这个文件
 */

import { supabase } from '../local-first-impl/supabase';

export const ExternalDependencies = {
  database: supabase,
  auth: supabase.auth,
  realtime: supabase,
  storage: chrome.storage,
} as const;