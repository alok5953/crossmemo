import { CacheOptions } from './types';
import { MemoryAdapter } from './adapters/memory';

type AnyFunction = (...args: any[]) => any;

export interface MemoizeOptions extends CacheOptions {
  keyResolver?: (...args: any[]) => string;
}

export function memoize<T extends AnyFunction>(
  fn: T,
  options: MemoizeOptions = {}
): T {
  const cache = new MemoryAdapter<ReturnType<T>>(options);
  const keyResolver = options.keyResolver || 
    ((...args: any[]) => JSON.stringify(args));

  return (async (...args: Parameters<T>) => {
    const key = keyResolver(...args);
    const cached = await cache.get(key);
    
    if (cached !== undefined) {
      return cached;
    }

    const result = await fn(...args);
    await cache.set(key, result, options);
    return result;
  }) as unknown as T;
}
