/**
 * Express Session Configuration with Redis Store
 * Enables distributed sessions across multiple API instances
 */
import session from 'express-session';
import RedisStore from 'connect-redis';
import { getRedisClient } from '../services/redis.js';
export function getSessionMiddleware() {
    const redis = getRedisClient();
    // If Redis is not available, use memory store (suitable for single-instance dev)
    if (!redis) {
        console.log('[Sessions] Redis no disponible. Usando MemoryStore para desarrollo.');
        return session({
            secret: process.env.SESSION_SECRET || 'dev-secret-key-change-in-production',
            resave: false,
            saveUninitialized: false,
            cookie: {
                secure: process.env.NODE_ENV === 'production',
                httpOnly: true,
                maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
                sameSite: 'lax'
            }
        });
    }
    // Redis-backed sessions for production multi-instance deployments
    console.log('[Sessions] Usando RedisStore para sesiones distribuidas.');
    const redisStore = new RedisStore({ client: redis });
    return session({
        store: redisStore,
        secret: process.env.SESSION_SECRET || 'dev-secret-key-change-in-production',
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
            sameSite: 'lax'
        }
    });
}
