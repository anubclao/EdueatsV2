Documento de arquitectura y contratos para integrar un asistente basado en conocimiento en CUALQUIER proyecto web o app, sin importar stack, lenguaje o infraestructura.
🎯 Propósito y Alcance
Esta especificación define una skill modular de chatbot que:
✅ Responde exclusivamente con la base de conocimiento del proyecto.
✅ Es agnóstica: funciona con React, Vue, Svelte, Vanilla JS, Flutter, Swift, Kotlin, Laravel, Django, Spring, Go, Rust, .NET, etc.
✅ Usa contratos estandarizados (HTTP/JSON, env vars, schemas) para garantizar interoperabilidad.
✅ Permite reemplazar cualquier componente (LLM, Vector DB, Embeddings, UI) sin romper la integración.
✅ Incluye guías de despliegue, seguridad, testing y mantenimiento listas para producción.
📐 Arquitectura Contract-First
123
Principios de diseño:
Stateless API: El backend no guarda estado de conversación por defecto (usa session_id opcional).
Pluggable Components: Cada bloque intercambia datos mediante contratos abiertos.
Configuration over Code: Comportamiento definido por variables de entorno/archivos de config.
Fail-safe: Fallbacks automáticos ante fallos de LLM, DB o red.
🔌 Contratos Universales (API)
📥 POST /chat
Headers: Content-Type: application/json, Authorization: Bearer <token> (opcional)
Request Schema:
json
12345678910
Response Schema:
json
12345678910111213
📥 POST /knowledge/sync
Request Schema:
json
1234567
Response: { "status": "success", "indexed_chunks": 0, "collection_version": "string" }
📌 Nota: Todos los endpoints deben devolver 400 para payloads inválidos, 429 para rate limit, 503 si el motor LLM/DB no responde.
⚙️ Matriz de Configuración
Clave
Tipo
Valor por defecto
Descripción
CHATBOT_LLM_ENDPOINT
URL
https://api.openai.com/v1
Endpoint compatible con OpenAI Chat API
CHATBOT_LLM_MODEL
string
gpt-4o-mini
Modelo a usar
CHATBOT_API_KEY
string
-
Clave de autenticación del proveedor
CHATBOT_EMBEDDING_MODEL
string
text-embedding-3-small
Modelo para generar vectores
CHATBOT_VECTOR_DB
string
chroma
chroma, qdrant, pinecone, pgvector, memory
CHATBOT_RETRIEVAL_K
int
3
Fragmentos recuperados por consulta
CHATBOT_SIMILARITY_THRESHOLD
float
0.65
Umbral mínimo de relevancia (cosine)
CHATBOT_SYSTEM_PROMPT
string
-
Instrucciones base del asistente
CHATBOT_FALLBACK_MSG
string
No encontré información actualizada sobre esto. ¿Puedo ayudarte con otra consulta?
Respuesta cuando no hay contexto suficiente
CHATBOT_CACHE_TTL
int
900
Segundos de caché para respuestas frecuentes
CHATBOT_RATE_LIMIT
string
10/minute
Límite por IP/session
💡 Convención: Prefijo CHATBOT_ garantiza aislamiento de configs en entornos compartidos.
🔄 Flujo de Integración (Agnóstico)
Capa
Acción Requerida
Punto de Validación
Frontend
Widget/Componente captura input → envía a /chat → renderiza answer + sources → maneja estados loading, error, fallback
Schema de respuesta válido, UI no bloquea, accesibilidad WCAG 2.1
Backend
Valida payload → genera embedding → consulta Vector DB → ensambla prompt → llama LLM → parsea respuesta → retorna JSON
Latencia p95 < 1.5s, manejo de timeouts, logs estructurados
Retrieval
Configura chunking, embeddings, filtros por metadatos, threshold de similitud
Precision/Recall > 0.8 en dataset de prueba
Knowledge
Ingesta → limpieza → división → indexación → versionado
Hash de documentos, rollback automático en fallo
📚 Pipeline de Base de Conocimiento
Recolección: PDF, Markdown, TXT, CSV, HTML, DOCX, JSON, DB dumps.
Limpieza: Eliminar headers/footers, normalizar saltos de línea, quitar PII.
Chunking:
Size: 300–800 tokens
Overlap: 10–20%
Strategy: por sección, semántico, o ventana deslizante según formato.
Embedding: Modelo uniforme para toda la colección.
Indexación: Store vectorial con metadatos (source, version, locale, tags).
Validación: Ejecutar 20–50 preguntas reales → medir faithfulness, context precision, hallucination rate.
Versionado: collection_v1, collection_v2... con alias latest.
🔄 Actualización automática: Trigger en CI/CD al modificar /docs/ o main branch.
🛡️ Checklist de Seguridad y Cumplimiento
Input validation: max length, encoding UTF-8, regex para prompt injection (<|, </|, SYSTEM:, IGNORE PREVIOUS)
CORS restrictivo en producción
API Keys rotadas cada 90 días
No almacenar PII en logs ni vectores
Rate limiting por IP + session + endpoint
Audit log: request_id, timestamp, query_hash, sources, confidence, user_agent
Consentimiento explícito si se guarda historial
Cumplimiento: GDPR, LOPD, CCPA, ISO 27001 (según jurisdicción)
Fallback a FAQ estático si LLM/DB cae > 30s
🧪 Framework de Pruebas
Tipo
Herramienta/Enfoque
Criterio de Éxito
Contract Testing
JSON Schema Validator
100% compliance en request/response
Load Testing
k6, Locust, Artillery
<2s p95, 0% error en 100 RPS
RAG Evaluation
Ragas, DeepEval, LangSmith
Faithfulness ≥ 0.85, Context Recall ≥ 0.8
Security
OWASP ZAP, Prompt Injection Scanners
0 críticas, 0 high
UX
Hotjar, Playwright, Cypress
Thumbs up > 70%, fallback < 15%
A/B Testing
Split.io, Optimizely, custom
Mejora métrica objetivo ≥ 5%
🌍 Patrones de Despliegue
Escenario
Recomendación
Dev/Local
memory vector DB + modelo open-source local + endpoint /chat mockeable
Staging
Qdrant/Chroma + modelo cloud económico + cache Redis + logs verbose
Production
Servicio gestionado (Pinecone/Weaviate) + LLM premium + CDN + fallback chain + monitoreo APM
Edge
Cloudflare Workers / Vercel Edge + embeddings cache + respuestas pre-generadas para FAQs
Air-Gapped
Ollama/vLLM + pgvector on-prem + sync manual vía USB/SCADA
📦 Fallback Chain recomendado: Cloud LLM → Local LLM → Cache → FAQ Estático → Error Controlado
🔁 Guía de Adaptación a Cualquier Stack
Tu Stack
Qué implementar
Dónde colocar la lógica
Frontend JS/TS
Widget fetch + UI states
useChatbot() hook / componente aislado
React/Vue/Svelte
Componente + provider de config
ChatProvider, useRAGQuery
Mobile (Flutter/Swift/Kotlin)
HTTP client + renderer nativo
Servicio de red + UI state manager
Backend (Node/Python/Go/Java/PHP/Rust/C#)
Router /chat + orchestrator
Capa de servicio, sin lógica de UI
Serverless
Función stateless + env vars
AWS Lambda, Vercel, Cloudflare Workers
Monolito
Módulo interno + config env
Ruta /api/chatbot, separado de core
Microservicios
Servicio dedicado + gRPC/REST
Puerto 8080, healthcheck /ping
✅ Regla de oro: La skill nunca debe tocar la DB principal del proyecto. Solo lee vectores y llama al LLM.
📦 Checklist de Despliegue Rápido
Variables de entorno configuradas
Base vectorial inicializada con conocimiento actual
Endpoint /chat responde con schema válido
Widget embebido y probado en 3 navegadores/dispositivos
Rate limiting activo
Logs estructurados habilitados
Fallback message configurado
Métricas de confianza y fuentes visibles (dev/staging)
Documentación de API publicada (OpenAPI/Swagger)
Pipeline de ingestión en CI/CD configurado
📝 Mantenimiento y Versionado
Contratos: Versionado semántico (v1, v2). Breaking changes → nueva ruta /v2/chat.
Conocimiento: Snapshot mensual + diff automático. Rollback mediante alias de colección.
Prompts: Almacenados en config/version control. Nunca hardcodeados.
Modelos: A/B testing por model_used en meta. Migración gradual con canary.
Deprecación: Avisar 90 días antes de eliminar endpoints o cambiar schemas.
📄 Licencia y Uso
Esta especificación es libre, agnóstica y de uso comercial/abierto.
Se recomienda:
Fork y adaptar a tu stack sin restricciones.
Mantener contratos estables para evitar breaking changes.
Documentar cambios en CHANGELOG.md.
Compartir mejoras con la comunidad (MIT, Apache 2.0 o equivalente).
