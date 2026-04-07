import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";

export default function ForbiddenPage() {
  return (
    <div className="vase-shell flex min-h-screen items-center justify-center px-6">
      <div className="surface-elevated w-full max-w-lg rounded-[32px] p-8 text-center">
        <p className="vase-kicker">Access restricted</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
          No tienes permisos para ver esta seccion.
        </h1>
        <p className="mt-4 text-sm leading-7 text-[var(--muted)]">
          Vase valida autorizacion en backend y solo expone cada panel al rol correspondiente.
        </p>
        <div className="mt-8 flex justify-center">
          <Link href="/app" className={buttonStyles({ tone: "primary" })}>
            Volver al panel
          </Link>
        </div>
      </div>
    </div>
  );
}
