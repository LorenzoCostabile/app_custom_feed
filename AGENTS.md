# AGENTS.md

Guía operativa para agentes que trabajen en **Atención**. Léela antes de tocar
código. Si cambias una convención, un comando o una regla de arquitectura,
actualiza este archivo.

Documentos de contexto:

- [`README.md`](README.md): puesta en marcha y uso.
- [`docs/MVP.md`](docs/MVP.md): diseño del producto.
- [`docs/ROADMAP.md`](docs/ROADMAP.md): fases y decisiones cerradas.
- [`docs/ESTADO.md`](docs/ESTADO.md): estado real, deuda técnica y prioridades.

---

## 1. Qué es este proyecto

Aplicación **multiusuario y autoalojada** para descubrir información, preparar una
**edición diaria** con pocas recomendaciones explicadas y consumirlas fuera de la
app (FreeTube o enlace). No mide tiempo de uso, no tiene scroll infinito ni
telemetría. La personalización es **explícitamente declarada** por el usuario.

Principios irrenunciables:

1. **Sin telemetría ni analítica.** No registrar aperturas, tiempos, clics ni
   frecuencia.
2. **Aislamiento total por usuario.** Toda consulta y mutación se filtra por
   `user_id`.
3. **Edición pequeña y terminable.** Nada de feeds infinitos.
4. **Motivos visibles.** Cada ítem de la edición guarda `reason` y
   `signalBreakdown`.
5. **Determinismo.** El motor no usa aleatoriedad; mismos datos → misma edición.
6. **Idioma:** interfaz, mensajes de error y documentación en **español**.
   Identificadores de código en inglés.

---

## 2. Stack y entorno

| Pieza | Versión / decisión |
|---|---|
| Next.js | 14 (App Router, Server Components) |
| React | 18 |
| TypeScript | 5.5, `strict` |
| Tailwind | 3.4 |
| PostgreSQL | 16 |
| ORM | Drizzle 0.33 + drizzle-kit |
| Validación | Zod |
| YouTube | OAuth + Data API v3 + `youtubei.js` (scraping) |
| Contenedores | Docker + Docker Compose |
| Tests | `node:test` ejecutado con `tsx` |

### Windows (entorno actual del usuario)

- **No hay Node.js en el host.** Todo se ejecuta en contenedores.
- Docker Desktop debe estar **arrancado a mano**. Si un comando falla con
  `npipe:////./pipe/dockerDesktopLinuxEngine`, pide al usuario que lo arranque;
  no intentes instalar Docker.
- Git ya está instalado; GitHub CLI (`gh`) se usa para autenticación.
- PowerShell: **no existe `rg`**; usa las herramientas de búsqueda del agente o
  `Select-String`. Evita `node -e` con comillas anidadas: crea un script temporal
  y bórralo al terminar.

### Linux

- Clonar el repo en el sistema de archivos nativo (`~/...`, ext4/btrfs).
- **No** ejecutar Node/Docker desde particiones NTFS/exFAT compartidas.
- Restaurar `.env` manualmente (no está en el repo) y `docker compose up --build`.

---

## 3. Comandos

### Desarrollo y verificación (Windows, Docker)

```powershell
# Arrancar app + base de datos
docker compose up --build

# Desarrollo con recarga en caliente
docker compose --profile dev up dev

# Comprobaciones dentro del contenedor de desarrollo
docker compose --profile dev run --rm --no-deps dev sh -c "npm run typecheck"
docker compose --profile dev run --rm --no-deps dev sh -c "npm run lint"
docker compose --profile dev run --rm --no-deps dev sh -c "npm test"
docker compose --profile dev run --rm --no-deps dev sh -c "npm run build"
```

> El servicio `dev` monta el repo en `/app` y usa volúmenes anónimos para
> `node_modules` y `.next`. Si la imagen `dev` no existe:
> `docker compose --profile dev build dev`.

### Producción local

```powershell
docker compose build app
docker compose up -d app
docker compose logs -f app
docker compose exec -T db psql -U atencion -d atencion
```

### Base de datos

```powershell
npm run db:generate          # nueva migración desde src/db/schema.ts
npm run db:migrate           # aplicar migraciones pendientes
npm run db:bootstrap         # asegurar admin inicial (variables ADMIN_*)
npm run db:seed -- correo@ejemplo.com
```

- **Nunca** edites una migración ya aplicada.
- **No** uses `db:push` en producción: puede alterar el esquema sin migración.
- El `entrypoint` de la imagen aplica migraciones y bootstrap al arrancar.

### Workers

```powershell
docker compose run --rm app npm run ingest
docker compose run --rm app npm run edition
```

En desarrollo, ejecutar dentro del contenedor `dev`.

---

## 4. Variables de entorno y secretos

Plantilla: [`.env.example`](.env.example). El `.env` real **no se versiona**.

| Variable | Uso |
|---|---|
| `DATABASE_URL` | Conexión PostgreSQL |
| `EDITION_SIZE` | Tamaño por defecto de la edición |
| `CANDIDATE_WINDOW_DAYS` | Ventana de candidatos (14) |
| `REPEAT_COOLDOWN_DAYS` | Días sin repetir ítems (7) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | Bootstrap del primer admin |
| `SESSION_COOKIE_SECURE` | `true` solo con HTTPS |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth de YouTube |
| `GOOGLE_API_KEY` | Opcional; duraciones sin token de usuario |
| `YOUTUBE_REDIRECT_URI` | Debe coincidir con Google Cloud |
| `TOKEN_ENCRYPTION_KEY` | 32 bytes en base64; cifra tokens y cookie |

Reglas:

- **Nunca** imprimas, registres ni commitees valores de secretos.
- No muestres la cookie de YouTube ni la clave de cifrado en logs o respuestas.
- Si cambias `TOKEN_ENCRYPTION_KEY`, los tokens y cookies guardados dejan de
  descifrarse: hay que reconectar YouTube.
- Si un secreto se filtra, hay que rotarlo; no basta con borrarlo del commit.

---

## 5. Mapa de la arquitectura

```
src/
├─ app/                 Páginas RSC + route handlers (/api)
├─ components/          Componentes cliente ("use client")
├─ lib/
│  ├─ auth/             scrypt, sesiones, usuario actual
│  ├─ ingestion/        RSS, normalización, ingesta
│  ├─ recommendation/   motor determinista
│  ├─ youtube/          OAuth, API oficial, InnerTube, cifrado
│  ├─ queries.ts        lecturas para páginas
│  ├─ classify.ts       clasificación por keywords
│  ├─ freetube.ts       enlaces freetube:// y duraciones
│  └─ env.ts            validación de entorno
├─ db/                  schema + conexión
├─ worker/              ingest.ts, edition.ts
└─ middleware.ts        protege todo salvo /login y /health
```

Flujo:

1. **Ingesta** (`lib/ingestion`): RSS → normalizar → insertar sin duplicados →
   clasificar temas → enriquecer duraciones.
2. **Edición** (`lib/recommendation`): fuentes activas y visibles → candidatos →
   puntuar → seleccionar → persistir.
3. **Consumo**: portada → guardar → biblioteca → FreeTube/enlace.
4. **YouTube**: OAuth (suscripciones/playlists) + cookie (recomendaciones).

---

## 6. Reglas de datos y multiusuario

- Toda tabla nueva debe tener `user_id` con `onDelete: "cascade"`, salvo tablas
  puente que hereden del padre (como `item_topics`).
- Toda consulta de lectura/escritura debe incluir `eq(tabla.userId, user.id)` o
  filtrar por una entidad ya acotada al usuario.
- Los índices únicos deben ser **por usuario** cuando el dato sea del usuario.
- Los route handlers comprueban sesión con `getApiUser()`; si no hay usuario,
  `unauthorized()`.
- No confíes en IDs del cliente: verifica propiedad antes de mutar.
- `DELETE /api/data` borra todos los datos del usuario; no lo ejecutes en pruebas
  sin confirmación explícita.

### Modelo de datos (15 tablas)

Identidad: `users`, `sessions`.
YouTube: `youtube_accounts`, `collections`, `collection_items`.
Contenido: `sources`, `items`, `topics`, `item_topics`.
Personalización: `preferences`, `feedback`.
Ediciones: `daily_editions`, `edition_items`.
Consumo: `saved_items`.
Operación: `ingestion_runs`.

---

## 7. Motor de recomendación

Archivos: `src/lib/recommendation/{constants,types,score,select,engine}.ts`.

- Versión actual: `ALGORITHM_VERSION = "mvp-1.0"`.
- Pesos: tema 0,35 · formato/duración 0,20 · frescura 0,15 · afinidad 0,15 ·
  novedad 0,15.
- Cupos por origen: seguidos 5 / descubrimiento 3 / actualidad 2, **escalados** al
  tamaño de edición.
- Tope por fuente: `sources.max_items_per_edition` (defecto 2).
- Peso por fuente: `sources.weight` (defecto 1).
- Ventana: 14 días. Cooldown: 7 días.
- Penalización por diversidad: fuente 0,15 · tema 0,10.
- **Los temas ponderan, no filtran.** Un ítem sin tema puede ser candidato.
- Desempate determinista: puntuación, fecha y `itemId`.

Reglas al modificar el motor:

1. Añade o ajusta tests en `recommendation.test.ts`.
2. Mantén el determinismo (sin `Math.random`, sin `Date.now()` dentro del cálculo
   salvo el `now` inyectado).
3. Si cambia el comportamiento de selección/puntuación, **sube
   `ALGORITHM_VERSION`**. Eso permite conservar ediciones anteriores.
4. No rompas la forma de `signalBreakdown` ni `reason`: se muestran en el
   historial.

---

## 8. Ingesta y fuentes

- `parseFeed` valida y normaliza: elimina UTMs, hash, barras finales; calcula
  `contentHash`.
- Deduplicación por `(source_id, external_id)` y `(user_id, canonical_url)`.
- El **formato** se deriva del tipo de fuente (`formatForSource`), no del ítem.
- Clasificación por keywords normalizadas (sin acentos, minúsculas). Es limitada:
  ampliar keywords es una decisión de producto.
- `isActive`: pausa la ingesta.
- `isHidden`: se ingiere, pero no entra en la edición.
- `maxItemsPerEdition`: tope por edición.
- `weight`: multiplicador de puntuación.
- El feed centinela `youtube://recommendations` **se excluye** de
  `ingestAllSources`; no lo trates como RSS.

---

## 9. Integración con YouTube

### OAuth + API oficial

- Suscripciones → fuentes RSS de canal.
- Playlists → colecciones. «Ver más tarde» (`WL`) está bloqueada por la API.
- App en modo *Prueba*: refresh token caduca a los 7 días.
- Cuentas de marca: `channels.list?mine=true` puede devolver
  `404 channelNotFound`; hay que reconectar eligiendo el canal.
- Los tokens se cifran con AES-256-GCM (`lib/youtube/crypto.ts`).

### InnerTube (feed de recomendaciones)

- `lib/youtube/innertube.ts` usa `youtubei.js` con la cookie del usuario.
- La cookie se guarda cifrada y **nunca** debe mostrarse.
- Se añade `SOCS=CAI` si falta consentimiento.
- Errores diferenciados: cookie caducada, historial desactivado, consentimiento.
- Es frágil y **va contra los Términos de YouTube**; no amplíes el scraping sin
  decisión explícita del usuario.
- El paquete `youtubei.js` debe seguir como *external package* en
  `next.config.mjs`.

---

## 10. Convenciones de API

- `export const dynamic = "force-dynamic"` en rutas que tocan BD o sesión.
- Validación con **Zod**; devolver `400` con `{ error: "..." }` en español.
- Códigos usados: `200`, `201`, `400`, `401`, `403`, `404`, `409`, `502`.
- Errores de terceros: `502` con mensaje comprensible, sin volcar secretos.
- No devuelvas filas de otros usuarios ni siquiera para comprobar existencia.
- Mutaciones: verifica propiedad y usa transacciones cuando haya varias tablas.

---

## 11. Convenciones de UI

- Server Components por defecto; `"use client"` solo para interacción.
- Textos en español, tono sobrio, sin emojis.
- Paleta Tailwind: `ink`, `paper`, `muted`, `line`, `accent`. Evita hex sueltos.
- Tarjetas: `rounded border border-line bg-white/60 p-4`.
- Botones primarios: `bg-accent text-white`; secundarios con borde.
- Mantén la columna `max-w-2xl` y la estética editorial.
- Nada de scroll infinito, contadores de uso ni métricas.
- Formularios con `label`, estados `pending` y mensajes de error visibles.

---

## 12. Migraciones y base de datos

1. Edita `src/db/schema.ts`.
2. Ejecuta `npm run db:generate`.
3. Revisa el SQL generado en `drizzle/`.
4. Aplica con `npm run db:migrate`.
5. No edites migraciones ya aplicadas; crea una nueva.
6. Mantén `drizzle/meta/_journal.json` y los snapshots en el repo.

PostgreSQL guarda sus datos en el volumen `pgdata`. **No borres el volumen** ni
ejecutes `docker system prune -a` sin confirmación explícita del usuario.

---

## 13. Testing y definición de «hecho»

Antes de dar una tarea por terminada:

```powershell
docker compose --profile dev run --rm --no-deps dev sh -c "npm run typecheck"
docker compose --profile dev run --rm --no-deps dev sh -c "npm run lint"
docker compose --profile dev run --rm --no-deps dev sh -c "npm test"
```

Si el cambio afecta al runtime o a la imagen de producción:

```powershell
docker compose build app
docker compose up -d app
```

Y comprueba al menos:

- `GET /health` → 200.
- Login correcto.
- Página o API afectada.
- Si toca el motor: genera una edición y revisa tamaño, motivos y topes.

Estado actual de tests: **6 unitarios** del motor. No hay tests de integración,
E2E, aislamiento multiusuario ni CI. Si añades lógica crítica, añade pruebas.

---

## 14. Git y repositorio

- `.env`, `node_modules`, `.next`, `*.tsbuildinfo` están ignorados. **Nunca** los
  commitees.
- Antes de commitear: `git status --short` y `git diff --cached`.
- Repo privado; no subas secretos ni datos personales.
- No reescribas historia ni hagas *force push* a `main`.
- Mensajes de commit claros, en español.
- Actualiza README/ROADMAP/ESTADO cuando cambie el comportamiento o el estado.

---

## 15. Limitaciones y bloqueos conocidos

- **Cookie de YouTube caducada**: el feed de recomendaciones requiere una cookie
  nueva. Ver `docs/ESTADO.md`.
- **OAuth en modo Prueba**: refresh token a 7 días.
- **«Ver más tarde»**: inaccesible vía API oficial.
- **Clasificación de temas escasa**: solo una pequeña parte de las publicaciones
  tiene tema; los temas ya no filtran, pero afectan a la relevancia.
- **Zona horaria**: la edición usa UTC; el cron previsto es `Europe/Madrid`.
  Corregir antes de automatizar.
- **Disco C: casi lleno** en el entorno Windows; cuidado con builds y volúmenes.
- **Sin cron, sin CI, sin imagen publicada, sin backups automáticos.**
- **Sin RLS**: el aislamiento depende de filtrar por `user_id` en cada consulta.

---

## 16. Prioridades actuales

1. Desbloquear y estabilizar YouTube (cookie válida, estado visible, fallback).
2. Cron real: ingesta horaria y edición a las 07:00 `Europe/Madrid`.
3. Publicar imagen, desplegar en TrueNAS y automatizar backups.
4. UI de feedback y CRUD de fuentes.
5. Tests de aislamiento/integración + CI.
6. PWA, bloqueo de vídeo en móvil y descubrimiento de fuentes.

No añadas funciones nuevas antes de cerrar los puntos 1–3 salvo petición expresa.
