import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/current-user";
import { listEditions } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function HistorialPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let editions: Awaited<ReturnType<typeof listEditions>> = [];
  let dbError = false;
  try {
    editions = await listEditions(user.id, 60);
  } catch {
    dbError = true;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Historial de ediciones</h1>
        <p className="mt-1 text-xs text-muted">
          Cada edición se guarda tal cual se generó, con los motivos por los que
          se eligió cada recomendación.
        </p>
      </div>

      {dbError ? (
        <p className="rounded border border-line p-4 text-sm text-muted">
          No se pudo conectar con la base de datos.
        </p>
      ) : null}

      {!dbError && editions.length === 0 ? (
        <p className="rounded border border-line p-4 text-sm text-muted">
          Todavía no se ha generado ninguna edición.
        </p>
      ) : null}

      <ul className="flex flex-col gap-3">
        {editions.map((edition) => (
          <li key={edition.id}>
            <Link
              href={`/historial/${edition.id}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded border border-line bg-white/60 p-4 hover:border-accent"
            >
              <span className="text-sm font-medium">{edition.editionDate}</span>
              <span className="text-xs text-muted">{edition.size} recomendaciones</span>
              <span className="text-xs text-muted">
                algoritmo {edition.algorithmVersion}
              </span>
              <span className="text-xs text-muted">
                {edition.createdAt.toLocaleString("es-ES")}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
