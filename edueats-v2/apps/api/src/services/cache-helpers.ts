type CacheEntry = {
  value: unknown;
  expiresAt: number;
};

const cacheStore = new Map<string, CacheEntry>();

const getFromCache = <T>(key: string): T | null => {
  const entry = cacheStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cacheStore.delete(key);
    return null;
  }
  return entry.value as T;
};

const setInCache = <T>(key: string, value: T, ttlSeconds: number) => {
  cacheStore.set(key, {
    value,
    expiresAt: Date.now() + Math.max(1, ttlSeconds) * 1000,
  });
};

const deleteFromCache = (key: string) => {
  cacheStore.delete(key);
};

const clearByPattern = (prefixPattern: string) => {
  const prefix = prefixPattern.replace('*', '');
  for (const key of cacheStore.keys()) {
    if (key.startsWith(prefix)) {
      cacheStore.delete(key);
    }
  }
};

/**
 * Cache helper functions for common patterns
 */

/**
 * Get or fetch menu data with in-memory caching.
 * Cache TTL: 1 hour (menus rarely change during the day)
 */
export async function getCachedMenus<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 3600
): Promise<T> {
  const cached = getFromCache<T>(key);
  if (cached !== null) {
    return cached;
  }

  const fresh = await fetcher();
  setInCache(key, fresh, ttlSeconds);
  return fresh;
}

/**
 * Invalidate menu cache pattern after changes
 */
export async function invalidateMenuCache(date?: string): Promise<void> {
  if (date) {
    deleteFromCache(`menu:${date}`);
  }
  // Clear all menu patterns if no specific date
  clearByPattern('menu:*');
}

/**
 * Get or fetch recipes with in-memory caching.
 * Cache TTL: 6 hours (recipes are static)
 */
export async function getCachedRecipes<T>(
  fetcher: () => Promise<T>,
  ttlSeconds: number = 21600
): Promise<T> {
  const cached = getFromCache<T>('recipes:all');
  if (cached !== null) {
    return cached;
  }

  const fresh = await fetcher();
  setInCache('recipes:all', fresh, ttlSeconds);
  return fresh;
}

/**
 * Invalidate recipes cache
 */
export async function invalidateRecipesCache(): Promise<void> {
  deleteFromCache('recipes:all');
  clearByPattern('recipes:*');
}

/**
 * Get or fetch categories with in-memory caching.
 * Cache TTL: 6 hours (categories are static)
 */
export async function getCachedCategories<T>(
  fetcher: () => Promise<T>,
  ttlSeconds: number = 21600
): Promise<T> {
  const cached = getFromCache<T>('categories:all');
  if (cached !== null) {
    return cached;
  }

  const fresh = await fetcher();
  setInCache('categories:all', fresh, ttlSeconds);
  return fresh;
}

/**
 * Invalidate categories cache
 */
export async function invalidateCategoriesCache(): Promise<void> {
  deleteFromCache('categories:all');
  clearByPattern('categories:*');
}

/**
 * Get or fetch category rules with in-memory caching.
 * Cache TTL: 6 hours (rules are static)
 */
export async function getCachedCategoryRules<T>(
  fetcher: () => Promise<T>,
  ttlSeconds: number = 21600
): Promise<T> {
  const cached = getFromCache<T>('category-rules:all');
  if (cached !== null) {
    return cached;
  }

  const fresh = await fetcher();
  setInCache('category-rules:all', fresh, ttlSeconds);
  return fresh;
}

/**
 * Invalidate category rules cache
 */
export async function invalidateCategoryRulesCache(): Promise<void> {
  deleteFromCache('category-rules:all');
  clearByPattern('category-rules:*');
}
