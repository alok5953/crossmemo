import { LocalStorageAdapter } from '../adapters/localStorage';

// Mock localStorage
const createLocalStorageMock = () => {
  let store: { [key: string]: string } = {};
  const mock = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    length: 0,
    key: (index: number) => Object.keys(store)[index],
    _getAllKeys: () => Object.keys(store),
    _store: store
  };
  return mock;
};

// Create a fresh mock for each test
let localStorageMock: ReturnType<typeof createLocalStorageMock>;

beforeEach(() => {
  localStorageMock = createLocalStorageMock();
  Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
    configurable: true,
    writable: true
  });
});

describe('LocalStorageAdapter', () => {
  let adapter: LocalStorageAdapter<any>;

  beforeEach(() => {
    adapter = new LocalStorageAdapter({ prefix: 'test:' });
  });

  it('should store and retrieve values with prefix', async () => {
    await adapter.set('key', 'value');
    expect(await adapter.get('key')).toBe('value');
    expect(localStorage.getItem('test:key')).toBeTruthy();
  });

  it('should handle TTL expiration', async () => {
    await adapter.set('key', 'value', { ttl: 100 });
    expect(await adapter.get('key')).toBe('value');
    
    // Wait for TTL to expire
    await new Promise(resolve => setTimeout(resolve, 150));
    expect(await adapter.get('key')).toBeUndefined();
  });

  it('should respect maxSize and implement LRU eviction', async () => {
    adapter = new LocalStorageAdapter({ maxSize: 2, prefix: 'test:' });
    
    await adapter.set('key1', 'value1');
    await adapter.set('key2', 'value2');
    await adapter.set('key3', 'value3');

    expect(await adapter.get('key1')).toBeUndefined();
    expect(await adapter.get('key2')).toBe('value2');
    expect(await adapter.get('key3')).toBe('value3');
  });

  it('should handle complex objects', async () => {
    const obj = { foo: 'bar', num: 123, arr: [1, 2, 3] };
    await adapter.set('key', obj);
    expect(await adapter.get('key')).toEqual(obj);
  });

  it('should implement has() correctly', async () => {
    await adapter.set('key', 'value');
    expect(await adapter.has('key')).toBe(true);
    expect(await adapter.has('nonexistent')).toBe(false);
  });

  it('should handle delete operation', async () => {
    await adapter.set('key', 'value');
    expect(await adapter.get('key')).toBe('value');
    
    await adapter.delete('key');
    expect(await adapter.get('key')).toBeUndefined();
  });

  it('should handle clear operation', async () => {
    await adapter.set('key1', 'value1');
    await adapter.set('key2', 'value2');
    
    await adapter.clear();
    expect(await adapter.get('key1')).toBeUndefined();
    expect(await adapter.get('key2')).toBeUndefined();
  });

  it('should handle invalid JSON in localStorage', async () => {
    localStorage.setItem('test:key', 'invalid json');
    expect(await adapter.get('key')).toBeUndefined();
  });
});
