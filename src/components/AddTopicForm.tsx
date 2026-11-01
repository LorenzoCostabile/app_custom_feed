"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function AddTopicForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [keywords, setKeywords] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const list = keywords
        .split(",")
        .map((keyword) => keyword.trim())
        .filter(Boolean);
      const response = await fetch("/api/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, keywords: list }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "No se pudo crear el tema.");
      }
      setName("");
      setKeywords("");
      setMessage("Tema creado.");
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
      <h2 className="text-sm font-semibold">Añadir tema explícito</h2>
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Nombre del tema (p. ej. IA abierta)"
        required
        className="rounded border border-line bg-white px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <input
        value={keywords}
        onChange={(event) => setKeywords(event.target.value)}
        placeholder="Palabras clave separadas por comas"
        required
        className="rounded border border-line bg-white px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-accent px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
        >
          Crear tema
        </button>
        {message ? <span className="text-xs text-muted">{message}</span> : null}
      </div>
    </form>
  );
}
