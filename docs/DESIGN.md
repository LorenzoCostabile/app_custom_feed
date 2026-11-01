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
- No envía a terceros lo que haces con ella: lo que ocurre aquí se queda aquí.

### El contrato

1. **La edición termina.** Siempre hay un «Fin de la edición». No hay más abajo.
2. **Aquí se decide; se consume fuera.** La app no reproduce vídeos ni mide
   consumo.
3. **Cada recomendación declara su origen.** Puede venir de tus fuentes o de un
   feed ajeno; lo que no se hace es ocultarlo ni disfrazarlo de criterio propio.
4. **Tus datos no alimentan a terceros.** Puedes medirte, generar informes y
   mejorar el motor con ellos; nunca se envían fuera ni perfilan a otras personas.
5. **Tus datos están aislados.** Exportables, borrables, invisibles para otras
   cuentas.

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

### 2.3. El origen se declara

No todas las recomendaciones nacen de una regla que podamos descomponer. Una
fuente puede ser el feed de YouTube, con su propia selección opaca. Eso es
legítimo: lo que no es aceptable es **ocultar de dónde viene**.

**Implica:** cada recomendación indica su procedencia (tus fuentes, descubrimiento,
actualidad o el feed de una plataforma) y, cuando el motor la puntúa, muestra el
motivo y conserva el desglose en el historial.

**Prohíbe:** presentar como criterio propio lo que en realidad ha elegido un
tercero, mezclar orígenes sin etiquetarlos e inventar una explicación que el motor
no puede sostener. «No lo sabemos» también es una explicación válida.

La puntuación se llama siempre **relevancia**, nunca «calidad» ni «fiabilidad».

### 2.4. La personalización se declara, no se deduce

**Implica:** fuentes, temas, formatos, duraciones y feedback se eligen de forma
explícita. El motor solo usa esas señales.

**Prohíbe:** usar señales de comportamiento a espaldas de la persona. Hoy no se
infieren preferencias por tiempo, clics, hora de acceso ni frecuencia. Si algún
día se incorporan, deberán declararse, poder desactivarse y explicarse en la
interfaz. Nada de perfiles psicológicos ni «usuarios similares».

### 2.5. Los datos se quedan aquí

La app puede medirte **para ti**: informes, estadísticas y, en el futuro, mejores
recomendaciones. Lo que no puede hacer es usar esos datos para alimentar a
terceros ni para justificar retención.

**Implica:** las métricas y gráficas internas son bienvenidas si sirven para
entender el propio consumo o mejorar el motor. Se documentan y se pueden borrar.

**Prohíbe:** enviar actividad a plataformas externas, analítica de terceros,
perfiles compartidos entre usuarios y cualquier mecanismo cuyo objetivo sea que
vuelvas antes (rachas, avisos de retención, «no te lo pierdas»).

Hoy no se mide nada. Si eso cambia, el cambio será explícito y local.

### 2.6. Sin urgencia

La aplicación no compite por tu tiempo ni intenta que vuelvas antes.

**Implica:** el ritmo lo marcas tú; no hay cuentas atrás ni «última oportunidad».
Lo que caduca, caduca sin dramatismo.

**Prohíbe:** notificaciones de reactivación, urgencia fabricada, escasez falsa y
mensajes que culpabilizan por no entrar.

La dirección visual (tipografía, color, composición) **no está cerrada** y no
forma parte de los principios. Lo que hay hoy es un punto de partida, no una
obligación.

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

- Errores: la pantalla explica **qué pasó y qué puede hacer la persona**, mientras
  el detalle técnico (mensaje original, pila, contexto) se registra en el
  servidor. Nada de volcar trazas en la interfaz, pero nada de tragárselas
  tampoco.
- Toda acción relevante deja rastro: quién, qué, cuándo y con qué resultado. La
  observabilidad no es opcional.
- Evita las mayúsculas gritadas, las exclamaciones y el «nuevo» como reclamo.
- No hay mensajes que culpen ni que metan prisa.

---

## 4. Estado visual actual (provisional)

Esta sección **describe lo que hay hoy**, no lo que debe ser. Sirve para que nadie
rompa la interfaz por accidente y para saber qué habría que tocar si se decide
cambiarla. La dirección visual no está cerrada: si se redefine, se actualiza esta
sección y se aplica de forma coherente.

### 4.1. Paleta

Definida en `tailwind.config.ts`. Hoy no se usan hex sueltos en componentes.

| Token | Valor | Uso |
|---|---|---|
| `paper` | `#faf9f6` | Fondo de la aplicación |
| `ink` | `#1a1a1a` | Texto principal |
| `muted` | `#6b6b6b` | Metadatos, ayudas, navegación |
| `line` | `#e5e2db` | Bordes, separadores |
| `accent` | `#2f5d50` | Enlaces y acción principal |
| `bg-white/60` | blanco translúcido | Superficie de tarjetas sobre `paper` |
| `text-red-700` | Tailwind | Solo errores y acciones destructivas |

Semántica actual del color:

- **Verde (`accent`) = acción disponible o enlace.** Hoy no se usa para decorar.
- **Rojo = error o destrucción.** Hoy no se usa para urgencia ni ofertas.
- **Gris (`muted`) = información secundaria.** Si algo importante queda en gris,
  suele ser un problema de jerarquía.
- El color **no debería ser el único portador de significado**: conviene que el
  estado vaya también en el texto («Oculta», «Pausada», «Con error: …»).

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

Convenciones actuales:

- Sin negritas dentro del cuerpo salvo el cierre de la edición.
- Los metadatos van en una sola línea separada por `·`.
- El título no se trunca; la descripción de la hemeroteca sí (`line-clamp-3`).
- La tabla es la referencia de lo que existe hoy; un tamaño nuevo se añade aquí.

### 4.3. Composición y espacio

- Contenedor `max-w-2xl` (672 px), `px-5 py-8`.
- Hoy, una sola columna de contenido y sin *sidebars*.
- Ritmo vertical con `gap-6` u `gap-8` entre bloques; `gap-3`/`gap-4` dentro.
- Tarjetas: `rounded border border-line bg-white/60 p-4` (compactas `p-3`).
- Separadores: `border-t border-line pt-4`.
- En móvil todo se apila; los grupos de acciones usan `flex-wrap`.

### 4.4. Superficies

- Hoy la profundidad se expresa con borde de 1 px; no hay sombras.
- Radio pequeño (`rounded`).
- Hoy no hay imágenes, ilustraciones, avatares ni portadas de vídeo.
- El único relleno de color sólido es el botón primario (`bg-accent text-white`).

Son decisiones de la versión actual, no invariantes: se pueden cambiar si la
dirección visual se redefine.

### 4.5. Iconografía

Hoy no hay set de iconos: las acciones se escriben («Guardar», «Copiar enlace»,
«Abrir en FreeTube»). Si se incorporan, deben ir acompañados de texto o de una
etiqueta accesible.

---

## 5. Anatomía de la interfaz

### 5.1. Estructura global

```
Cabecera      marca + nombre de usuario + salir
              navegación (Edición · Historial · Biblioteca · Hemeroteca ·
              Colecciones · Fuentes [+ Usuarios si admin])
Contenido     una columna, h1 + bloques
Pie           declaración de privacidad (hoy: no-medición)
```

- La navegación no marca la página activa (deuda conocida, ver §9).
- «Usuarios» solo existe para administradores; no se muestra deshabilitado.
- El pie declara el compromiso de privacidad. Si algún día se añade medición
  interna, ese texto debe actualizarse en el mismo cambio.

### 5.2. Tarjeta de recomendación

Orden actual, de arriba abajo:

1. **Título** (`text-base font-medium`).
2. **Metadatos**: `Formato · duración · fuente`.
3. **Origen**: agrupador visible («De tus fuentes», «Descubrimiento»,
   «Actualidad»).
4. **Motivo**: una frase, `text-sm text-ink/80`; si lo eligió un tercero, se dice.
5. **Acciones**: guardar (secundaria) + abrir (enlace de texto).

Hoy la tarjeta no incluye resumen, miniatura, canal ni fecha de publicación: la
edición debe leerse en segundos. El detalle está en la hemeroteca. Son decisiones
revisables, no invariantes.

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
- Los errores se muestran junto al control y en texto.

### 5.4. Formularios

- `input`/`select`/`textarea`: `rounded border border-line bg-white px-3 py-2 text-sm`,
  foco con `focus:border-accent`.
- Cada control tiene `label` visible; no se usan *placeholders* como etiqueta.
- Los formularios de alta viven al final de su sección, no en modales.
- Los ajustes por fuente (mostrar, actualizar, tope, peso) se aplican al salir del
  campo (`onBlur`), con confirmación textual «Guardado».
- No hay asistentes por pasos ni validación en tiempo real agresiva: se valida al
  enviar y se explica el fallo con claridad.

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
| Historial | «Puedes reconstruir cualquier edición pasada» | Ediciones reescritas o con el origen oculto |
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
- Todo error se registra con traza completa (mensaje, contexto y pila si aplica)
  en el servidor, aunque la pantalla muestre un texto breve.
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
| «Recomendado para ti» sin declarar el origen | Caja negra |
| Ordenar por «popularidad» | Métrica social, no personal |
| Comentarios, likes, compartir | Métricas y ruido social |
| Enviar actividad a plataformas externas | Alimenta a terceros con tus datos |
| *Toasts* efímeros para errores | Se pierden y no son accesibles |
| Urgencia fabricada o escasez falsa | Presiona la decisión |

Las decisiones puramente visuales (color, tipografía, sombras, iconos, imágenes,
modo oscuro) **no están en esta lista**: la dirección estética sigue abierta.

---

## 11. Gobernanza del diseño

### Cómo proponer un cambio

1. **Nombra el principio** de §2 que el cambio sirve (o el antipatrón que elimina).
2. **Describe el antes y el después** con el texto exacto que verá la persona.
3. **Comprueba los estados**: vacío, error, pendiente, éxito, móvil, teclado.
4. **Parte de los patrones** de §5; el estilo visual de §4 es revisable.
5. **Actualiza este documento** si cambia una regla, y `AGENTS.md` si cambia un
   comando o una convención.

### Checklist de revisión de UI

- [ ] ¿La pantalla termina? ¿Hay un final o un siguiente paso claro?
- [ ] ¿Cada recomendación declara su origen y, si el motor la puntuó, su motivo?
- [ ] ¿Los datos de uso se quedan en la app?
- [ ] ¿El texto es claro, sin culpar ni meter prisa?
- [ ] ¿Cada acción relevante deja traza suficiente para depurar un fallo?
- [ ] ¿Los errores muestran un mensaje comprensible y guardan el detalle técnico?
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
| P1 | Observabilidad | Logs estructurados por acción y errores con traza; hoy solo hay mensajes en pantalla |
| P1 | Feedback explícito | UI de «más de esto», «menos de esta fuente», «no me sirvió», con confirmación |
| P1 | Gestión de fuentes | Editar y eliminar fuentes, importar/exportar OPML |
| P2 | Informes personales | Estadísticas de consumo propias (gráficas, resúmenes) sin salir de la app; base para un motor más sofisticado |
| P2 | Medición interna | Si se mide uso, hacerlo explícito, local, exportable y borrable |
| P2 | PWA | Manifest, iconos, instalación, comportamiento sin conexión |
| P2 | Móvil | Ocultar FreeTube en móvil; bloqueo real de reproducción |
| P2 | Dirección visual | Definir tipografía, color y composición cuando se decida; hoy es un punto de partida |
| P2 | Onboarding | Primera cuenta: explicar el contrato sin convertirlo en tutorial |

---

## 13. Decisiones cerradas

Solo se cierran decisiones de **producto y comportamiento**. Las visuales quedan
abiertas hasta que se definan de forma explícita.

| Decisión | Estado |
|---|---|
| Edición finita con cierre explícito | Cerrada |
| Origen declarado y motivo visible (cuando el motor puntúa) | Cerrada |
| Consumo fuera de la app (FreeTube/enlace) | Cerrada |
| Sin scroll infinito; paginación explícita | Cerrada |
| Sin *gamification* | Cerrada |
| Sin telemetría de terceros; métricas internas permitidas | Cerrada |
| Aislamiento total por usuario | Cerrada |
| Datos exportables y borrables | Cerrada |
| Toda acción importante deja traza técnica | Cerrada |

---

**Cierre.** Atención no compite por tu atención: la protege. Cada pantalla debe
poder responder a una pregunta sencilla: *¿esto ayuda a decidir mejor, o solo a
quedarse más tiempo?* Si la respuesta no es la primera, no pertenece aquí.
