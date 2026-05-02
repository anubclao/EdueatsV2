# EduEats

## Skills Integradas

El proyecto ahora incorpora oficialmente estas skills en la carpeta `Skills/`:

1. `memory-tester.skill`: validacion y auditoria del sistema de memoria.
2. `skill_seguridad_web.md`: lineamientos de seguridad web para cabeceras, hardening y practicas de proteccion.

Adicionalmente, se mantiene la especificacion de chatbot en `Skills/chatbot-skill-spec.md` como base de contratos para el asistente.

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

## Chatbot Adicional

Se agrego un asistente adicional para usuarios admin y estudiante:

1. Frontend: ruta `/admin/assistant` y `/student/assistant`.
2. Backend: endpoint `POST /api/chatbot`.
3. Fallback automatico cuando no hay proveedor LLM configurado.

Variables de entorno disponibles para el chatbot:

- `CHATBOT_LLM_ENDPOINT`
- `CHATBOT_LLM_MODEL`
- `CHATBOT_API_KEY`
- `CHATBOT_SYSTEM_PROMPT`
- `CHATBOT_FALLBACK_MSG`
- `CHATBOT_RATE_LIMIT_PER_MINUTE`
