# CrossMemo

A powerful cross-environment caching and memoization utility with TTL support and multiple storage adapters. Works seamlessly in both Node.js and browser environments.

## Features

- **Cross-Environment**: Works in both Node.js and browsers
- **Multiple Storage Adapters**: 
  - Memory (In-memory LRU cache)
  - LocalStorage (Browser persistent storage)
  - FileSystem (Node.js persistent storage)
- **TTL Support**: Set expiration time for cached items
- **LRU Cache**: Automatic least-recently-used item eviction
- **Type-Safe**: Written in TypeScript with full type definitions
- **Custom Key Resolution**: Flexible cache key generation
- **Error Handling**: Graceful fallback on storage errors

## Installation

```bash
npm install crossmemo
```

## Quick Start

```typescript
import { memoize } from 'crossmemo';

// Simple memoization
const expensiveFunction = async (x: number) => {
  // Simulate expensive computation
  await new Promise(resolve => setTimeout(resolve, 1000));
  return x * 2;
};

const memoizedFn = memoize(expensiveFunction, {
  ttl: 5000 // Cache results for 5 seconds
});

// First call will take 1 second
await memoizedFn(5); // => 10

// Second call is instant
await memoizedFn(5); // => 10 (from cache)
```

## Usage

### Direct Cache Usage

```typescript
import { Cache } from 'crossmemo';

const cache = new Cache();

// Store a value with 1 minute TTL
await cache.set('key', { data: 'value' }, { ttl: 60000 });

// Retrieve the value
const value = await cache.get('key');

// Check if key exists
const exists = await cache.has('key');

// Delete a key
await cache.delete('key');

// Clear all cache
await cache.clear();
```

### Custom Storage Adapter

```typescript
import { LocalStorageAdapter } from 'crossmemo';

const cache = new Cache({
  adapter: new LocalStorageAdapter({
    prefix: 'myapp:', // Custom prefix for localStorage keys
    maxSize: 100 // Maximum number of items to store
  })
});
```

### Custom Key Resolution

```typescript
const memoizedFn = memoize(
  async (user: { id: number, name: string }) => {
    // ... expensive operation
  },
  {
    keyResolver: (user) => `user-${user.id}` // Custom cache key
  }
);
```

## API Reference

### `memoize(fn, options?)`

Creates a memoized version of a function.

Options:
- `ttl`: Time-to-live in milliseconds
- `keyResolver`: Custom function to generate cache keys
- `maxSize`: Maximum number of items to cache (LRU eviction)

### `Cache`

Main cache class with the following methods:
- `get(key)`: Get a value
- `set(key, value, options?)`: Set a value
- `delete(key)`: Delete a value
- `clear()`: Clear all values
- `has(key)`: Check if key exists

### Storage Adapters

- `MemoryAdapter`: In-memory storage (default)
- `LocalStorageAdapter`: Browser localStorage
- `FileSystemAdapter`: Node.js file system

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT 
