import { CacheOptions, CacheEntry, StorageAdapter } from '../types';

export class MemoryAdapter<T> implements StorageAdapter<T> {
  private store: Map<string, CacheEntry<T>> = new Map();
  private maxSize: number;
  private accessOrder: string[] = [];

  constructor(options?: CacheOptions) {
    this.maxSize = options?.maxSize || Infinity;
  }

  private isExpired(entry: CacheEntry<T>): boolean {
    if (!entry.expiry) return false;
    return Date.now() >= entry.expiry;
  }

  private updateAccessOrder(key: string) {
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    this.accessOrder.push(key);
  }

  private cleanup(): void {
    // Remove expired entries and invalid keys
    const validKeys = new Set(this.store.keys());
    this.accessOrder = this.accessOrder.filter(key => validKeys.has(key));

    for (const [key, entry] of this.store.entries()) {
      if (this.isExpired(entry)) {
        this.store.delete(key);
        this.accessOrder = this.accessOrder.filter(k => k !== key);
      }
    }

    // LRU eviction if size exceeds maxSize
    while (this.store.size > this.maxSize && this.accessOrder.length > 0) {
      const oldestKey = this.accessOrder[0];
      if (oldestKey) {
        this.store.delete(oldestKey);
        this.accessOrder.shift();
      }
    }
  }

  async get(key: string): Promise<T | undefined> {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    
    if (this.isExpired(entry)) {
      this.store.delete(key);
      this.accessOrder = this.accessOrder.filter(k => k !== key);
      return undefined;
    }

    this.updateAccessOrder(key);
    return entry.value;
  }

  async set(key: string, value: T, options?: CacheOptions): Promise<void> {
    // Run cleanup before adding new item
    this.cleanup();
    
    // If we're at max size and this is a new key, remove oldest
    if (this.store.size >= this.maxSize && !this.store.has(key)) {
      const oldestKey = this.accessOrder[0];
      if (oldestKey) {
        this.store.delete(oldestKey);
        this.accessOrder.shift();
      }
    }

    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      expiry: options?.ttl ? Date.now() + options.ttl : undefined
    };

    this.store.set(key, entry);
    this.updateAccessOrder(key);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
    this.accessOrder = this.accessOrder.filter(k => k !== key);
  }

  async clear(): Promise<void> {
    this.store.clear();
    this.accessOrder = [];
  }

  async has(key: string): Promise<boolean> {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (this.isExpired(entry)) {
      this.store.delete(key);
      this.accessOrder = this.accessOrder.filter(k => k !== key);
      return false;
    }
    return true;
  }
}
