import {
  ArrowRight,
  BadgeCheck,
  Bike,
  Building2,
  ChefHat,
  FileCheck2,
  LayoutGrid,
  ReceiptText,
  ShieldCheck,
  WifiOff,
  Wallet,
} from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { resolveRestOwnerRequest } from "@/lib/request-context";
import { BrandLogo, ThemeButton } from "@/components/brand";

const OWNER_SIGNIN = "https://app.vase.ar/signin?redirectTo=https%3A%2F%2Frest.vase.ar%2Fowner";

const features = [
  { icon: LayoutGrid, title: "Salón en vivo", body: "El plano de tus mesas con su estado real: libre, ocupada, reservada o para limpiar. Uní mesas con dos toques." },
  { icon: ChefHat, title: "Cocina sin papelitos", body: "Cada comanda llega a su estación en orden. La cocina marca lo que está listo y el mozo se entera." },
  { icon: Wallet, title: "Caja que cierra", body: "Turnos, cobros en efectivo, tarjeta o Mercado Pago y cuentas corrientes, con el arqueo hecho." },
  { icon: FileCheck2, title: "Factura electrónica", body: "Comprobantes de ARCA por sucursal y punto de venta, con CAE y QR, sin salir del sistema." },
  { icon: Bike, title: "Delivery en un lugar", body: "Los pedidos de las apps entran junto con los del salón. Nadie copia nada a mano." },
  { icon: Building2, title: "Varias sucursales", body: "Elegí qué comparten (carta, recetas, precios, depósitos) y qué maneja cada una por su cuenta." },
] as const;

const steps = [
  { n: "1", title: "Se corta internet", body: "La sucursal sigue tomando pedidos, mandando a cocina e imprimiendo como si nada." },
  { n: "2", title: "Todo queda guardado", body: "Cada movimiento se guarda en el servidor de la sucursal, con quién lo hizo y cuándo." },
  { n: "3", title: "Vuelve y se sincroniza", body: "Cuando vuelve la conexión, todo sube solo a la nube. Sin duplicados ni planillas." },
] as const;

const roles = ["Mozo", "Cocina", "Caja", "Depósito", "Delivery", "Encargado", "Dueño"] as const;

export default async function RestHomePage() {
  let authenticated = false;
  try {
    const requestHeaders = await headers();
    await resolveRestOwnerRequest({ cookieHeader: requestHeaders.get("cookie") });
    authenticated = true;
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("SESSION")) throw error;
  }
  if (authenticated) redirect("/owner");

  return (
    <div className="vr-site">
      <header className="vr-site-top">
        <div className="vr-wrap">
          <BrandLogo />
          <nav className="vr-site-links" aria-label="Secciones de la página">
            <a href="#funciones">Funciones</a>
            <a href="#sin-internet">Sin internet</a>
            <a href="#equipo">Tu equipo</a>
          </nav>
          <div className="vr-sp" />
          <ThemeButton withLabel={false} />
          <a className="vr-btn line hide-sm" href="/staff/login">Entrar al turno</a>
          <a className="vr-btn acc" href={OWNER_SIGNIN}>Ingresar</a>
        </div>
      </header>

      <main>
        <section className="vr-wrap vr-hero">
          <div className="vr-hero-copy">
            <span className="vr-kick"><i />Vase Rest · para restaurantes</span>
            <h1>Tu restaurante, <span>siempre en servicio.</span></h1>
            <p className="vr-hero-lede">
              Salón, cocina, caja y delivery en un solo lugar. Y si se corta internet, tu sucursal sigue trabajando.
            </p>
            <div className="vr-hero-actions">
              <a className="vr-btn acc lg" href={OWNER_SIGNIN}>Ingresar al panel <ArrowRight size={17} aria-hidden="true" /></a>
              <a className="vr-btn line lg" href="/staff/login">Soy del equipo</a>
            </div>
            <div className="vr-trust">
              <span><ShieldCheck size={16} aria-hidden="true" />Los datos de cada negocio, separados</span>
              <span><BadgeCheck size={16} aria-hidden="true" />Cada acción queda registrada</span>
            </div>
          </div>

          {/* Vista previa del panel: misma estructura que el panel real (menú, barra de arriba, indicadores). */}
          <div className="vr-preview" role="img" aria-label="Vista previa del panel de Vase Rest con el salón en vivo">
            <div className="vr-pv-side" aria-hidden="true">
              <span className="vr-pv-logo" />
              <span className="vr-pv-nb on" /><span className="vr-pv-nb" /><span className="vr-pv-nb" /><span className="vr-pv-nb" /><span className="vr-pv-nb" />
            </div>
            <div className="vr-pv-main" aria-hidden="true">
              <div className="vr-pv-top">
                <div><b>Salón</b><small>Sucursal Centro · 21:40</small></div>
                <span className="vr-pv-status"><i />Todo sincronizado</span>
              </div>
              <div className="vr-pv-kpis">
                <div><small>Mesas ocupadas</small><b>14 / 22</b></div>
                <div><small>En cocina</small><b>9</b></div>
                <div><small>Ventas de hoy</small><b>$ 1,2 M</b></div>
              </div>
              <div className="vr-pv-floor">
                {["M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8"].map((code, index) => (
                  <span key={code} className={`t ${["busy", "free", "busy", "res", "free", "busy", "clean", "busy"][index]}`}>
                    <b>{code}</b><small>{["4 p.", "2 p.", "6 p.", "21:30", "4 p.", "2 p.", "—", "8 p."][index]}</small>
                  </span>
                ))}
              </div>
              <div className="vr-pv-ticket">
                <ReceiptText size={15} />
                <span><b>Mesa 4 · 2 platos listos</b><small>Cocina caliente avisó hace 1 min</small></span>
              </div>
            </div>
          </div>
        </section>

        <section id="funciones" className="vr-wrap vr-section">
          <div className="vr-section-head">
            <span className="vr-kick"><i />Funciones</span>
            <h2>Todo el servicio, de la mesa a la caja</h2>
            <p>Cada pantalla está pensada para quien la usa en plena hora pico.</p>
          </div>
          <div className="vr-features">
            {features.map(({ icon: Icon, title, body }) => (
              <article key={title} className="vr-feature">
                <span className="vr-kic"><Icon size={20} aria-hidden="true" /></span>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="sin-internet" className="vr-wrap vr-section">
          <div className="vr-band">
            <div className="vr-band-head">
              <span className="vr-band-ic"><WifiOff size={22} aria-hidden="true" /></span>
              <div>
                <h2>¿Se cortó internet? El servicio sigue.</h2>
                <p>Cada sucursal tiene su propio servidor local. La nube es para mirar todo junto, no para poder trabajar.</p>
              </div>
            </div>
            <ol className="vr-steps">
              {steps.map((step) => (
                <li key={step.n}>
                  <span className="vr-stepn">{step.n}</span>
                  <b>{step.title}</b>
                  <p>{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="equipo" className="vr-wrap vr-section">
          <div className="vr-section-head">
            <span className="vr-kick"><i />Tu equipo</span>
            <h2>Cada uno ve lo suyo</h2>
            <p>Entran con un código y un PIN. El mozo ve el salón, la cocina ve sus comandas y la caja ve la caja.</p>
          </div>
          <div className="vr-roles">
            {roles.map((role) => <span key={role} className="vr-role">{role}</span>)}
          </div>
        </section>

        <section className="vr-wrap vr-section">
          <div className="vr-cta">
            <div>
              <h2>Probalo en tu restaurante</h2>
              <p>Si ya tenés cuenta en Vase, entrá y creá tu primera sucursal en dos minutos.</p>
            </div>
            <div className="vr-hero-actions">
              <a className="vr-btn acc lg" href={OWNER_SIGNIN}>Ingresar <ArrowRight size={17} aria-hidden="true" /></a>
              <a className="vr-btn line lg" href="https://vase.ar">Conocer Vase</a>
            </div>
          </div>
        </section>
      </main>

      <footer className="vr-foot">
        <div className="vr-wrap">
          <span>© {new Date().getFullYear()} Vase</span>
          <div className="vr-sp" />
          <a href="https://vase.ar">vase.ar</a>
          <a href="https://app.vase.ar">Tu cuenta</a>
          <a href="/staff/login">Acceso del equipo</a>
        </div>
      </footer>
    </div>
  );
}
