import { Request, Response } from 'express';
import type { Store } from 'express-rate-limit';
import { Redis as RedisClient } from 'ioredis';
import { getRedisClient } from '../services/redis.js';

/**
 * Redis-backed rate limit store for express-rate-limit
 * Falls back to in-memory if Redis is unavailable
 */
export class RedisRateLimitStore implements Store {
  private inMemoryStore: Map<string, { count: number; resetTime: number }> = new Map();
  prefix = 'ratelimit:';

  async increment(key: string): Promise<{ totalHits: number; resetTime: Date }> {
    const redis = getRedisClient();

    if (!redis) {
      // Fallback: in-memory store
      const now = Date.now();
      const entry = this.inMemoryStore.get(key);

      if (!entry || entry.resetTime < now) {
        this.inMemoryStore.set(key, { count: 1, resetTime: now + 60000 }); // 1 min default
        return { totalHits: 1, resetTime: new Date(now + 60000) };
      }

      entry.count++;
      return { totalHits: entry.count, resetTime: new Date(entry.resetTime) };
    }

    try {
      const redisKey = `${this.prefix}${key}`;
      const count = await redis.incr(redisKey);

      // Set expiry on first increment
      if (count === 1) {
        await redis.expire(redisKey, 60); // 1 minute window
      }

      return { totalHits: count, resetTime: new Date(Date.now() + 60000) };
    } catch (err) {
      console.warn('[RateLimitStore] Redis error, falling back to memory:', (err as Error).message);
      const res = this.fallbackIncr(key);
      return { totalHits: res, resetTime: new Date(Date.now() + 60000) };
    }
  }

  async decrement(key: string): Promise<void> {
    const redis = getRedisClient();

    if (!redis) {
      const entry = this.inMemoryStore.get(key);
      if (entry) {
        entry.count = Math.max(0, entry.count - 1);
      }
      return;
    }

    try {
      const redisKey = `${this.prefix}${key}`;
      await redis.decr(redisKey);
    } catch (err) {
      console.warn('[RateLimitStore] Redis decrement error:', (err as Error).message);
    }
  }

  private fallbackIncr(key: string): number {
    const now = Date.now();
    const entry = this.inMemoryStore.get(key);

    if (!entry || entry.resetTime < now) {
      this.inMemoryStore.set(key, { count: 1, resetTime: now + 60000 });
      return 1;
    }

    entry.count++;
    return entry.count;
  }

  async resetKey(key: string): Promise<void> {
    const redis = getRedisClient();

    if (redis) {
      try {
        await redis.del(`${this.prefix}${key}`);
      } catch (err) {
        console.warn('[RateLimitStore] Redis error on reset:', (err as Error).message);
      }
    }

    this.inMemoryStore.delete(key);
  }

  async reset(): Promise<void> {
    const redis = getRedisClient();

    if (redis) {
      try {
        const keys = await redis.keys(`${this.prefix}*`);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } catch (err) {
        console.warn('[RateLimitStore] Redis error on full reset:', (err as Error).message);
      }
    }

    this.inMemoryStore.clear();
  }
}


