import { CacheOptions, StorageAdapter, CacheEventType, CacheEventListener, CacheEvent } from './types';
import { MemoryAdapter } from './adapters/memory';
import { LocalStorageAdapter } from './adapters/localStorage';
import { FileSystemAdapter } from './adapters/fileSystem';

export class Cache<T> {
  private adapter: StorageAdapter<T>;
  private eventListeners: Map<CacheEventType, Set<CacheEventListener<T>>> = new Map();
  private options: CacheOptions;

  constructor(options?: CacheOptions & { adapter?: StorageAdapter<T> }) {
    this.options = options || {};
    
    // Auto-detect best adapter if none provided
    if (!options?.adapter) {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        this.adapter = new LocalStorageAdapter<T>(options);
      } else if (typeof process !== 'undefined' && process.versions?.node) {
        this.adapter = new FileSystemAdapter<T>(options);
      } else {
        this.adapter = new MemoryAdapter<T>(options);
      }
    } else {
      this.adapter = options.adapter;
    }

    // Forward adapter events if supported
    if (this.adapter.addEventListener) {
      ['set', 'get', 'delete', 'clear', 'expired'].forEach(type => {
        this.adapter.addEventListener!(type as CacheEventType, event => {
          this.emitEvent(event);
        });
      });
    }
  }

  private emitEvent(event: CacheEvent<T>) {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach(listener => listener(event));
    }
  }

  addEventListener(type: CacheEventType, listener: CacheEventListener<T>) {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }
    this.eventListeners.get(type)!.add(listener);
  }

  removeEventListener(type: CacheEventType, listener: CacheEventListener<T>) {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  async get(key: string): Promise<T | undefined> {
    const value = await this.adapter.get(key);
    if (value === undefined) return undefined;

    this.emitEvent({
      type: 'get',
      key,
      value,
      timestamp: Date.now()
    });
    
    return value;
  }

  async set(key: string, value: T, options?: CacheOptions): Promise<void> {
    await this.adapter.set(key, value, { ...this.options, ...options });
    
    this.emitEvent({
      type: 'set',
      key,
      value,
      timestamp: Date.now()
    });
  }

  async delete(key: string): Promise<void> {
    await this.adapter.delete(key);
    
    this.emitEvent({
      type: 'delete',
      key,
      timestamp: Date.now()
    });
  }

  async clear(): Promise<void> {
    await this.adapter.clear();
    
    this.emitEvent({
      type: 'clear',
      timestamp: Date.now()
    });
  }

  async has(key: string): Promise<boolean> {
    return this.adapter.has(key);
  }
}
