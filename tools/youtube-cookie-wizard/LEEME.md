# Asistente de cookie de YouTube

Herramienta **local para Windows** que lee la cookie de tu navegador, comprueba
que la sesión de YouTube sigue viva y la entrega a Atención.

No hay que copiar cadenas enormes a mano ni buscar cookies en las herramientas
del navegador. El asistente hace tres cosas y te dice el resultado de cada una:

1. Prepara `yt-dlp` dentro de `tools/youtube-cookie-wizard/.venv`.
2. Exporta las cookies del navegador que elijas y consulta tus suscripciones
   para confirmar que la sesión es válida.
3. Inicia sesión en tu instancia de Atención (si hace falta) y guarda allí la
   cookie, ya cifrada.

## Antes de empezar

| Necesitas | Detalle |
|---|---|
| **Windows** | Probado en Windows 10/11. |
| **Python 3** | Si `python --version` funciona, ya lo tienes. Si no, instálalo desde [python.org](https://www.python.org/downloads/windows/) marcando *Add python.exe to PATH*. |
| **Un navegador con sesión en YouTube** | Se recomienda **Firefox**. También detecta Chrome, Edge y Brave. |
| **Atención en marcha** | Para el paso 3. Con Docker: `docker compose up -d` y `http://localhost:3000`. |
| **Cuenta de YouTube conectada en Atención** | La cookie se guarda junto a la cuenta de YouTube (OAuth). Si aún no la has conectado, hazlo primero en *Fuentes*. |

## Uso

1. Haz doble clic en **`Iniciar.bat`**.
2. Se abre una página en tu navegador. Si no se abre, copia la dirección
   `http://127.0.0.1:8765/` que aparece en la ventana negra.
3. **Paso 1:** pulsa «Preparar yt-dlp». La primera vez descarga unos pocos
   megabytes dentro de `.venv`.
4. **Paso 2:** elige el navegador, sigue los pasos que aparecen y pulsa
   «Exportar y comprobar». Debes ver «Sesión comprobada».
5. **Paso 3:** escribe la dirección de Atención y, si la app te lo pide, tu
   correo y contraseña. Pulsa «Guardar cookie en Atención».

Cuando termine, cierra la ventana negra o pulsa «Cerrar el asistente».

## Qué hace exactamente con tus datos

- La cookie **no se muestra** en la interfaz ni se escribe en el registro.
- El archivo temporal `yt-cookies.txt` se crea en esta carpeta y se puede
  borrar con el botón «Borrar cookie exportada» o a mano.
- La cookie viaja **solo** a la dirección de Atención que indiques. Por defecto,
  `http://localhost:3000`.
- El correo y la contraseña solo se usan para abrir una sesión en tu propia
  instancia. No se guardan en ningún archivo.
- El servidor local escucha únicamente en `127.0.0.1`: no es accesible desde
  otros equipos de la red.

## Si algo falla

| Mensaje | Qué hacer |
|---|---|
| «No se ha encontrado Python 3» | Instala Python y marca *Add python.exe to PATH*. Vuelve a abrir `Iniciar.bat`. |
| «El navegador tiene la base de datos de cookies bloqueada» | Cierra el navegador por completo, también desde la bandeja del sistema, y repite. |
| «Failed to decrypt» o error al leer Chrome/Edge/Brave | Usa **Firefox**. Los navegadores basados en Chrome cifran las cookies con una clave que `yt-dlp` no siempre puede leer. |
| «No encuentro el perfil de ese navegador» | Abre el navegador una vez, entra en YouTube y repite. Si tienes varios perfiles, escribe su nombre en el campo opcional. |
| «Login details are needed» | La sesión no está iniciada en ese navegador. Entra en `youtube.com` con tu cuenta y comprueba que aparece tu avatar. |
| «No hay suscripciones» | La sesión se leyó, pero la cuenta no tiene suscripciones. La cookie puede servir igualmente. |
| «Conecta tu cuenta de YouTube primero» | En Atención, ve a *Fuentes* y conecta tu cuenta de YouTube (OAuth). Después repite el paso 3. |
| «La app responde, pero aún no tiene el endpoint de importación» | Tu instancia de Atención es anterior a esta versión. Actualízala o pega la cookie a mano en *Fuentes*. |
| El navegador no se abre solo | Abre `http://127.0.0.1:8765/` a mano. Si el puerto está ocupado, el asistente usa el siguiente libre (hasta 8805). |

## Para desarrolladores

- `wizard.py`: servidor HTTP local sin dependencias externas. Rutas: `/api/env`,
  `/api/install`, `/api/export`, `/api/probe`, `/api/push`, `/api/forget` y
  `/api/shutdown`.
- `static/`: interfaz en HTML, CSS y JavaScript sin frameworks.
- No se versionan `.venv/` ni `yt-cookies.txt`.
- El asistente no forma parte de la imagen Docker; es una herramienta de
  escritorio para el PC del usuario.

### Probar sin interfaz

```powershell
curl.exe http://127.0.0.1:8765/api/env
curl.exe -X POST http://127.0.0.1:8765/api/probe -H "Content-Type: application/json" -d '{\"url\":\"http://localhost:3000\"}'
```

La exportación real necesita un navegador con sesión iniciada; no se puede
simular con un archivo de prueba sin saltarse la comprobación de YouTube.
