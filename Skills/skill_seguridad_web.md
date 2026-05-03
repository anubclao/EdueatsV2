# 🔒 Skill de Seguridad Web para PWA y Aplicaciones Web

## Versión: 1.0 | Nivel: Profesional | Universal: Cualquier lenguaje/framework

---

## 📋 ÍNDICE
1. [Headers de Seguridad HTTP](#headers-seguridad)
2. [Content Security Policy (CSP)](#csp)
3. [Autenticación y Sesiones](#auth)
4. [Validación de Entradas](#input-validation)
5. [Protección contra Ataques Comunes](#ataques)
6. [Seguridad en PWAs](#pwa-security)
7. [Configuración de Servidor](#server-config)
8. [Certificados SSL/TLS](#ssl)
9. [Auditoría y Testing](#testing)
10. [Checklist de Despliegue](#checklist)

---

## 1. HEADERS DE SEGURIDAD HTTP {#headers-seguridad}

### Headers Esenciales (Implementar TODOS)

```http
# Strict-Transport-Security (HSTS)
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
# Fuerza HTTPS por 1 año, incluye subdominios, elegible para preload list

# X-Content-Type-Options
X-Content-Type-Options: nosniff
# Previene MIME-type sniffing

# X-Frame-Options
X-Frame-Options: DENY
# o SAMEORIGIN si necesitas iframes propios
# Previene clickjacking

# X-XSS-Protection (Legacy, pero útil como respaldo)
X-XSS-Protection: 1; mode=block

# Referrer-Policy
Referrer-Policy: strict-origin-when-cross-origin
# Controla información enviada en referrer

# Permissions-Policy (antes Feature-Policy)
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()
# Deshabilita APIs sensibles no necesarias
```

### Headers Modernos y Avanzados

```http
# Cross-Origin-Embedder-Policy
Cross-Origin-Embedder-Policy: require-corp

# Cross-Origin-Opener-Policy
Cross-Origin-Opener-Policy: same-origin

# Cross-Origin-Resource-Policy
Cross-Origin-Resource-Policy: same-origin

# Origin-Agent-Cluster
Origin-Agent-Cluster: ?1
```

### Implementación por Framework

#### Node.js/Express
```javascript
const helmet = require('helmet');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Ajustar según necesidad
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.tudominio.com"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" }
}));
```

#### Python/Flask
```python
from flask_talisman import Talisman

Talisman(app,
    force_https=True,
    strict_transport_security=True,
    strict_transport_security_max_age=31536000,
    content_security_policy={
        'default-src': "'self'",
        'script-src': "'self'",
        'style-src': ["'self'", "'unsafe-inline'"],
    },
    referrer_policy='strict-origin-when-cross-origin',
    feature_policy={
        'geolocation': "'none'",
        'camera': "'none'",
        'microphone': "'none'"
    }
)
```

#### PHP
```php
// En .htaccess o configuración de servidor
header("Strict-Transport-Security: max-age=31536000; includeSubDomains; preload");
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: DENY");
header("X-XSS-Protection: 1; mode=block");
header("Referrer-Policy: strict-origin-when-cross-origin");
header("Permissions-Policy: camera=(), microphone=(), geolocation=()");
header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'");
```

#### Nginx
```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
add_header X-XSS-Protection "1; mode=block" always;
```

#### Apache
```apache
Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
Header always set X-Frame-Options "DENY"
Header always set X-Content-Type-Options "nosniff"
Header always set Referrer-Policy "strict-origin-when-cross-origin"
Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"
Header always set X-XSS-Protection "1; mode=block"
```

---

## 2. CONTENT SECURITY POLICY (CSP) {#csp}

### CSP Estricta (Recomendada)

```http
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'nonce-{random}' 'strict-dynamic';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self';
  connect-src 'self' https://api.tudominio.com;
  media-src 'self';
  object-src 'none';
  frame-src 'none';
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests;
  block-all-mixed-content;
  report-uri /csp-report;
  report-to csp-endpoint;
```

### Nonce Generation (Anti-XSS)

```javascript
// Node.js
const crypto = require('crypto');
const nonce = crypto.randomBytes(16).toString('base64');
// Insertar en templates: <script nonce="<%= nonce %>">...</script>
```

```python
# Python
import secrets
nonce = secrets.token_urlsafe(16)
# En template Jinja2: <script nonce="{{ nonce }}">...</script>
```

### CSP Report-Only (Modo Testing)

```http
Content-Security-Policy-Report-Only: default-src 'self'; report-uri /csp-report;
```

---

## 3. AUTENTICACIÓN Y SESIONES {#auth}

### JWT Seguro

```javascript
// Node.js - jsonwebtoken con opciones seguras
const jwt = require('jsonwebtoken');

// Generar token
const token = jwt.sign(
  { userId: user.id, role: user.role },
  process.env.JWT_SECRET, // Mínimo 256 bits (32 bytes)
  {
    expiresIn: '15m',           // Access token corto
    issuer: 'tu-app',
    audience: 'tu-api',
    algorithm: 'HS256'           // o RS256 para asimétrico
  }
);

// Refresh token (almacenar en httpOnly cookie)
const refreshToken = jwt.sign(
  { userId: user.id },
  process.env.JWT_REFRESH_SECRET,
  { expiresIn: '7d' }
);

// Cookie segura
res.cookie('refreshToken', refreshToken, {
  httpOnly: true,
  secure: true,           // Solo HTTPS
  sameSite: 'Strict',     // o 'Lax' si necesitas redirecciones
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/api/auth/refresh'
});
```

### Gestión de Sesiones

```javascript
// Node.js con express-session
const session = require('express-session');
const RedisStore = require('connect-redis')(session);

app.use(session({
  store: new RedisStore({ client: redisClient }),
  name: '__Host-sessionId',  // __Host- prefix para cookies seguras
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    httpOnly: true,
    sameSite: 'Strict',
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    domain: undefined  // No especificar para host-only
  }
}));
```

### Regeneración de ID de Sesión

```javascript
// Después de login exitoso
req.session.regenerate((err) => {
  if (err) return next(err);
  req.session.userId = user.id;
  req.session.save((err) => {
    if (err) return next(err);
    res.redirect('/dashboard');
  });
});
```

### Rate Limiting para Auth

```javascript
// Node.js con express-rate-limit
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 intentos
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Demasiados intentos. Intente en 15 minutos.'
    });
  }
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
```

---

## 4. VALIDACIÓN DE ENTRADAS {#input-validation}

### Validación Estricta (Universal)

#### Principios:
- **Whitelist > Blacklist**: Permitir solo lo conocido seguro
- **Validar en servidor**: Nunca confiar solo en cliente
- **Sanitizar salida**: Escapar al renderizar
- **Tipado estricto**: Convertir tipos explícitamente

#### Node.js/Joi
```javascript
const Joi = require('joi');

const userSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required(),
  email: Joi.string()
    .email({ minDomainSegments: 2, tlds: { allow: ['com', 'net', 'org'] } })
    .required(),
  password: Joi.string()
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$'))
    .required()
    .messages({
      'string.pattern.base': 'Password debe tener 12+ chars, mayúscula, minúscula, número y especial'
    }),
  age: Joi.number()
    .integer()
    .min(13)
    .max(120)
    .required(),
  role: Joi.string()
    .valid('user', 'admin', 'moderator')
    .default('user')
});

// Uso
const { error, value } = userSchema.validate(req.body);
if (error) return res.status(400).json({ error: error.details[0].message });
```

#### Python/Pydantic
```python
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Literal
import re

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=30, regex=r'^[a-zA-Z0-9_]+$')
    email: EmailStr
    password: str = Field(..., min_length=12)
    age: int = Field(..., ge=13, le=120)
    role: Literal['user', 'admin', 'moderator'] = 'user'

    @validator('password')
    def validate_password(cls, v):
        if not re.match(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$', v):
            raise ValueError('Password debe tener mayúscula, minúscula, número y especial')
        return v

    @validator('username')
    def validate_username(cls, v):
        if v.lower() in ['admin', 'root', 'system', 'null']:
            raise ValueError('Username reservado')
        return v
```

#### PHP
```php
<?php
function validateInput($data, $rules) {
    $errors = [];
    foreach ($rules as $field => $rule) {
        $value = $data[$field] ?? null;

        if (isset($rule['required']) && $rule['required'] && empty($value)) {
            $errors[$field] = "Campo requerido";
            continue;
        }

        if (isset($rule['type'])) {
            switch($rule['type']) {
                case 'email':
                    if (!filter_var($value, FILTER_VALIDATE_EMAIL)) {
                        $errors[$field] = "Email inválido";
                    }
                    break;
                case 'int':
                    if (!filter_var($value, FILTER_VALIDATE_INT)) {
                        $errors[$field] = "Debe ser entero";
                    }
                    break;
                case 'string':
                    if (!is_string($value)) {
                        $errors[$field] = "Debe ser texto";
                    }
                    break;
            }
        }

        if (isset($rule['pattern']) && !preg_match($rule['pattern'], $value)) {
            $errors[$field] = "Formato inválido";
        }

        if (isset($rule['max']) && strlen($value) > $rule['max']) {
            $errors[$field] = "Máximo {$rule['max']} caracteres";
        }
    }
    return $errors;
}

// Uso
$rules = [
    'username' => ['required' => true, 'type' => 'string', 'max' => 30, 'pattern' => '/^[a-zA-Z0-9_]+$/'],
    'email' => ['required' => true, 'type' => 'email'],
    'age' => ['required' => true, 'type' => 'int']
];
$errors = validateInput($_POST, $rules);
```

### Sanitización de Salida

```javascript
// Node.js - Escapar HTML
const escapeHtml = (unsafe) => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// O usar librerías como DOMPurify (cliente) o sanitize-html (servidor)
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const DOMPurify = createDOMPurify(new JSDOM('').window);
const clean = DOMPurify.sanitize(dirtyHtmlInput);
```

```python
# Python
import bleach
from markupsafe import escape

# Escapar simple
safe_text = escape(user_input)

# Sanitizar HTML permitido
allowed_tags = ['p', 'br', 'strong', 'em', 'u']
allowed_attrs = {}
clean_html = bleach.clean(user_html, tags=allowed_tags, attributes=allowed_attrs, strip=True)
```

---

## 5. PROTECCIÓN CONTRA ATAQUES COMUNES {#ataques}

### SQL Injection (SQLi)

```javascript
// ❌ MALO - Concatenación
const query = `SELECT * FROM users WHERE id = '${userId}'`;

// ✅ BUENO - Parametrizado
// Node.js/MySQL
const [rows] = await db.execute('SELECT * FROM users WHERE id = ?', [userId]);

// Node.js/PostgreSQL
const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);

// Node.js/MongoDB (NoSQL injection también existe)
const user = await User.findOne({ _id: new ObjectId(userId) }); // Validar ObjectId
```

```python
# Python/SQLAlchemy
user = session.query(User).filter(User.id == user_id).first()

# Python/Raw SQL con psycopg2
cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))

# Python/MongoDB
from bson.objectid import ObjectId
if ObjectId.is_valid(user_id):
    user = db.users.find_one({"_id": ObjectId(user_id)})
```

### Cross-Site Scripting (XSS)

```javascript
// Estrategia de Defensa en Profundidad

// 1. CSP (ya cubierto arriba)
// 2. Escapar output (ya cubierto arriba)
// 3. HttpOnly cookies
// 4. X-XSS-Protection header

// 5. Validar URLs antes de redirección
const allowedDomains = ['tudominio.com', 'www.tudominio.com'];
function isValidRedirect(url) {
  try {
    const parsed = new URL(url);
    return allowedDomains.includes(parsed.hostname);
  } catch {
    return false;
  }
}

// 6. Sanitizar filenames
const sanitizeFilename = (name) => {
  return name.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\.\./g, '');
};
```

### Cross-Site Request Forgery (CSRF)

```javascript
// Node.js con csurf
const csurf = require('csurf');
const csrfProtection = csurf({ 
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: 'Strict'
  }
});

app.use(csrfProtection);

// Enviar token al frontend
app.get('/form', (req, res) => {
  res.render('form', { csrfToken: req.csrfToken() });
});

// En frontend (enviar en header o body)
fetch('/api/action', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
});
```

```python
# Python/Flask-WTF
from flask_wtf.csrf import CSRFProtect
csrf = CSRFProtect(app)

# En template
# <input type="hidden" name="csrf_token" value="{{ csrf_token() }}">
```

### Insecure Deserialization

```javascript
// ❌ NUNCA usar eval() o new Function() con input de usuario
// ❌ NUNCA deserializar datos no confiables con JSON.parse sin validación

// ✅ Validar antes de parsear
function safeJSONParse(str) {
  const parsed = JSON.parse(str);
  // Validar estructura esperada
  if (!parsed || typeof parsed !== 'object') throw new Error('Invalid');
  return parsed;
}

// ✅ Para datos sensibles, usar formatos con schemas (Protobuf, Avro)
```

### Path Traversal

```javascript
// Node.js
const path = require('path');
const fs = require('fs');

function safeReadFile(baseDir, userPath) {
  // Normalizar y resolver
  const safePath = path.normalize(userPath).replace(/^(\.\.(\/|\|$))+/, '');
  const fullPath = path.join(baseDir, safePath);

  // Verificar que está dentro del directorio base
  if (!fullPath.startsWith(path.resolve(baseDir))) {
    throw new Error('Path traversal detected');
  }

  return fs.readFileSync(fullPath);
}
```

### Server-Side Request Forgery (SSRF)

```javascript
// ❌ MALO
const response = await fetch(userProvidedUrl);

// ✅ BUENO - Whitelist de URLs
const ALLOWED_URLS = [
  'https://api.tudominio.com',
  'https://cdn.tudominio.com'
];

function safeFetch(url) {
  const parsed = new URL(url);
  const isAllowed = ALLOWED_URLS.some(allowed => 
    parsed.href.startsWith(allowed)
  );

  if (!isAllowed) throw new Error('URL not allowed');
  if (parsed.protocol !== 'https:') throw new Error('HTTPS only');

  // Bloquear IPs privadas
  const hostname = parsed.hostname;
  if (isPrivateIP(hostname)) throw new Error('Private IP blocked');

  return fetch(url);
}

function isPrivateIP(hostname) {
  const privateRanges = [
    /^127\./, /^10\./, /^172\.(1[6-9]|2[0-9]|3[01])\./, /^192\.168\./,
    /^0\./, /^169\.254\./, /^fc00:/, /^fe80:/
  ];
  return privateRanges.some(range => range.test(hostname));
}
```

---

## 6. SEGURIDAD EN PWAs {#pwa-security}

### Service Worker Seguro

```javascript
// sw.js - Service Worker seguro
const CACHE_NAME = 'app-v1';
const ALLOWED_ORIGINS = [
  self.location.origin,
  'https://cdn.tudominio.com'
];

self.addEventListener('fetch', (event) => {
  // Solo interceptar requests GET de nuestro origen
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (!ALLOWED_ORIGINS.includes(url.origin)) return;

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Cache-first para assets estáticos
      if (response) return response;

      return fetch(event.request).then((fetchResponse) => {
        // Solo cachear respuestas exitosas de nuestro origen
        if (!fetchResponse || fetchResponse.status !== 200) {
          return fetchResponse;
        }

        const responseToCache = fetchResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          // Validar que es un tipo cacheable
          const contentType = fetchResponse.headers.get('content-type');
          if (contentType && (
            contentType.includes('javascript') ||
            contentType.includes('css') ||
            contentType.includes('image') ||
            contentType.includes('font')
          )) {
            cache.put(event.request, responseToCache);
          }
        });

        return fetchResponse;
      }).catch(() => {
        // Fallback offline
        if (event.request.destination === 'document') {
          return caches.match('/offline.html');
        }
      });
    })
  );
});

// Limpiar caches antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
});
```

### Web App Manifest Seguro

```json
{
  "name": "Mi App Segura",
  "short_name": "App",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "scope": "/",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "categories": ["productivity"],
  "orientation": "portrait",
  "lang": "es",
  "dir": "ltr",
  "prefer_related_applications": false
}
```

### Storage Seguro

```javascript
// IndexedDB con cifrado (cliente)
// Usar Web Crypto API para datos sensibles

async function encryptData(data, key) {
  const encoder = new TextEncoder();
  const encoded = encoder.encode(JSON.stringify(data));

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  );

  return { iv: Array.from(iv), data: Array.from(new Uint8Array(encrypted)) };
}

async function decryptData(encryptedObj, key) {
  const iv = new Uint8Array(encryptedObj.iv);
  const data = new Uint8Array(encryptedObj.data);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  const decoder = new TextDecoder();
  return JSON.parse(decoder.decode(decrypted));
}

// Generar key desde password (PBKDF2)
async function deriveKey(password, salt) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}
```

### Notifications Seguras

```javascript
// Solo solicitar permiso después de interacción del usuario
button.addEventListener('click', async () => {
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    // Registrar push con VAPID keys seguras
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    // Enviar subscription al servidor de forma segura
    await fetch('/api/push-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify(subscription)
    });
  }
});
```

---

## 7. CONFIGURACIÓN DE SERVIDOR {#server-config}

### Nginx Seguro

```nginx
server {
    listen 443 ssl http2;
    server_name tudominio.com;
    root /var/www/app;
    index index.html;

    # SSL
    ssl_certificate /etc/ssl/certs/tudominio.com.crt;
    ssl_certificate_key /etc/ssl/private/tudominio.com.key;
    ssl_protocols TLSv1.3;  # Solo TLS 1.3
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/ssl/certs/chain.crt;
    resolver 1.1.1.1 8.8.8.8 valid=300s;
    resolver_timeout 5s;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';" always;

    # OCSP Must-Staple (si el certificado lo soporta)
    add_header Expect-CT "max-age=86400, enforce" always;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;

    # Ocultar versión de Nginx
    server_tokens off;

    # Prevenir información de directorios
    autoindex off;

    # Tamaño máximo de body
    client_max_body_size 10M;

    # Timeouts
    client_body_timeout 12;
    client_header_timeout 12;
    keepalive_timeout 15;
    send_timeout 10;

    # Compresión (con cuidado con BREACH)
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml application/atom+xml image/svg+xml;

    # Cache estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header X-Content-Type-Options "nosniff";
        access_log off;
    }

    # API con rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Login con rate limiting estricto
    location /api/auth/ {
        limit_req zone=login burst=5 nodelay;
        proxy_pass http://backend;
    }

    # PWA files
    location = /manifest.json {
        add_header Cache-Control "no-cache";
        add_header Content-Type "application/manifest+json";
    }

    location = /sw.js {
        add_header Cache-Control "no-cache";
        add_header Service-Worker-Allowed "/";
    }

    # Bloquear archivos sensibles
    location ~ /\. {
        deny all;
        return 404;
    }

    location ~* \.(env|git|htaccess|htpasswd|ini|log|sh|sql|bak|config)$ {
        deny all;
        return 404;
    }
}

# Redirect HTTP a HTTPS
server {
    listen 80;
    server_name tudominio.com;
    return 301 https://$server_name$request_uri;
}
```

### Docker Seguro

```dockerfile
# Dockerfile seguro para Node.js
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY . .
RUN npm run build

# Runtime stage
FROM node:20-alpine
RUN apk add --no-cache dumb-init

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /app
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

USER nodejs

EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3   CMD node -e "require('http').get('http://localhost:3000/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

CMD ["dumb-init", "node", "dist/server.js"]
```

```yaml
# docker-compose.yml seguro
version: '3.8'

services:
  app:
    build: .
    restart: unless-stopped
    read_only: true  # Filesystem read-only
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - CHOWN  # Solo si es necesario
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
    networks:
      - app-network
    environment:
      - NODE_ENV=production
    secrets:
      - jwt_secret
      - db_password

  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - app-network
    secrets:
      - db_password

secrets:
  jwt_secret:
    file: ./secrets/jwt_secret.txt
  db_password:
    file: ./secrets/db_password.txt

networks:
  app-network:
    driver: bridge
    internal: true  # Sin acceso externo

volumes:
  postgres_data:
```

---

## 8. CERTIFICADOS SSL/TLS {#ssl}

### Configuración TLS 1.3 Moderna

```nginx
# Generar certificado con Let's Encrypt
certbot --nginx -d tudominio.com -d www.tudominio.com --must-staple --hsts

# Configuración manual de certificado
ssl_certificate /etc/letsencrypt/live/tudominio.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/tudominio.com/privkey.pem;

# Solo TLS 1.3 (recomendado para apps nuevas)
ssl_protocols TLSv1.3;

# Si necesitas compatibilidad legacy (no recomendado):
# ssl_protocols TLSv1.2 TLSv1.3;
# ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
# ssl_prefer_server_ciphers on;

# Certificado con soporte OCSP Must-Staple
# Al generar CSR, incluir: 1.3.6.1.5.5.7.1.24 = DER:30:03:02:01:05
```

### Certificado con DNS Challenge (para internos)

```bash
# Usar DNS challenge para wildcard o dominios internos
certbot certonly   --dns-cloudflare   --dns-cloudflare-credentials ~/.secrets/cloudflare.ini   -d tudominio.com   -d *.tudominio.com   --server https://acme-v02.api.letsencrypt.org/directory
```

---

## 9. AUDITORÍA Y TESTING {#testing}

### Dependencias Vulnerables

```bash
# Node.js
npm audit
npm audit fix
# o usar Snyk
npx snyk test
npx snyk monitor

# Python
pip install safety
safety check

# PHP
composer audit
```

### Headers Testing

```bash
# Usar curl para verificar headers
curl -I -s https://tudominio.com | grep -i "strict-transport\|x-frame\|content-security\|x-content\|referrer\|permissions"

# O usar herramientas online:
# - securityheaders.com
# - observatory.mozilla.org
# - ssllabs.com/ssltest
```

### Testing Automatizado de Seguridad

```javascript
// Jest + Supertest para testing de seguridad
const request = require('supertest');
const app = require('../app');

describe('Security Tests', () => {
  test('should have security headers', async () => {
    const res = await request(app).get('/');
    expect(res.headers['strict-transport-security']).toBeDefined();
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  test('should reject SQL injection attempts', async () => {
    const res = await request(app)
      .get('/api/users?id=1 OR 1=1')
      .expect(400);
  });

  test('should reject XSS in input', async () => {
    const res = await request(app)
      .post('/api/comments')
      .send({ text: '<script>alert(1)</script>' })
      .expect(400);
  });

  test('should enforce rate limiting', async () => {
    // Hacer 6 requests rápidos al login
    const requests = Array(6).fill().map(() => 
      request(app).post('/api/auth/login').send({})
    );
    const responses = await Promise.all(requests);
    const lastResponse = responses[responses.length - 1];
    expect(lastResponse.status).toBe(429);
  });

  test('should reject CSRF without token', async () => {
    const res = await request(app)
      .post('/api/action')
      .send({ data: 'test' })
      .expect(403);
  });
});
```

### OWASP ZAP Testing

```bash
# Instalar ZAP
wget https://github.com/zaproxy/zaproxy/releases/download/v2.14.0/ZAP_2.14.0_Linux.tar.gz

# Escaneo baseline (CI/CD friendly)
docker run -t owasp/zap2docker-stable zap-baseline.py   -t https://tudominio.com   -r zap-report.html

# Escaneo full (más lento, más completo)
docker run -t owasp/zap2docker-stable zap-full-scan.py   -t https://tudominio.com   -r zap-full-report.html
```

---

## 10. CHECKLIST DE DESPLIEGUE {#checklist}

### Pre-Despliegue

- [ ] **HTTPS obligatorio**: Todo el tráfico por TLS 1.2+ (preferible 1.3)
- [ ] **HSTS activo**: `max-age=31536000; includeSubDomains; preload`
- [ ] **CSP implementado**: Sin `'unsafe-inline'` en scripts (usar nonces)
- [ ] **X-Frame-Options**: `DENY` o `SAMEORIGIN`
- [ ] **Cookies seguras**: `Secure`, `HttpOnly`, `SameSite=Strict`
- [ ] **Rate limiting**: En login, registro, API públicas
- [ ] **Validación de inputs**: Whitelist en servidor
- [ ] **Parametrización SQL**: Sin concatenación de queries
- [ ] **Escaping output**: HTML, JS, CSS, URL contexts
- [ ] **CSRF tokens**: En todas las mutaciones de estado
- [ ] **CORS configurado**: Orígenes explícitos, no `*`
- [ ] **Dependencias auditadas**: Sin vulnerabilidades conocidas
- [ ] **Secrets management**: No hardcodeados, usar variables de entorno/secrets manager
- [ ] **Logs sanitizados**: No loggear PII, passwords, tokens
- [ ] **Error handling**: Mensajes genéricos al usuario, detalles solo en logs internos
- [ ] **File uploads**: Validar tipo, tamaño, escanear con antivirus, almacenar fuera de webroot
- [ ] **Backup cifrado**: Base de datos y archivos sensibles

### Post-Despliegue

- [ ] **Security headers**: Verificar en securityheaders.com
- [ ] **SSL Labs**: Calificación A+ en ssllabs.com
- [ ] **OWASP ZAP**: Sin alertas High o Medium
- [ ] **Monitoring**: Alertas de intentos de intrusión
- [ ] **WAF**: Considerar Cloudflare/AWS WAF para protección adicional
- [ ] **Bug bounty**: Programa de recompensas por vulnerabilidades

---

## 🛡️ RESUMEN DE DEFENSA EN PROFUNDIDAD

| Capa | Protección |
|------|-----------|
| **Red** | WAF, Rate limiting, DDoS protection |
| **Transporte** | TLS 1.3, HSTS, Cert pinning |
| **Aplicación** | Headers de seguridad, CSP, CORS |
| **Autenticación** | JWT seguro, Sessions hardening, MFA |
| **Autorización** | RBAC, Principle of least privilege |
| **Input** | Validación whitelist, Sanitización |
| **Output** | Escaping contextual, CSP |
| **Datos** | Cifrado en reposo y tránsito |
| **Monitoreo** | Logging, Alerting, SIEM |

---

## 📚 RECURSOS ADICIONALES

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Mozilla Web Security Guidelines](https://infosec.mozilla.org/guidelines/web_security)
- [CSP Quick Reference](https://content-security-policy.com/)
- [HTML5 Security Cheatsheet](https://html5sec.org/)
- [Web.dev Security](https://web.dev/security/)
- [HSTS Preload List](https://hstspreload.org/)

---

*Skill creada: 2026-05-02 | Compatibilidad: Universal (Node.js, Python, PHP, Go, Ruby, Java, .NET, etc.)*
*Licencia: MIT - Usar libremente en proyectos personales y comerciales*
