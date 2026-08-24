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
/**
 * Borra TODAS las entradas cuya key empieza con `prefix` (ej: `recipes:`).
 * Usar con cuidado: en multi-tenant esto afecta a TODOS los colegios,
 * que es lo apropiado cuando una admin plataforma hace una acción cross-tenant
 * (ej: crear un colegio nuevo, migrar imágenes). Para invalidaciones del
 * tenant actual, usar {@link invalidateForSchool}.
 */
const clearByPattern = (prefix) => {
    const prefixToMatch = prefix.endsWith(':') ? prefix : `${prefix}:`;
    for (const key of cacheStore.keys()) {
        if (key.startsWith(prefixToMatch)) {
            cacheStore.delete(key);
        }
    }
};
/**
 * Borra las entradas de un namespace que pertenezcan a un colegio específico.
 * Es la invalidación correcta para mutaciones tenant-scoped (ej: admin de
 * colegio X edita una receta → invalidar solo `recipes:schoolId=X`).
 */
const invalidateForSchool = (namespace, schoolId) => {
    const prefix = `${namespace}:${schoolId}`;
    for (const key of cacheStore.keys()) {
        if (key.startsWith(prefix)) {
            cacheStore.delete(key);
        }
    }
    // También borra el alias `:all` legacy si existe (defensivo).
    deleteFromCache(`${namespace}:all`);
};
/**
 * Cache helper functions for common patterns.
 *
 * MULTI-TENANT: todas las funciones de cache incluyen `schoolId` en la key
 * para evitar data leak entre colegios. La excepción documentada son los
 * `category_rules` que son globales de plataforma.
 */
// ── Menus ─────────────────────────────────────────────────────────────────
export async function getCachedMenus(key, fetcher, ttlSeconds = 3600) {
    const cached = getFromCache(key);
    if (cached !== null)
        return cached;
    const fresh = await fetcher();
    setInCache(key, fresh, ttlSeconds);
    return fresh;
}
/**
 * Invalida el cache de menús.
 * @param date Si se pasa, borra solo ese día del colegio.
 *   Si no se pasa, borra el scope del colegio (no cross-tenant).
 */
export async function invalidateMenuCache(opts) {
    const { schoolId, date } = opts;
    // Llamadas legacy (sin schoolId) — borra TODO. Solo válido para admin
    // plataforma o migraciones. Log explícito para que un descuido se note.
    if (!schoolId) {
        console.warn('[cache] invalidateMenuCache sin schoolId — limpiando TODO el namespace (legado)');
        clearByPattern('menu');
        return;
    }
    if (date)
        deleteFromCache(`menu:${schoolId}:${date}`);
    invalidateForSchool('menu', schoolId);
}
// ── Recipes ───────────────────────────────────────────────────────────────
export async function getCachedRecipes(schoolId, fetcher, ttlSeconds = 21600) {
    const key = `recipes:${schoolId}`;
    const cached = getFromCache(key);
    if (cached !== null)
        return cached;
    const fresh = await fetcher();
    setInCache(key, fresh, ttlSeconds);
    return fresh;
}
export async function invalidateRecipesCache(schoolId) {
    if (!schoolId) {
        console.warn('[cache] invalidateRecipesCache sin schoolId — limpiando TODO (legado)');
        clearByPattern('recipes');
        return;
    }
    invalidateForSchool('recipes', schoolId);
}
// ── Categories ────────────────────────────────────────────────────────────
export async function getCachedCategories(schoolId, fetcher, ttlSeconds = 21600) {
    const key = `categories:${schoolId}`;
    const cached = getFromCache(key);
    if (cached !== null)
        return cached;
    const fresh = await fetcher();
    setInCache(key, fresh, ttlSeconds);
    return fresh;
}
export async function invalidateCategoriesCache(schoolId) {
    if (!schoolId) {
        console.warn('[cache] invalidateCategoriesCache sin schoolId — limpiando TODO (legado)');
        clearByPattern('categories');
        return;
    }
    invalidateForSchool('categories', schoolId);
}
// ── Category Rules (GLOBAL — sin schoolId) ───────────────────────────────
export async function getCachedCategoryRules(fetcher, ttlSeconds = 21600) {
    const key = 'category-rules:global';
    const cached = getFromCache(key);
    if (cached !== null)
        return cached;
    const fresh = await fetcher();
    setInCache(key, fresh, ttlSeconds);
    return fresh;
}
export async function invalidateCategoryRulesCache() {
    deleteFromCache('category-rules:global');
}
