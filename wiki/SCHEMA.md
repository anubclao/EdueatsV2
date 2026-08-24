# EduEats V2 — Project Schema (orient)

> Single source of truth for stack conventions, layering and security baseline.
> Code mirrors this wiki — if they diverge, the wiki wins on intent, the code wins on behavior.

## Stack

| Capa | Tecnología |
|---|---|
| Monorepo | npm workspaces (root, sin Turbo/Nx) |
| API | Express 4.21 + TypeScript 5.7 + mysql2/promise + helmet + express-rate-limit + express-session + multer 2.1 + zod 3.24 + socket.io 4.7 |
| Realtime | socket.io 4.7 sobre mismo HTTP server, autenticado por cookie |
| DB | MySQL/MariaDB. Schema en `database/schema.sql`, migraciones en `edueats-v2/scripts/migrations/*.sql` |
| Front | Vite 6 + React 19 + react-router-dom 7 + Tailwind 3.4 + socket.io-client + exceljs |
| Shared | `packages/shared` (tipos compartidos entre api/web) |
| Deploy | Hostinger hPanel — guía en `HOSTINGER.md`. Backend = Node, frontend se copia a `apps/api/dist/web/` vía `scripts/sync-web-dist.mjs` |

## Layout del repo

```
EduEats V2/                    ← repo root (donde corre git)
├── .env.example               ← plantilla ÚNICA de env (consolidada)
├── .gitignore                 ← ignora node_modules, backups, EduEats - copia/, *.rar
├── HOSTINGER.md               ← guía deploy
├── README.md
├── database/                  ← schema.sql + scripts de bootstrap
├── images/                    ← imágenes de recetas en producción (TRACKEADAS en git)
├── backups/                   ← dumps manuales (ignorado)
├── EduEats - copia/           ← copia vieja de seguridad (ignorado)
├── Skills/                    ← documentación técnica legacy
└── edueats-v2/                ← monorepo npm workspaces
    ├── apps/api/              ← backend Express
    ├── apps/web/              ← frontend Vite+React
    ├── packages/shared/       ← tipos compartidos
    ├── scripts/migrations/    ← SQL idempotente (001_multi_tenant etc)
    └── package.json           ← root con workspaces
```

## Layering (backend)

```
src/
├── server.ts                  ← bootstrap (HTTP, graceful shutdown)
├── app.ts                     ← express app, middleware global, route mounting
├── db/pool.ts                 ← mysql2 pool, soporta DATABASE_URL
├── middleware/
│   ├── auth.ts                ← HMAC-SHA256 cookie auth, requireAuth, requireRoles
│   ├── sessions.ts            ← express-session config (MemoryStore)
│   ├── error.ts               ← errorHandler + asyncHandler (sanitiza mensajes)
│   └── in-memory-rate-limit-store.ts ← store para express-rate-limit
├── routes/                    ← una Router por recurso
├── services/
│   ├── cache-helpers.ts       ← in-memory cache con TTL por recurso
│   ├── email.ts               ← nodemailer wrapper
│   ├── queue.ts               ← cola en memoria (DEPRECATED — solo no-op)
│   ├── websocket.ts           ← Socket.IO server con auth por cookie
│   ├── tenant.ts              ← helpers multi-tenant (scopedWhere, getSchoolId)
│   ├── timezone.ts            ← utilidades hora Bogotá (UTC-5)
│   └── email-queue-worker.ts  ← DEPRECATED (exit 0)
└── (packages/shared)
```

## Convenciones

### Naming
- Archivos TS: kebab-case (`cache-helpers.ts`, `in-memory-rate-limit-store.ts`)
- Express routers: `xxxRouter` exportado como named export
- DB columns: snake_case. JS fields: camelCase. Map con `as` en SELECT.

### Secrets (NO commitear)
- `.env.example` vive en root y se copia a `edueats-v2/.env` para uso real
- Variables críticas: `SESSION_SECRET`, `DB_PASS`, `EMAIL_PASS`, `CHATBOT_API_KEY`
- Generar `SESSION_SECRET`: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`

### Multi-tenant
- Toda tabla tenant-scoped tiene `school_id VARCHAR(64) NOT NULL`
- Helper `getSchoolId(req)` lee de `req.schoolId` (poblado por `requireAuth`)
- Reglas:
  - Nunca confiar en `schoolId` enviado por cliente
  - Queries tenant-scoped DEBEN incluir `WHERE school_id = ?`
  - Helpers: `scopedWhere(table, existingWhere)` y `andScoped(table)`

### Cache (in-memory)
- ⚠️ **TODO CACHE NUEVO debe incluir `schoolId` en su key** (ver issues de audit)
- TTL default: 6h para datos estáticos, 1h para menús
- `invalidateXCache()` debe borrar solo el scope del tenant actual

### Auth
- Sesiones server-side en tabla `auth_sessions` con `token_hash` HMAC-SHA256(SESSION_SECRET)
- Cookie: `__Host-edueats_session` en prod, `edueats_session` en dev
- Atributos: `httpOnly=true, secure=isProduction, sameSite='strict' (prod) | 'lax' (dev), path=/`
- Login flow: OTP por correo (5-10min TTL, 3 intentos/hora por email)
- Roles: `admin`, `staff`, `teacher`, `student`, `visitor` (catálogo en tabla `roles`)

### Rate limiting
- Global: 200 req/min por IP en `/api/*`
- Auth: 10 req/15min por IP en `/api/users/{register,verify,resend-verification}` y `/api/auth/{start,verify-otp}`
- OTP adicional: 3 códigos/hora por email (custom, en auth.ts)

### CSP (Helmet)
- `defaultSrc 'self'`, `objectSrc 'none'`, `frameSrc 'none'`
- ⚠️ `imgSrc 'self' data: https:` (ver audit — `https:` debería ser whitelist)

## Naming commits
```
feat: nueva funcionalidad
fix: corrección de bug
chore: tareas menores
docs: solo documentación
refactor: cambio sin cambio de comportamiento
security: fix de vulnerabilidad
ci: cambios en CI/CD
```

## Estado del repo
- **Branch:** `main` (sincronizado con origin)
- **Remoto:** `https://github.com/anubclao/EdueatsV2.git`
- **Working tree:** clean al momento del audit
- **Imágenes de recetas:** TRACKEADAS en git (carpeta `images/`)
- **Tests:** ❌ ninguno configurado (TODO: agregar Vitest)

---

## ⚠️ Troubleshooting post-deploy

### Imágenes devuelven 404 tras redeploy

**Síntoma:** DevTools muestra `Failed to load /images/general/<uuid>.png: 404`.
Las recetas cargan en la BD con `image_url` poblado, pero las imágenes no aparecen.

**Causa:** el server.js vive en `hbuilds/versions/<hash>/nodejs/apps/api/dist/`, separado
del storage persistente donde están las imágenes. El walk-up relativo que funciona
en dev (`__dirname/../../../../images`) no resuelve en producción porque el `images/`
no está en el árbol del build.

**Fix:**
1. Definir env var `IMAGES_PATH=/home/u.../domains/<tu-dominio>/public_html/images`
2. Reiniciar el proceso Node
3. El log al arrancar debe mostrar `[startup] Sirviendo imágenes desde: <ruta>`

**Por qué pasa:** cada deploy de Hostinger genera un nuevo hash de versión y un
nuevo directorio. El código se redeploya pero los archivos subidos (imágenes)
siguen en el storage persistente. Sin la env var, el server busca en el lugar
equivocado.

**Lección operativa:** la primera acción tras un redeploy que rompa imágenes es
verificar el log de arranque y confirmar que el path resuelto por `IMAGES_PATH`
(o el fallback de walk-up) realmente apunta al directorio con las imágenes.
Para que el próximo deploy sea smooth, agregar `IMAGES_PATH` al template de
variables de entorno del proyecto en Hostinger.

### Backend muere al arrancar con `SESSION_SECRET es obligatorio`

**Síntoma:** log muestra
```
Error: [Sessions] SESSION_SECRET es obligatorio en producción.
  at resolveSessionSecret (.../middleware/sessions.js:17:19)
```

**Causa:** `NODE_ENV=production` + `.env` sin `SESSION_SECRET` real (o con placeholder
`cambia-esto-en-produccion`). El guard fail-closed rechaza arrancar.

**Fix:**
1. Generar secret: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
2. Pegar en hPanel → Variables de entorno
3. Reiniciar proceso Node

**Por qué es importante:** fallar abierto en prod con un secret público
significaría que cualquiera puede firmar cookies de admin. Por eso el guard es estricto.

**Lección operativa:** cualquier redeploy que toque el código de auth DEBE
venir acompañado de verificación del `.env` en producción. Agregar a un
runbook futuro si se automatiza el deploy.
