import { memoize } from '../memoize';

describe('memoize', () => {
  it('should cache function results', async () => {
    let callCount = 0;
    const fn = async (x: number) => {
      callCount++;
      return x * 2;
    };

    const memoizedFn = memoize(fn);
    
    expect(await memoizedFn(5)).toBe(10);
    expect(await memoizedFn(5)).toBe(10);
    expect(callCount).toBe(1);

    expect(await memoizedFn(6)).toBe(12);
    expect(callCount).toBe(2);
  });

  it('should handle custom key resolver', async () => {
    let callCount = 0;
    const fn = async (a: number, b: number) => {
      callCount++;
      return a + b;
    };

    const memoizedFn = memoize(fn, {
      keyResolver: (a, b) => `sum:${a}:${b}`
    });

    expect(await memoizedFn(2, 3)).toBe(5);
    expect(await memoizedFn(2, 3)).toBe(5);
    expect(callCount).toBe(1);
  });

  it('should respect TTL option', async () => {
    let callCount = 0;
    const fn = async (x: number) => {
      callCount++;
      return x * 2;
    };

    const memoizedFn = memoize(fn, { ttl: 100 });

    expect(await memoizedFn(5)).toBe(10);
    expect(await memoizedFn(5)).toBe(10);
    expect(callCount).toBe(1);

    await new Promise(resolve => setTimeout(resolve, 150));
    expect(await memoizedFn(5)).toBe(10);
    expect(callCount).toBe(2);
  });

  it('should handle complex arguments and return values', async () => {
    const fn = async (obj: { x: number, y: string }) => {
      return { result: obj.x * 2, text: obj.y.toUpperCase() };
    };

    const memoizedFn = memoize(fn);
    const input = { x: 5, y: 'test' };
    const expected = { result: 10, text: 'TEST' };

    expect(await memoizedFn(input)).toEqual(expected);
    expect(await memoizedFn({ ...input })).toEqual(expected);
  });

  it('should handle function errors', async () => {
    const fn = async () => {
      throw new Error('test error');
    };

    const memoizedFn = memoize(fn);
    await expect(memoizedFn()).rejects.toThrow('test error');
  });
});
