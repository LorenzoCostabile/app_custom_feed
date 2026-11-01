import { LoginForm } from "@/components/LoginForm";

export const metadata = {
  title: "Entrar · Atención",
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const next = typeof searchParams.next === "string" ? searchParams.next : "/";

  return (
    <section className="mx-auto mt-16 max-w-sm">
      <h1 className="text-lg font-semibold tracking-tight">Entrar en Atención</h1>
      <p className="mt-2 text-sm text-muted">
        Descubrimiento deliberado: elige, guarda y consume fuera de la
        aplicación.
      </p>
      <div className="mt-6">
        <LoginForm next={next} />
      </div>
    </section>
  );
}
