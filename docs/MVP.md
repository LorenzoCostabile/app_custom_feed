# Atención — Diseño del MVP

Documento de diseño · Versión 0.2
Deriva del documento conceptual «Diseño del sistema de descubrimiento deliberado» v0.3.

---

## Actualización v0.2 — cambios respecto a la v0.1

La v0.1 describía una aplicación **estrictamente personal y local**. Con las
decisiones tomadas después, el sistema pasa a ser **multiusuario en un NAS** e
incorpora la cuenta de YouTube. Estas son las decisiones vigentes:

| Dimensión | Decisión v0.2 |
|-----------|---------------|
| Despliegue | NAS TrueNAS Scale, como *custom app*; imagen en Docker Hub; proxy inverso del NAS |
| Usuarios | Multiusuario con datos **totalmente aislados**; el admin crea las cuentas |
| Autenticación | Usuario + contraseña (hash), sesión con cookie |
| Cuenta de YouTube | OAuth por usuario, token guardado y re-sincronización diaria + botón manual |
| Datos de YouTube | Suscripciones, playlists, «Ver más tarde» y duración/metadatos |
| Playlists y «Ver más tarde» | Colecciones en la hemeroteca |
| Filtro principal | Canal activo/inactivo (no el tema) |
| Temas | Solo **suben la puntuación**; dejan de ser obligatorios para ser candidato |
| Móvil | Solo descubrir y guardar; **vídeos no reproducibles** (podcasts/lecturas sí) |
| Escritorio | Reproducción en FreeTube mediante enlace `freetube://` |
| Edición diaria | Cron a las 07:00 Europe/Madrid, una edición por usuario |

Implicaciones sobre el resto del documento:

- La sección 1.1 (personal, local) queda superada: ahora cada entidad pertenece
  a un usuario (`user_id`).
- El «modelo A conservador» se implementa **sin exigir coincidencia temática**:
  todo lo de las fuentes activas es candidato y los temas ponderan.
- La decisión «RSS-first sin cuenta de Google» se matiza: sigue siendo el modo
  de ingesta por defecto, y la cuenta de Google se usa **de forma explícita y
  opcional** para importar/actualizar suscripciones y colecciones.

El detalle y el orden de implementación están en [`ROADMAP.md`](ROADMAP.md).

---

## 0. Propósito de este documento

El MVP debe demostrar una sola cosa: que Atención puede **recuperar contenido de fuentes elegidas por ti, preparar una edición diaria relevante, permitirte guardar lo que merece tu tiempo y consumirlo fuera de la aplicación**.

Todo lo que no sirva a esa demostración queda fuera. El MVP no intenta ser el producto final; intenta validar el bucle central sin vigilarte ni optimizar tu atención.

---

## 1. Alcance

### 1.1. Dentro del MVP

| # | Capacidad | Descripción |
|---|-----------|-------------|
| 1 | Gestión de fuentes | Añadir, editar, activar y eliminar fuentes RSS/Atom (canales de YouTube, podcasts y medios). |
| 2 | Ingesta programada | Recuperar y normalizar publicaciones de las fuentes, con deduplicación e historial de ejecución. |
| 3 | Temas explícitos | Definir intereses por temas y subtemas; clasificar ítems por reglas de palabras clave. |
| 4 | Preferencias explícitas | Incluir/excluir temas y fuentes, formatos permitidos y filtros de duración. |
| 5 | Edición diaria | Selección determinista y diversificada con cuotas, motivos de inclusión y versión de algoritmo. |
| 6 | Biblioteca | Guardar ítems, marcarlos como consumidos y quitarlos. |
| 7 | Hemeroteca | Consultar y buscar todas las publicaciones de tus fuentes, con paginación explícita. |
| 8 | Feedback deliberado | Valoraciones que solo cambian el perfil tras confirmación explícita. |
| 9 | Portabilidad | Exportar y borrar todos los datos personales en formatos abiertos. |
| 10 | Reproducción externa | Abrir vídeos de YouTube en FreeTube; copiar enlace como alternativa. |

### 1.2. Fuera del MVP

Se excluyen deliberadamente, por el documento conceptual:

- Chatbot que recomiende contenidos.
- Resúmenes automáticos de todos los contenidos.
- Análisis ideológico automatizado.
- Puntuaciones de credibilidad opacas.
- Importación del historial de YouTube.
- Perfiles psicológicos o inferencia de preferencias por comportamiento.
- Filtrado colaborativo («usuarios similares»).
- Embeddings semánticos y búsqueda vectorial (candidatos a fase posterior).
- Notificaciones automáticas de actualidad.
- Contadores de pendientes o indicadores de «ponerse al día».
- Microservicios, Kubernetes o infraestructura distribuida.

---

## 2. El bucle central

```
Fuentes ──ingesta──▶ Ítems ──recomendador──▶ Edición diaria ──decisión──▶ Biblioteca ──▶ FreeTube
   ▲                                                                          │
   └──────────────────── feedback explícito ──────────────────────────────────┘
```

El flujo **termina cuando has decidido**, no cuando has consumido todo el contenido. La aplicación nunca muestra un contador de elementos pendientes.

---

## 3. Experiencia de usuario

### 3.1. Pantalla: Edición de hoy

- Cabecera: «Tu edición de hoy».
- Filtros por formato: Todo · Vídeos · Podcasts · Lecturas.
- Lista de tarjetas agrupadas por origen de selección:
  - **De tus fuentes**
  - **Descubrimiento**
  - **Actualidad**
- Cada tarjeta muestra: título, formato, duración estimada, procedencia, un **motivo** de recomendación en una frase y una acción «Guardar para después».
- Cierre explícito: «Fin de la edición. No hay más recomendaciones hoy.»

### 3.2. Pantalla: Biblioteca

- Ítems guardados, ordenables por fecha de guardado.
- Acciones por ítem: abrir en FreeTube (vídeos), abrir enlace, marcar como visto/consumido, quitar.
- Sin métricas de tiempo ni de reproducción.

### 3.3. Pantalla: Hemeroteca

- Todas las publicaciones de las fuentes seguidas.
- Filtros por fuente, tema y formato.
- Búsqueda por texto (título y descripción).
- Paginación explícita. Sin scroll infinito, sin recomendaciones intercaladas.

### 3.4. Pantalla: Fuentes y preferencias

- Lista de fuentes con estado de la última ingesta.
- Alta de fuente por URL de feed.
- Definición de temas con palabras clave.
- Preferencias: temas incluidos/excluidos, formatos permitidos, duración mínima/máxima.

### 3.5. Estados vacíos y de error

| Situación | Respuesta de la interfaz |
|-----------|--------------------------|
| Sin fuentes | «Aún no sigues ninguna fuente. Añade una para empezar.» |
| Sin ítems tras ingesta | «Tus fuentes no han publicado nada nuevo todavía.» |
| Edición vacía | «Hoy no hay recomendaciones. Puedes explorar la hemeroteca.» |
| Fuente inaccesible | La fuente se marca como «con error» sin romper la ingesta del resto. |
| Sin red | Mensajes locales; nunca bloqueos ni castigos. |

---

## 4. El recomendador (versión MVP — modelo A/B)

Se implementa primero la capacidad del **modelo A (conservador)** dejando el diseño preparado para el **modelo B (equilibrado)**.

### 4.1. Etapa 1 — Recuperación de candidatos

Para una edición se reúnen ítems porque:

1. Pertenecen a una **fuente activa**.
2. Fueron publicados en la ventana de candidatura (por defecto, últimos 14 días).
3. **No** están excluidos por formato ni por duración según preferencias.
4. **No** han sido ya presentados en una edición reciente (por defecto, últimos 7 días).
5. **No** son duplicados (misma URL canónica o huella de título normalizado).
6. Están asociados a **al menos un tema incluido**.

Los candidatos se agrupan en tres orígenes:

- `followed`: fuente que ya sigues.
- `discovery`: fuente candidata afín a un tema declarado pero que no sigues todavía.
- `contextual`: fuente seguida cuyo tema está poco representado en la edición actual.

### 4.2. Etapa 2 — Puntuación determinista

Cada candidato recibe una puntuación **inspeccionable**, suma ponderada de señales acotadas:

| Señal | Peso | Definición |
|-------|------|------------|
| `topicMatch` | 0.35 | Grado de coincidencia con temas incluidos (0–1). |
| `preferenceMatch` | 0.20 | Cumplimiento de preferencias explícitas (formato, duración). |
| `freshness` | 0.15 | Decaimiento temporal desde la publicación. |
| `sourceAffinity` | 0.15 | Afinidad de la fuente según feedback explícito confirmado. |
| `novelty` | 0.15 | Penaliza repetir tema/formato/formato reciente. |

Reglas obligatorias:

- Ninguna señal usa tiempo de lectura, reproducción, hora de acceso ni frecuencia de apertura.
- La puntuación **no** pretende medir veracidad ni calidad informativa. Se etiqueta explícitamente como *relevancia*, nunca como *fiabilidad*.

### 4.3. Etapa 3 — Selección diversificada

- Cupo global provisional: **10 ítems** (no obligatorio; si hay 6 buenos, la edición tiene 6).
- Cupos por origen:

| Origen | Cupo máximo |
|--------|-------------|
| `followed` | 5 |
| `discovery` | 3 |
| `contextual` | 2 |

- **Límite de repetición:** máximo **2 ítems por fuente** y **máximo 1 ítem del mismo tema dominante consecutivo**.
- Selección greedy con penalización por diversidad: se recorre por puntuación y se descuenta una penalización fija si el ítem comparte fuente o tema con los ya elegidos.

### 4.4. Explicabilidad y reproducibilidad

- Cada ítem de edición guarda: puntuación, desglose por señal, motivo en lenguaje natural y **versión del algoritmo**.
- Una edición pasada puede reconstruirse: la versión fija cómo se puntuó y seleccionó.
- El motivo se redacta a partir de la señal dominante (p. ej. «Coincide con tu interés explícito en <tema>»).

---

## 5. Arquitectura

```
PWA (Next.js)  ──▶  API de Next.js  ──▶  PostgreSQL
                          │
                          ├──▶ Recomendador (TypeScript determinista)
                          └──▶ Ingesta programada (worker + cron)
                                     │
                                     └──▶ Adaptadores RSS/Atom (y APIs autorizadas a futuro)
```

- **Frontend/PWA:** Next.js + TypeScript + Tailwind CSS.
- **Backend:** API Routes de Next.js.
- **Base de datos:** PostgreSQL con Drizzle ORM.
- **Ingesta:** worker independiente ejecutable por cron.
- **Recomendación:** TypeScript puro, reglas deterministas y testeables.
- **Reproducción:** fuera de la aplicación, en FreeTube.

### 5.1. Stack

| Componente | Tecnología |
|------------|------------|
| Frontend | Next.js + TypeScript |
| Estilos | Tailwind CSS |
| Backend | API Routes de Next.js |
| Base de datos | PostgreSQL |
| ORM | Drizzle |
| Tareas programadas | Cron + worker |
| RSS | Parser RSS/Atom |

### 5.2. Configuración de entorno

| Variable | Uso |
|----------|-----|
| `DATABASE_URL` | Cadena de conexión a PostgreSQL. |
| `INGEST_USER_AGENT` | Identificación honesta del worker ante las fuentes. |
| `EDITION_SIZE` | Tamaño máximo de la edición (por defecto 10). |
| `CANDIDATE_WINDOW_DAYS` | Ventana de candidatura (por defecto 14). |
| `REPEAT_COOLDOWN_DAYS` | Cooldown de repetición (por defecto 7). |

---

## 6. Modelo de datos

Entidades principales (nombres en `snake_case`):

| Tabla | Propósito |
|-------|-----------|
| `users` | Cuentas de la aplicación (v0.2). Nombre, email, hash de contraseña, rol. |
| `sessions` | Sesiones activas con token y caducidad (v0.2). |
| `youtube_accounts` | Tokens OAuth por usuario (v0.2). |
| `collections` | Playlists y «Ver más tarde» importados (v0.2). |
| `collection_items` | Vídeos dentro de una colección (v0.2). |
| `sources` | Canales, podcasts y medios; incluye `user_id`, `kind`, `feed_url`, `is_followed`, `is_active`, estado de ingesta. |
| `items` | Vídeos, episodios y artículos; incluye `user_id`, `source_id`, URL canónica, fechas, duración, formato. |
| `topics` | Intereses configurables con palabras clave, por usuario. |
| `item_topics` | Relación muchos-a-muchos ítem–tema con `score`. |
| `preferences` | Elecciones explícitas de formato y duración, por usuario. |
| `daily_editions` | Ediciones generadas con fecha y versión del algoritmo, por usuario. |
| `edition_items` | Ítems incluidos con origen, puntuación, desglose y motivo. |
| `saved_items` | Biblioteca personal con estado (`saved`, `consumed`, `removed`). |
| `feedback` | Valoraciones deliberadas y su estado de confirmación. |
| `ingestion_runs` | Estado de actualización por fuente y ejecución. |

Invariantes:

- Toda entidad de contenido y configuración pertenece a un `user_id`.
- `items` es único por `(source_id, external_id)` y por `(user_id, canonical_url)`.
- `sources` es único por `(user_id, feed_url)`; `topics` por `(user_id, name)`.
- `preferences` es único por `(user_id, key)`.
- `edition_items` es único por `(edition_id, item_id)`.
- Cada `edition_item` referencia una `algorithm_version`.

---

## 7. Criterios de aceptación del MVP

1. Puedo añadir una fuente RSS válida y ver sus últimas publicaciones tras una ingesta.
2. Una fuente rota no impide la ingesta del resto y queda marcada como «con error».
3. Puedo declarar un tema con palabras clave y comprobar que clasifica ítems.
4. Puedo generar una edición diaria que respete cupos, límite por fuente y tamaño máximo.
5. Cada ítem de la edición muestra un motivo comprensible y guarda su versión de algoritmo.
6. Generar dos veces la edición del mismo día con los mismos datos produce el mismo resultado (determinismo).
7. Puedo guardar un ítem, verlo en la biblioteca y marcarlo como consumido.
8. Puedo buscar y paginar la hemeroteca de mis fuentes.
9. Puedo exportar mis datos y borrarlos por completo.
10. La aplicación no registra tiempo de reproducción, hora de acceso ni frecuencia de apertura.

---

## 8. Privacidad por diseño

- Minimización de datos: solo fuentes, preferencias, guardados y feedback explícito.
- Sin telemetría de terceros como señal de recomendación; los errores técnicos se
  registran aparte. Cualquier métrica interna futura será explícita y local.
- Exportación y borrado totales.
- Si en el futuro se usan embeddings vía API externa, se documentará y se preferirán modelos locales.

---

## 9. Roadmap posterior al MVP

1. Modelo B completo: cuota de descubrimiento automático y exploración contextual.
2. Descubrimiento de fuentes: OPML, directorios y relaciones trazables.
3. Evaluación de relevancia semántica (pgvector) frente a reglas deterministas.
4. Alertas de acontecimientos concretos elegidos por el usuario.
5. Integración de más adaptadores (APIs autorizadas) tras validar condiciones de uso.
