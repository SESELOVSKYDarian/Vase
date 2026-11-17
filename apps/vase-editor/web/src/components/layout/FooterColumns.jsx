// Pie de la tienda: columnas de links, contacto y redes.
import { Globe } from 'lucide-react';
import { navigate } from '../../utils/navigation';

export default function FooterColumns({ FooterColumn, LegalText, SOCIAL_ICON_MAP, accountLinks, brandName, displayBrandName, email, emailId, footerDescription, handleNewsletterSubmit, helpLinks, legalLinks, legalText, logoSrc, newsletter, setEmail, setSubmitted, shopLinks, socialLinks, submitted, whatsappRaw }) {
    return (
        <footer className="mt-0 w-full bg-[#1a1614] text-[#fffaf6]">
            <div className="mx-auto max-w-[1440px] px-5 py-14 md:px-10 md:py-20 xl:px-[120px]">
                <div className="grid gap-8 md:gap-10 lg:grid-cols-2 xl:grid-cols-[1.1fr_0.75fr_0.75fr_0.75fr_0.75fr_1fr] xl:gap-12">
                    <div className="space-y-7">
                        <button
                            type="button"
                            onClick={() => navigate("/")}
                            className="text-left text-[42px] font-black lowercase leading-none tracking-[-0.08em] text-[#ff4d00]"
                        >
                            {logoSrc ? <img src={logoSrc} alt={brandName} className="h-11 w-auto object-contain" /> : displayBrandName}
                        </button>
                        <p className="max-w-sm text-base font-semibold leading-7 text-[#d7c8bf]">
                            {footerDescription}
                        </p>
                        <div className="flex flex-wrap gap-3">
                            {socialLinks.map((item, index) => (
                                (() => {
                                    const Icon = SOCIAL_ICON_MAP[item?.type] || Globe;
                                    return (
                                        <a
                                            key={`${item.label}-${index}`}
                                            href={item.href || "#"}
                                            onClick={(event) => {
                                                if (!item.href) event.preventDefault();
                                            }}
                                            target={item.href?.startsWith("http") ? "_blank" : undefined}
                                            rel={item.href?.startsWith("http") ? "noopener noreferrer" : undefined}
                                            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#3a2d27] bg-[#241d1a] text-[#fffaf6] transition-colors hover:border-[#ff4d00] hover:text-[#ff4d00]"
                                            aria-label={item.label}
                                        >
                                            <Icon size={16} strokeWidth={2.4} />
                                        </a>
                                    );
                                })()
                            ))}
                        </div>
                    </div>

                    <div className="lg:pt-1">
                        <FooterColumn title="Tienda" links={shopLinks} />
                    </div>
                    <div className="lg:pt-1">
                        <FooterColumn title="Ayuda" links={helpLinks} />
                    </div>

                    <div className="lg:pt-1">
                        <FooterColumn title="Cuenta" links={accountLinks} />
                    </div>

                    <div className="lg:pt-1">
                        <FooterColumn title="Legal" links={legalLinks} compact />
                    </div>

                    <div className="space-y-4 lg:pt-1">
                        {newsletter.enabled !== false ? (
                            <form onSubmit={handleNewsletterSubmit} className="rounded-[24px] border border-[#332822] bg-[#211b18] p-4">
                                <label htmlFor={emailId} className="block text-xs font-black uppercase tracking-[0.16em] text-[#ffbe8b]">
                                    {newsletter.title}
                                </label>
                                <p className="mt-2 text-sm leading-5 text-[#b9aaa2]">{newsletter.description}</p>
                                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                                    <input
                                        id={emailId}
                                        type="email"
                                        value={email}
                                        onChange={(event) => {
                                            setEmail(event.target.value);
                                            setSubmitted(false);
                                        }}
                                        placeholder={newsletter.placeholder}
                                        className="min-w-0 flex-1 rounded-full border border-[#3a2d27] bg-[#171310] px-4 py-3 text-sm text-white outline-none placeholder:text-[#7b665d] focus:border-[#ff4d00]"
                                    />
                                    <button type="submit" className="rounded-full bg-[#ff4d00] px-4 py-3 text-xs font-black uppercase tracking-[0.08em] text-white">
                                        {newsletter.buttonLabel}
                                    </button>
                                </div>
                                {submitted ? <p className="mt-3 text-xs font-bold text-[#ffbe8b]">Suscripcion recibida.</p> : null}
                            </form>
                        ) : null}
                    </div>
                </div>

                <div className="mt-12 flex flex-col gap-4 border-t border-[#332822] pt-8 text-xs font-semibold text-[#8f8077] md:flex-row md:items-center md:justify-between">
                    <p><LegalText text={legalText} /></p>
                    {whatsappRaw ? (
                        <button
                            type="button"
                            onClick={() => {
                                const cleaned = whatsappRaw.replace(/\D/g, "");
                                if (cleaned) window.open(`https://wa.me/${cleaned}`, "_blank");
                            }}
                            className="w-fit rounded-full border border-[#3a2d27] px-4 py-2 text-[#ffbe8b] transition-colors hover:border-[#ff4d00] hover:text-white"
                        >
                            WhatsApp comercial
                        </button>
                    ) : null}
                </div>
            </div>
        </footer>
    );
}
