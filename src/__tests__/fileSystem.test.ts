import { FileSystemAdapter } from '../adapters/fileSystem';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('FileSystemAdapter', () => {
  let adapter: FileSystemAdapter<any>;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `memo-test-${Date.now()}`);
    adapter = new FileSystemAdapter({ directory: tempDir });
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  it('should create cache directory if it does not exist', async () => {
    await adapter.set('key', 'value');
    const stats = await fs.stat(tempDir);
    expect(stats.isDirectory()).toBe(true);
  });

  it('should store and retrieve values', async () => {
    await adapter.set('key', 'value');
    expect(await adapter.get('key')).toBe('value');
  });

  it('should handle TTL expiration', async () => {
    await adapter.set('key', 'value', { ttl: 100 });
    expect(await adapter.get('key')).toBe('value');
    
    await new Promise(resolve => setTimeout(resolve, 150));
    expect(await adapter.get('key')).toBeUndefined();
  });

  it('should respect maxSize and implement LRU eviction', async () => {
    adapter = new FileSystemAdapter({ directory: tempDir, maxSize: 2 });
    
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

  it('should handle invalid cache files', async () => {
    const filePath = path.join(tempDir, 'invalid.json');
    await fs.mkdir(tempDir, { recursive: true });
    await fs.writeFile(filePath, 'invalid json');
    
    expect(await adapter.get('invalid')).toBeUndefined();
  });

  it('should handle concurrent operations', async () => {
    const promises = Array(10).fill(0).map((_, i) => 
      adapter.set(`key${i}`, `value${i}`)
    );
    
    await Promise.all(promises);
    
    for (let i = 0; i < 10; i++) {
      expect(await adapter.get(`key${i}`)).toBe(`value${i}`);
    }
  });
});
