# EduEats v2

Sistema de gestión de almuerzos escolares: backend API + frontend React + multi-tenant por colegio.

## Estructura del repositorio

```
.
├── .env.example                # Plantilla única de variables de entorno
├── .github/workflows/          # CI (build + typecheck)
├── database/                   # Scripts SQL de bootstrap (schema inicial)
├── images/                     # Imágenes servidas por el API
├── Skills/                     # Skills y guías del proyecto (markdown)
├── HOSTINGER.md                # Guía de deploy específica a Hostinger
├── README.md                   # Este archivo
└── edueats-v2/                 # Monorepo de la aplicación
    ├── apps/
    │   ├── api/                # Backend Express + TypeScript + MySQL
    │   └── web/                # Frontend React + Vite + Tailwind
    ├── packages/
    │   └── shared/             # Tipos compartidos api ↔ web
    └── scripts/
        ├── migrations/         # Migraciones SQL idempotentes
        └── sync-web-dist.mjs   # Copia el build de web al dist del API
```

## Stack

- **Backend**: Node.js 20+, Express 4, TypeScript 5.7 (ESM, NodeNext), MySQL 8 / MariaDB 10.6+
- **Frontend**: React 19, Vite 6, TypeScript 5.7, Tailwind 3, PWA
- **Auth**: OTP por correo + sesión cookie (HMAC-SHA256), multi-tenant por `school_id`
- **Real-time**: WebSocket (socket.io) con auth por cookie
- **Sin dependencias externas runtime** (no Redis, no Docker, sin Bull queue) — todo corre en proceso y memoria

## Ejecutar localmente

**Requisitos**: Node.js 20+, MySQL local con la BD `edueat` creada (`database/schema.sql`).

1. Instalar dependencias (raíz del monorepo):
   ```bash
   cd edueats-v2
   npm install
   ```
2. Configurar variables de entorno:
   ```bash
   cp ../.env.example .env
   # editar .env con tus valores (DB_PASS, EMAIL_*, etc.)
   ```
3. Sembrar la base de datos (solo la primera vez):
   ```bash
   mysql -u root -p < ../database/schema.sql
   ```
4. Levantar API y frontend en paralelo:
   ```bash
   npm run dev:api   # http://localhost:3001
   npm run dev:web   # http://localhost:5173
   ```

El frontend en dev hace proxy de `/api` al backend en `:3001`.

## Build de producción

```bash
cd edueats-v2
npm run build
```

Esto produce:
- `apps/api/dist/server.js` y sus rutas/middleware (entrypoint)
- `apps/web/dist/` (frontend)
- `apps/api/dist/web/` (frontend copiado para que el API lo sirva)

Para arrancar el servidor compilado:
```bash
cd edueats-v2
npm start
```

## Deploy

**Hostinger Premium (Node.js + MySQL)**: ver [`HOSTINGER.md`](./HOSTINGER.md) — pasos detallados, variables de entorno, migración multitenant y troubleshooting.

## API

Todos los endpoints (excepto `/api/health/live` y `/api/auth/start`) requieren sesión activa.

| Recurso | Endpoints |
|---|---|
| Auth | `POST /api/auth/start`, `POST /api/auth/verify-otp`, `GET /api/auth/me`, `POST /api/auth/logout` |
| Users | `GET/POST/PUT/DELETE /api/users`, `POST /api/users/register`, `POST /api/users/verify`, `POST /api/users/resend-verification` |
| Schools (multi-tenant) | `GET/POST/PUT /api/schools`, `GET /api/schools/:id` |
| Roles | `GET/POST/PUT/DELETE /api/roles` |
| Categories | `GET/POST/PUT/DELETE /api/categories` (con `category-rules`) |
| Recipes | `GET/POST/PUT/DELETE /api/recipes` |
| Menus | `GET /api/menus`, `GET /api/menus/:date`, `POST/DELETE /api/menus/:date` (admin) |
| Orders | `GET /api/orders`, `GET /api/orders/count-by-date/:date`, `POST /api/orders`, `POST /api/orders/batch` (admin), `DELETE /api/orders/:id` (admin) |
| Preferences | `GET/POST/DELETE /api/preferences` |
| Surveys | `GET/POST/PUT/DELETE /api/surveys`, `POST /api/surveys/results` |
| Notifications | `GET/POST/DELETE /api/notifications` |
| Variables | `GET/POST/PUT/DELETE /api/variables` |
| Reports | `GET/POST/DELETE /api/reports` |
| Chatbot | `POST /api/chatbot` |
| Health | `GET /api/health/live`, `GET /api/health/ready` |

Todos los endpoints de datos están scopeados por `req.schoolId` (aislamiento multi-tenant).

## Multi-tenant

Cada colegio tiene un `id` único. Las tablas tenant-scoped tienen columna `school_id` con FK a `schools(id)`. El helper `getSchoolId(req)` en `apps/api/src/services/tenant.ts` garantiza que toda query filtre por el colegio del usuario autenticado.

**Migración inicial** (producción): ejecutar `edueats-v2/scripts/migrations/001_multi_tenant.sql` una sola vez. Es idempotente y backwards-compatible (crea un colegio `default` que absorbe los datos existentes).

## Chatbot (opcional)

Asistente IA para admin y estudiante. Sin `CHATBOT_API_KEY` configurado, el endpoint responde con un fallback genérico.

- Frontend: rutas `/admin/assistant` y `/student/assistant` (en construcción bajo `apps/web/src/pages/`)
- Backend: `POST /api/chatbot` (con rate-limit de `CHATBOT_RATE_LIMIT_PER_MINUTE`)

## Skills (documentación interna)

La carpeta `Skills/` contiene guías y especificaciones del proyecto:

- `chatbot-skill-spec.md` — contrato del asistente
- `skill_seguridad_web.md` — lineamientos de seguridad web
- `memory-tester.skill` — validación del sistema de memoria
- `fullstack-engineer/` — guías de arquitectura fullstack (referencia)
- `software-architecture/` — patrones de diseño y discovery (referencia)

## CI

Cada push a `main` corre `.github/workflows/deploy.yml` con `npm ci`, `tsc --noEmit` y `vite build` para verificar que el código compila antes de hacer deploy manual a Hostinger.
