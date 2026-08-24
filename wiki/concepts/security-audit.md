# concepts/security-audit.md — Audit EduEats V2

Fecha: 2026-08-23. Metodología: Karpathy orient → code → verify.
Stack: Express 4 + TS + MySQL + React 19/Vite. ~4.2k LOC backend + ~3.5k LOC frontend.

## TL;DR — veredicto

**El proyecto está notablemente mejor protegido de lo esperado para un MVP colombiano.** Auth (HMAC-SHA256 + cookie `__Host-` + httpOnly + sameSite strict), CSP, helmet, rate-limit, validación Zod, SQL parametrizado y manejo de errores sin fugas: todo presente y bien aplicado.

**PERO hay 4 hallazgos críticos/p0 que rompen el modelo multi-tenant** y **1 hallazgo de control de acceso (schoolsRouter sin auth)**. Si el backend está expuesto públicamente (Hostinger) **alguien puede crear colegios en tu BD ahora mismo**.

## 🛑 Vulnerabilidades / bugs críticos (P0)

| # | Sev | Ubicación | Hallazgo | Fix mínimo |
|---|---|---|---|---|
| V1 | 🔴 HIGH | `routes/schools.ts` TODOS los endpoints (GET, POST, PUT) | **Sin auth** — el comentario dice "asumiendo que solo el operador tiene acceso". Si la API está en internet, cualquiera puede listar/crear colegios. | `requireAuth, requireRoles('admin')` en TODAS las rutas |
| V2 | 🔴 HIGH | `services/cache-helpers.ts` + `routes/{recipes,categories,menus,category-rules}.ts` | **Cache key fija** `'recipes:all'`, `'categories:all'`, `'menu:*'`, `'category-rules:all'` → Colegio A lee primero y colegio B recibe sus datos hasta que TTL expira (6h). Data leak multi-tenant. | Incluir `${schoolId}` en cada key + invalidar solo el scope del tenant |
| V3 | 🟠 HIGH | `routes/preferences.ts:34` POST | **IDOR**: no valida que `req.authUser.id === studentId` para estudiantes. Un estudiante puede sobrescribir las preferencias recurrentes de otro. | `if (authUser.role === 'student' && authUser.id !== studentId) return 403` |
| V4 | 🟠 HIGH | `routes/surveys.ts:91` POST `/results` | **IDOR**: un estudiante puede responder encuestas EN NOMBRE DE OTRO (spamming encuestas) — `userId` viene del body sin validar. | Forzar `userId = req.authUser.id` si role es `student` |
| V5 | 🟠 HIGH | `routes/notifications.ts` líneas 21-53 y 69-101 | **Handlers DUPLICADOS** (POST `/` y DELETE `/:id` declarados dos veces). Express ejecuta el primero; el segundo es código muerto. Confuso y propenso a bugs. | Eliminar las copias duplicadas |
| V6 | 🟠 HIGH | `routes/reports.ts` líneas 30-45 y 55-68 (POST); 47-53 y 72-78 (DELETE) | **Handlers DUPLICADOS** (mismo problema que V5) | Eliminar las copias duplicadas |
| V7 | 🟠 HIGH | `npm audit` (14 HIGH CVEs) | Vulnerabilidades en `multer`, `brace-expansion`, `fast-uri`, `ip-address`, `nodemailer`, `postcss`, `socket.io-parser`, `ws`, `vite`, `react-router-dom`, `nanoid`, `tmp`, `@babel/plugin-transform-modules-systemjs` | Agregar `overrides` en root `package.json` |

## 🟡 Vulnerabilidades / bugs P1

| # | Sev | Ubicación | Hallazgo | Fix |
|---|---|---|---|---|
| V8 | 🟡 MED | `app.ts:55` CSP `imgSrc` | `'https:'` permite CUALQUIER imagen de cualquier origen (tracking pixels, exfil) | Cambiar a `'self' data:` o whitelist explícita |
| V9 | 🟡 MED | `app.ts:119-125` CORS con `!origin` | Cualquier petición SIN header Origin (file://, sandboxed iframe, Node fetch) pasa; solo bloqueado en presencia de Origin inválido | Mover check a `requireAuth` en endpoints sensibles, o requerir origin siempre |
| V10 | 🟡 MED | `routes/category-rules.ts:9` | Tabla `category_rules` SIN `school_id` → reglas cross-tenant (no aparece en migración 001_multi_tenant.sql) | Decisión: o se agrega columna o se documenta que es global |
| V11 | 🟡 MED | `routes/users.ts:14-22` `mapUser` | Usa `...u` spread — si la BD añade columnas sensibles (password_hash, secret_token), se filtran automáticamente | Whitelist explícito de columnas seguras |
| V12 | 🟡 MED | `services/email.ts:115` | From-address tomado directo de `EMAIL_USER` env sin sanitizar → si está mal configurado, smtp puede rechazarlo o usarlo para spoof | Validar formato email |

## 🟢 Optimizaciones / deuda técnica (P2-P3)

| # | Sev | Área | Cambio |
|---|---|---|---|
| O1 | P2 | `routes/variables.ts:16` POST | Admin puede crear `isSystem=1` arbitrary (cambiar la lógica del sistema) | Forzar `isSystem=0` en el insert |
| O2 | P2 | `routes/roles.ts:14` POST | Mismo problema con `isSystem=1` | Forzar a 0 en el insert |
| O3 | P2 | `routes/recipes.ts:76` PUT | No valida que la receta exista antes de update — silent fail si el id no existe | SELECT antes, devolver 404 si no |
| O4 | P2 | `routes/recipes.ts:89` DELETE | Mismo problema | Idem |
| O5 | P3 | Backend sin tests | 0 archivos de test en todo el monorepo | Instalar Vitest + 5-10 tests críticos (auth, IDOR, multi-tenant cache) |
| O6 | P3 | `routes/auth.ts:215` | `verification_token` se loggea en consola — PII en logs | Quitar el `console.log` (línea 175 también) |
| O7 | P3 | `services/queue.ts` | Cola en memoria que solo encola y nunca procesa — emails caen al fallback sync (auth.ts línea 240). Funcional pero confuso | Documentar como "intencional: queue es no-op, fallback a sendMail directo" |
| O8 | P3 | `services/email-queue-worker.ts` | Worker DEPRECATED que hace `process.exit(0)` | Eliminar archivo y referencia en scripts |
| O9 | P3 | Frontend | Bundle sin code-splitting (recharts/exceljs en admin cargan en home) | `next/dynamic` no aplica (es Vite) — usar `lazy()` en rutas admin |
| O10 | P3 | `routes/auth.ts:264` | `devOtp` se retorna siempre que `NODE_ENV=development` | OK pero documentar |

## ✅ Cosas bien hechas (no tocar)

- `middleware/auth.ts` — HMAC-SHA256 sobre `SESSION_SECRET` con fallback solo-dev (fail-closed en prod)
- Cookie `__Host-edueats_session` con httpOnly+secure+sameSite=strict en prod
- `error.ts` sanitiza mensajes (no filtra SQL errors al cliente)
- `helmet` con CSP estricta, HSTS, referrer-policy
- SQL parametrizado en TODAS las queries (sin concatenación visible)
- `pool.execute` con `?` placeholders consistentemente
- `orders.ts POST` fuerza `studentId` del `authUser` (no confía en cliente)
- `websocket.ts` autentica por cookie en handshake + autorize join-order
- `users.ts GET /email/:email` valida admin OR self
- `surveys.ts GET /results/check` valida admin OR self
- Validation con zod en routes críticos (auth, chatbot, orders)
- Rate-limit en auth y global (express-rate-limit v8 con store en memoria)
- `__Host-` cookie previene subdomain fixation
- `killServer` paths con validaciones de category id

## Cache multi-tenant — el problema concreto

```typescript
// ANTES (cache-helpers.ts:80)
const cached = getFromCache<T>('recipes:all');  // ⚠️ key fija, todos los colegios comparten
if (cached !== null) return cached;
const fresh = await fetcher();
setInCache('recipes:all', fresh, ttlSeconds);  // ⚠️ mismo problema
```

Si colegio A hace GET `/api/recipes` primero, su lista queda en cache con key `recipes:all`. Cuando colegio B hace el mismo GET en los próximos 6h, recibe los datos de A.

**Fix**: incluir schoolId en key:
```typescript
const key = `recipes:${schoolId}`;
```

Y en invalidadores, usar el mismo scope.

## Sobre las imágenes de recetas (respuesta a la pregunta del usuario)

**Las imágenes SÍ están en git**. `git ls-files images/` muestra:
- `images/general/*.png` (4 archivos reales)
- `images/{starter,soup,main,vegetarian,dessert,snack,ensaladas-y-frutas}/.gitkeep` (placeholders para que git cree las carpetas)

**Si haces `git push origin main`, las imágenes YA se subirán junto con el código.** No se pierden. El push sube:
- commits nuevos con código de los fixes
- archivos tracked nuevos/modificados (código + imágenes si las modificas)

`images/` NO está en `.gitignore`, así que se commitea. Si quieres empezar a excluir imágenes grandes (futuro), agrega `images/**/*.png` a `.gitignore` — pero las que ya están en git siguen ahí para siempre hasta que uses `git rm --cached`.

## ACTION TABLE (orden de remediación)

| Pri | Esfuerzo | Impacto | Acción |
|---|---|---|---|
| 🔥 P0 | 5 min | Crítico | Eliminar duplicados notifications.ts + reports.ts |
| 🔥 P0 | 15 min | Crítico | schoolsRouter → agregar requireAuth admin |
| 🔥 P0 | 30 min | Crítico | Cache multi-tenant: cambiar keys a `recipes:${schoolId}` etc. |
| 🔥 P0 | 15 min | Alto | IDOR preferences + surveys |
| 🔥 P0 | 20 min | Alto | npm overrides para CVEs |
| 🟡 P1 | 10 min | Medio | CSP imgSrc → quitar `https:` |
| 🟡 P1 | 15 min | Medio | mapUser whitelist explícito |
| 🟡 P1 | 5 min | Medio | category-rules agregar school_id (decisión) |
| 🟢 P2 | 5 min | Bajo | variables/roles POST forzar isSystem=0 |
| 🟢 P2 | 10 min | Bajo | recipes PUT/DELETE verificar existencia |
| 🟢 P3 | — | DX | Documentar (sin tocar) lo demás |
