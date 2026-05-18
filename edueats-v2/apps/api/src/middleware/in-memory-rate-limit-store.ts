import type { Store } from 'express-rate-limit';

/**
 * In-memory rate limit store for express-rate-limit.
 */
export class InMemoryRateLimitStore implements Store {
  private inMemoryStore: Map<string, { count: number; resetTime: number }> = new Map();

  async increment(key: string): Promise<{ totalHits: number; resetTime: Date }> {
    const now = Date.now();
    const entry = this.inMemoryStore.get(key);

    if (!entry || entry.resetTime < now) {
      this.inMemoryStore.set(key, { count: 1, resetTime: now + 60000 });
      return { totalHits: 1, resetTime: new Date(now + 60000) };
    }

    entry.count += 1;
    return { totalHits: entry.count, resetTime: new Date(entry.resetTime) };
  }

  async decrement(key: string): Promise<void> {
    const entry = this.inMemoryStore.get(key);
    if (entry) {
      entry.count = Math.max(0, entry.count - 1);
    }
  }

  async resetKey(key: string): Promise<void> {
    this.inMemoryStore.delete(key);
  }

  async reset(): Promise<void> {
    this.inMemoryStore.clear();
  }
}
