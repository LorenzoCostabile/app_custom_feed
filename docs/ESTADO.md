# Reporte de estado — Atención

**Fecha:** 22 de octubre de 2026
**Alcance:** código en `F:\ProyectoAppAtencion`, infraestructura Docker y datos
verificados en la última ejecución. Durante la elaboración del informe Docker
estaba detenido, por lo que las cifras de datos son la última medición conocida.

---

## 1. Veredicto

El MVP está **funcionalmente completo en su bucle principal**: ingesta RSS,
edición diaria con motivos, biblioteca, hemeroteca, colecciones, historial,
multiusuario y configuración por fuente. La arquitectura es sencilla y coherente
para un NAS. Lo que falta no es «más app», sino **cerrar la operación diaria**
(cron, publicación, copias) y **estabilizar la integración real de YouTube**, que
ahora mismo está bloqueada por una cookie caducada.

---

## 2. Herramientas y stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js **14.2** (App Router, RSC) |
| UI | React **18.3**, Tailwind CSS **3.4** |
| Lenguaje | TypeScript **5.5** |
| Datos | PostgreSQL **16** + Drizzle ORM **0.33** / drizzle-kit |
| Validación | Zod **3.23** |
| Ingesta | `rss-parser`, `fetch` nativo |
| YouTube | Google OAuth + YouTube Data API v3 + `youtubei.js` **18.2** (scraping) |
| Utilidades | `date-fns`, `dotenv` |
| Ejecución de scripts | `tsx` (workers, migraciones, seed) |
| Tests | `node:test` vía `tsx` (6 pruebas unitarias) |
| Calidad | ESLint (`next lint`) + `tsc --noEmit` |
| Infra | Docker multi-stage (Node 20 Alpine) + Docker Compose |
| Entorno local | Docker Desktop en Windows; **Node no instalado en el host** |

**Tamaño del código:** 79 archivos `.ts/.tsx`, ~**6.875 líneas** (sin
`node_modules`): `lib` 2.934, `app` 2.066, `components` 1.349, `db` 429,
`worker` 61.

---

## 3. Arquitectura

Monolito Next.js con tres tipos de ejecución sobre la misma base de código:

```
Navegador
   │
   ├─ Páginas RSC (src/app/**/page.tsx)  ── leen con src/lib/queries.ts
   ├─ Route Handlers (/api/**)            ── mutaciones y acciones
   └─ Middleware (sesión)

                    ▼
        Dominio en src/lib/**
   auth · ingestion · recommendation · youtube

                    ▼
        Drizzle ORM (src/db/schema.ts)
                    ▼
              PostgreSQL 16

Workers tsx (src/worker/*) ── misma capa de dominio
   ingest.ts  → ingesta de todas las fuentes
   edition.ts → genera la edición de cada usuario

Servicios externos:
   RSS/Atom · Google OAuth/API · InnerTube (youtubei.js)
```

**Decisión clave:** no hay microservicios ni colas. El «cron» son comandos que se
ejecutan contra el mismo contenedor (`npm run ingest`, `npm run edition`). Esto es
correcto para un NAS doméstico y mantiene el despliegue simple.

### Flujo de datos

1. **Ingesta:** `parseFeed` → normaliza URL/título/fecha →
   `insert ... onConflictDoNothing` → `classifyText` (temas) → enriquece duración
   de YouTube.
2. **Edición:** carga fuentes activas y no ocultas → candidatos de los últimos
   14 días → puntuación → selección con cupos y topes → persistencia transaccional
   (una edición por usuario/día/versión).
3. **Consumo:** portada → guardar → biblioteca → abrir en FreeTube o enlace
   externo.
4. **YouTube:** OAuth → suscripciones como fuentes, playlists/«Ver más tarde»
   como colecciones → feed de recomendaciones vía cookie → fuente centinela
   `youtube://recommendations`.

---

## 4. Estructura de carpetas

```
src/
├─ app/
│  ├─ page.tsx                 Edición de hoy
│  ├─ login/
│  ├─ historial/[id]/
│  ├─ biblioteca/ hemeroteca/ colecciones/ fuentes/
│  ├─ admin/usuarios/
│  ├─ health/route.ts          Público para el proxy
│  └─ api/                     auth, admin, data, edition, export, feedback,
│                              ingest, preferences, saved, sources, topics, youtube
├─ components/                 16 componentes cliente
├─ lib/
│  ├─ auth/                    sesión, scrypt, usuario actual
│  ├─ ingestion/               rss, normalize, ingest
│  ├─ recommendation/          engine, select, score, types, constants, test
│  ├─ youtube/                 oauth, api, tokens, sync, crypto, innertube,
│  │                           recommendations, config, state
│  ├─ queries.ts               lecturas para páginas
│  ├─ classify.ts              temas por keywords
│  ├─ freetube.ts              enlaces freetube:// y duraciones
│  └─ env.ts                   validación de entorno
├─ db/                         schema.ts + conexión
├─ worker/                     ingest.ts, edition.ts
└─ middleware.ts               protege todo salvo /login y /health
scripts/                       migrate, bootstrap-admin, seed-sources
drizzle/                       4 migraciones
docs/                          MVP.md, ROADMAP.md, ESTADO.md
```

---

## 5. Modelo de datos

**15 tablas**, todas con aislamiento por `user_id` salvo `item_topics` (hereda del
ítem):

| Grupo | Tablas |
|---|---|
| Identidad | `users`, `sessions` |
| YouTube | `youtube_accounts`, `collections`, `collection_items` |
| Contenido | `sources`, `items`, `topics`, `item_topics` |
| Personalización | `preferences`, `feedback` |
| Ediciones | `daily_editions`, `edition_items` |
| Consumo | `saved_items` |
| Operación | `ingestion_runs` |

Puntos sólidos:

- Índices únicos por usuario (`sources_user_feed_unique`,
  `items_user_canonical_unique`, etc.).
- `contentHash` y `canonicalUrl` evitan duplicados.
- Tokens OAuth y cookie de YouTube **cifrados** (AES-256-GCM).
- Ediciones inmutables con `signalBreakdown` y `reason` por ítem.

Deuda:

- Aislamiento por `WHERE user_id` en código, **sin Row Level Security**. Un filtro
  olvidado sería una fuga; no hay test automático de aislamiento.
- El motor de fechas usa **UTC** (`startOfDayUtc`), mientras el cron previsto es
  `Europe/Madrid`: puede generar la edición con fecha del día anterior en
  verano/invierno.
- `env.ts` existe, pero varios módulos leen `process.env` directamente.

---

## 6. API y páginas

### Páginas

`/` edición · `/login` · `/historial` · `/historial/[id]` · `/biblioteca` ·
`/hemeroteca` · `/colecciones` · `/fuentes` · `/admin/usuarios`

### API (route handlers)

- **Auth:** `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- **Admin:** `/api/admin/users`
- **Datos:** `DELETE /api/data` (borrado total), `GET /api/export`
- **Edición/ingesta:** `POST /api/edition`, `POST /api/ingest`
- **Fuentes/temas/prefs:** `GET|POST /api/sources`, `PATCH /api/sources/[id]`,
  `GET|POST /api/topics`, `GET|PUT /api/preferences`
- **Consumo:** `/api/saved`, `POST|PATCH /api/feedback`
- **YouTube:** `GET /api/youtube/connect`, `GET /api/youtube/callback`,
  `POST /api/youtube/sync`, `POST /api/youtube/disconnect`,
  `POST|DELETE /api/youtube/cookie`, `POST /api/youtube/recommendations`
- **Salud:** `GET /health` (público)

---

## 7. Diseño y experiencia

- **Estética editorial sobria:** fondo papel `#faf9f6`, tinta `#1a1a1a`, acento
  verde `#2f5d50`, líneas `#e5e2db`. Es el estado actual, no una dirección
  cerrada: ver [`DISENO.md`](DISENO.md).
- **Tipografía del sistema**, una sola columna `max-w-2xl`, tarjetas con borde
  fino.
- **Principios visibles en la UI:** sin scroll infinito, sin métricas de uso, sin
  notificaciones; cierre explícito «Fin de la edición».
- Portada agrupada por origen (seguidas / descubrimiento / actualidad), con motivo
  de selección y botón de guardar.
- Navegación simple; administración solo visible para admin.
- **Pendiente de diseño:** definir la dirección visual, PWA, manifest/iconos,
  bloqueo de reproducción en móvil.

---

## 8. Motor de recomendación

Versión `mvp-1.0`, determinista y explicable:

| Señal | Peso |
|---|---|
| Coincidencia de tema | 0,35 |
| Formato/duración | 0,20 |
| Frescura | 0,15 |
| Afinidad de fuente (feedback confirmado) | 0,15 |
| Novedad (temas recientes) | 0,15 |

- Ventana de candidatos: **14 días**; cooldown de repetición: **7 días**.
- Cupos por origen **5 seguidos / 3 descubrimiento / 2 actualidad**, escalados al
  tamaño de edición.
- Tope por fuente configurable (defecto **2**) y **peso** multiplicador (defecto
  1).
- Penalización por diversidad (fuente 0,15 · tema 0,10).
- **Los temas ponderan, no filtran** (recién aplicado): las recomendaciones de
  YouTube, sin clasificar, ya entran en la edición.
- Determinismo con desempate por fecha e `itemId`.
- Cobertura de tests: 6 unitarios (puntuación, cupos, topes, posiciones).

Deuda:

- El peso >1 puede hacer que la puntuación supere 1 (los tests solo cubren peso
  1).
- La clasificación por keywords es muy limitada: solo **19 de ~1.800**
  publicaciones tenían tema en la última medición.
- No hay UI de feedback todavía, aunque el motor ya consume `feedback.confirmed`.

---

## 9. Integración con YouTube

**Dos vías independientes:**

1. **OAuth + API oficial** (fiable): suscripciones como fuentes RSS de canal,
   playlists y «Ver más tarde» como colecciones, duraciones vía `videos.list`.
   - Límites conocidos: app en modo *Prueba* → refresh token a **7 días**; cuentas
     de marca → `404 channelNotFound`; «Ver más tarde» (`WL`) bloqueada por la
     API.
2. **InnerTube con cookie** (frágil, contra TOS): portada personalizada de
   youtube.com.
   - Requiere cookie de sesión válida y consentimiento (la app añade
     `SOCS=CAI`).
   - **Estado actual: bloqueada.** La cookie guardada ya no autentica (YouTube
     responde «Sign in»), probablemente por rotar la sesión. Hace falta pegar una
     cookie nueva.
   - Ya muestra errores claros (cookie caducada / historial desactivado /
     consentimiento).

---

## 10. Seguridad y privacidad

Bien resuelto:

- Contraseñas con **scrypt** + salt y comparación en tiempo constante.
- Sesiones con token aleatorio; en BD solo se guarda su **SHA-256**; cookie
  `HttpOnly`, `SameSite=Lax`, `Secure` en producción; TTL 30 días.
- Middleware protege páginas; todas las APIs comprueban usuario; consultas
  acotadas por `user_id`.
- Secretos de Google y cookie cifrados con AES-256-GCM (`TOKEN_ENCRYPTION_KEY` de
  32 bytes).
- **Exportación** JSON y **borrado total** de datos por usuario.
- Sin telemetría de terceros ni analítica ajena. Hoy no se registran métricas de
  uso; si se añaden, serán locales, explícitas y borrables.

Riesgos:

- No hay RLS ni test de aislamiento entre usuarios.
- No hay rate limiting en login.
- La cookie de YouTube es material sensible: conviene rotarla tras usarla y no
  reutilizar la sesión del navegador principal.
- `SESSION_COOKIE_SECURE` mal configurado en TrueNAS dejaría la cookie sin
  `Secure`.

---

## 11. Infraestructura y operación

- `Dockerfile` multi-stage (`deps → builder → runner`), usuario `nextjs` no root.
- `docker/entrypoint.sh`: espera PostgreSQL, aplica migraciones y crea admin si
  hay variables.
- `docker-compose.yml`: `db` + `app` + perfil `dev` con hot reload.
- `docker-compose.prod.yml`: pensado para *custom app* de TrueNAS, secretos por
  entorno, puerto configurable.
- **No hay**: CI/CD, imagen publicada en Docker Hub, contenedor cron, copias de
  seguridad automatizadas, HTTPS (se delega en el proxy del NAS).
- **Disco C: casi lleno** (~0,66 GB libres; `docker_data.vhdx` ~75 GB). Riesgo
  operativo real.

---

## 12. Calidad y verificación

Verificado en la última sesión:

- `typecheck` OK, `lint` OK, **6/6 tests**, `next build` OK.
- Imagen Docker reconstruida y contenedor arrancado.
- Smoke tests: `/health` 200, login 200, `/fuentes` 200, portada 200.
- Ocultar fuente reduce la edición (10 → 6); restaurarla la recupera.
- Recomendaciones: importación de 40 vídeos y 2 incluidas en una edición real.

Carencias:

- Sin tests de integración ni E2E; sin CI.
- Sin tests de aislamiento multiusuario.
- Sin monitorización ni logs estructurados.

---

## 13. Estado por fases

| Fase | Estado |
|---|---|
| 0 · Multiusuario y despliegue | **Casi completa**: falta publicar imagen en Docker Hub |
| 1 · YouTube | **Implementada**; verificación con cookie real pendiente |
| 2 · Algoritmo y experiencia | **Parcial**: temas ya ponderan, historial/ingesta/config hechos; faltan feedback UI y CRUD de fuentes |
| 3 · Plataforma | **Pendiente**: PWA, bloqueo móvil, cron, FreeTube |
| 4 · Descubrimiento | **Pendiente** |

---

## 14. Cómo avanzar (prioridad recomendada)

### P0 — Cerrar la operación diaria (1–2 semanas)

1. **Cookie nueva de YouTube** y verificación real del feed; añadir estado visible
   («cookie válida / caducada») y un fallback claro si InnerTube falla.
2. **Cron real**: contenedor o tareas del NAS para ingesta horaria y edición a las
   07:00 **Europe/Madrid** (corregir el uso de UTC).
3. **Publicar imagen** en Docker Hub + `docker-compose.prod.yml` probado en
   TrueNAS + **backups** del volumen `pgdata`.
4. Resolver el **disco C:** (compactar `vhdx` o mover Docker a D:/F:).

### P1 — Completar el producto (2–4 semanas)

5. **UI de feedback** («más de esto», «menos de esta fuente», «no me sirvió») con
   confirmación; el motor ya la usa.
6. **CRUD de fuentes** (editar/eliminar) e **import/export OPML**.
7. **Gestión de temas**: editar keywords para subir la clasificación del 1 %
   actual.
8. **Tests de aislamiento y de integración** + CI (GitHub Actions: typecheck,
   lint, test, build).

### P2 — Plataforma y alcance

9. **PWA** + bloqueo de vídeo en móvil + enlace FreeTube en escritorio.
10. **Descubrimiento de fuentes** (fase 4), la parte más costosa y la que más
    valor diferencial añade a largo plazo.

**Recomendación estratégica:** no añadir funciones nuevas hasta cerrar P0. La app
ya hace lo importante; lo que falta para que sea «de uso diario» es que se ejecute
sola, sea segura en el NAS y tenga copias de seguridad.
