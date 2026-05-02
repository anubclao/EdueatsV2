# EduEats

## Ejecutar localmente

**Requisitos previos:** Node.js

1. Instalar dependencias:
   `npm install`
2. Configurar las variables de entorno (ver [.env.example](.env.example))
   Si el backend vive en otro dominio, ajustar el meta `edueats-api-base` en [index.html](index.html).
3. Ejecutar la app:
   `npm run dev`

## Deploy En Mismo Subdominio

1. Construir frontend en la raiz:
   `npm run build`
2. Subir backend (`server/`) al hosting Node y ejecutar `npm install` dentro de esa carpeta.
3. Configurar variables de entorno del backend (DB_HOST, DB_USER, DB_PASS, DB_NAME, CORS_ORIGIN, etc.).
4. Iniciar Node con `npm start` dentro de `server/`.
5. Verificar rutas:
   `/api/health` (API) y `/login` (frontend SPA servido por Express).
