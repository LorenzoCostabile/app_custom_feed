import { redirect } from "next/navigation";

import { UserAdmin } from "@/components/UserAdmin";
import { getCurrentUser } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.isAdmin) redirect("/");

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Usuarios</h1>
        <p className="mt-1 text-sm text-muted">
          Crea cuentas para las personas que usarán Atención. Sus datos están
          completamente aislados entre sí.
        </p>
      </div>
      <UserAdmin />
    </section>
  );
}
