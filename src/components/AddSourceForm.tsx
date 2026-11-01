"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function AddSourceForm() {
  const router = useRouter();
  const [kind, setKind] = useState("youtube");
  const [title, setTitle] = useState("");
  const [feedUrl, setFeedUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, title, feedUrl }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "No se pudo añadir la fuente.");
      }
      setTitle("");
      setFeedUrl("");
      setMessage("Fuente añadida.");
      router.refresh();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Error inesperado.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-3 rounded border border-line bg-white/60 p-4"
    >
      <h2 className="text-sm font-semibold">Añadir fuente</h2>
      <div className="flex flex-col gap-3 sm:flex-row">
        <select
          value={kind}
          onChange={(event) => setKind(event.target.value)}
          className="rounded border border-line bg-white px-3 py-2 text-sm"
        >
          <option value="youtube">Canal de YouTube</option>
          <option value="podcast">Podcast</option>
          <option value="news">Medio / noticias</option>
        </select>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Nombre de la fuente"
          required
          className="flex-1 rounded border border-line bg-white px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </div>
      <input
        value={feedUrl}
        onChange={(event) => setFeedUrl(event.target.value)}
        placeholder="URL del feed RSS o Atom"
        required
        type="url"
        className="rounded border border-line bg-white px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-accent px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
        >
          Añadir
        </button>
        {message ? <span className="text-xs text-muted">{message}</span> : null}
      </div>
      <p className="text-xs text-muted">
        Canales de YouTube: usa el feed del canal
        (https://www.youtube.com/feeds/videos.xml?channel_id=...).
      </p>
    </form>
  );
}
