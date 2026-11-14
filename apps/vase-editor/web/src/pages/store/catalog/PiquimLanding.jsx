// Portada del catálogo de Piquim: encabezado, tarjetas de familias y pie.
import { renderResponsiveCardTitle } from "../../../utils/renderResponsiveCardTitle";
import { navigate } from "../../../utils/navigation";
import { BookmarkIcon, CartIcon, SearchIcon } from "./icons.jsx";

export const PIQUIM_EXACT_CARDS = [
    {
        id: 'heladeria',
        slug: 'heladeria',
        prefix: '01 — Frío que enamora',
        title: 'Heladería',
        tags: ['Estabilizantes', 'Aditivos'],
        description: 'Materia prima para la elaboración de productos de heladería artesanal de altísima calidad.',
        image: '/piquim/catalogo/card-heladeria-piquim.jpeg',
        objectPosition: 'center 42%',
        imageStyle: { width: 566, height: 700, left: -64, top: 0 },
        overlay: 'linear-gradient(180deg, rgba(107, 184, 224, 0.56) 0%, rgba(26, 22, 20, 0.80) 100%)',
        width: 478,
    },
    {
        id: 'panaderia',
        slug: 'panaderia',
        prefix: '02 — Hornear y decorar',
        title: 'Panadería/Confitería',
        tags: ['Premezclas', 'Mejoradores', 'Cremas', 'DDL'],
        description: 'Premezclas, mejoradores, cremas y bases para panaderia, reposteria y confiteria profesional.',
        image: '/piquim/catalogo/card-panaderia-piquim.jpeg',
        objectPosition: 'center 40%',
        imageStyle: { width: 770, height: 752, left: -210, top: -26 },
        overlay: 'linear-gradient(180deg, rgba(212, 162, 74, 0.56) 0%, rgba(26, 22, 20, 0.80) 100%)',
        width: 478,
    },
];

export function PiquimCatalogLanding({ cards, onSelectCard }) {
    return (
        <div className="min-h-screen bg-[var(--store-background)] font-[Inter] text-[var(--store-text)] transition-colors duration-300">
            <div className="w-full overflow-hidden bg-[var(--store-background)]">
                <section className="w-full overflow-hidden">
                    <div className={`grid min-h-[100svh] w-full grid-cols-1 items-stretch gap-0.5 overflow-hidden bg-[#FF4D00] ${cards.length > 1 ? "lg:grid-cols-2" : ""}`}>
                        {cards.slice(0, 2).map((card) => (
                            <PiquimExactCatalogCard
                                key={card.id}
                                card={card}
                                onClick={() => onSelectCard({ ...card, categorySlug: card.categorySlug || card.slug, category: card.category || card.slug })}
                            />
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}

export function PiquimCatalogHeader() {
    return (
        <div className="fixed left-0 right-0 top-0 z-50 flex w-full flex-col items-center justify-center overflow-hidden border-b border-[#E8DFD8]/80 bg-[#FFFAF6]/35 px-[60px] py-[18px] backdrop-blur-2xl max-md:px-4">
            <div className="inline-flex w-full items-center justify-center overflow-hidden rounded-[30px] bg-[linear-gradient(90deg,rgba(255,191,140,0.74)_0%,rgba(255,239,232,0.62)_48%,rgba(255,191,140,0.74)_100%)] px-[60px] py-[18px] shadow-[0_18px_60px_rgba(255,77,0,0.12)] outline outline-1 -outline-offset-1 outline-[#E8DFD8]/90 backdrop-blur-2xl max-md:px-5">
                <button type="button" onClick={() => navigate('/')} className="shrink-0" aria-label="Ir a inicio">
                    <img src="/piquim/catalogo/logo-navbar.png" alt="Piquim" style={{ width: 108, height: 31 }} />
                </button>

                <nav className="flex flex-1 items-center justify-center gap-8 overflow-hidden max-md:hidden">
                    <button type="button" onClick={() => navigate('/')} className="text-sm font-medium text-[#1A1614]" style={{ fontFamily: 'Helvetica Neue Medium Extended, Gilroy, sans-serif' }}>
                        Inicio
                    </button>
                    <button type="button" onClick={() => navigate('/catalog')} className="text-sm font-medium text-[#1A1614]" style={{ fontFamily: 'Helvetica Neue Medium Extended, Gilroy, sans-serif' }}>
                        Catálogos
                    </button>
                    <button type="button" onClick={() => navigate('/about')} className="text-sm font-medium text-[#1A1614]" style={{ fontFamily: 'Helvetica Neue Medium Extended, Gilroy, sans-serif' }}>
                        Nosotros
                    </button>
                </nav>

                <div className="flex items-center justify-center gap-3.5 overflow-hidden">
                    <button type="button" onClick={() => navigate('/catalog')} className="flex items-center justify-center overflow-hidden rounded-full" aria-label="Buscar">
                        <SearchIcon className="size-6 text-black" />
                    </button>
                    <button type="button" onClick={() => navigate('/profile')} className="flex items-center justify-center overflow-hidden rounded-full max-sm:hidden" aria-label="Guardados">
                        <BookmarkIcon className="size-6 text-black" />
                    </button>
                    <button type="button" onClick={() => navigate('/cart')} className="flex items-center justify-center overflow-hidden rounded-full" aria-label="Carrito">
                        <CartIcon className="size-6 text-black" />
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/register')}
                        className="flex h-6 w-[100px] items-center justify-center gap-5 overflow-hidden rounded-full bg-[#FF4D00] text-sm font-bold text-[#FFFAF6] max-sm:hidden"
                        style={{ fontFamily: 'Gilroy, sans-serif' }}
                    >
                        Registrarse
                    </button>
                </div>
            </div>
        </div>
    );
}

export function PiquimExactCatalogCard({ card, onClick }) {
    return (
        <article
            className="relative min-h-[100svh] w-full overflow-hidden bg-[#1A1614]"
        >
            <img
                src={card.image}
                alt={card.title}
                className="absolute inset-0 h-full w-full object-cover"
                style={{ objectPosition: card.objectPosition || 'center' }}
            />
            <div className="absolute inset-0" style={{ background: card.overlay }} />
            <div className="absolute inset-x-4 bottom-6 flex min-h-[290px] w-auto min-w-0 flex-col items-center justify-center gap-3 px-2 sm:inset-x-6 sm:bottom-[30px] sm:gap-4 md:inset-x-10 md:px-0">
                <div className="flex items-center justify-center gap-3">
                    <div className="text-[11px] font-bold text-white" style={{ fontFamily: 'Gilroy, sans-serif', letterSpacing: 1.98 }}>
                        {card.prefix}
                    </div>
                </div>
                <h2 className="w-full max-w-full min-w-0 whitespace-normal text-center text-[clamp(2rem,10vw,3.5rem)] font-black italic leading-[0.95] text-[#FF4D00] [overflow-wrap:anywhere]" style={{ fontFamily: 'Gilroy, sans-serif' }}>
                    {renderResponsiveCardTitle(card.title)}
                </h2>
                <div className="flex w-full max-w-[398px] flex-wrap content-center items-center justify-center gap-1.5">
                    {(Array.isArray(card.tags) ? card.tags : []).map((tag) => (
                        <span
                            key={`${card.id}-${tag}`}
                            className="flex items-start justify-start overflow-hidden rounded-full bg-white/15 px-2.5 py-[5px] text-[10px] font-medium text-[#FFFAF6] outline outline-1 -outline-offset-1 outline-white"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
                <p className="w-full max-w-80 text-center text-[13px] font-normal leading-[19.5px] text-[#FFFAF6]" style={{ fontFamily: 'HelveticaNeueW01-66MediumIt, Gilroy, sans-serif' }}>
                    {card.description}
                </p>
                <button
                    type="button"
                    onClick={onClick}
                    className="inline-flex items-center justify-center gap-2 overflow-hidden border-b-2 border-[#FF4D00] pb-1"
                >
                    <span className="text-[11px] font-bold text-[#FFFAF6]" style={{ letterSpacing: 0.88 }}>{card.buttonLabel || 'VER CATÁLOGO'}</span>
                    <span className="text-sm font-bold text-[#FFFAF6]">→</span>
                </button>
            </div>
        </article>
    );
}

export function PiquimCatalogFooter() {
    const shopLinks = [
        { label: 'Heladería', href: '/catalog?category=heladeria' },
        { label: 'Panadería/Confitería', href: '/catalog?category=panaderia' },
        { label: 'Promociones', href: '/catalog' },
    ];
    const helpLinks = ['Envíos y entregas', 'Pagos y facturación', 'Cambios y devoluciones', 'Preguntas frecuentes'];
    const legalLinks = [['Términos', '/terms'], ['Privacidad', '/privacy'], ['Cookies', '/privacy'], ['Defensa al consumidor', '/about']];

    return (
        <footer className="flex w-full flex-col items-start justify-start overflow-hidden bg-[#1A1614]">
            <div className="inline-flex w-full items-start justify-center gap-[130px] overflow-hidden px-[120px] pb-[60px] pt-20 max-xl:flex-wrap max-xl:gap-12 max-xl:px-8">
                <div className="inline-flex w-[280px] flex-col items-start justify-start gap-5 overflow-hidden">
                    <img src="/piquim/catalogo/logo-footer.png" alt="Piquim" style={{ width: 142, height: 41 }} />
                    <p className="w-[280px] text-[13px] font-normal leading-[22.1px] text-[#B5ADA8]">
                        Materia prima premium para heladerías, panaderías y confiterías. Mar del Plata, desde 1992.
                    </p>
                    <div className="inline-flex items-start justify-start gap-2.5 overflow-hidden">
                        {['IG', 'FB', 'YT', 'TT'].map((item) => (
                            <span key={item} className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full text-[11px] font-bold text-[#FFFAF6] outline outline-1 -outline-offset-1 outline-[#4A4441]" style={{ letterSpacing: 0.66 }}>
                                {item}
                            </span>
                        ))}
                    </div>
                </div>

                <PiquimFooterColumn title="COMPRAR" links={shopLinks} />
                <PiquimFooterColumn title="AYUDA" links={helpLinks.map((label) => ({ label, href: '/about' }))} />

                <div className="inline-flex w-[280px] flex-col items-start justify-start gap-4 overflow-hidden">
                    <h3 className="text-[11px] font-bold text-[#FF4D00]" style={{ letterSpacing: 2.2 }}>NEWSLETTER</h3>
                    <p className="w-[280px] text-[13px] font-normal leading-[22.1px] text-[#B5ADA8]">
                        Recetas, novedades y descuentos para profesionales. Una vez al mes. Sin spam.
                    </p>
                    <div className="inline-flex w-full items-start justify-start overflow-hidden rounded-full bg-[rgba(74,68,65,0.40)]">
                        <div className="flex flex-1 items-start justify-start overflow-hidden py-3.5 pl-[18px]">
                            <span className="text-[13px] font-normal text-[#B5ADA8]">tu@email.com</span>
                        </div>
                        <button type="button" className="flex items-start justify-start overflow-hidden bg-[#FF4D00] px-[22px] py-3.5 text-base font-bold text-white">
                            →
                        </button>
                    </div>
                    <p className="w-[280px] text-[11px] font-normal leading-[17.6px] text-[#B5ADA8]">
                        Al suscribirte aceptás nuestros Términos y Política de privacidad.
                    </p>
                </div>
            </div>
            <div className="h-px w-full bg-[rgba(74,68,65,0.50)]" />
            <div className="inline-flex w-full items-center justify-between overflow-hidden px-[120px] py-7 max-xl:flex-col max-xl:items-start max-xl:gap-5 max-xl:px-8">
                <p className="text-xs font-normal text-[#B5ADA8]">
                    © 2026 Piquim Profesional S.A.  ·  Mar del Plata, Argentina  ·  CUIT 30-XXXXXXXX-X
                </p>
                <div className="flex items-start justify-start gap-7 overflow-hidden">
                    {legalLinks.map(([label, href]) => (
                        <button key={label} type="button" onClick={() => navigate(href)} className="text-xs font-medium text-[#FFFAF6]">
                            {label}
                        </button>
                    ))}
                </div>
            </div>
        </footer>
    );
}


export function PiquimFooterColumn({ title, links }) {
    return (
        <div className="inline-flex flex-col items-start justify-start gap-4 overflow-hidden">
            <h3 className="text-[11px] font-bold text-[#FF4D00]" style={{ letterSpacing: 2.2 }}>{title}</h3>
            {links.map((link) => (
                <button
                    key={`${title}-${link.label}`}
                    type="button"
                    onClick={() => navigate(link.href)}
                    className="text-sm font-medium text-[#FFFAF6]"
                >
                    {link.label}
                </button>
            ))}
        </div>
    );
}
