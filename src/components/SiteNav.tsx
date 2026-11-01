import Link from "next/link";

import { LogoutButton } from "./LogoutButton";

const LINKS = [
  { href: "/", label: "Edición de hoy" },
  { href: "/historial", label: "Historial" },
  { href: "/biblioteca", label: "Biblioteca" },
  { href: "/hemeroteca", label: "Hemeroteca" },
  { href: "/colecciones", label: "Colecciones" },
  { href: "/fuentes", label: "Fuentes" },
];

export function SiteNav({
  user,
}: {
  user?: { name: string; isAdmin: boolean } | null;
}) {
  const links = user?.isAdmin
    ? [...LINKS, { href: "/admin/usuarios", label: "Usuarios" }]
    : LINKS;

  return (
    <header className="flex flex-col gap-3 border-b border-line pb-4">
      <div className="flex items-baseline justify-between gap-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Atención
        </Link>
        {user ? (
          <span className="flex items-baseline gap-2 text-xs text-muted">
            {user.name}
            <span aria-hidden>·</span>
            <LogoutButton />
          </span>
        ) : null}
      </div>
      {user ? (
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-ink">
              {link.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
