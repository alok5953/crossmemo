import { Cache } from '../cache';
import { CacheEvent, CacheEventType } from '../types';

describe('Cache', () => {
  let cache: Cache<any>;

  beforeEach(() => {
    cache = new Cache();
  });

  it('should handle basic cache operations', async () => {
    await cache.set('key', 'value');
    expect(await cache.get('key')).toBe('value');
  });

  it('should emit events for cache operations', async () => {
    const events: CacheEvent<any>[] = [];
    const listener = (event: CacheEvent<any>) => {
      events.push(event);
    };

    cache.addEventListener('set', listener);
    cache.addEventListener('get', listener);
    cache.addEventListener('delete', listener);

    await cache.set('key', 'value');
    await cache.get('key');
    await cache.delete('key');

    expect(events.length).toBe(3);
    expect(events[0].type).toBe('set');
    expect(events[1].type).toBe('get');
    expect(events[2].type).toBe('delete');

    cache.removeEventListener('set', listener);
    await cache.set('key2', 'value2');
    expect(events.length).toBe(3);
  });

  it('should handle custom serialization', async () => {
    const serializer = (value: any) => `serialized:${JSON.stringify(value)}`;
    const deserializer = (value: string) => JSON.parse(value.replace('serialized:', ''));

    cache = new Cache({ serializer, deserializer });

    const obj = { foo: 'bar' };
    await cache.set('key', obj);
    expect(await cache.get('key')).toEqual(obj);
  });

  it('should handle TTL options', async () => {
    await cache.set('key', 'value', { ttl: 100 });
    expect(await cache.get('key')).toBe('value');

    await new Promise(resolve => setTimeout(resolve, 150));
    expect(await cache.get('key')).toBeUndefined();
  });

  it('should handle clear operation', async () => {
    await cache.set('key1', 'value1');
    await cache.set('key2', 'value2');

    await cache.clear();
    expect(await cache.get('key1')).toBeUndefined();
    expect(await cache.get('key2')).toBeUndefined();
  });

  it('should handle has() operation', async () => {
    await cache.set('key', 'value');
    expect(await cache.has('key')).toBe(true);
    expect(await cache.has('nonexistent')).toBe(false);
  });
});
