/**
 * ID tracking utilities for delete detection in Simple Sync
 */

/**
 * Get last known remote IDs for delete detection
 */
export const getLastKnownRemoteIds = async (userId: string): Promise<string[]> => {
  try {
    const key = `last_known_remote_ids_${userId}`;
    const result = await chrome.storage.local.get([key]);
    return result[key] || [];
  } catch (error) {
    console.warn('[SimpleSync] Failed to get last known remote IDs:', error);
    return [];
  }
};

/**
 * Get last known local IDs for delete detection
 */
export const getLastKnownLocalIds = async (userId: string): Promise<string[]> => {
  try {
    const key = `last_known_local_ids_${userId}`;
    const result = await chrome.storage.local.get([key]);
    return result[key] || [];
  } catch (error) {
    console.warn('[SimpleSync] Failed to get last known local IDs:', error);
    return [];
  }
};

/**
 * Save current remote IDs for future delete detection
 */
export const saveLastKnownRemoteIds = async (userId: string, remoteIds: string[]): Promise<void> => {
  try {
    const key = `last_known_remote_ids_${userId}`;
    await chrome.storage.local.set({
      [key]: remoteIds,
      [`${key}_timestamp`]: Date.now()
    });
    console.log(`[SimpleSync] Saved ${remoteIds.length} remote IDs for delete tracking`);
  } catch (error) {
    console.warn('[SimpleSync] Failed to save last known remote IDs:', error);
  }
};

/**
 * Save current local IDs for future delete detection
 */
export const saveLastKnownLocalIds = async (userId: string, localIds: string[]): Promise<void> => {
  try {
    const key = `last_known_local_ids_${userId}`;
    await chrome.storage.local.set({
      [key]: localIds,
      [`${key}_timestamp`]: Date.now()
    });
    console.log(`[SimpleSync] Saved ${localIds.length} local IDs for delete tracking`);
  } catch (error) {
    console.warn('[SimpleSync] Failed to save last known local IDs:', error);
  }
};