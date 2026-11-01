"use client";

import { useEffect, useState, type FormEvent } from "react";

type AdminUser = {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  isActive: boolean;
  createdAt: string;
};

export function UserAdmin() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/api/admin/users");
    if (response.ok) {
      const data = await response.json();
      setUsers(data.users);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, password, isAdmin }),
      });
      const data = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      if (!response.ok) {
        throw new Error(data?.error ?? "No se pudo crear el usuario.");
      }
      setEmail("");
      setName("");
      setPassword("");
      setIsAdmin(false);
      setMessage("Usuario creado.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error inesperado.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Nombre</span>
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="rounded border border-line bg-transparent px-3 py-2 text-ink focus:border-accent focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded border border-line bg-transparent px-3 py-2 text-ink focus:border-accent focus:outline-none"
            />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Contraseña (mínimo 8 caracteres)</span>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded border border-line bg-transparent px-3 py-2 text-ink focus:border-accent focus:outline-none"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isAdmin}
            onChange={(event) => setIsAdmin(event.target.checked)}
          />
          <span className="text-muted">Administrador</span>
        </label>
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        {message ? <p className="text-sm text-accent">{message}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded border border-line px-4 py-2 text-sm text-muted hover:border-accent hover:text-accent disabled:opacity-50"
        >
          {pending ? "Creando…" : "Crear usuario"}
        </button>
      </form>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-ink">Cuentas existentes</h2>
        <ul className="flex flex-col divide-y divide-line text-sm">
          {users.map((user) => (
            <li key={user.id} className="flex items-center justify-between py-2">
              <span className="text-ink">
                {user.name} <span className="text-muted">· {user.email}</span>
              </span>
              <span className="text-xs text-muted">
                {user.isAdmin ? "admin" : "usuario"}
                {user.isActive ? "" : " · inactivo"}
              </span>
            </li>
          ))}
          {users.length === 0 ? (
            <li className="py-2 text-muted">Sin usuarios todavía.</li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
