/**
 * Tests for Local-First Error Classes and Utilities
 */

import {
  StorageError,
  SyncError,
  ConflictError,
  createStorageError,
  createSyncError,
  createConflictError,
  isStorageError,
  isSyncError,
  isConflictError,
} from '../errors';

describe('Local-First Errors', () => {
  describe('StorageError', () => {
    it('should create storage error with correct properties', () => {
      const error = new StorageError({
        type: 'ENTITY_NOT_FOUND',
        message: 'Entity with id "123" not found',
        entityId: '123',
      });

      expect(error._tag).toBe('StorageError');
      expect(error.type).toBe('ENTITY_NOT_FOUND');
      expect(error.message).toBe('Entity with id "123" not found');
      expect(error.entityId).toBe('123');
    });

    it('should create storage error with original error', () => {
      const originalError = new Error('Database connection failed');
      const error = new StorageError({
        type: 'CONNECTION_FAILED',
        message: 'Failed to connect to storage',
        originalError,
      });

      expect(error.originalError).toBe(originalError);
    });
  });

  describe('SyncError', () => {
    it('should create sync error with retryable flag', () => {
      const error = new SyncError({
        type: 'NETWORK_ERROR',
        message: 'Network timeout',
        retryable: true,
      });

      expect(error._tag).toBe('SyncError');
      expect(error.type).toBe('NETWORK_ERROR');
      expect(error.retryable).toBe(true);
    });

    it('should default retryable to undefined when not specified', () => {
      const error = new SyncError({
        type: 'AUTH_ERROR',
        message: 'Authentication failed',
      });

      expect(error.retryable).toBeUndefined();
    });
  });

  describe('ConflictError', () => {
    it('should create conflict error with entity data', () => {
      const localEntity = { id: '1', name: 'Local' };
      const remoteEntity = { id: '1', name: 'Remote' };
      
      const error = new ConflictError({
        type: 'UNRESOLVABLE_CONFLICT',
        message: 'Cannot resolve conflict between entities',
        localEntity,
        remoteEntity,
      });

      expect(error._tag).toBe('ConflictError');
      expect(error.localEntity).toBe(localEntity);
      expect(error.remoteEntity).toBe(remoteEntity);
    });
  });

  describe('Error Factory Functions', () => {
    describe('createStorageError', () => {
      it('should create storage error with all parameters', () => {
        const originalError = new Error('Test error');
        const error = createStorageError(
          'VALIDATION_ERROR',
          'Invalid entity data',
          originalError,
          'entity-123'
        );

        expect(error.type).toBe('VALIDATION_ERROR');
        expect(error.message).toBe('Invalid entity data');
        expect(error.originalError).toBe(originalError);
        expect(error.entityId).toBe('entity-123');
      });

      it('should create storage error with minimal parameters', () => {
        const error = createStorageError('QUOTA_EXCEEDED', 'Storage quota exceeded');

        expect(error.type).toBe('QUOTA_EXCEEDED');
        expect(error.message).toBe('Storage quota exceeded');
        expect(error.originalError).toBeUndefined();
        expect(error.entityId).toBeUndefined();
      });
    });

    describe('createSyncError', () => {
      it('should create retryable sync error', () => {
        const error = createSyncError('RATE_LIMIT_ERROR', 'Rate limit exceeded', undefined, true);

        expect(error.type).toBe('RATE_LIMIT_ERROR');
        expect(error.retryable).toBe(true);
      });

      it('should create non-retryable sync error', () => {
        const error = createSyncError('AUTH_ERROR', 'Invalid token', undefined, false);

        expect(error.retryable).toBe(false);
      });
    });

    describe('createConflictError', () => {
      it('should create conflict error with entities', () => {
        const local = { version: 1 };
        const remote = { version: 2 };
        const error = createConflictError(
          'INVALID_CONFLICT_DATA',
          'Conflict data is invalid',
          local,
          remote
        );

        expect(error.type).toBe('INVALID_CONFLICT_DATA');
        expect(error.localEntity).toBe(local);
        expect(error.remoteEntity).toBe(remote);
      });
    });
  });

  describe('Type Guards', () => {
    const storageError = createStorageError('UNKNOWN_ERROR', 'Test storage error');
    const syncError = createSyncError('UNKNOWN_ERROR', 'Test sync error');
    const conflictError = createConflictError('RESOLUTION_FAILED', 'Test conflict error');
    const regularError = new Error('Regular error');

    describe('isStorageError', () => {
      it('should return true for StorageError instances', () => {
        expect(isStorageError(storageError)).toBe(true);
      });

      it('should return false for non-StorageError instances', () => {
        expect(isStorageError(syncError)).toBe(false);
        expect(isStorageError(conflictError)).toBe(false);
        expect(isStorageError(regularError)).toBe(false);
        expect(isStorageError(null)).toBe(false);
        expect(isStorageError(undefined)).toBe(false);
      });
    });

    describe('isSyncError', () => {
      it('should return true for SyncError instances', () => {
        expect(isSyncError(syncError)).toBe(true);
      });

      it('should return false for non-SyncError instances', () => {
        expect(isSyncError(storageError)).toBe(false);
        expect(isSyncError(conflictError)).toBe(false);
        expect(isSyncError(regularError)).toBe(false);
        expect(isSyncError(null)).toBe(false);
        expect(isSyncError(undefined)).toBe(false);
      });
    });

    describe('isConflictError', () => {
      it('should return true for ConflictError instances', () => {
        expect(isConflictError(conflictError)).toBe(true);
      });

      it('should return false for non-ConflictError instances', () => {
        expect(isConflictError(storageError)).toBe(false);
        expect(isConflictError(syncError)).toBe(false);
        expect(isConflictError(regularError)).toBe(false);
        expect(isConflictError(null)).toBe(false);
        expect(isConflictError(undefined)).toBe(false);
      });
    });
  });
});