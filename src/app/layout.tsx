import type { ReactNode } from "react";
import type { Metadata } from "next";

import { SiteNav } from "@/components/SiteNav";
import { getCurrentUser } from "@/lib/auth/current-user";

import "./globals.css";

export const metadata: Metadata = {
  title: "Atención",
  description:
    "Descubrimiento deliberado: selecciona, guarda y consume fuera de la aplicación.",
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <html lang="es">
      <body>
        <div className="mx-auto min-h-screen w-full max-w-2xl px-5 py-8">
          <SiteNav
            user={user ? { name: user.name, isAdmin: user.isAdmin } : null}
          />
          <main className="mt-8">{children}</main>
          <footer className="mt-16 border-t border-line pt-4 text-xs text-muted">
            Atención no mide tu tiempo, ni tu frecuencia de uso, ni tu
            comportamiento.
          </footer>
        </div>
      </body>
    </html>
  );
}
