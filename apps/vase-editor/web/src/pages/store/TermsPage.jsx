import React, { useEffect, useMemo } from 'react';
import StoreLayout from '../../components/layout/StoreLayout';
import { useTenant } from '../../context/TenantContext';
import { navigate } from '../../utils/navigation';

export default function TermsPage() {
    const { tenant, settings } = useTenant();
    const branding = settings?.branding || {};
    const commerce = settings?.commerce || {};
    const companyName = useMemo(() => {
        const legal = String(commerce.legal_company_name || '').trim();
        if (legal) return legal;
        const brand = String(branding.name || tenant?.name || '').trim();
        return brand || 'la empresa';
    }, [commerce.legal_company_name, branding.name, tenant?.name]);

    const lastUpdated = useMemo(() => {
        const date = new Date();
        return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
    }, []);

    useEffect(() => {
        try { window.scrollTo({ top: 0, behavior: 'instant' }); } catch { window.scrollTo(0, 0); }
    }, []);

    const Section = ({ title, children }) => (
        <section className="mb-8">
            <h2 className="text-xl md:text-2xl font-black text-[#181411] dark:text-white mb-3 tracking-tight">{title}</h2>
            <div className="text-[15px] leading-relaxed text-[#5a4a3c] dark:text-[#c9beb1] space-y-3">
                {children}
            </div>
        </section>
    );

    return (
        <StoreLayout>
            <main className="max-w-[900px] mx-auto w-full px-4 md:px-10 py-10 md:py-16">
                <nav className="flex items-center gap-2 text-xs text-[#8a7560] mb-6 uppercase tracking-wider font-semibold">
                    <button className="hover:text-primary transition-colors" onClick={() => navigate('/')}>Inicio</button>
                    <span>/</span>
                    <span className="text-primary">Terminos y condiciones</span>
                </nav>

                <header className="mb-10">
                    <p className="text-xs uppercase tracking-[0.3em] text-[#8a7560] font-semibold">Documento legal</p>
                    <h1 className="text-3xl md:text-4xl font-black text-[#181411] dark:text-white mt-2 leading-tight">
                        Terminos y Condiciones de Uso
                    </h1>
                    <p className="text-sm text-[#8a7560] mt-3">
                        Empresa responsable: <span className="font-bold text-[#181411] dark:text-white">{companyName}</span>
                    </p>
                    <p className="text-xs text-[#8a7560] mt-1">Ultima actualizacion: {lastUpdated}</p>
                </header>

                <article className="bg-white dark:bg-[#1a130c] border border-[#e5e1de] dark:border-[#3d2f21] rounded-2xl p-6 md:p-10 shadow-sm">
                    <Section title="1. Aceptacion de los terminos">
                        <p>
                            El presente documento regula el acceso y uso del sitio de comercio electronico operado por
                            <strong> {companyName}</strong> (en adelante, "la Empresa"). Al navegar el sitio, registrar una
                            cuenta o realizar una compra, el usuario acepta de forma expresa estos terminos. Si no esta de
                            acuerdo con alguna clausula, debe abstenerse de utilizar el servicio.
                        </p>
                    </Section>

                    <Section title="2. Plataforma tecnologica">
                        <p>
                            El sitio funciona sobre la plataforma <strong>Vase.ar</strong>, un proveedor independiente de
                            software como servicio (SaaS) que provee la infraestructura tecnica, el alojamiento y las
                            herramientas de administracion.
                        </p>
                        <p>
                            <strong>Vase.ar no comercializa productos, no procesa pagos, no realiza envios, no emite
                            facturas y no tiene relacion contractual con los compradores.</strong> Toda la operacion comercial
                            (catalogo, precios, stock, cobros, despachos, garantias y atencion postventa) es responsabilidad
                            exclusiva de {companyName}. Cualquier reclamo derivado de una compra debe dirigirse directamente
                            a {companyName} a traves de los canales de contacto publicados en el sitio.
                        </p>
                    </Section>

                    <Section title="3. Registro y cuenta de usuario">
                        <p>
                            Para realizar compras puede ser necesario crear una cuenta proporcionando datos veraces y
                            actualizados. El usuario es responsable de mantener la confidencialidad de su contrasena y de
                            toda actividad realizada bajo su cuenta. {companyName} se reserva el derecho de suspender o
                            eliminar cuentas que infrinjan estos terminos o presenten datos falsos.
                        </p>
                    </Section>

                    <Section title="4. Productos, precios y disponibilidad">
                        <p>
                            Los productos publicados, sus descripciones, fotografias y precios son provistos y mantenidos por
                            {' '}{companyName}. Los precios estan expresados en la moneda indicada en el sitio e incluyen los
                            impuestos cuando asi se aclare. La Empresa puede modificar precios, condiciones de oferta y stock
                            sin previo aviso. La disponibilidad de un producto se confirma al momento de procesar el pedido.
                        </p>
                    </Section>

                    <Section title="5. Compra, pago y facturacion">
                        <p>
                            La compra se perfecciona cuando {companyName} confirma el pedido y, si corresponde, recibe el
                            pago. Los medios de pago habilitados se muestran en el checkout. La emision de comprobantes
                            fiscales (factura, recibo) y el cumplimiento de las obligaciones impositivas estan a cargo
                            exclusivo de {companyName}.
                        </p>
                        <p>
                            En caso de detectarse errores de precio, descripcion o stock, {companyName} podra cancelar el
                            pedido reintegrando el monto abonado, sin que ello genere derecho a indemnizacion adicional.
                        </p>
                    </Section>

                    <Section title="6. Envios y entrega">
                        <p>
                            Los plazos, costos y zonas de envio se informan durante el checkout o en las paginas
                            correspondientes del sitio. Las entregas son ejecutadas por {companyName} o por los
                            transportistas que la Empresa designe. El riesgo sobre el producto se transfiere al comprador
                            al momento de la entrega efectiva.
                        </p>
                    </Section>

                    <Section title="7. Cambios, devoluciones y arrepentimiento">
                        <p>
                            Conforme al regimen de defensa del consumidor aplicable en la Republica Argentina (Ley 24.240 y
                            normas concordantes), el comprador puede ejercer el derecho de revocacion dentro de los <strong>10
                            dias corridos</strong> desde la recepcion del producto, siempre que el bien no haya sido usado y
                            se encuentre en su embalaje original. Los gastos de devolucion se rigen por la normativa vigente.
                        </p>
                        <p>
                            Para iniciar un cambio o devolucion, el cliente debe contactarse con {companyName} a traves de
                            los canales publicados en el sitio.
                        </p>
                    </Section>

                    <Section title="8. Garantias">
                        <p>
                            Los productos cuentan con la garantia legal y, cuando aplique, la garantia adicional ofrecida por
                            el fabricante o por {companyName}. La gestion de garantias se realiza directamente con la Empresa.
                        </p>
                    </Section>

                    <Section title="9. Datos personales y privacidad">
                        <p>
                            {companyName} es responsable del tratamiento de los datos personales que el usuario provee al
                            registrarse o comprar, conforme a la Ley 25.326 de Proteccion de Datos Personales. Los datos se
                            utilizan para procesar pedidos, gestionar la cuenta, brindar soporte y enviar comunicaciones
                            comerciales cuando el usuario lo haya autorizado.
                        </p>
                        <p>
                            La plataforma Vase.ar actua unicamente como encargado del tratamiento, almacenando los datos en
                            nombre y por cuenta de {companyName}. Para conocer mas detalles consulte la pagina de Privacidad.
                        </p>
                    </Section>

                    <Section title="10. Propiedad intelectual">
                        <p>
                            Todas las marcas, logotipos, textos, fotografias y demas contenidos del sitio son propiedad de
                            {' '}{companyName} o de terceros que han autorizado su uso. Queda prohibida su reproduccion total
                            o parcial sin autorizacion escrita.
                        </p>
                    </Section>

                    <Section title="11. Limitacion de responsabilidad">
                        <p>
                            {companyName} no sera responsable por interrupciones del servicio, errores temporales en el
                            sitio o demoras de transportistas que escapen a su control razonable. Vase.ar, en su caracter
                            de proveedor tecnologico, no asume responsabilidad por las operaciones comerciales realizadas
                            entre {companyName} y sus clientes.
                        </p>
                    </Section>

                    <Section title="12. Modificacion de los terminos">
                        <p>
                            {companyName} podra actualizar estos terminos en cualquier momento. La version vigente sera
                            siempre la publicada en esta pagina. El uso continuado del sitio implica la aceptacion de las
                            modificaciones.
                        </p>
                    </Section>

                    <Section title="13. Ley aplicable y jurisdiccion">
                        <p>
                            Estos terminos se rigen por las leyes de la Republica Argentina. Para cualquier controversia que
                            no pueda resolverse de manera amistosa, las partes se someten a los tribunales ordinarios con
                            competencia en el domicilio comercial de {companyName}, salvo que la legislacion del consumidor
                            establezca un fuero distinto a favor del comprador.
                        </p>
                    </Section>

                    <Section title="14. Contacto">
                        <p>
                            Para consultas, reclamos o ejercicio de derechos sobre datos personales, comuniquese con
                            {' '}{companyName} a traves de los canales informados en la seccion de contacto del sitio.
                        </p>
                    </Section>
                </article>

                <div className="mt-10 flex flex-wrap gap-3 justify-between items-center">
                    <button
                        type="button"
                        onClick={() => navigate('/')}
                        className="px-5 h-11 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 transition-opacity"
                    >
                        Volver al inicio
                    </button>
                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() => navigate('/catalog')}
                            className="px-5 h-11 rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] text-sm font-bold text-[#181411] dark:text-white hover:bg-[#f5f2f0] dark:hover:bg-[#2c2116] transition-colors"
                        >
                            Ir al catalogo
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/about')}
                            className="px-5 h-11 rounded-xl border border-[#e5e1de] dark:border-[#3d2f21] text-sm font-bold text-[#181411] dark:text-white hover:bg-[#f5f2f0] dark:hover:bg-[#2c2116] transition-colors"
                        >
                            Sobre nosotros
                        </button>
                    </div>
                </div>
            </main>
        </StoreLayout>
    );
}
