export default function ManagementAccessDeniedPage() {
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
        <a className="ui-button ui-button-primary justify-center" href="https://app.vase.ar/app">
          Volver a Vase
        </a>
        <a
          className="ui-button justify-center"
          href="https://app.vase.ar/api/auth/signout?callbackUrl=https%3A%2F%2Fapp.vase.ar%2Fsignin"
        >
          Cerrar sesión central
        </a>
        <a className="text-sm font-semibold text-primary" href="https://app.vase.ar/signin">
          Iniciar sesión con otra cuenta
        </a>
      </div>
    </div>
  )
}
