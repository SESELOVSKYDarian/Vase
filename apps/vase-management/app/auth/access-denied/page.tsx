export default function ManagementAccessDeniedPage() {
  const appUrl = process.env.NEXT_PUBLIC_VASE_APP_URL ?? "https://app.vase.ar";
  const appHomeUrl = new URL("/app", appUrl).toString();
  const logoutUrl = new URL("/api/auth/central-logout", appUrl).toString();
  const signInUrl = new URL("/signin", appUrl).toString();

  return (
    <div className="space-y-6 text-center">
      <div className="space-y-2">
        <h1 className="font-display text-3xl font-semibold text-gray-900 dark:text-white">
          No tenés acceso a Vase Management
        </h1>
        <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
          Tu sesión es válida, pero tu cuenta no tiene acceso activo a este producto.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <a className="ui-button ui-button-primary justify-center" href={appHomeUrl}>
          Volver a Vase
        </a>
        <form action={logoutUrl} method="post">
          <button className="ui-button w-full justify-center" type="submit">
            Cerrar sesión central
          </button>
        </form>
        <a className="text-sm font-semibold text-primary" href={signInUrl}>
          Iniciar sesión con otra cuenta
        </a>
      </div>
    </div>
  )
}
