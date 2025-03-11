export interface CacheOptions {
  ttl?: number;
  maxSize?: number;
  serializer?: (value: any) => string;
  deserializer?: (value: string) => any;
}

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  expiry?: number;
}

export type CacheEventType = 'set' | 'get' | 'delete' | 'clear' | 'expired';

export interface CacheEvent<T> {
  type: CacheEventType;
  key?: string;
  value?: T;
  timestamp: number;
}

export interface CacheEventListener<T> {
  (event: CacheEvent<T>): void;
}

export interface StorageAdapter<T> {
  get(key: string): Promise<T | undefined>;
  set(key: string, value: T, options?: CacheOptions): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
  addEventListener?(type: CacheEventType, listener: CacheEventListener<T>): void;
  removeEventListener?(type: CacheEventType, listener: CacheEventListener<T>): void;
}
