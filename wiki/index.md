# EduEats V2 Wiki — Index

| Página | Contenido |
|---|---|
| [SCHEMA.md](./SCHEMA.md) | Stack, layout, convenciones, secrets, layering |
| [concepts/security-audit.md](./concepts/security-audit.md) | Auditoría 2026-08-23: 7 P0, 5 P1, 10 P2/P3 |

## Decisiones recientes

- 2026-08-23 — Auditoría completa ejecutada. Decisión: arreglar P0+P1 (no P2/P3).
  Decisión clave: NO agregar `school_id` a `category_rules` (es tabla de plataforma
  con reglas universales), documentar en el código.
