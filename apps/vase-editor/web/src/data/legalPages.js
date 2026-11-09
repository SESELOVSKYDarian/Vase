// Términos y Políticas de la tienda: textos de partida y cómo se leen. Cada tienda los cambia desde Diseño
// (branding.legal_pages). En los textos, {empresa} se reemplaza por el nombre de la empresa.
export const LEGAL_DEFAULTS = {
    terms: {
        path: '/terms',
        tab: 'Términos y condiciones',
        crumb: 'Terminos y condiciones',
        title: 'Terminos y Condiciones de Uso',
        // Frases sobre Vase que van siempre al final de su sección; si la tienda quita la sección, salen solas.
        notes: [
            { key: "datos-personales", title: "Datos personales y privacidad", index: 8, body: "La plataforma Vase.ar actua unicamente como encargado del tratamiento, almacenando los datos en nombre y por cuenta de {empresa}. Para conocer mas detalles consulte la pagina de Privacidad." },
            { key: "responsabilidad", title: "Limitacion de responsabilidad", index: 10, body: "Vase.ar, en su caracter de proveedor tecnologico, no asume responsabilidad por las operaciones comerciales realizadas entre {empresa} y sus clientes." },
        ],
        // La cláusula de Vase va siempre, en todas las tiendas: no se guarda con la tienda ni se puede editar.
        fixed: {
            index: 1,
            title: "Plataforma tecnologica",
            body: "El sitio funciona sobre la plataforma **Vase.ar**, un proveedor independiente de software como servicio (SaaS) que provee la infraestructura tecnica, el alojamiento y las herramientas de administracion.\n\n**Vase.ar no comercializa productos, no procesa pagos, no realiza envios, no emite facturas y no tiene relacion contractual con los compradores.** Toda la operacion comercial (catalogo, precios, stock, cobros, despachos, garantias y atencion postventa) es responsabilidad exclusiva de {empresa}. Cualquier reclamo derivado de una compra debe dirigirse directamente a {empresa} a traves de los canales de contacto publicados en el sitio.",
        },
        sections: [
            {
                title: "Aceptacion de los terminos",
                body: "El presente documento regula el acceso y uso del sitio de comercio electronico operado por **{empresa}** (en adelante, \"la Empresa\"). Al navegar el sitio, registrar una cuenta o realizar una compra, el usuario acepta de forma expresa estos terminos. Si no esta de acuerdo con alguna clausula, debe abstenerse de utilizar el servicio."
            },
            {
                title: "Registro y cuenta de usuario",
                body: "Para realizar compras puede ser necesario crear una cuenta proporcionando datos veraces y actualizados. El usuario es responsable de mantener la confidencialidad de su contrasena y de toda actividad realizada bajo su cuenta. {empresa} se reserva el derecho de suspender o eliminar cuentas que infrinjan estos terminos o presenten datos falsos."
            },
            {
                title: "Productos, precios y disponibilidad",
                body: "Los productos publicados, sus descripciones, fotografias y precios son provistos y mantenidos por {empresa}. Los precios estan expresados en la moneda indicada en el sitio e incluyen los impuestos cuando asi se aclare. La Empresa puede modificar precios, condiciones de oferta y stock sin previo aviso. La disponibilidad de un producto se confirma al momento de procesar el pedido."
            },
            {
                title: "Compra, pago y facturacion",
                body: "La compra se perfecciona cuando {empresa} confirma el pedido y, si corresponde, recibe el pago. Los medios de pago habilitados se muestran en el checkout. La emision de comprobantes fiscales (factura, recibo) y el cumplimiento de las obligaciones impositivas estan a cargo exclusivo de {empresa}.\n\nEn caso de detectarse errores de precio, descripcion o stock, {empresa} podra cancelar el pedido reintegrando el monto abonado, sin que ello genere derecho a indemnizacion adicional."
            },
            {
                title: "Envios y entrega",
                body: "Los plazos, costos y zonas de envio se informan durante el checkout o en las paginas correspondientes del sitio. Las entregas son ejecutadas por {empresa} o por los transportistas que la Empresa designe. El riesgo sobre el producto se transfiere al comprador al momento de la entrega efectiva."
            },
            {
                title: "Cambios, devoluciones y arrepentimiento",
                body: "Conforme al regimen de defensa del consumidor aplicable en la Republica Argentina (Ley 24.240 y normas concordantes), el comprador puede ejercer el derecho de revocacion dentro de los **10 dias corridos** desde la recepcion del producto, siempre que el bien no haya sido usado y se encuentre en su embalaje original. Los gastos de devolucion se rigen por la normativa vigente.\n\nPara iniciar un cambio o devolucion, el cliente debe contactarse con {empresa} a traves de los canales publicados en el sitio."
            },
            {
                title: "Garantias",
                body: "Los productos cuentan con la garantia legal y, cuando aplique, la garantia adicional ofrecida por el fabricante o por {empresa}. La gestion de garantias se realiza directamente con la Empresa."
            },
            {
                key: "datos-personales",
                title: "Datos personales y privacidad",
                body: "{empresa} es responsable del tratamiento de los datos personales que el usuario provee al registrarse o comprar, conforme a la Ley 25.326 de Proteccion de Datos Personales. Los datos se utilizan para procesar pedidos, gestionar la cuenta, brindar soporte y enviar comunicaciones comerciales cuando el usuario lo haya autorizado.",
            },
            {
                title: "Propiedad intelectual",
                body: "Todas las marcas, logotipos, textos, fotografias y demas contenidos del sitio son propiedad de {empresa} o de terceros que han autorizado su uso. Queda prohibida su reproduccion total o parcial sin autorizacion escrita."
            },
            {
                key: "responsabilidad",
                title: "Limitacion de responsabilidad",
                body: "{empresa} no sera responsable por interrupciones del servicio, errores temporales en el sitio o demoras de transportistas que escapen a su control razonable.",
            },
            {
                title: "Modificacion de los terminos",
                body: "{empresa} podra actualizar estos terminos en cualquier momento. La version vigente sera siempre la publicada en esta pagina. El uso continuado del sitio implica la aceptacion de las modificaciones."
            },
            {
                title: "Ley aplicable y jurisdiccion",
                body: "Estos terminos se rigen por las leyes de la Republica Argentina. Para cualquier controversia que no pueda resolverse de manera amistosa, las partes se someten a los tribunales ordinarios con competencia en el domicilio comercial de {empresa}, salvo que la legislacion del consumidor establezca un fuero distinto a favor del comprador."
            },
            {
                title: "Contacto",
                body: "Para consultas, reclamos o ejercicio de derechos sobre datos personales, comuniquese con {empresa} a traves de los canales informados en la seccion de contacto del sitio."
            }
        ],
            },
    privacy: {
        path: '/privacy',
        tab: 'Privacidad y seguridad',
        crumb: 'Privacidad y seguridad',
        title: 'Políticas de Privacidad y Seguridad',
        notes: [
            { key: "responsable", title: "Quién es responsable de tus datos", index: 0, body: "El sitio funciona sobre la plataforma **Vase.ar**, que actúa únicamente como encargada del tratamiento: almacena y procesa los datos en nombre y por cuenta de {empresa}." },
        ],
        sections: [
            {
                key: "responsable",
                title: "Quién es responsable de tus datos",
                body: "**{empresa}** es responsable del tratamiento de los datos personales que se recogen en este sitio, conforme a la Ley 25.326 de Protección de Datos Personales de la República Argentina.",
            },
            {
                title: "Qué datos recopilamos",
                body: "- Datos de la cuenta: nombre, correo electrónico, teléfono y contraseña.\n- Datos de compra: productos pedidos, dirección de entrega, datos de facturación y medio de pago elegido.\n- Datos de uso: páginas visitadas, búsquedas, productos guardados y datos técnicos del dispositivo y la conexión.\n- Lo que nos envíes al comunicarte con nosotros."
            },
            {
                title: "Para qué los usamos",
                body: "- Crear y administrar tu cuenta.\n- Procesar pedidos, pagos, envíos, cambios y devoluciones.\n- Emitir comprobantes y cumplir obligaciones legales.\n- Responder consultas y brindar soporte.\n- Mejorar el sitio y prevenir fraudes.\n- Enviarte novedades y promociones, solo si lo autorizaste. Podés darte de baja cuando quieras."
            },
            {
                title: "Con quién los compartimos",
                body: "No vendemos tus datos personales. Solo los compartimos con quienes hacen falta para prestar el servicio: proveedores de pago, empresas de transporte, servicios de correo y la plataforma tecnológica. También podremos informarlos cuando una autoridad competente lo exija."
            },
            {
                title: "Cookies y almacenamiento en el navegador",
                body: "Usamos cookies y almacenamiento local del navegador para mantener tu sesión, recordar el carrito y guardar tus preferencias. Si se utilizan herramientas de medición, sirven para entender cómo se usa el sitio.\n\nPodés borrar o bloquear las cookies desde tu navegador, pero algunas funciones pueden dejar de andar."
            },
            {
                title: "Seguridad de la información",
                body: "Aplicamos medidas técnicas y organizativas razonables para proteger tus datos contra accesos no autorizados, pérdida o alteración, como la conexión cifrada del sitio y el acceso restringido a la información.\n\nNingún sistema es completamente infalible. Te recomendamos usar una contraseña propia y segura, no compartirla y cerrar la sesión en dispositivos ajenos. {empresa} nunca te va a pedir tu contraseña."
            },
            {
                title: "Pagos",
                body: "Cuando pagás con un proveedor externo, los datos de tu tarjeta o cuenta los procesa directamente ese proveedor, bajo sus propias condiciones de seguridad y privacidad."
            },
            {
                title: "Cuánto tiempo guardamos los datos",
                body: "Conservamos tus datos mientras tengas una cuenta activa y durante el tiempo necesario para cumplir obligaciones legales, contables e impositivas."
            },
            {
                title: "Tus derechos",
                body: "Podés solicitar el acceso, la rectificación, la actualización o la supresión de tus datos, comunicándote con {empresa} por los canales publicados en el sitio.\n\nEl titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en forma gratuita a intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo al efecto conforme lo establecido en el artículo 14, inciso 3 de la Ley 25.326. La Agencia de Acceso a la Información Pública, órgano de control de la Ley 25.326, tiene la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de protección de datos personales."
            },
            {
                title: "Cambios en esta política",
                body: "{empresa} puede actualizar esta política en cualquier momento. La versión vigente es siempre la publicada en esta página."
            },
            {
                title: "Contacto",
                body: "Para consultas sobre privacidad o seguridad, comunicate con {empresa} por los canales informados en la sección de contacto del sitio."
            }
        ],
            },
};

const clone = (value) => JSON.parse(JSON.stringify(value));
const sameTitle = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

// Una versión guardada no puede repetir ni reemplazar las frases fijas de Vase.
function withoutNotes(section, notes = []) {
    const body = notes.reduce((text, note) => text.split(note.body).join(''), String(section?.body || ''));
    return { ...section, body: body.replace(/\n{3,}/g, '\n\n').trim() };
}

// Lo que muestra la página: lo que cargó la tienda o, si no tocó nada, el texto de partida.
export function legalPage(kind, settings = {}) {
    const base = LEGAL_DEFAULTS[kind];
    const saved = settings?.branding?.legal_pages?.[kind] || {};
    const hasOwn = Array.isArray(saved.sections);
    return {
        title: String(saved.title || '').trim() || base.title,
        // Las secciones que edita la tienda; una copia guardada de la cláusula fija no cuenta.
        sections: hasOwn
            ? saved.sections.filter((section) => !base.fixed || !sameTitle(section?.title, base.fixed.title)).map((section) => withoutNotes(section, base.notes))
            : clone(base.sections),
        notes: base.notes || [],
        fixed: base.fixed ? { ...base.fixed } : null,
        updated_at: saved.updated_at || null,
        customized: hasOwn,
        hide_footer_link: saved.hide_footer_link === true,
    };
}

// Lo que se lee en la página: las secciones de la tienda con lo fijo de Vase en su lugar.
export function legalDisplaySections(page) {
    const noteFor = (section) => page.notes.find((note) => (section.key ? section.key === note.key : sameTitle(section.title, note.title)));
    const list = page.sections.map((section, sourceIndex) => ({ ...section, sourceIndex, note: noteFor(section)?.body || '' }));
    const orphans = page.notes.filter((note) => !list.some((section) => section.note === note.body));
    const place = (item, index) => list.splice(Math.min(index, list.length), 0, { title: item.title, body: item.body, fixed: true });
    if (page.fixed) place(page.fixed, page.fixed.index);
    orphans.forEach((note) => place(note, note.index));
    return list;
}

export const fillCompany = (text, company) => String(text || '').replace(/\{empresa\}/gi, company);

// Convierte el texto en párrafos y listas: línea en blanco separa; "- " arma una lista.
export function legalBlocks(body) {
    return String(body || '').split(/\n\s*\n/).map((chunk) => chunk.trim()).filter(Boolean).map((chunk) => {
        const lines = chunk.split('\n').map((line) => line.trim()).filter(Boolean);
        if (lines.every((line) => line.startsWith('- '))) return { type: 'list', items: lines.map((line) => line.slice(2)) };
        return { type: 'text', text: lines.join(' ') };
    });
}

// "**así**" va en negrita. Devuelve los pedazos para armarlos sin HTML.
export function legalInline(text) {
    return String(text || '').split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((part) => (
        part.startsWith('**') && part.endsWith('**') && part.length > 4 ? { bold: true, text: part.slice(2, -2) } : { bold: false, text: part }
    ));
}

// El pie siempre lleva a Privacidad, salvo que la tienda lo apague o ya tenga un link.
export function withPrivacyLink(links = [], settings = {}) {
    if (legalPage('privacy', settings).hide_footer_link) return links;
    if (links.some((link) => String(link?.href || '').startsWith('/privacy'))) return links;
    return [...links, { label: 'Privacidad y seguridad', href: '/privacy' }];
}
