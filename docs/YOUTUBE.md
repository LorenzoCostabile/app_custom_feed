# YouTube: feed de recomendaciones y cookie

Documento operativo de la integración más frágil de Atención. Describe cómo se
obtiene el feed, cómo se gestiona la cookie y qué falta por cerrar.

## 1. Regla de producto

> **Un hueco no se rellena.** Si el feed de YouTube no está accesible, esa fuente
> aporta cero ítems. La edición sale más corta y se declara el motivo. No se
> sustituye por otras fuentes, no se inventan recomendaciones y no se reordena
> para compensar.

Esto también aplica a los temas: un vídeo sin clasificar no se descarta ni se le
asigna un tema inventado.

## 2. Motor

- **Motor único de la app:** `youtubei.js`, clavado en la versión exacta
  `18.3.0` (sin `^`). Se actualiza solo cuando la fixture del feed siga pasando.
- **`yt-dlp` no se ejecuta dentro de la app.** Se usa como herramienta local de
  escritorio para exportar y validar la cookie del navegador.
- Motivos de la decisión (comprobados en octubre de 2026):
  - `youtubei.js` publica correcciones del parser cada 2–4 semanas; la 18.2.0
    arregló justo los nodos `LockupView` que usa el feed.
  - `yt-dlp ":ytrec"` **sin sesión devuelve exit 0 y cero líneas**: miente
    cuando falla. `:ytsubs` sí da un error explícito, y se usa como sonda.
  - Añadir `yt-dlp` al contenedor supone Python y ~100 MB extra sin mejorar el
    contrato de datos.

## 3. Ciclo de vida de la cookie

```
navegador → yt-dlp → cookies.txt → asistente → POST /api/youtube/cookie
                                                    │
                                          normalizar + validar
                                                    │
                                          cifrar (AES-256-GCM)
                                                    │
                                    youtube_accounts.cookie_encrypted
```

1. **Exportar.** `tools/youtube-cookie-wizard/Iniciar.bat` (Windows) detecta
   Firefox/Chrome/Edge/Brave, instala `yt-dlp` en un `.venv` local y ejecuta
   `--cookies-from-browser` contra `:ytsubs`. Si imprime IDs, la sesión es válida.
2. **Normalizar.** La app acepta dos formatos y los reduce a una cabecera corta:
   - `cookies.txt` de Netscape (lo que exporta `yt-dlp`), o
   - la cabecera `cookie` copiada del navegador.
   Se conservan las cookies de `youtube.com` y solo las de sesión de
   `google.com`. Se descarta el resto y se deduplican nombres.
3. **Validar.** `validateCookie()` crea un cliente InnerTube y comprueba la
   sesión con `account.getInfo(true)`, **no** con `session.logged_in`: esa
   bandera solo mira si hay cookies de sesión, así que una cookie inventada
   también la activa. La lista de cuentas exige una sesión real. Distingue:
   - `valid`: sesión y feed correctos.
   - `no_feed`: sesión válida, pero YouTube no ofrece recomendaciones (historial
     desactivado, consentimiento pendiente…). La cookie **se guarda**; el feed
     simplemente no aportará ítems.
   - `invalid`: cookie caducada o sin sesión. **No se guarda.**
   - `error`: fallo de red o del protocolo. **No se guarda** y se reintenta; no
     se confunde con una cookie caducada.
4. **Guardar.** Se cifra con `TOKEN_ENCRYPTION_KEY` y se actualiza
   `youtube_accounts.cookie_encrypted`. Nunca se registra el valor.
5. **Comprobar.** `GET /api/youtube/cookie/status` hace la misma validación en
   vivo y devuelve estado + `videoCount`. Se llama desde el botón «Comprobar
   cookie» y desde el asistente, no en cada carga de página.
6. **Refrescar.** En producción, el servicio `scheduler` ejecuta
   `npm run recommendations` a las 06:45 (`Europe/Madrid`). Si falla, escribe
   `last_status = error` y el motivo en `sources.last_error`, y la edición de las
   07:00 sale sin esos ítems.

### Cookies imprescindibles

| Grupo | Nombres |
|---|---|
| Sesión principal | `SID`, `__Secure-1PSID` o `__Secure-3PSID` |
| Sesión secundaria | `HSID`, `SSID`, `APISID`, `SAPISID`, `__Secure-1PAPISID` o `__Secure-3PAPISID` |

Si falta el grupo principal, la petición se rechaza con el nombre que falta. Si
falta el secundario, se guarda un aviso y la validación en vivo decide.

## 4. API

| Método | Ruta | Respuesta |
|---|---|---|
| `GET` | `/api/youtube/cookie/status` | `{ hasCookie, status, message, videoCount, checkedAt }` |
| `POST` | `/api/youtube/cookie` | `{ ok, status, videoCount, cookieCount, warnings }` |
| `DELETE` | `/api/youtube/cookie` | `{ ok: true }` |

`status` ∈ `missing` · `no_account` · `valid` · `no_feed` · `invalid` · `error`.

Códigos de error del `POST`: `400` si falta la sesión o la cookie está caducada;
`502` si no se pudo comprobar contra YouTube; `401` sin sesión de Atención.

Todas las consultas van filtradas por `user_id`. No se devuelve la cookie ni
fragmentos de ella.

## 5. Asistente local (Windows)

Carpeta: `tools/youtube-cookie-wizard/`. Guía de uso en
[`LEEME.md`](../tools/youtube-cookie-wizard/LEEME.md).

- Escucha solo en `127.0.0.1:8765` (o el siguiente puerto libre).
- No se incluye en la imagen Docker.
- `.venv/` y `yt-cookies.txt` están en `.gitignore`.
- Si la app aún no tiene el endpoint, el asistente lo detecta y lo dice en vez
  de fallar en silencio.

## 6. Diagnóstico y estados visibles

| Situación | Mensaje / comportamiento |
|---|---|
| Cookie caducada | «La cookie de YouTube no es válida o la sesión ha caducado.» El feed aporta 0 ítems. |
| Historial desactivado | «Actívalo en https://www.youtube.com/feed/history». Sesión válida. |
| Consentimiento pendiente | «Abre youtube.com, acepta el aviso y vuelve a guardar la cookie.» |
| YouTube bloquea la IP | Error de red/protocolo (`502`), sin inventar ítems. |
| Cookie de otro usuario | No se puede: toda lectura/escritura va por `user_id`. |

## 7. Pendiente

1. **Comparación autenticada** de motores con una cookie real durante varios
   días; hoy la evidencia es de documentación y pruebas sin sesión.
2. **Fixture del feed** saneada y test de forma en CI. Cuando YouTube cambie un
   nodo, debe fallar la CI, no la edición de mañana.
3. **Paginación real** (`feed.continue()`): hoy `limit = 40` pero solo se lee la
   primera página (~20).
4. **Fechas honestas**: `publishedText` se guarda como texto y `firstSeenAt`
   como fecha real. Hoy `publishedAt` se fija al importar.
5. **Registro por ejecución** en `ingestion_runs` (`engine`, `duration_ms`,
   `raw_hash`) para responder «¿qué pasó a las 07:00?».
6. **`cookieUpdatedAt`** en `youtube_accounts` para mostrar «importada el…» sin
   una comprobación en vivo.
7. **Persistir la rotación de cookies.** YouTube puede rotar
   `__Secure-1PSIDTS` en cada uso; `youtubei.js` no guarda las `Set-Cookie`. Si
   el feed empieza a responder «Sign in» con una cookie recién exportada, hay
   que volver a exportarla. Habría que leer las cookies de la sesión del cliente
   y volver a cifrarlas tras cada uso.
