import { Redis as RedisClient } from 'ioredis';
let redis = null;
/**
 * Initialize Redis connection
 * Falls back gracefully if Redis is unavailable or REDIS_URL is not set
 */
export async function initRedis() {
    if (!process.env.REDIS_URL) {
        console.log('[Redis] REDIS_URL not set — running without Redis cache');
        return null;
    }
    try {
        redis = new RedisClient(process.env.REDIS_URL, {
            lazyConnect: true,
            enableOfflineQueue: false,
            maxRetriesPerRequest: 3,
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
        });
        redis.on('error', (err) => {
            console.error('[Redis] Connection error:', err.message);
        });
        redis.on('connect', () => {
            console.log('[Redis] Connected successfully');
        });
        await redis.connect();
        console.log('[Redis] ✓ Ready');
        return redis;
    }
    catch (err) {
        console.warn('[Redis] Failed to connect — app will work without cache:', err.message);
        redis = null;
        return null;
    }
}
export function getRedisClient() {
    return redis;
}
/**
 * Get value from Redis cache
 * Returns null if key not found or Redis is unavailable
 */
export async function getCached(key) {
    if (!redis)
        return null;
    try {
        const data = await redis.get(key);
        if (!data)
            return null;
        return JSON.parse(data);
    }
    catch (err) {
        console.warn(`[Redis] get error for key "${key}":`, err.message);
        return null;
    }
}
/**
 * Set value in Redis cache with optional TTL (in seconds)
 */
export async function setCached(key, value, ttlSeconds = 3600) {
    if (!redis)
        return false;
    try {
        await redis.setex(key, ttlSeconds, JSON.stringify(value));
        return true;
    }
    catch (err) {
        console.warn(`[Redis] set error for key "${key}":`, err.message);
        return false;
    }
}
/**
 * Delete key from Redis cache
 */
export async function deleteCached(key) {
    if (!redis)
        return false;
    try {
        await redis.del(key);
        return true;
    }
    catch (err) {
        console.warn(`[Redis] delete error for key "${key}":`, err.message);
        return false;
    }
}
/**
 * Clear all keys matching a pattern (use with caution in production)
 */
export async function clearCachePattern(pattern) {
    if (!redis)
        return 0;
    try {
        const keys = await redis.keys(pattern);
        if (keys.length === 0)
            return 0;
        await redis.del(...keys);
        return keys.length;
    }
    catch (err) {
        console.warn(`[Redis] clear pattern error for "${pattern}":`, err.message);
        return 0;
    }
}
/**
 * Close Redis connection (for graceful shutdown)
 */
export async function closeRedis() {
    if (!redis)
        return;
    try {
        await redis.quit();
        console.log('[Redis] Connection closed');
        redis = null;
    }
    catch (err) {
        console.error('[Redis] Error closing connection:', err.message);
    }
}
