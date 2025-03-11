import { CacheOptions, CacheEntry, StorageAdapter } from '../types';

export class LocalStorageAdapter<T> implements StorageAdapter<T> {
  private prefix: string;
  private maxSize: number;
  private accessOrderKey: string;

  constructor(options?: CacheOptions & { prefix?: string }) {
    this.prefix = options?.prefix || 'cache:';
    this.maxSize = options?.maxSize || Infinity;
    this.accessOrderKey = `${this.prefix}__access_order`;
  }

  private getFullKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  private isExpired(entry: CacheEntry<T>): boolean {
    if (!entry.expiry) return false;
    return Date.now() >= entry.expiry;
  }

  private getAccessOrder(): string[] {
    try {
      const order = localStorage.getItem(this.accessOrderKey);
      return order ? JSON.parse(order) : [];
    } catch {
      return [];
    }
  }

  private setAccessOrder(order: string[]): void {
    localStorage.setItem(this.accessOrderKey, JSON.stringify(order));
  }

  private updateAccessOrder(key: string): void {
    const order = this.getAccessOrder().filter(k => k !== key);
    order.push(key);
    if (order.length > this.maxSize) {
      const oldestKey = order.shift();
      if (oldestKey) {
        this.removeFromStorage(oldestKey);
      }
    }
    this.setAccessOrder(order);
  }

  private removeFromStorage(key: string): void {
    localStorage.removeItem(this.getFullKey(key));
    const order = this.getAccessOrder().filter(k => k !== key);
    this.setAccessOrder(order);
  }

  private async cleanup(): Promise<void> {
    if (typeof localStorage === 'undefined') return;

    // Get all valid keys that start with our prefix
    const allKeys = Object.keys(localStorage)
      .filter(key => key.startsWith(this.prefix) && key !== this.accessOrderKey)
      .map(key => key.slice(this.prefix.length));

    const validKeys: string[] = [];
    let accessOrder = this.getAccessOrder();

    // Remove any keys from access order that no longer exist
    accessOrder = accessOrder.filter(key => allKeys.includes(key));

    // Check for expired entries and build valid keys list
    for (const key of allKeys) {
      try {
        const raw = localStorage.getItem(this.getFullKey(key));
        if (raw) {
          const entry: CacheEntry<T> = JSON.parse(raw);
          if (this.isExpired(entry)) {
            this.removeFromStorage(key);
          } else {
            validKeys.push(key);
            if (!accessOrder.includes(key)) {
              accessOrder.push(key);
            }
          }
        }
      } catch {
        this.removeFromStorage(key);
      }
    }

    // LRU eviction if size exceeds maxSize
    while (accessOrder.length > this.maxSize) {
      const oldestKey = accessOrder.shift();
      if (oldestKey) {
        this.removeFromStorage(oldestKey);
      }
    }

    this.setAccessOrder(accessOrder);
  }

  async get(key: string): Promise<T | undefined> {
    if (typeof localStorage === 'undefined') return undefined;

    const fullKey = this.getFullKey(key);
    const raw = localStorage.getItem(fullKey);
    
    if (!raw) return undefined;

    try {
      const entry: CacheEntry<T> = JSON.parse(raw);
      
      if (this.isExpired(entry)) {
        this.removeFromStorage(key);
        return undefined;
      }

      this.updateAccessOrder(key);
      return entry.value;
    } catch {
      this.removeFromStorage(key);
      return undefined;
    }
  }

  async set(key: string, value: T, options?: CacheOptions): Promise<void> {
    if (typeof localStorage === 'undefined') return;

    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      expiry: options?.ttl ? Date.now() + options.ttl : undefined
    };

    try {
      localStorage.setItem(this.getFullKey(key), JSON.stringify(entry));
      this.updateAccessOrder(key);
    } catch {
      // If storage is full, cleanup and try again
      await this.cleanup();
      localStorage.setItem(this.getFullKey(key), JSON.stringify(entry));
      this.updateAccessOrder(key);
    }
  }

  async delete(key: string): Promise<void> {
    if (typeof localStorage === 'undefined') return;
    this.removeFromStorage(key);
  }

  async clear(): Promise<void> {
    if (typeof localStorage === 'undefined') return;

    // Get all items with our prefix
    const keys = Object.keys(localStorage)
      .filter(key => key.startsWith(this.prefix));

    // Remove all items including access order
    for (const key of keys) {
      localStorage.removeItem(key);
    }

    // Reset access order
    localStorage.removeItem(this.accessOrderKey);
    localStorage.clear(); // Clear all items to ensure a clean slate
  }

  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== undefined;
  }
}
