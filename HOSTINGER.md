# Deploy a Hostinger Premium (Node.js + MySQL)

Guía paso a paso para desplegar EduEats v2 en un hosting Hostinger Premium con Node.js app + MySQL.

## Antes de empezar

- Acceso al panel de Hostinger (hPanel)
- Dominio apuntando al hosting (ej. `edueats.tecnowebsupportia.com`)
- Git repo público o acceso SSH (para el auto-deploy de Hostinger)
- Node.js 20+ disponible en el plan (Hostinger Premium lo incluye)

## Paso 0 — Crear la base de datos

En hPanel → **Bases de datos → MySQL**:

1. Crear base de datos con el nombre exacto `u652436213_Edueat` (lo ves en el panel, tiene prefijo del usuario).
2. Crear usuario MySQL dedicado, ej. `u652436213_EdueatApp`, con contraseña fuerte.
3. Asignar todos los privilegios al usuario sobre esa base de datos.
4. Anotar:
   - DB host = `localhost` (NO `127.0.0.1` — el driver mysql2 a veces resuelve IPv6 con `localhost` y falla)
   - DB name = `u652436213_Edueat`
   - DB user = `u652436213_EdueatApp`
   - DB pass = la que generaste

## Paso 1 — Crear la app Node.js en hPanel

En hPanel → **Avanzado → Node.js**:

1. Click en **Crear aplicación**.
2. Configurar:
   - **Versión de Node.js**: 20.x o superior
   - **Modo de inicio**: `Production`
   - **Directorio de la app**: `edueats-v2` (donde está `package.json` raíz del monorepo)
   - **Entry point / archivo de inicio**: `apps/api/dist/server.js`
3. **Guardar y reimplementar** (no solo Guardar — ver nota abajo).

> **⚠️ NOTA IMPORTANTE — Reimplementar, no solo Restart**
>
> En Hostinger, cambiar variables de entorno y solo dar "Guardar" o "Restart App" NO recarga los nuevos valores en el proceso que ya está corriendo. Hay dos formas de aplicar cambios:
>
> - Botón **"Guardar y reimplementar"** (morado) en la pantalla de la app Node.js
> - O ir a la pestaña **Despliegues** y click **"Redesplegar"**
>
> Si ves errores viejos en runtime logs después de cambiar env vars, casi siempre es esto.

## Paso 2 — Subir el código

Opción A — **Git auto-deploy** (recomendado):

1. En hPanel → **Git** dentro de la app Node.js.
2. Conectar el repo `https://github.com/anubclao/EdueatsV2.git`, rama `main`.
3. Cada push a main disparará el deploy.
4. Asegúrate de que el script de build corra (ver Paso 3).

Opción B — **Upload manual** (zip):

1. En tu máquina local, hacer `npm run build` en `edueats-v2/` (esto produce `apps/api/dist/server.js` y `apps/api/dist/web/`).
2. Comprimir `edueats-v2/` en un zip (sin `node_modules`).
3. Subir vía **File manager** o **SSH** y descomprimir en el directorio de la app.

## Paso 3 — Build en el servidor

Hostinger ejecuta `npm install` y necesita construir el proyecto. En hPanel → Node.js → **Scripts de inicio** o **Comandos de build**:

```
npm install --include=dev
npm run build
```

(El flag `--include=dev` es necesario porque `tsc` está en devDependencies).

**Si prefieres pre-construir localmente y subir el dist** (más rápido, recomendado en producción):

1. Local: `cd edueats-v2 && npm ci && npm run build`.
2. Subir solo `edueats-v2/` sin `node_modules`.
3. En el servidor: `cd edueats-v2 && npm ci --omit=dev`.
4. El entry point `apps/api/dist/server.js` ya está listo.

## Paso 4 — Variables de entorno

En hPanel → **Avanzado → Node.js** → tu app → **Variables de entorno**, definir:

```bash
# Base de datos (de Paso 0)
DB_HOST=localhost
DB_PORT=3306
DB_USER=u652436213_EdueatApp
DB_PASS=TU_PASSWORD_MYSQL
DB_NAME=u652436213_Edueat
DB_POOL_CONNECTION_LIMIT=30
DB_POOL_QUEUE_LIMIT=0
DB_REQUIRED_ON_BOOT=false

# Servidor
NODE_ENV=production
PORT=3001
WEB_DIST_PATH=apps/api/dist/web

# CORS — tu dominio real
CORS_ORIGIN=https://edueats.tecnowebsupportia.com

# Sesiones — OBLIGATORIO en producción
# Generar con: node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
SESSION_SECRET=<pegar-aqui-el-valor-generado>

# Email (Gmail con contraseña de aplicación)
EMAIL_USER=tecnowebiacol@gmail.com
EMAIL_PASS=<contraseña-de-16-chars-de-Google>

# Chatbot (si usas)
CHATBOT_API_KEY=<tu-groq-api-key>
```

**Después de cambiar las env vars: "Guardar y reimplementar"** (ver Paso 1, la nota).

## Paso 5 — Migración de base de datos

Antes de que el API pueda arrancar, hay que crear las tablas. Dos opciones:

### Opción A — Desde cero (recomendado si es deployment nuevo)

1. En hPanel → **Bases de datos → phpMyAdmin**.
2. Seleccionar la base `u652436213_Edueat` en el panel izquierdo.
3. Pestaña **Importar** → seleccionar `database/schema.sql` (incluido en el repo) → **Continuar**.
4. Verificar: debe crear las tablas `roles`, `users`, `categories`, `recipes`, `daily_menu_*`, `orders`, `order_items`, `notifications`, `surveys`, `variables`, `reports`, `preferences`, etc.
5. Si también quieres las categorías base sembradas: importar `database/insert-categories.sql` después.

### Opción B — Migración multi-tenant sobre DB existente

Si ya tenías la DB de v1 sin multi-tenant, ejecutar en phpMyAdmin (pestaña SQL):

```sql
-- Copiar y pegar el contenido de edueats-v2/scripts/migrations/001_multi_tenant.sql
-- Es idempotente: detecta si las columnas ya existen y no duplica.
```

Esto crea la tabla `schools`, agrega `school_id` a 16 tablas tenant-scoped, y siembra un colegio `default` que absorbe los datos existentes (backwards-compatible).

## Paso 6 — Crear el colegio inicial (multi-tenant)

Una vez el API esté corriendo:

```bash
# Verificar que el API responde
curl https://edueats.tecnowebsupportia.com/api/health/live
# → {"status":"ok","service":"api","uptimeSec":...}

# Verificar conexión a DB
curl https://edueats.tecnowebsupportia.com/api/health/ready
# → {"status":"ready","db":"mysql",...} (debe ser "ready", no "not_ready")
```

Crear tu primer colegio (solo si no ejecutaste la migración 001_multi_tenant.sql; si lo hiciste, el colegio `default` ya existe):

```bash
curl -X POST https://edueats.tecnowebsupportia.com/api/schools \
  -H "Content-Type: application/json" \
  -d '{"id":"default","name":"Mi Colegio","slug":"mi-colegio"}'
# → {"success":true,"id":"default"}
```

El endpoint siembra categorías base (starter, soup, main, vegetarian, dessert, snack, general) y la variable global `schoolName`.

## Paso 7 — Verificación end-to-end

1. Abrir `https://edueats.tecnowebsupportia.com` → debe cargar el frontend React.
2. Probar login con OTP → revisar que llega el email (verificar que EMAIL_USER/EMAIL_PASS están bien y que Gmail no está bloqueando la app password).
3. Crear un usuario admin desde phpMyAdmin o desde el endpoint (si lo agregas).
4. Probar crear un pedido, una receta, un menú.
5. WebSocket: abrir DevTools → Network → WS, debe haber conexión `/socket.io/`.

## Troubleshooting

### "Error interno del servidor" en login o pantallas
- Revisar runtime logs en hPanel → Node.js → tu app → **Logs**.
- Si ves `Unknown column 'school_id'` → no corriste la migración 001_multi_tenant.sql.
- Si ves `Authentication failed for user 'X'` → la contraseña del .env no coincide con la del usuario MySQL. Volvé a setear y "Guardar y reimplementar".

### El frontend no carga (404 en assets)
- `WEB_DIST_PATH=apps/api/dist/web` debe estar exactamente así.
- Verificar que `npm run build` corrió y que `apps/api/dist/web/index.html` existe.

### Sesión no persiste
- La cookie usa `__Host-` prefix en producción, lo que requiere HTTPS. Hostinger lo da por defecto, pero si estás en un subdominio sin cert, hay que forzar HTTPS en hPanel.

### CORS errors
- `CORS_ORIGIN` debe ser el dominio EXACTO del frontend (con `https://` y sin trailing slash).
- Si tienes varios subdominios, separarlos con coma: `https://a.com,https://b.com`.

### Variables de entorno no se actualizan
- Ver nota del Paso 1. **"Guardar y reimplementar"** es el botón correcto, no "Guardar" ni "Restart App".

## Estructura final en el servidor

```
~/domains/edueats.tecnowebsupportia.com/   ← document root (sirve el frontend estático)
~/nodejs/edueats-v2/                        ← app Node.js (lo que importa el hPanel)
  ├── apps/
  │   ├── api/dist/                         ← código compilado del backend
  │   │   ├── server.js                     ← entrypoint
  │   │   ├── web/                          ← frontend bundle (servido por el API)
  │   │   └── ...
  │   └── web/dist/                         ← build original (puede ignorarse)
  ├── packages/shared/dist/
  ├── .env                                  ← variables de entorno (NO commitear)
  └── package.json
```

El API Express sirve tanto `/api/*` como el frontend estático desde `apps/api/dist/web/`, así que **no se necesita configurar el document root del dominio** — el Node.js app maneja todo en su puerto.
