/**
 * In-memory rate limit store for express-rate-limit.
 */
export class InMemoryRateLimitStore {
    inMemoryStore = new Map();
    async increment(key) {
        const now = Date.now();
        const entry = this.inMemoryStore.get(key);
        if (!entry || entry.resetTime < now) {
            this.inMemoryStore.set(key, { count: 1, resetTime: now + 60000 });
            return { totalHits: 1, resetTime: new Date(now + 60000) };
        }
        entry.count += 1;
        return { totalHits: entry.count, resetTime: new Date(entry.resetTime) };
    }
    async decrement(key) {
        const entry = this.inMemoryStore.get(key);
        if (entry) {
            entry.count = Math.max(0, entry.count - 1);
        }
    }
    async resetKey(key) {
        this.inMemoryStore.delete(key);
    }
    async reset() {
        this.inMemoryStore.clear();
    }
}
