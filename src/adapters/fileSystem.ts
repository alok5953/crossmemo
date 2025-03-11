import { CacheOptions, CacheEntry, StorageAdapter } from '../types';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

export interface FileSystemAdapterOptions extends CacheOptions {
  directory?: string;
}

export class FileSystemAdapter<T> implements StorageAdapter<T> {
  private directory: string;
  private maxSize: number;
  private accessOrderFile: string;

  constructor(options?: FileSystemAdapterOptions) {
    this.directory = options?.directory || path.join(process.cwd(), '.cache');
    this.maxSize = options?.maxSize || Infinity;
    this.accessOrderFile = path.join(this.directory, '__access_order.json');
  }

  private getFilePath(key: string): string {
    const hash = crypto.createHash('md5').update(key).digest('hex');
    return path.join(this.directory, `${hash}.json`);
  }

  private async ensureDirectory(): Promise<void> {
    try {
      await fs.access(this.directory);
    } catch {
      await fs.mkdir(this.directory, { recursive: true });
    }
  }

  private isExpired(entry: CacheEntry<T>): boolean {
    if (!entry.expiry) return false;
    return Date.now() >= entry.expiry;
  }

  private async getAccessOrder(): Promise<string[]> {
    try {
      const content = await fs.readFile(this.accessOrderFile, 'utf-8');
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  private async setAccessOrder(order: string[]): Promise<void> {
    await this.ensureDirectory();
    await fs.writeFile(this.accessOrderFile, JSON.stringify(order), 'utf-8');
  }

  private async updateAccessOrder(key: string): Promise<void> {
    const order = (await this.getAccessOrder()).filter(k => k !== key);
    order.push(key);
    await this.setAccessOrder(order);
  }

  private async cleanup(): Promise<void> {
    await this.ensureDirectory();

    const files = await fs.readdir(this.directory);
    const accessOrder = await this.getAccessOrder();
    const validKeys: string[] = [];

    // Process each file except access order file
    for (const file of files.filter(f => f !== '__access_order.json')) {
      const filePath = path.join(this.directory, file);
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const entry: CacheEntry<T> = JSON.parse(content);

        if (this.isExpired(entry)) {
          await fs.unlink(filePath);
        } else {
          const key = file.replace('.json', '');
          validKeys.push(key);
        }
      } catch {
        await fs.unlink(filePath);
      }
    }

    // Update access order to only include valid keys and add any missing valid keys
    const updatedOrder = accessOrder.filter(key => validKeys.includes(key));
    validKeys.forEach(key => {
      if (!updatedOrder.includes(key)) {
        updatedOrder.push(key);
      }
    });

    // LRU eviction if size exceeds maxSize
    while (updatedOrder.length > this.maxSize) {
      const oldestKey = updatedOrder.shift();
      if (oldestKey) {
        try {
          await fs.unlink(path.join(this.directory, `${oldestKey}.json`));
        } catch {
          // Ignore errors during cleanup
        }
      }
    }

    await this.setAccessOrder(updatedOrder);
  }

  async get(key: string): Promise<T | undefined> {
    await this.ensureDirectory();
    const filePath = this.getFilePath(key);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const entry: CacheEntry<T> = JSON.parse(content);

      if (this.isExpired(entry)) {
        await fs.unlink(filePath);
        const order = (await this.getAccessOrder()).filter(k => k !== key);
        await this.setAccessOrder(order);
        return undefined;
      }

      await this.updateAccessOrder(key);
      return entry.value;
    } catch {
      return undefined;
    }
  }

  async set(key: string, value: T, options?: CacheOptions): Promise<void> {
    await this.cleanup();

    // If we're at max size and this is a new key, remove oldest
    const currentOrder = await this.getAccessOrder();
    if (!currentOrder.includes(key) && currentOrder.length >= this.maxSize) {
      const oldestKey = currentOrder.shift();
      if (oldestKey) {
        try {
          await fs.unlink(path.join(this.directory, `${oldestKey}.json`));
        } catch {
          // Ignore errors during cleanup
        }
        await this.setAccessOrder(currentOrder);
      }
    }

    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      expiry: options?.ttl ? Date.now() + options.ttl : undefined
    };

    const filePath = this.getFilePath(key);
    await fs.writeFile(filePath, JSON.stringify(entry), 'utf-8');
    await this.updateAccessOrder(key);
  }

  async delete(key: string): Promise<void> {
    const filePath = this.getFilePath(key);
    try {
      await fs.unlink(filePath);
      const order = (await this.getAccessOrder()).filter(k => k !== key);
      await this.setAccessOrder(order);
    } catch {
      // Ignore if file doesn't exist
    }
  }

  async clear(): Promise<void> {
    try {
      const files = await fs.readdir(this.directory);
      await Promise.all(
        files.map(file => fs.unlink(path.join(this.directory, file)))
      );
      await this.setAccessOrder([]);
    } catch {
      // Ignore if directory doesn't exist
    }
  }

  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== undefined;
  }
}
