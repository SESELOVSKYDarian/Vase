import React, { useEffect, useMemo } from 'react';
import StoreLayout from '../../components/layout/StoreLayout';
import { useTenant } from '../../context/TenantContext';
import { navigate } from '../../utils/navigation';
import { LEGAL_DEFAULTS, fillCompany, legalBlocks, legalDisplaySections, legalInline, legalPage } from '../../data/legalPages';

const Inline = ({ text, company }) => legalInline(fillCompany(text, company)).map((part, index) => (
    part.bold ? <strong key={index}>{part.text}</strong> : <React.Fragment key={index}>{part.text}</React.Fragment>
));

const Section = ({ title, body, company }) => (
    <section className="mb-8">
        <h2 className="text-xl md:text-2xl font-black text-[#181411] dark:text-white mb-3 tracking-tight">{fillCompany(title, company)}</h2>
        <div className="text-[15px] leading-relaxed text-[#5a4a3c] dark:text-[#c9beb1] space-y-3">
            {legalBlocks(body).map((block, index) => (
                block.type === 'list'
                    ? <ul key={index} className="list-disc space-y-1.5 pl-5">{block.items.map((item, i) => <li key={i}><Inline text={item} company={company} /></li>)}</ul>
                    : <p key={index}><Inline text={block.text} company={company} /></p>
            ))}
        </div>
    </section>
);

// Términos (/terms) y Privacidad y seguridad (/privacy): misma página, distinto texto.
export function LegalDocument({ kind }) {
    const { tenant, settings } = useTenant();
    const page = legalPage(kind, settings);
    const crumb = LEGAL_DEFAULTS[kind].crumb;
    const branding = settings?.branding || {};
    const commerce = settings?.commerce || {};
    const companyName = useMemo(() => {
        const legal = String(commerce.legal_company_name || '').trim();
        if (legal) return legal;
        const brand = String(branding.name || tenant?.name || '').trim();
        return brand || 'la empresa';
    }, [commerce.legal_company_name, branding.name, tenant?.name]);

    const lastUpdated = useMemo(() => {
        const date = page.updated_at ? new Date(page.updated_at) : new Date();
        return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
    }, [page.updated_at]);

    useEffect(() => {
        try { window.scrollTo({ top: 0, behavior: 'instant' }); } catch { window.scrollTo(0, 0); }
    }, []);

    return (
        <StoreLayout>
            <main className="max-w-[900px] mx-auto w-full px-4 md:px-10 py-10 md:py-16">
                <nav className="flex items-center gap-2 text-xs text-[#8a7560] mb-6 uppercase tracking-wider font-semibold">
                    <button className="hover:text-primary transition-colors" onClick={() => navigate('/')}>Inicio</button>
                    <span>/</span>
                    <span className="text-primary">{crumb}</span>
                </nav>

                <header className="mb-10">
                    <p className="text-xs uppercase tracking-[0.3em] text-[#8a7560] font-semibold">Documento legal</p>
                    <h1 className="text-3xl md:text-4xl font-black text-[#181411] dark:text-white mt-2 leading-tight">
                        {page.title}
                    </h1>
                    <p className="text-sm text-[#8a7560] mt-3">
                        Empresa responsable: <span className="font-bold text-[#181411] dark:text-white">{companyName}</span>
                    </p>
                    <p className="text-xs text-[#8a7560] mt-1">Ultima actualizacion: {lastUpdated}</p>
                </header>

                <article className="bg-white dark:bg-[#1a130c] border border-[#e5e1de] dark:border-[#3d2f21] rounded-2xl p-6 md:p-10 shadow-sm">
                    {legalDisplaySections(page).map((section, index) => (
                        <Section key={index} title={`${index + 1}. ${section.title}`} body={[section.body, section.note].filter(Boolean).join('\n\n')} company={companyName} />
                    ))}
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

export default function TermsPage() {
    return <LegalDocument kind="terms" />;
}

export function PrivacyPage() {
    return <LegalDocument kind="privacy" />;
}
