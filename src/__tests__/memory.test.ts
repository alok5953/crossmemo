import { MemoryAdapter } from '../adapters/memory';

describe('MemoryAdapter', () => {
  let adapter: MemoryAdapter<any>;

  beforeEach(() => {
    adapter = new MemoryAdapter();
  });

  it('should store and retrieve values', async () => {
    await adapter.set('key', 'value');
    expect(await adapter.get('key')).toBe('value');
  });

  it('should handle TTL expiration', async () => {
    await adapter.set('key', 'value', { ttl: 100 });
    expect(await adapter.get('key')).toBe('value');
    
    // Wait for TTL to expire
    await new Promise(resolve => setTimeout(resolve, 150));
    expect(await adapter.get('key')).toBeUndefined();
  });

  it('should respect maxSize and implement LRU eviction', async () => {
    adapter = new MemoryAdapter({ maxSize: 2 });
    
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
});
