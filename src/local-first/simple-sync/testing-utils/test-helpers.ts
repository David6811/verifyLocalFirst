/**
 * Test utilities and helpers for simple-sync testing
 */

import { SyncResult, SyncData } from '../types';

/**
 * Generate a UUID for testing
 */
export const generateTestUUID = (): string => {
  return 'test-' + Math.random().toString(36).substr(2, 9);
};

/**
 * Create a mock SyncResult for testing
 */
export const createMockSyncResult = (overrides?: Partial<SyncResult>): SyncResult => ({
  success: true,
  localCount: 5,
  remoteCount: 3,
  syncedCount: 8,
  errors: [],
  timestamp: new Date('2024-01-01T12:00:00Z'),
  direction: 'bidirectional',
  ...overrides
});

/**
 * Create a mock entity for testing
 */
export const createMockEntity = (overrides?: any) => ({
  id: generateTestUUID(),
  user_id: 'test-user',
  entityType: 'bookmark',
  data: {
    title: 'Test Bookmark',
    url: 'https://example.com',
    description: 'Test description',
    tags: ['test', 'bookmark'],
    ...overrides?.data
  },
  created_at: new Date('2024-01-01T10:00:00Z'),
  updated_at: new Date('2024-01-01T10:00:00Z'),
  ...overrides
});

/**
 * Create multiple mock entities
 */
export const createMockEntities = (count: number, baseOverrides?: any): any[] => {
  return Array.from({ length: count }, (_, index) => 
    createMockEntity({
      ...baseOverrides,
      data: {
        title: `Test Entity ${index + 1}`,
        url: `https://example-${index + 1}.com`,
        ...baseOverrides?.data
      }
    })
  );
};

/**
 * Create mock local entities with specific characteristics
 */
export const createMockLocalEntities = (count: number): any[] => {
  return createMockEntities(count, {
    user_id: 'test-user',
    data: {
      title: 'Local Bookmark',
      source: 'local'
    }
  });
};

/**
 * Create mock remote entities with specific characteristics
 */
export const createMockRemoteEntities = (count: number): any[] => {
  return createMockEntities(count, {
    user_id: 'test-user',
    data: {
      title: 'Remote Bookmark',
      source: 'remote'
    }
  });
};

/**
 * Create a mock SyncData object for testing
 */
export const createMockSyncData = (overrides?: Partial<SyncData>): SyncData => {
  const localEntities = createMockLocalEntities(3);
  const remoteEntities = createMockRemoteEntities(2);
  const lastKnownRemoteIds = ['remote-1'];
  const lastKnownLocalIds = ['local-1', 'local-2'];

  const localMap = new Map(localEntities.map(e => [e.id, e]));
  const remoteMap = new Map(remoteEntities.map(e => [e.id, e]));
  const allIds = new Set([...localMap.keys(), ...remoteMap.keys(), ...lastKnownRemoteIds, ...lastKnownLocalIds]);

  return {
    localEntities,
    remoteEntities,
    localMap,
    remoteMap,
    lastKnownRemoteIds,
    lastKnownLocalIds,
    currentRemoteIds: remoteEntities.map(e => e.id),
    currentLocalIds: localEntities.map(e => e.id),
    allIds,
    ...overrides
  };
};

/**
 * Create entities with update conflicts for testing
 */
export const createConflictingEntities = (entityId: string) => {
  const baseEntity = createMockEntity({ id: entityId });
  
  const localEntity = {
    ...baseEntity,
    data: {
      ...baseEntity.data,
      title: 'Local Update',
      description: 'Updated locally'
    },
    updated_at: new Date('2024-01-01T11:00:00Z')
  };

  const remoteEntity = {
    ...baseEntity,
    data: {
      ...baseEntity.data,
      title: 'Remote Update',
      description: 'Updated remotely'
    },
    updated_at: new Date('2024-01-01T12:00:00Z') // Later than local
  };

  return { localEntity, remoteEntity };
};

/**
 * Sleep utility for async testing
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Create a mock Chrome storage interface
 */
export class MockChromeStorage {
  private data: Record<string, any> = {};

  get = jest.fn().mockImplementation((keys: string | string[]) => {
    const keyArray = Array.isArray(keys) ? keys : [keys];
    const result: Record<string, any> = {};
    
    keyArray.forEach(key => {
      if (key in this.data) {
        result[key] = this.data[key];
      }
    });
    
    return Promise.resolve(result);
  });

  set = jest.fn().mockImplementation((items: Record<string, any>) => {
    Object.assign(this.data, items);
    return Promise.resolve();
  });

  remove = jest.fn().mockImplementation((keys: string | string[]) => {
    const keyArray = Array.isArray(keys) ? keys : [keys];
    keyArray.forEach(key => delete this.data[key]);
    return Promise.resolve();
  });

  clear = jest.fn().mockImplementation(() => {
    this.data = {};
    return Promise.resolve();
  });

  // Test utility methods
  getRawData() {
    return { ...this.data };
  }

  setRawData(data: Record<string, any>) {
    this.data = { ...data };
  }

  reset() {
    this.data = {};
    this.get.mockClear();
    this.set.mockClear();
    this.remove.mockClear();
    this.clear.mockClear();
  }
}

/**
 * Setup Chrome storage mock for tests
 */
export const setupChromeMock = () => {
  const mockStorage = new MockChromeStorage();
  
  global.chrome = {
    storage: {
      local: mockStorage
    }
  } as any;

  return mockStorage;
};

/**
 * Mock operations modules for testing
 */
export const createMockLocalOps = () => ({
  getEntities: jest.fn(),
  createEntity: jest.fn(),
  updateEntity: jest.fn(),
  deleteEntity: jest.fn(),
});

export const createMockRemoteOps = () => ({
  getEntitiesLegacy: jest.fn(),
  createEntityLegacy: jest.fn(),
  updateEntityLegacy: jest.fn(),
  deleteEntityLegacy: jest.fn(),
});

/**
 * Create a comprehensive test environment
 */
export class TestEnvironment {
  public readonly userId: string;
  public readonly mockChromeStorage: MockChromeStorage;
  public readonly mockLocalOps: ReturnType<typeof createMockLocalOps>;
  public readonly mockRemoteOps: ReturnType<typeof createMockRemoteOps>;
  
  private localEntities: Map<string, any> = new Map();
  private remoteEntities: Map<string, any> = new Map();

  constructor(userId: string = 'test-user') {
    this.userId = userId;
    this.mockChromeStorage = setupChromeMock();
    this.mockLocalOps = createMockLocalOps();
    this.mockRemoteOps = createMockRemoteOps();
    
    this.setupMockBehaviors();
  }

  private setupMockBehaviors() {
    // Setup local operations mock behaviors
    this.mockLocalOps.getEntities.mockImplementation(() => 
      Promise.resolve(Array.from(this.localEntities.values()))
    );
    
    this.mockLocalOps.createEntity.mockImplementation((entityType: string, data: any) => {
      const entity = createMockEntity({ ...data, entityType });
      this.localEntities.set(entity.id, entity);
      return Promise.resolve(entity);
    });

    this.mockLocalOps.updateEntity.mockImplementation((id: string, updates: any) => {
      const existing = this.localEntities.get(id);
      if (existing) {
        const updated = { ...existing, ...updates, updated_at: new Date() };
        this.localEntities.set(id, updated);
        return Promise.resolve(updated);
      }
      return Promise.reject(new Error(`Entity ${id} not found`));
    });

    this.mockLocalOps.deleteEntity.mockImplementation((id: string) => {
      this.localEntities.delete(id);
      return Promise.resolve();
    });

    // Setup remote operations mock behaviors
    this.mockRemoteOps.getEntitiesLegacy.mockImplementation(() =>
      Promise.resolve(Array.from(this.remoteEntities.values()))
    );

    this.mockRemoteOps.createEntityLegacy.mockImplementation((data: any) => {
      const entity = createMockEntity(data);
      this.remoteEntities.set(entity.id, entity);
      return Promise.resolve(entity);
    });

    this.mockRemoteOps.updateEntityLegacy.mockImplementation((id: string, updates: any) => {
      const existing = this.remoteEntities.get(id);
      if (existing) {
        const updated = { ...existing, ...updates, updated_at: new Date() };
        this.remoteEntities.set(id, updated);
        return Promise.resolve(updated);
      }
      return Promise.reject(new Error(`Entity ${id} not found`));
    });

    this.mockRemoteOps.deleteEntityLegacy.mockImplementation((id: string) => {
      this.remoteEntities.delete(id);
      return Promise.resolve();
    });
  }

  // Test utility methods
  async createLocalEntity(data?: any): Promise<any> {
    return this.mockLocalOps.createEntity('bookmark', { user_id: this.userId, ...data });
  }

  async createRemoteEntity(data?: any): Promise<any> {
    return this.mockRemoteOps.createEntityLegacy({ user_id: this.userId, ...data });
  }

  async createEntityInBoth(id: string, data?: any): Promise<void> {
    const entityData = { id, user_id: this.userId, ...data };
    const localEntity = createMockEntity(entityData);
    const remoteEntity = createMockEntity(entityData);
    
    this.localEntities.set(id, localEntity);
    this.remoteEntities.set(id, remoteEntity);
  }

  getLocalEntity(id: string): any | undefined {
    return this.localEntities.get(id);
  }

  getRemoteEntity(id: string): any | undefined {
    return this.remoteEntities.get(id);
  }

  getAllLocalEntities(): any[] {
    return Array.from(this.localEntities.values());
  }

  getAllRemoteEntities(): any[] {
    return Array.from(this.remoteEntities.values());
  }

  cleanup() {
    this.localEntities.clear();
    this.remoteEntities.clear();
    this.mockChromeStorage.reset();
    jest.clearAllMocks();
  }
}

/**
 * Assertion helpers for testing sync results
 */
export const expectSyncSuccess = (result: SyncResult) => {
  expect(result.success).toBe(true);
  expect(result.errors).toHaveLength(0);
};

export const expectSyncFailure = (result: SyncResult, expectedErrors?: number) => {
  expect(result.success).toBe(false);
  if (expectedErrors !== undefined) {
    expect(result.errors).toHaveLength(expectedErrors);
  } else {
    expect(result.errors.length).toBeGreaterThan(0);
  }
};

export const expectEntityEquality = (entity1: any, entity2: any, ignoreFields: string[] = ['updated_at']) => {
  const filtered1 = { ...entity1 };
  const filtered2 = { ...entity2 };
  
  ignoreFields.forEach(field => {
    delete filtered1[field];
    delete filtered2[field];
  });
  
  expect(filtered1).toEqual(filtered2);
};