const cacheStore = new Map();
const getFromCache = (key) => {
    const entry = cacheStore.get(key);
    if (!entry)
        return null;
    if (entry.expiresAt <= Date.now()) {
        cacheStore.delete(key);
        return null;
    }
    return entry.value;
};
const setInCache = (key, value, ttlSeconds) => {
    cacheStore.set(key, {
        value,
        expiresAt: Date.now() + Math.max(1, ttlSeconds) * 1000,
    });
};
const deleteFromCache = (key) => {
    cacheStore.delete(key);
};
const clearByPattern = (prefixPattern) => {
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
export async function getCachedMenus(key, fetcher, ttlSeconds = 3600) {
    const cached = getFromCache(key);
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
export async function invalidateMenuCache(date) {
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
export async function getCachedRecipes(fetcher, ttlSeconds = 21600) {
    const cached = getFromCache('recipes:all');
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
export async function invalidateRecipesCache() {
    deleteFromCache('recipes:all');
    clearByPattern('recipes:*');
}
/**
 * Get or fetch categories with in-memory caching.
 * Cache TTL: 6 hours (categories are static)
 */
export async function getCachedCategories(fetcher, ttlSeconds = 21600) {
    const cached = getFromCache('categories:all');
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
export async function invalidateCategoriesCache() {
    deleteFromCache('categories:all');
    clearByPattern('categories:*');
}
/**
 * Get or fetch category rules with in-memory caching.
 * Cache TTL: 6 hours (rules are static)
 */
export async function getCachedCategoryRules(fetcher, ttlSeconds = 21600) {
    const cached = getFromCache('category-rules:all');
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
export async function invalidateCategoryRulesCache() {
    deleteFromCache('category-rules:all');
    clearByPattern('category-rules:*');
}
