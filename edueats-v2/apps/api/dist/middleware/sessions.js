/**
 * Express Session Configuration (MemoryStore only).
 */
import session from 'express-session';
export function getSessionMiddleware() {
    console.log('[Sessions] Usando MemoryStore.');
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
