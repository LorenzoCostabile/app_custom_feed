# Atención — Filosofía de diseño

Este documento explica **por qué** la aplicación se ve y se comporta así. No es
una guía de estilo para decorar pantallas: es el contrato entre el producto y
quien lo usa. Si una decisión de interfaz no se puede justificar con estos
principios, no está lista.

Documentos relacionados: [`MVP.md`](MVP.md) (diseño funcional),
[`ROADMAP.md`](ROADMAP.md) (fases), [`ESTADO.md`](ESTADO.md) (estado real) y
[`../AGENTS.md`](../AGENTS.md) (reglas operativas).

---

## 1. La tesis

El problema que resuelve Atención no es la falta de contenido, sino su exceso.
Casi todas las aplicaciones compiten por retener atención: infinito, notificaciones,
rachas, métricas. Atención hace lo contrario: **prepara una edición corta y la
termina**.

La metáfora que gobierna el diseño es la de una **publicación impresa de una sola
tirada**, no la de un *feed*:

- Tiene portada, secciones y un final explícito.
- Alguien la compuso antes de que la leyeras, con criterio y con motivos.
- No se actualiza sola mientras la lees.
- No sabe si la has leído, cuánto has tardado ni qué has hecho después.

### El contrato

1. **La edición termina.** Siempre hay un «Fin de la edición». No hay más abajo.
2. **Aquí se decide; se consume fuera.** La app no reproduce vídeos ni mide
   consumo.
3. **Cada recomendación se explica.** Si no hay motivo, no hay recomendación.
4. **Nada se deduce de tu comportamiento.** Lo que la app sabe de ti lo has
   escrito tú.
5. **Tus datos son tuyos y están aislados.** Exportables, borrables, invisibles
   para otras cuentas.

---

## 2. Principios

### 2.1. La edición termina

**Implica:** un número pequeño y acotado de recomendaciones (10 por defecto),
cierre explícito, paginación en lugar de scroll infinito.

**Prohíbe:** carga automática al hacer scroll, «relacionados», «sigue leyendo»,
contadores de pendientes, insignias de «nuevo».

### 2.2. Se decide aquí, se consume fuera

**Implica:** la acción principal es **guardar** o **abrir en FreeTube/enlace**. La
app es una mesa de decisión, no un reproductor.

**Prohíbe:** reproductor embebido, autoplay, miniaturas grandes que inviten a
quedarse, historial de reproducción.

### 2.3. Todo tiene un motivo

**Implica:** cada tarjeta muestra una frase en lenguaje natural que explica por
qué está ahí, y el historial conserva el desglose de señales y la versión del
algoritmo.

**Prohíbe:** recomendaciones «mágicas», puntuaciones sin explicar, cajas negras.
La puntuación se llama siempre **relevancia**, nunca «calidad» ni «fiabilidad».

### 2.4. La personalización se declara, no se deduce

**Implica:** fuentes, temas, formatos, duraciones y feedback se eligen de forma
explícita. El motor solo usa esas señales.

**Prohíbe:** inferir preferencias por tiempo de permanencia, clics, hora de
acceso, frecuencia de apertura o reproducción. Nada de perfiles psicológicos ni
«usuarios similares».

### 2.5. Nada de espejos

La app **no te devuelve métricas de ti mismo**.

**Implica:** silencio sobre uso, tiempo, rachas y progreso.

**Prohíbe:** gráficos de actividad, «has leído 12 de 40», «llevas 5 días
seguidos», resúmenes semanales de comportamiento, notificaciones de retención.

La única analítica admitida es la **operativa**: estado de ingesta y errores
técnicos, visibles en Fuentes.

### 2.6. Calma antes que estímulo

**Implica:** una sola columna, papel cálido, bordes finos, tipografía del sistema,
sin animaciones ni color de marca a gran escala.

**Prohíbe:** degradados, sombras profundas, ilustraciones decorativas, animaciones
de entrada, vídeo de fondo, *confetti*, emojis.

### 2.7. Determinismo y memoria

**Implica:** con los mismos datos, la misma edición. Cada edición pasada se
conserva tal cual se generó, con su versión de algoritmo.

**Prohíbe:** aleatoriedad en la selección, ediciones que se reescriben solas,
pérdida de motivos históricos.

### 2.8. Privacidad como estructura

**Implica:** aislamiento por `user_id`, sesión con cookie `HttpOnly`, secretos
cifrados, exportación y borrado total.

**Prohíbe:** cuentas compartidas, datos cruzados entre usuarios, telemetría de
terceros, cookies de analítica.

### 2.9. Una sola voz, en español llano

**Implica:** interfaz, errores y documentación en español; identificadores de
código en inglés. Frases cortas, sin jerga técnica en pantalla.

**Prohíbe:** anglicismos innecesarios («feed», «track», «engagement»), mensajes
culpabilizadores, signos de exclamación.

---

## 3. Voz y tono

La app habla como un editor sobrio, no como un asistente entusiasta. Tutea, afirma
y no persuade.

| Decimos | No decimos |
|---|---|
| «Tu edición de hoy» | «¡Tu dosis diaria!» |
| «Guardar para después» | «Guardar en mi lista de lectura» |
| «Fin de la edición.» | «¡Has llegado al final!» |
| «Hoy no hay recomendaciones.» | «Vaya, parece que no hay nada…» |
| «No se pudo conectar con la base de datos.» | «Error 500: ECONNREFUSED» |
| «Lo que has decidido que merece tu tiempo.» | «Tu contenido guardado» |
| «Aún no sigues ninguna fuente.» | «Tu feed está vacío 😢» |
| «Publicaciones» | «Contenido» / «items» |
| «Recomendaciones» | «Sugerencias para ti» |
| «Fuentes» | «Canales y medios» |

Reglas:

- Errores: **qué pasó y qué puede hacer la persona**, sin códigos ni trazas.
- Nada de mayúsculas gritadas ni de exclamaciones.
- Sin emojis, sin iconos decorativos, sin «nuevo» como reclamo.
- Los estados se nombran en pasado («Guardado», «Cookie borrada») o en presente
  neutro («Fin de la edición»).

### Microcopy canónico

Texto que ya está en producción y que define el tono. Reutilízalo en lugar de
inventar variantes:

- Portada: «Tu edición de hoy», «Fin de la edición.» / «No hay más
  recomendaciones hoy.»
- Pie global: «Atención no mide tu tiempo, ni tu frecuencia de uso, ni tu
  comportamiento.»
- Biblioteca: «Lo que has decidido que merece tu tiempo.»
- Hemeroteca: «Todas las publicaciones de tus fuentes, por consulta intencional.
  Sin contadores de pendientes.»
- Fuentes: «Aquí defines qué quieres seguir. La personalización es exclusivamente
  explícita.»
- Datos: «Atención no registra tiempo de reproducción, hora de acceso ni
  frecuencia de apertura. Puedes exportar y borrar todo.»
- Login: «Descubrimiento deliberado: elige, guarda y consume fuera de la
  aplicación.»

---

## 4. Lenguaje visual

### 4.1. Paleta

Definida en `tailwind.config.ts`. **No se usan hex sueltos en componentes.**

| Token | Valor | Uso |
|---|---|---|
| `paper` | `#faf9f6` | Fondo de la aplicación |
| `ink` | `#1a1a1a` | Texto principal |
| `muted` | `#6b6b6b` | Metadatos, ayudas, navegación |
| `line` | `#e5e2db` | Bordes, separadores |
| `accent` | `#2f5d50` | Enlaces y acción principal |
| `bg-white/60` | blanco translúcido | Superficie de tarjetas sobre `paper` |
| `text-red-700` | Tailwind | Solo errores y acciones destructivas |

Semántica del color:

- **Verde (`accent`) = acción disponible o enlace.** No se usa para decorar ni
  para estados.
- **Rojo = error o destrucción.** Nunca para urgencia, ofertas o alertas.
- **Gris (`muted`) = información secundaria.** Si algo importante queda en gris,
  es un error de jerarquía.
- El color **nunca es el único portador de significado**: el estado va también en
  el texto («Oculta», «Pausada», «Con error: …»).

### 4.2. Tipografía

Una sola familia: `system-ui, -apple-system, Segoe UI, sans-serif`.

| Nivel | Clases | Uso |
|---|---|---|
| Marca | `text-lg font-semibold tracking-tight` | «Atención» en la cabecera |
| Título de página | `text-xl font-semibold` | `h1` de cada pantalla |
| Sección | `text-xs font-semibold uppercase tracking-wider text-muted` | Agrupadores de la edición («De tus fuentes»…) |
| Subtítulo de sección | `text-sm font-semibold` | «Fuentes seguidas», «Temas», «Tus datos» |
| Título de tarjeta | `text-base font-medium leading-snug` | Título de una recomendación |
| Cuerpo | `text-sm` | Motivos, descripciones, formularios |
| Metadatos | `text-xs text-muted` | Formato · duración · fuente, fechas |
| Énfasis secundario | `text-sm text-ink/80` | Motivo de la recomendación |

Reglas:

- **Sin negritas dentro del cuerpo** salvo el cierre de la edición.
- Los metadatos van siempre en una sola línea separada por `·`.
- El título nunca se trunca; la descripción de la hemeroteca sí (`line-clamp-3`).
- No se usan tamaños arbitrarios: si hace falta uno nuevo, se añade aquí.

### 4.3. Composición y espacio

- Contenedor único `max-w-2xl` (672 px), `px-5 py-8`.
- Una sola columna. Nunca dos columnas de contenido ni *sidebars*.
- Ritmo vertical con `gap-6` u `gap-8` entre bloques; `gap-3`/`gap-4` dentro.
- Tarjetas: `rounded border border-line bg-white/60 p-4` (compactas `p-3`).
- Separadores: `border-t border-line pt-4`, no cajas adicionales.
- En móvil todo se apila; los grupos de acciones usan `flex-wrap`.

### 4.4. Superficies: borde, no sombra

- La profundidad se expresa con **borde de 1 px**, no con sombras.
- Radio pequeño (`rounded`, 4 px). Nada de píldoras ni círculos.
- Sin imágenes, sin ilustraciones, sin avatares, sin portadas de vídeo.
- El único relleno de color sólido es el botón primario (`bg-accent text-white`).

### 4.5. Sin iconografía

No hay set de iconos. Cuando hace falta una acción se escribe: «Guardar»,
«Copiar enlace», «Abrir en FreeTube». Un icono sin texto obligaría a adivinar; el
texto es más accesible y más sobrio.

---

## 5. Anatomía de la interfaz

### 5.1. Estructura global

```
Cabecera      marca + nombre de usuario + salir
              navegación (Edición · Historial · Biblioteca · Hemeroteca ·
              Colecciones · Fuentes [+ Usuarios si admin])
Contenido     una columna, h1 + bloques
Pie           declaración de no-medición
```

- La navegación no marca la página activa (deuda conocida, ver §9).
- «Usuarios» solo existe para administradores; no se muestra deshabilitado.
- El pie es fijo en todas las páginas y es parte del contrato, no decoración.

### 5.2. Tarjeta de recomendación

Orden fijo, de arriba abajo:

1. **Título** (`text-base font-medium`).
2. **Metadatos**: `Formato · duración · fuente`.
3. **Motivo**: una frase, `text-sm text-ink/80`.
4. **Acciones**: guardar (secundaria) + abrir (enlace de texto).

La tarjeta no incluye resumen, miniatura, canal ni fecha de publicación: la
edición debe leerse en segundos. El detalle está en la hemeroteca.

### 5.3. Jerarquía de acciones

| Nivel | Estilo | Ejemplos |
|---|---|---|
| Primaria | `rounded bg-accent px-4 py-2 text-sm text-white` | «Buscar» |
| Secundaria | `rounded border border-line px-4 py-2 text-sm text-muted hover:border-accent hover:text-accent` | «Generar edición ahora», «Sincronizar ahora» |
| Terciaria | enlace `text-xs text-accent hover:underline` | «Abrir en FreeTube», «Historial de ediciones» |
| Micro-acción | botón `px-3 py-1 text-xs border` | «Guardar para después», «Copiar enlace» |
| Destructiva | borde/texto `text-red-700` | «Borrar todos mis datos», «Desconectar» |

Reglas:

- **Una sola acción primaria por pantalla.** Hoy solo «Buscar» la usa.
- Las acciones destructivas siempre piden confirmación explícita
  (`window.confirm`) y nunca son el botón por defecto.
- Toda acción asíncrona muestra estado pendiente y deshabilita el botón; el
  resultado aparece **junto a la acción**, no en un *toast*.
- Los errores se muestran en rojo y en texto, sin iconos.

### 5.4. Formularios

- `input`/`select`/`textarea`: `rounded border border-line bg-white px-3 py-2 text-sm`,
  foco con `focus:border-accent`.
- Cada control tiene `label` visible; no se usan *placeholders* como etiqueta.
- Los formularios de alta viven al final de su sección, no en modales.
- Los ajustes por fuente (mostrar, actualizar, tope, peso) se aplican al salir del
  campo (`onBlur`), con confirmación textual «Guardado».
- No hay asistentes por pasos ni validación en tiempo real agresiva: se valida al
  enviar y se explica el fallo en español.

### 5.5. Navegación y paginación

- Navegación por texto, no por pestañas ni menús desplegables.
- La hemeroteca pagina con «Anterior / Siguiente» y «Página X de Y». Sin scroll
  infinito y sin «cargar más».
- Los enlaces externos se abren en pestaña nueva con `rel="noreferrer"`.

---

## 6. Las pantallas y su intención

| Pantalla | Promesa | Lo que nunca muestra |
|---|---|---|
| Edición de hoy | «Esto es lo que merece tu tiempo hoy, y por qué» | Más de una tirada, scroll infinito, contadores |
| Historial | «Puedes reconstruir cualquier edición pasada» | Ediciones reescritas o sin motivos |
| Biblioteca | «Esto lo decidiste tú» | Recomendaciones, métricas de consumo |
| Hemeroteca | «Todo lo publicado, si lo buscas» | Sugerencias intercaladas, orden por «relevancia» |
| Colecciones | «Lo que ya tenías en YouTube» | Recomendaciones nuevas, reproducción |
| Fuentes | «Tú controlas qué entra» | Rankings, «fuentes populares», métricas de uso |
| Login | «Entra y decide» | Registro público, «recordarme», recuperación automática |
| Usuarios (admin) | «Gestiona cuentas» | Datos de otros usuarios más allá de lo necesario |

Notas por pantalla:

- **Portada.** Agrupa por origen (`De tus fuentes`, `Descubrimiento`,
  `Actualidad`) para que el criterio de selección sea visible. Si no hay edición,
  ofrece dos salidas concretas: añadir fuentes o explorar la hemeroteca. El botón
  «Generar edición ahora» ejecuta ingesta + edición y resume el resultado
  («N publicaciones nuevas · edición FECHA con N recomendaciones»).
- **Historial.** Cada fila es una edición inmutable con fecha, tamaño y versión de
  algoritmo. El detalle repite los motivos tal como se generaron.
- **Biblioteca.** El estado `consumed` se refleja atenuando el título; no hay
  contador de pendientes ni barra de progreso.
- **Hemeroteca.** Es el único lugar con búsqueda y filtros. La intención es
  consulta puntual, no navegación. La paginación es explícita.
- **Fuentes.** Es el panel de control: estado de ingesta, ajustes por fuente,
  temas, preferencias, YouTube y gestión de datos. Todo con divulgación
  progresiva dentro de la misma página, sin subpestañas.
- **Login.** Máximo una tarjeta de contenido y el propósito de la app. Sin
  marketing.

---

## 7. Estados

| Estado | Patrón | Ejemplo |
|---|---|---|
| Vacío | Caja `rounded border border-line p-4 text-sm text-muted` con una salida | «Aún no sigues ninguna fuente. Añade una para empezar.» |
| Error de datos | Misma caja, sin rojo: es un fallo de configuración, no del usuario | «No se pudo conectar con la base de datos.» |
| Error de acción | Texto rojo junto al control | «No se pudo actualizar la biblioteca.» |
| Pendiente | Botón deshabilitado con verbo en gerundio | «Sincronizando…», «Generando edición…» |
| Éxito | Texto `text-xs text-muted` junto a la acción, sin desaparecer de inmediato | «Cookie guardada.» |
| Parcial | Se enumera lo que falló, sin bloquear el resto | Lista de errores de sincronización |

Reglas:

- **Nunca un *toast* flotante** ni un mensaje que desaparezca antes de leerse.
- Un error nunca borra lo que la persona había escrito.
- Un fallo de una fuente no invalida la ingesta de las demás.
- Los estados vacíos siempre ofrecen el siguiente paso.

---

## 8. Móvil y escritorio

La diferencia es de **intención**, no solo de tamaño:

- **Móvil:** descubrir, decidir y guardar. Los vídeos **no se reproducen** aquí.
- **Escritorio:** además, abrir en FreeTube mediante `freetube://`.

Consecuencias de diseño:

- Sin reproductor embebido en ningún caso.
- El enlace «Abrir en FreeTube» es una salida, no una promesa de reproducción.
- Los objetivos táctiles deben ser cómodos (deuda actual: botones de `py-1`).
- No hay menú hamburguesa: la navegación se envuelve en varias líneas.

Pendiente: PWA instalable, iconos, manifest y bloqueo real de vídeo en móvil. Hoy
el enlace de FreeTube se muestra también en móvil; debe ocultarse cuando no haya
posibilidad de abrirlo.

---

## 9. Accesibilidad

Lo que ya está bien:

- `html lang="es"`.
- Contraste alto de `ink` sobre `paper`; el verde `accent` cumple para texto
  normal.
- Controles nativos (`button`, `input`, `select`, `textarea`, `label`).
- Estados que no dependen solo del color: llevan texto.
- Sin animaciones ni movimiento que requiera `prefers-reduced-motion`.
- Jerarquía de encabezados coherente (`h1` por página, `h2` por sección, `h3` en
  tarjetas).

Deuda conocida:

1. **Tamaño de texto.** Muchos metadatos y acciones usan `text-xs` (12 px). Debe
   subirse a 13–14 px o permitir escalado sin romper la composición.
2. **Foco visible.** Solo algunos campos usan `focus:border-accent`; faltan
   `focus-visible` claros en enlaces y botones.
3. **Página activa.** La navegación no usa `aria-current="page"`.
4. **Objetivos táctiles.** Botones de `py-1` quedan por debajo de 44 px.
5. **Saltar al contenido.** No hay enlace «Saltar al contenido».
6. **Fechas.** La portada muestra `2026-10-22`; el historial usa
   `toLocaleString("es-ES")`. Debe unificarse en un formato legible.
7. **Estados de error sin `role="alert"`** en formularios asíncronos.
8. **Confirmaciones nativas** (`window.confirm`): accesibles, pero rompen la
   estética; si se sustituyen, deben mantener el foco atrapado y el texto claro.

Regla para lo nuevo: si no se puede usar con teclado, con lector de pantalla y a
200 % de zoom, no está terminado.

---

## 10. Antipatrones (lista negra)

| Antipatrón | Por qué |
|---|---|
| Scroll infinito / «cargar más» | Rompe la edición finita |
| Contadores de pendientes o no leídos | Convierte la decisión en deuda |
| Rachas, logros, puntos, niveles | *Gamification* = retención |
| Notificaciones push de «nuevo contenido» | Reclamo de atención |
| Autoplay o vídeo embebido | Consumo dentro de la app |
| Miniaturas grandes y llamativas | Sesgo hacia el clic |
| «Recomendado para ti» sin motivo | Caja negra |
| Ordenar por «popularidad» | Métrica social, no personal |
| Comentarios, likes, compartir | Métricas y ruido social |
| Modo oscuro automático sin decisión | No es prioritario y añade superficie |
| *Toasts* efímeros para errores | Se pierden y no son accesibles |
| Texto en inglés en la interfaz | Rompe la voz |
| Emojis y signos de exclamación | Tono publicitario |
| Sombras, degradados, glassmorphism | Estímulo visual innecesario |

---

## 11. Gobernanza del diseño

### Cómo proponer un cambio

1. **Nombra el principio** de §2 que el cambio sirve (o el antipatrón que elimina).
2. **Describe el antes y el después** con el microcopy exacto.
3. **Comprueba los estados**: vacío, error, pendiente, éxito, móvil, teclado.
4. **Reutiliza tokens y patrones** de §4 y §5 antes de inventar.
5. **Actualiza este documento** si cambia una regla, y `AGENTS.md` si cambia un
   comando o una convención.

### Checklist de revisión de UI

- [ ] ¿La pantalla termina? ¿Hay un final o un siguiente paso claro?
- [ ] ¿Cada recomendación tiene motivo visible?
- [ ] ¿Se evita cualquier métrica de comportamiento?
- [ ] ¿Los textos están en español, sin emojis ni exclamaciones?
- [ ] ¿Se usan solo los tokens `ink/paper/muted/line/accent`?
- [ ] ¿Hay una sola acción primaria y las destructivas confirman?
- [ ] ¿Los estados vacío/error/pendiente están resueltos con texto?
- [ ] ¿Funciona a 360 px de ancho y a 200 % de zoom?
- [ ] ¿Se puede recorrer con teclado y el foco se ve?
- [ ] ¿La pantalla nueva aparece en la tabla de §6?

Si alguna respuesta es «no», la interfaz no está terminada.

---

## 12. Deuda de diseño y evolución

| Prioridad | Tema | Detalle |
|---|---|---|
| P0 | Legibilidad | Subir `text-xs` en metadatos y acciones; unificar formato de fecha |
| P1 | Accesibilidad | `focus-visible`, `aria-current`, enlace de salto, `role="alert"` |
| P1 | Feedback explícito | UI de «más de esto», «menos de esta fuente», «no me sirvió», con confirmación |
| P1 | Gestión de fuentes | Editar y eliminar fuentes, importar/exportar OPML |
| P2 | PWA | Manifest, iconos, instalación, comportamiento sin conexión |
| P2 | Móvil | Ocultar FreeTube en móvil; bloqueo real de reproducción |
| P2 | Modo oscuro | Solo si se decide explícitamente; requiere tokens semánticos |
| P2 | Onboarding | Primera cuenta: explicar el contrato sin convertirlo en tutorial |

---

## 13. Decisiones cerradas

| Decisión | Estado |
|---|---|
| Una sola columna, `max-w-2xl` | Cerrada |
| Sin imágenes ni miniaturas | Cerrada |
| Sin iconos; acciones con texto | Cerrada |
| Bordes en lugar de sombras | Cerrada |
| Cinco colores semánticos + rojo para error | Cerrada |
| Español en interfaz, inglés en código | Cerrada |
| Sin telemetría ni métricas de uso | Cerrada |
| Edición finita con cierre explícito | Cerrada |
| Motivo visible en cada recomendación | Cerrada |
| Consumo fuera de la app (FreeTube/enlace) | Cerrada |
| Sin scroll infinito; paginación explícita | Cerrada |
| Sin *gamification* | Cerrada |

---

**Cierre.** Atención no compite por tu atención: la protege. Cada pantalla debe
poder responder a una pregunta sencilla: *¿esto ayuda a decidir mejor, o solo a
quedarse más tiempo?* Si la respuesta no es la primera, no pertenece aquí.
