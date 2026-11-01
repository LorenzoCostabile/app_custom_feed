# Atención — Roadmap

Plan de evolución desde el MVP v0.1 (un solo usuario, ingesta RSS) hasta la
aplicación v0.2 (multiusuario en NAS, con YouTube integrado).

Estado actual: **Fase 1 implementada** (verificación con cuenta real pendiente);
adelantados de la Fase 2 el historial de ediciones, el panel de estado de ingesta
y el botón «Generar edición ahora». Incluye un *seed* de prensa española
(`npm run db:seed`), **configuración por fuente** (ocultar, tope por edición y
peso), **tamaño de edición configurable** y el **feed real de recomendaciones de
YouTube** vía `youtubei.js` (cookie de sesión cifrada).

---

## Resumen de decisiones

| Dimensión | Decisión |
|-----------|----------|
| Despliegue | NAS TrueNAS Scale como *custom app*; imagen en Docker Hub; proxy inverso del NAS |
| Usuarios | Multiusuario, admin crea cuentas, datos totalmente aislados |
| Autenticación | Usuario + contraseña (hash), sesión con cookie |
| Cuenta de YouTube | OAuth por usuario, token guardado, re-sincronización diaria + botón manual |
| Feed de recomendaciones | Scraping InnerTube con la cookie del usuario (cifrada); no usa la API oficial |
| Configuración por fuente | Activar/ocultar, tope por edición y peso |
| Tamaño de edición | Configurable por usuario (preferencias; por defecto 10) |
| Datos de YouTube | Suscripciones, playlists, «Ver más tarde», duración/metadatos |
| Playlists y «Ver más tarde» | Colecciones en la hemeroteca |
| Filtro principal | Canal activo/inactivo |
| Temas | Solo suben la puntuación; no son obligatorios |
| Móvil | Descubrir y guardar; vídeos no reproducibles (podcasts/lecturas sí) |
| Escritorio | Reproducción en FreeTube |
| Edición diaria | Cron 07:00 Europe/Madrid, una edición por usuario |

---

## Fase 0 — Multiusuario y despliegue

Objetivo: que varias personas puedan usarlo con sus datos aislados y que la
aplicación se pueda instalar en el NAS.

- [x] Tablas `users` y `sessions`.
- [x] Añadir `user_id` a `sources`, `items`, `topics`, `preferences`,
      `daily_editions`, `saved_items`, `feedback`, `ingestion_runs` y ajustar las
      restricciones únicas para que sean por usuario.
- [x] Hash de contraseñas y sesión con cookie `httpOnly`.
- [x] Página de login, logout y middleware que protege la app.
- [x] Aislar todas las consultas y endpoints por usuario.
- [x] Alta de usuarios desde la interfaz (solo admin) y *bootstrap* del primer
      administrador por variables de entorno.
- [x] Endpoint `/health` para el proxy inverso.
- [ ] Imagen publicada en Docker Hub y compose de *custom app* para TrueNAS.

Criterios de aceptación:

1. Sin sesión, cualquier ruta redirige a `/login`.
2. Dos usuarios no ven datos del otro bajo ninguna ruta ni API.
3. El admin crea usuarios; un usuario normal no puede.
4. `GET /health` responde `200` sin autenticación.

---

## Fase 1 — Integración con YouTube

Objetivo: importar la cuenta y mantener las colecciones al día. Requiere un
proyecto de Google Cloud (OAuth Client + API key) por parte del usuario.

- [x] Tablas `youtube_accounts`, `collections` y `collection_items`.
- [x] Flujo OAuth (Google) con token de refresco cifrado.
- [x] Importar suscripciones como fuentes (activas por defecto).
- [x] Importar playlists propias como colecciones (las playlists guardadas no
      las devuelve la API).
- [~] «Ver más tarde» como colección: **no es posible**; la API de YouTube la
      bloquea (`watchLaterNotAccessible`).
- [x] Duración y metadatos vía `videos.list` (con API key o con el token OAuth
      del usuario).
- [x] Botón «Sincronizar ahora» (la re-sincronización diaria llega en la Fase 3).
- [x] Feed real de recomendaciones vía `youtubei.js` (cookie de sesión cifrada).
- [x] Toggle activo/inactivo por canal y por fuente (interfaz en Fuentes).
- [x] **Verificado**: la API devuelve `404 channelNotFound` cuando la cuenta no
      tiene canal propio (p. ej. algunas cuentas de marca); en ese caso hay que
      reconectar eligiendo el canal correcto.

Criterios de aceptación:

1. Conecto mi cuenta una vez y veo mis suscripciones como fuentes.
2. Desactivo un canal y desaparecen sus vídeos de la edición.
3. Mis playlists y «Ver más tarde» aparecen como colecciones en la hemeroteca.
4. Una re-sincronización actualiza los cambios sin duplicar.

---

## Fase 2 — Algoritmo y experiencia

- [ ] Candidatos = todo lo de fuentes activas; los temas ponderan, no filtran.
- [~] CRUD de fuentes: hechos activar/pausar, ocultar, tope por edición y peso;
      falta editar/eliminar desde la interfaz.
- [ ] Interfaz de feedback («más de esto», «menos de esta fuente», «no me
      sirvió») con confirmación antes de cambiar el perfil.
- [x] Historial de ediciones: consultar ediciones pasadas y sus motivos.
- [x] Panel de estado de ingesta por fuente y errores.
- [x] Botón «Generar edición ahora» (ingesta + edición desde la portada).
- [x] Fuentes de prensa española precargadas (`scripts/seed-sources.ts`).
- [x] Configuración por fuente (activar/ocultar, tope por edición, peso).
- [x] Tamaño de edición configurable por usuario.

Criterios de aceptación:

1. Una fuente sin tema asociado puede aparecer en la edición.
2. Puedo deshacer o confirmar una valoración antes de que afecte al perfil.
3. Puedo abrir una edición anterior y ver por qué se eligió cada ítem.

---

## Fase 3 — Plataforma

- [ ] PWA instalable: manifest, iconos y service worker.
- [ ] Bloqueo de vídeos en móvil («Disponible solo en el ordenador»); podcasts y
      lecturas sí se abren.
- [ ] Contenedor cron: ingesta cada hora, edición a las 07:00 Europe/Madrid por
      usuario.
- [ ] Reproducción en FreeTube desde el escritorio.

Criterios de aceptación:

1. La app se instala como PWA en móvil y escritorio.
2. En móvil no existe ningún enlace que reproduzca un vídeo.
3. Cada usuario tiene su edición de las 07:00 sin intervención manual.

---

## Fase 4 — Descubrimiento de fuentes

La parte más trabajosa del diseño original (sección 2.3).

- [ ] Exploración temática de canales y podcasts.
- [ ] Curación externa: OPML, directorios y newsletters.
- [ ] Descubrimiento por relaciones, trazable y permitido.

---

## Fuera de alcance

Notificaciones de última hora, resúmenes automáticos, análisis ideológico,
puntuaciones de credibilidad opacas, importación del historial de YouTube,
perfiles psicológicos, filtrado colaborativo y telemetría enviada a terceros.
