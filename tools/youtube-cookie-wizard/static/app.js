"use strict";

const state = {
  env: null,
  browser: null,
  exported: false,
  busy: false,
};

const $ = (id) => document.getElementById(id);

async function api(path, body) {
  const options =
    body === undefined
      ? { method: "GET" }
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        };
  const response = await fetch(path, options);
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (!data || typeof data !== "object") {
    throw new Error(
      `El asistente respondió algo inesperado (HTTP ${response.status}).`,
    );
  }
  return data;
}

function setPill(element, text, tone) {
  if (!text) {
    element.hidden = true;
    element.textContent = "";
    return;
  }
  element.hidden = false;
  element.className = `pill ${tone ?? "neutral"}`;
  element.textContent = text;
}

function clearElement(element) {
  while (element.firstChild) element.removeChild(element.firstChild);
}

function setResult(element, options) {
  const { tone = "ok", title, message, list, listTitle, hint } = options;
  element.hidden = false;
  element.className = `result ${tone}`;
  clearElement(element);

  if (title) {
    const heading = document.createElement("span");
    heading.className = "result-title";
    heading.textContent = title;
    element.appendChild(heading);
  }
  if (message) {
    const paragraph = document.createElement("p");
    paragraph.textContent = message;
    element.appendChild(paragraph);
  }
  if (list && list.length > 0) {
    if (listTitle) {
      const caption = document.createElement("h4");
      caption.textContent = listTitle;
      element.appendChild(caption);
    }
    const ul = document.createElement("ul");
    for (const item of list) {
      const li = document.createElement("li");
      li.textContent = item;
      ul.appendChild(li);
    }
    element.appendChild(ul);
  }
  if (hint) {
    const paragraph = document.createElement("p");
    paragraph.className = "hint";
    paragraph.textContent = hint;
    element.appendChild(paragraph);
  }
}

function formatDate(seconds) {
  if (!seconds) return "";
  try {
    return new Date(seconds * 1000).toLocaleString("es-ES", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return "";
  }
}

function updateButtons() {
  const install = $("install");
  const exportButton = $("export");
  const forget = $("forget");
  const probe = $("probe");
  const push = $("push");

  install.disabled = state.busy;
  exportButton.disabled = state.busy || !state.browser;
  forget.hidden = !state.exported;
  forget.disabled = state.busy;
  probe.disabled = state.busy;
  push.disabled = state.busy || !state.exported;

  const ytdlpReady = Boolean(state.env?.ytdlp?.installed);
  install.textContent = state.busy
    ? install.textContent
    : ytdlpReady
      ? "Actualizar yt-dlp"
      : "Preparar yt-dlp";
}

async function withBusy(button, label, task) {
  const previous = button ? button.textContent : null;
  state.busy = true;
  if (button) {
    button.textContent = label;
    button.disabled = true;
  }
  document.body.setAttribute("aria-busy", "true");
  updateButtons();
  try {
    return await task();
  } finally {
    state.busy = false;
    if (button) button.textContent = previous;
    document.body.removeAttribute("aria-busy");
    updateButtons();
  }
}

function renderBrowsers(browsers) {
  const container = $("browsers");
  clearElement(container);

  const entries = Object.entries(browsers);
  const installed = entries
    .filter(([, info]) => info.installed)
    .map(([key]) => key);

  if (!state.browser || !browsers[state.browser]?.installed) {
    state.browser =
      installed.find((key) => browsers[key].recommended) ?? installed[0] ?? null;
  }

  if (installed.length === 0) {
    const paragraph = document.createElement("p");
    paragraph.className = "muted";
    paragraph.textContent =
      "No se ha detectado ningún navegador compatible. Instala Firefox, inicia sesión en YouTube y vuelve a abrir este asistente.";
    container.appendChild(paragraph);
    renderHelp();
    updateButtons();
    return;
  }

  for (const [key, info] of entries) {
    const label = document.createElement("label");
    label.className = "browser";
    if (key === state.browser) label.classList.add("is-selected");
    if (!info.installed) label.classList.add("is-missing");

    const input = document.createElement("input");
    input.type = "radio";
    input.name = "browser";
    input.value = key;
    input.checked = key === state.browser;
    input.disabled = !info.installed;
    input.addEventListener("change", () => {
      state.browser = key;
      for (const other of container.querySelectorAll(".browser")) {
        const radio = other.querySelector("input");
        other.classList.toggle("is-selected", Boolean(radio?.checked));
      }
      renderHelp();
      updateButtons();
    });

    const text = document.createElement("span");
    text.className = "browser-text";

    const name = document.createElement("span");
    name.className = "browser-name";
    name.textContent = info.name;
    if (info.recommended) {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = "Recomendado";
      name.appendChild(badge);
    }
    text.appendChild(name);

    const note = document.createElement("span");
    note.className = "browser-note";
    note.textContent = info.installed
      ? info.profileFound
        ? "Detectado"
        : "Instalado, sin perfil encontrado"
      : "No detectado";
    text.appendChild(note);

    label.appendChild(input);
    label.appendChild(text);
    container.appendChild(label);
  }

  renderHelp();
  updateButtons();
}

function renderHelp() {
  const help = $("browser-help");
  clearElement(help);

  if (!state.browser || !state.env?.browsers?.[state.browser]) {
    const paragraph = document.createElement("p");
    paragraph.textContent =
      "Elige un navegador para ver los pasos. Si no aparece ninguno, instala Firefox y entra una vez en YouTube.";
    help.appendChild(paragraph);
    return;
  }

  const info = state.env.browsers[state.browser];
  const intro = document.createElement("p");
  intro.textContent = `Pasos para ${info.name}:`;
  help.appendChild(intro);

  const steps = document.createElement("ol");
  const messages = [
    `Abre ${info.name} y entra en youtube.com.`,
    "Inicia sesión con la cuenta cuyo feed quieres traer.",
    "Comprueba que arriba a la derecha aparece tu avatar: si no, la cookie no servirá.",
  ];

  if (state.browser === "firefox") {
    messages.push(
      "Puedes dejar Firefox abierto. Pulsa «Exportar y comprobar».",
    );
  } else {
    messages.push(
      `Cierra ${info.name} por completo antes de continuar: mientras está abierto bloquea su base de datos de cookies.`,
    );
    messages.push(
      "Pulsa «Exportar y comprobar». Si falla el descifrado, usa Firefox: los navegadores basados en Chrome cifran las cookies con una clave que yt-dlp no siempre puede leer.",
    );
  }

  for (const message of messages) {
    const li = document.createElement("li");
    li.textContent = message;
    steps.appendChild(li);
  }
  help.appendChild(steps);
}

function renderEnvironment(env) {
  state.env = env;
  state.exported = Boolean(env.cookie?.exported);

  $("env-python").textContent = env.python ? `Python ${env.python}` : "No detectado";

  if (env.ytdlp?.installed) {
    $("env-ytdlp").textContent = env.ytdlp.version
      ? `Listo · ${env.ytdlp.version}`
      : "Listo";
    setPill($("install-status"), "Instalado", "ok");
  } else {
    $("env-ytdlp").textContent = "Sin instalar";
    setPill($("install-status"), "Pendiente", "neutral");
  }

  if (env.cookie?.exported) {
    const when = formatDate(env.cookie.updatedAt);
    $("env-cookie").textContent = when ? `Exportada · ${when}` : "Exportada";
  } else {
    $("env-cookie").textContent = "Sin exportar";
  }

  if (env.defaultApp && $("app-url").value === "http://localhost:3000") {
    $("app-url").value = env.defaultApp;
  }

  renderBrowsers(env.browsers ?? {});
  updateButtons();
}

async function refreshEnvironment() {
  try {
    const env = await api("/api/env");
    renderEnvironment(env);
  } catch (cause) {
    $("env-python").textContent = "Error";
    $("env-ytdlp").textContent = "Error";
    $("env-cookie").textContent = "Error";
    const log = $("install-log");
    log.hidden = false;
    log.classList.add("is-error");
    log.textContent =
      cause instanceof Error ? cause.message : "No se pudo leer el entorno.";
  }
}

async function install() {
  const log = $("install-log");
  log.hidden = false;
  log.classList.remove("is-error");
  log.textContent =
    "Preparando yt-dlp dentro de esta carpeta. La primera vez puede tardar un minuto…";

  await withBusy($("install"), "Preparando…", async () => {
    try {
      const data = await api("/api/install", {});
      log.textContent = (data.log ?? []).join("\n") || "Sin salida.";
      if (data.ok) {
        setPill($("install-status"), "Instalado", "ok");
        await refreshEnvironment();
      } else {
        log.classList.add("is-error");
        log.textContent += `\n\n${data.error ?? "Falló la instalación."}`;
        if (data.hint) log.textContent += `\n${data.hint}`;
        setPill($("install-status"), "Falló", "bad");
      }
    } catch (cause) {
      log.classList.add("is-error");
      log.textContent += `\n\n${
        cause instanceof Error ? cause.message : "Error inesperado."
      }`;
      setPill($("install-status"), "Falló", "bad");
    }
  });
}

async function exportCookie() {
  if (!state.browser) return;
  const result = $("export-result");
  setResult(result, {
    tone: "pending",
    title: "Leyendo la cookie…",
    message:
      "No cierres esta ventana. Se está consultando YouTube para comprobar que la sesión sigue viva.",
  });

  await withBusy($("export"), "Exportando…", async () => {
    try {
      const data = await api("/api/export", {
        browser: state.browser,
        profile: $("profile").value.trim(),
      });

      if (!data.ok) {
        setResult(result, {
          tone: "bad",
          title: "No se pudo leer la sesión",
          message: data.error ?? "yt-dlp devolvió un error.",
          hint: data.hint,
        });
        return;
      }

      state.exported = true;
      const lines = [
        `${data.cookieCount} cookies leídas de ${data.browser}.`,
        data.subscriptions > 0
          ? `Sesión válida: ${data.subscriptions} suscripciones leídas.`
          : "La cookie se leyó correctamente, pero la cuenta no devolvió suscripciones.",
      ];
      if (data.warning) lines.push(data.warning);

      setResult(result, {
        tone: data.warning ? "warn" : "ok",
        title: "Sesión comprobada",
        list: lines,
        hint: "Ahora guárdala en Atención (paso 3).",
      });
      await refreshEnvironment();
    } catch (cause) {
      setResult(result, {
        tone: "bad",
        title: "Error inesperado",
        message: cause instanceof Error ? cause.message : "Inténtalo de nuevo.",
      });
    }
  });
}

async function forgetCookie() {
  if (!window.confirm("¿Borrar la cookie exportada de esta carpeta?")) return;
  await withBusy($("forget"), "Borrando…", async () => {
    try {
      await api("/api/forget", {});
      state.exported = false;
      $("export-result").hidden = true;
      setPill($("probe-status"), null);
      await refreshEnvironment();
    } catch (cause) {
      setResult($("export-result"), {
        tone: "bad",
        title: "No se pudo borrar",
        message: cause instanceof Error ? cause.message : "Inténtalo de nuevo.",
      });
    }
  });
}

function appUrl() {
  const value = $("app-url").value.trim().replace(/\/+$/, "");
  if (!/^https?:\/\/.+/i.test(value)) {
    throw new Error("La dirección debe empezar por http:// o https://.");
  }
  return value;
}

async function probe() {
  const pill = $("probe-status");
  setPill(pill, "Comprobando…", "neutral");

  await withBusy($("probe"), "Comprobando…", async () => {
    try {
      const data = await api("/api/probe", { url: appUrl() });
      if (data.ok && data.needsLogin) {
        setPill(pill, "Pide iniciar sesión", "warn");
      } else if (data.ok) {
        setPill(pill, "Conectada", "ok");
      } else {
        setPill(pill, data.endpoint === false ? "Sin endpoint" : "Sin conexión", "bad");
      }

      if (!data.ok) {
        setResult($("push-result"), {
          tone: "bad",
          title: "No se pudo comprobar la conexión",
          message: data.error ?? "La app no respondió.",
          hint: data.hint,
        });
      } else if (data.needsLogin) {
        setResult($("push-result"), {
          tone: "warn",
          title: "La app responde, pero pide iniciar sesión",
          message:
            "Escribe el correo y la contraseña de tu cuenta de Atención y pulsa «Guardar cookie en Atención».",
        });
      } else {
        const status = data.status ?? {};
        setResult($("push-result"), {
          tone: "ok",
          title: "La app responde",
          message: status.hasCookie
            ? "Ya hay una cookie guardada en Atención. Al guardar, se sustituirá por la nueva."
            : "Todavía no hay ninguna cookie guardada.",
        });
      }
    } catch (cause) {
      setPill(pill, "Error", "bad");
      setResult($("push-result"), {
        tone: "bad",
        title: "Dirección no válida",
        message: cause instanceof Error ? cause.message : "Revisa la dirección.",
      });
    }
  });
}

async function pushCookie() {
  if (!state.exported) return;
  const result = $("push-result");
  setResult(result, {
    tone: "pending",
    title: "Guardando…",
    message: "Atención está comprobando la cookie antes de guardarla.",
  });

  await withBusy($("push"), "Guardando…", async () => {
    try {
      const data = await api("/api/push", {
        url: appUrl(),
        email: $("email").value.trim(),
        password: $("password").value,
      });

      if (!data.ok) {
        setResult(result, {
          tone: data.needsLogin ? "warn" : "bad",
          title: data.needsLogin
            ? "Atención pide iniciar sesión"
            : "No se pudo guardar",
          message: data.error ?? "Revisa los datos e inténtalo otra vez.",
          hint: data.hint,
        });
        return;
      }

      $("password").value = "";
      const saved = data.result?.status;
      setPill($("probe-status"), "Conectada", "ok");
      setResult(result, {
        tone: "ok",
        title: "Cookie guardada en Atención",
        message:
          saved === "valid"
            ? "La sesión es válida y el feed de recomendaciones responde."
            : "La cookie está guardada. Si el feed de YouTube no devuelve vídeos, Atención lo dirá al actualizar recomendaciones.",
        hint: "Ya puedes cerrar este asistente y volver a Atención.",
      });
    } catch (cause) {
      setResult(result, {
        tone: "bad",
        title: "Error inesperado",
        message: cause instanceof Error ? cause.message : "Inténtalo de nuevo.",
      });
    }
  });
}

async function shutdown() {
  if (!window.confirm("¿Cerrar el asistente?")) return;
  try {
    await api("/api/shutdown", {});
  } catch {
    // El servidor puede cerrarse antes de responder.
  }
  document.body.innerHTML =
    '<main class="page"><div class="result ok"><span class="result-title">Asistente cerrado</span><p>Puedes cerrar esta pestaña. La cookie ya está en Atención.</p></div></main>';
}

$("install").addEventListener("click", install);
$("export").addEventListener("click", exportCookie);
$("forget").addEventListener("click", forgetCookie);
$("probe").addEventListener("click", probe);
$("push").addEventListener("click", pushCookie);
$("shutdown").addEventListener("click", shutdown);

refreshEnvironment();
