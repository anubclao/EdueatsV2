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

/**
 * Borra TODAS las entradas cuya key empieza con `prefix` (ej: `recipes:`).
 * Usar con cuidado: en multi-tenant esto afecta a TODOS los colegios,
 * que es lo apropiado cuando una admin plataforma hace una acción cross-tenant
 * (ej: crear un colegio nuevo, migrar imágenes). Para invalidaciones del
 * tenant actual, usar {@link invalidateForSchool}.
 */
const clearByPattern = (prefix: string) => {
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
const invalidateForSchool = (namespace: string, schoolId: string) => {
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
export async function getCachedMenus<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 3600
): Promise<T> {
  const cached = getFromCache<T>(key);
  if (cached !== null) return cached;
  const fresh = await fetcher();
  setInCache(key, fresh, ttlSeconds);
  return fresh;
}

/**
 * Invalida el cache de menús.
 * @param date Si se pasa, borra solo ese día del colegio.
 *   Si no se pasa, borra el scope del colegio (no cross-tenant).
 */
export async function invalidateMenuCache(opts: { schoolId: string; date?: string }): Promise<void> {
  const { schoolId, date } = opts;
  // Llamadas legacy (sin schoolId) — borra TODO. Solo válido para admin
  // plataforma o migraciones. Log explícito para que un descuido se note.
  if (!schoolId) {
    console.warn('[cache] invalidateMenuCache sin schoolId — limpiando TODO el namespace (legado)');
    clearByPattern('menu');
    return;
  }
  if (date) deleteFromCache(`menu:${schoolId}:${date}`);
  invalidateForSchool('menu', schoolId);
}

// ── Recipes ───────────────────────────────────────────────────────────────
export async function getCachedRecipes<T>(
  schoolId: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 21600
): Promise<T> {
  const key = `recipes:${schoolId}`;
  const cached = getFromCache<T>(key);
  if (cached !== null) return cached;
  const fresh = await fetcher();
  setInCache(key, fresh, ttlSeconds);
  return fresh;
}

export async function invalidateRecipesCache(schoolId?: string): Promise<void> {
  if (!schoolId) {
    console.warn('[cache] invalidateRecipesCache sin schoolId — limpiando TODO (legado)');
    clearByPattern('recipes');
    return;
  }
  invalidateForSchool('recipes', schoolId);
}

// ── Categories ────────────────────────────────────────────────────────────
export async function getCachedCategories<T>(
  schoolId: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 21600
): Promise<T> {
  const key = `categories:${schoolId}`;
  const cached = getFromCache<T>(key);
  if (cached !== null) return cached;
  const fresh = await fetcher();
  setInCache(key, fresh, ttlSeconds);
  return fresh;
}

export async function invalidateCategoriesCache(schoolId?: string): Promise<void> {
  if (!schoolId) {
    console.warn('[cache] invalidateCategoriesCache sin schoolId — limpiando TODO (legado)');
    clearByPattern('categories');
    return;
  }
  invalidateForSchool('categories', schoolId);
}

// ── Category Rules (GLOBAL — sin schoolId) ───────────────────────────────
export async function getCachedCategoryRules<T>(
  fetcher: () => Promise<T>,
  ttlSeconds: number = 21600
): Promise<T> {
  const key = 'category-rules:global';
  const cached = getFromCache<T>(key);
  if (cached !== null) return cached;
  const fresh = await fetcher();
  setInCache(key, fresh, ttlSeconds);
  return fresh;
}

export async function invalidateCategoryRulesCache(): Promise<void> {
  deleteFromCache('category-rules:global');
}
