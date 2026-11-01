# Atención

Sistema multiusuario para descubrir información, seleccionar lo que merece tu
tiempo y consumirlo deliberadamente. El flujo termina cuando has decidido, no
cuando has consumido todo el contenido.

Diseño del MVP: [`docs/MVP.md`](docs/MVP.md). Filosofía de diseño:
[`docs/DISENO.md`](docs/DISENO.md). Plan por fases:
[`docs/ROADMAP.md`](docs/ROADMAP.md). Estado actual y próximos pasos:
[`docs/ESTADO.md`](docs/ESTADO.md).

Si vas a modificar el proyecto (persona o agente), empieza por
[`AGENTS.md`](AGENTS.md): reglas de arquitectura, comandos, secretos y
definición de «hecho».

## Estado

Este repositorio contiene el **MVP** en su versión multiusuario. Implementa el
bucle central:

1. Recuperar publicaciones de tus fuentes (RSS/Atom).
2. Preparar una edición diaria relevante y diversificada, con motivos.
3. Guardar contenidos en tu biblioteca.
4. Consumirlos fuera de la aplicación (FreeTube o enlace).

Cada cuenta tiene sus datos **completamente aislados**. La personalización es
**exclusivamente explícita**: no se infiere nada de tu tiempo de permanencia,
frecuencia de apertura, hora de acceso ni reproducción.

## Requisitos

- Docker Desktop (o Docker Engine) con Docker Compose.

No necesitas instalar Node.js ni PostgreSQL en tu máquina: ambos se ejecutan en
contenedores.

## Puesta en marcha con Docker

```bash
docker compose up --build
```

Esto levanta:

- **db**: PostgreSQL 16 con un volumen persistente `pgdata`.
- **app**: la aplicación Next.js en http://localhost:3000. Al arrancar espera a
  la base de datos, aplica las migraciones y, si defines `ADMIN_EMAIL` y
  `ADMIN_PASSWORD`, crea el administrador inicial.

La primera vez, define el administrador en tu `.env` antes de arrancar:

```bash
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=una-contraseña-larga
ADMIN_NAME=Administrador
```

Después entra en http://localhost:3000; te redirigirá a `/login`. Desde la
pantalla **Usuarios** (solo administradores) podrás crear el resto de cuentas.

### Autenticación

- Sesión con cookie `HttpOnly`; contraseñas con `scrypt`.
- Todas las rutas y APIs exigen sesión; cada usuario solo ve sus propios datos.
- `SESSION_COOKIE_SECURE=false` sirve para HTTP local. Ponlo a `true` (o quítalo
  en producción) cuando la app vaya detrás de un proxy con HTTPS.
- `GET /health` es público y sirve para el chequeo del proxy inverso.

### Fuentes de prensa incluidas (seed)

El repositorio trae una lista curada y validada de **medios españoles** (El País,
El Mundo, elDiario.es, El Confidencial, La Vanguardia, ABC, 20minutos, El
Español, El HuffPost, The Objective, Expansión, Cinco Días, Xataka, Hipertextual,
ADSLZone, Microsiervos, Jot Down, Zenda, Marca, AS, Mundo Deportivo…) para que
haya contenido desde el primer acceso. Para cargarlas en un usuario:

```bash
docker compose run --rm app npm run db:seed -- correo@ejemplo.com
# en desarrollo:
docker compose --profile dev run --rm dev npm run db:seed -- correo@ejemplo.com
```

El script es idempotente: solo añade las fuentes que falten. Después pulsa
**Generar edición ahora** en la portada (o ejecuta la ingesta y la edición por
separado, ver más abajo).

### Historial y estado de ingesta

- **Historial** (`/historial`): cada edición generada se guarda tal cual, con la
  fecha, el algoritmo y los motivos de cada recomendación.
- **Estado de ingesta** (en `Fuentes`): últimas ejecuciones por fuente, con
  publicaciones encontradas, nuevas y errores.

### Configurar fuentes y tamaño de la edición

En **Fuentes**, cada fuente tiene controles propios:

- **Mostrar en la edición**: al desmarcarlo la fuente se *oculta*; se sigue
  ingiriendo, pero no aporta candidatos a la edición (no hay que borrarla).
- **Actualizar fuente**: pausa temporalmente la ingesta sin borrar nada.
- **Máx. en edición**: tope de publicaciones de esa fuente por edición
  (por defecto 2).
- **Peso**: multiplicador de su puntuación (`1` es neutro; `2` la refuerza).

En **Preferencias** puedes fijar **Recomendaciones por edición** (por defecto
10). Los cupos por origen (5/3/2) se escalan a ese tamaño y, si hay suficientes
candidatos, la edición se rellena hasta el tamaño pedido respetando el tope de
cada fuente.

### Conectar YouTube (Fase 1)

Cada usuario puede conectar su cuenta de YouTube para importar sus
**suscripciones** (como fuentes), sus **playlists** y **«Ver más tarde»** (como
colecciones), con la duración de cada vídeo. La app nunca reproduce vídeos en
móvil ni lee tu actividad.

1. En Google Cloud habilita **YouTube Data API v3** y crea un **cliente OAuth de
   tipo Web** con el redirect URI `http://TU_DOMINIO/api/youtube/callback`.
   La **API key** es opcional: solo hace falta si quieres leer las duraciones de
   los vídeos sin usar los tokens OAuth del usuario (`videos.list`).
2. Rellena en `.env`:

   ```bash
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   YOUTUBE_REDIRECT_URI=http://localhost:3000/api/youtube/callback
   TOKEN_ENCRYPTION_KEY=...   # openssl rand -base64 32
   # opcional:
   # GOOGLE_API_KEY=...
   ```

3. Reinicia la app y entra en **Fuentes → Conectar YouTube**. Tras autorizar,
   se importan suscripciones y colecciones. Usa **Sincronizar ahora** cuando
   quieras refrescar; las colecciones se ven en **Colecciones**.

Los tokens OAuth se guardan cifrados con AES-256-GCM usando
`TOKEN_ENCRYPTION_KEY`. Mientras la app de Google esté en modo *Prueba*, el
refresh token caduca a los 7 días: revisa **Sincronizar ahora** o publica la app.

#### Feed de recomendaciones (scraping InnerTube)

Además de la API oficial, puedes importar tu **feed real de recomendaciones** de
YouTube (la portada de youtube.com). Se obtiene con la librería `youtubei.js`
(InnerTube), que **requiere tu cookie de sesión**:

1. En **Fuentes → Cuenta de YouTube**, pega el valor de la cabecera `cookie`
   de una petición a `youtube.com` estando con la sesión iniciada (incluye
   `SID`, `HSID`, `SSID`, `__Secure-1PSID`, etc.).
2. Pulsa **Guardar cookie**. Se almacena cifrada con `TOKEN_ENCRYPTION_KEY`.
3. Pulsa **Actualizar recomendaciones** (o **Sincronizar ahora**). Los vídeos
   entran en una fuente dedicada «Recomendaciones de YouTube».

Requisitos de la cuenta de YouTube: el **historial de reproducción debe estar
activado** (<https://www.youtube.com/feed/history>); si está desactivado, YouTube
devuelve la portada vacía y la app mostrará un aviso. La app añade el
consentimiento de cookies (`SOCS=CAI`) si tu cookie no lo incluye. La cookie deja
de valer si cierras esa sesión, cambias la contraseña o revocas los dispositivos:
en ese caso vuelve a iniciar sesión en el navegador y pega una cookie nueva. Las
recomendaciones importadas no necesitan clasificación por temas: los temas solo
ponderan, no filtran.

Aviso: este método no usa la API oficial; es frágil (puede dejar de funcionar si
YouTube cambia) y **va contra los Términos de YouTube**. Úsalo bajo tu
responsabilidad. Si caduca la sesión, vuelve a pegar la cookie.

### Despliegue en TrueNAS Scale

Publica la imagen en Docker Hub y usa [`docker-compose.prod.yml`](docker-compose.prod.yml)
como *custom app*:

```bash
docker build -t TU_USUARIO/atencion:0.2.0 .
docker push TU_USUARIO/atencion:0.2.0
```

Configura en la app del NAS:

- `ATENCION_IMAGE` con tu imagen (`TU_USUARIO/atencion:0.2.0`).
- `DATABASE_URL` (o deja el servicio `db` del compose).
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` (solo la primera vez).
- `SESSION_COOKIE_SECURE=true` si el proxy del NAS sirve por HTTPS.
- Puerto interno `3000`; apunta el proxy inverso del NAS al puerto publicado.
- Un volumen persistente para PostgreSQL.

Detén los servicios con `Ctrl+C` o:

```bash
docker compose down          # detiene (conserva los datos)
docker compose down -v       # detiene y borra el volumen de datos
```

### Modo desarrollo (recarga en caliente)

```bash
docker compose --profile dev up dev
```

Monta el código del repositorio dentro del contenedor y ejecuta `next dev`.

### Estructura Docker

```
Dockerfile                    Imagen de la aplicación (build de producción)
docker/entrypoint.sh          Espera BD, migra y crea el admin inicial
docker-compose.yml            Servicios db, app y dev (perfil "dev")
docker-compose.prod.yml       Custom app para TrueNAS (imagen de Docker Hub)
.dockerignore
```

## Trabajos programados (ingesta y edición)

Ejecútalos puntualmente dentro del contenedor:

```bash
docker compose run --rm app npm run ingest    # recupera publicaciones nuevas
docker compose run --rm app npm run edition   # genera la edición diaria
```

También puedes lanzarlos desde la interfaz: en **Fuentes** el botón **Actualizar
fuentes ahora** y en la portada **Generar edición ahora** (hace la ingesta y la
edición de una vez).

Para programarlos, añade un servicio con cron o usa el Programador de tareas de
Windows apuntando a esos comandos. Ejemplo de cron cada hora y cada mañana:

```cron
0 * * * *  docker compose -f /ruta/atencion/docker-compose.yml run --rm app npm run ingest
0 7 * * *  docker compose -f /ruta/atencion/docker-compose.yml run --rm app npm run edition
```

## Alternativa sin Docker

Si ya tienes Node.js 20+ y PostgreSQL 14+ instalados:

```bash
cp .env.example .env        # ajusta DATABASE_URL
npm install
npm run db:migrate          # aplica migraciones (drizzle/)
npm run dev
```

## Estructura

```
docs/                         Diseño del MVP
Dockerfile                    Imagen de producción de la app
docker-compose.yml            App + PostgreSQL
docker/entrypoint.sh          Espera de BD y migraciones
drizzle/                      Migraciones SQL generadas
src/
  app/                        PWA Next.js (App Router) y API
  components/                 Interfaz (servidor y cliente)
  db/                         Cliente Drizzle y esquema
  lib/
    auth/                     Sesiones, contraseñas y guardas de acceso
    ingestion/                Adaptadores RSS/Atom y lógica de ingesta
    recommendation/           Recomendador determinista
    youtube/                  OAuth, API, cifrado, feed InnerTube y sincronización
    queries.ts                Consultas de lectura
  worker/                     Entradas ejecutables para cron
scripts/migrate.ts            Aplicación de migraciones
scripts/bootstrap-admin.ts    Creación del administrador inicial
scripts/seed-sources.ts       Fuentes de prensa españolas (idempotente)
```

## Regenerar migraciones

Tras cambiar `src/db/schema.ts` (requiere Node.js local o ejecutarlo en el
contenedor de desarrollo):

```bash
npm run db:generate
```

## El recomendador (versión mvp-1.0)

Determinista y auditable, en tres etapas:

1. **Recuperación de candidatos**: fuentes activas, ventana temporal, temas
   incluidos, sin duplicados ni repeticiones recientes.
2. **Puntuación**: suma ponderada de `topicMatch`, `preferenceMatch`,
   `freshness`, `sourceAffinity` y `novelty`. La puntuación mide *relevancia*,
   nunca *veracidad* ni *calidad informativa*.
3. **Selección diversificada**: cupos por origen (5 seguidas / 3 descubrimiento
   / 2 contextual, escalados al tamaño de la edición), tope por fuente
   configurable y penalización por repetición de tema. Cada ítem guarda su
   desglose, su motivo y la versión del algoritmo.

Ejecuta las pruebas del recomendador (con Node.js local o en el contenedor):

```bash
npm test
# o, sin Node.js instalado:
docker compose --profile dev run --rm dev npm test
```

## Privacidad

- Minimización de datos: fuentes, preferencias, guardados y feedback explícito.
- Sin telemetría de terceros: los datos no salen de la app. Una métrica interna
  futura sería local, explícita y borrable.
- Exportación (`/api/export`) y borrado total (`DELETE /api/data`) desde la
  pantalla de Fuentes.

## Reproducción

FreeTube no se integra en la lógica de Atención. La aplicación ofrece enlaces
`freetube://` para vídeos de YouTube y, como alternativa, copiar el enlace o
abrir la fuente.
