import { getCached, setCached, deleteCached, clearCachePattern } from './redis.js';
/**
 * Cache helper functions for common patterns
 */
/**
 * Get or fetch menu data with Redis caching
 * Cache TTL: 1 hour (menus rarely change during the day)
 */
export async function getCachedMenus(key, fetcher, ttlSeconds = 3600) {
    const cached = await getCached(key);
    if (cached !== null) {
        return cached;
    }
    const fresh = await fetcher();
    await setCached(key, fresh, ttlSeconds);
    return fresh;
}
/**
 * Invalidate menu cache pattern after changes
 */
export async function invalidateMenuCache(date) {
    if (date) {
        await deleteCached(`menu:${date}`);
    }
    // Clear all menu patterns if no specific date
    await clearCachePattern('menu:*');
}
/**
 * Get or fetch recipes with Redis caching
 * Cache TTL: 6 hours (recipes are static)
 */
export async function getCachedRecipes(fetcher, ttlSeconds = 21600) {
    const cached = await getCached('recipes:all');
    if (cached !== null) {
        return cached;
    }
    const fresh = await fetcher();
    await setCached('recipes:all', fresh, ttlSeconds);
    return fresh;
}
/**
 * Invalidate recipes cache
 */
export async function invalidateRecipesCache() {
    await deleteCached('recipes:all');
    await clearCachePattern('recipes:*');
}
/**
 * Get or fetch categories with Redis caching
 * Cache TTL: 6 hours (categories are static)
 */
export async function getCachedCategories(fetcher, ttlSeconds = 21600) {
    const cached = await getCached('categories:all');
    if (cached !== null) {
        return cached;
    }
    const fresh = await fetcher();
    await setCached('categories:all', fresh, ttlSeconds);
    return fresh;
}
/**
 * Invalidate categories cache
 */
export async function invalidateCategoriesCache() {
    await deleteCached('categories:all');
    await clearCachePattern('categories:*');
}
/**
 * Get or fetch category rules with Redis caching
 * Cache TTL: 6 hours (rules are static)
 */
export async function getCachedCategoryRules(fetcher, ttlSeconds = 21600) {
    const cached = await getCached('category-rules:all');
    if (cached !== null) {
        return cached;
    }
    const fresh = await fetcher();
    await setCached('category-rules:all', fresh, ttlSeconds);
    return fresh;
}
/**
 * Invalidate category rules cache
 */
export async function invalidateCategoryRulesCache() {
    await deleteCached('category-rules:all');
    await clearCachePattern('category-rules:*');
}
