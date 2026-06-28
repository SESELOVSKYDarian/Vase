import React, { useId, useMemo, useState } from "react";
import { Instagram, Facebook, Youtube, Music2, MessageCircle, Linkedin, Globe, MapPin, Phone, Mail } from "lucide-react";
import { useTenant } from "../../context/TenantContext";
import { navigate } from "../../utils/navigation";
import { PIQUIM_FOOTER_DEFAULTS } from "../../data/piquimBranding";
import { isPiquimTenantIdentity } from "../../utils/tenantBranding";

const toArray = (value, fallback = []) => (Array.isArray(value) ? value : fallback);
const SOCIAL_ICON_MAP = {
    instagram: Instagram,
    facebook: Facebook,
    youtube: Youtube,
    tiktok: Music2,
    whatsapp: MessageCircle,
    linkedin: Linkedin,
    website: Globe,
};

const detectSocialType = (value = "") => {
    const raw = String(value || "").toLowerCase();
    if (raw.includes("instagram")) return "instagram";
    if (raw.includes("facebook")) return "facebook";
    if (raw.includes("youtube") || raw.includes("youtu.be")) return "youtube";
    if (raw.includes("tiktok")) return "tiktok";
    if (raw.includes("wa.me") || raw.includes("whatsapp")) return "whatsapp";
    if (raw.includes("linkedin")) return "linkedin";
    return "website";
};

const normalizeSocials = (footer) => {
    const explicit = toArray(footer.socialLinks, []);
    if (explicit.length) {
        return explicit.map((item) => {
            const type = item?.type || detectSocialType(item?.href || "");
            return {
                label: item?.label || type,
                type,
                href: item?.href || "",
            };
        });
    }

    const socials = footer.socials || {};
    return [
        { label: "Instagram", type: "instagram", href: socials.instagram || "" },
        { label: "Facebook", type: "facebook", href: socials.facebook || "" },
        { label: "YouTube", type: "youtube", href: socials.youtube || "" },
        { label: "TikTok", type: "tiktok", href: socials.tiktok || "" },
    ];
};

const FooterLink = ({ href, children }) => (
    <a
        href={href || "/"}
        onClick={(event) => {
            if (!href || href.startsWith("http")) return;
            event.preventDefault();
            navigate(href);
        }}
        target={href?.startsWith("http") ? "_blank" : undefined}
        rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
        className="text-sm font-semibold text-[#b9aaa2] transition-colors hover:text-white"
    >
        {children}
    </a>
);

export default function Footer() {
    const { tenant, settings } = useTenant();
    const emailId = useId();
    const [email, setEmail] = useState("");
    const [submitted, setSubmitted] = useState(false);

    const branding = settings?.branding || {};
    const footer = branding.footer || {};
    const commerce = settings?.commerce || {};
    const brandName = branding.name || tenant?.name || "Mi Negocio";
    const displayBrandName = String(brandName || "").toUpperCase();
    const isPiquim = isPiquimTenantIdentity({ tenant, settings });
    const genericFooterDescription = "Catalogo, pedidos y atencion comercial desde una tienda online personalizada.";
    const genericLinks = [
        { label: "Inicio", href: "/" },
        { label: "Catalogo", href: "/catalog" },
        { label: "Sobre Nosotros", href: "/about" },
    ];

    const footerDescription = footer.description || (isPiquim ? PIQUIM_FOOTER_DEFAULTS.description : genericFooterDescription);
    const shopLinks = toArray(footer.shopLinks, toArray(footer.quickLinks, isPiquim ? PIQUIM_FOOTER_DEFAULTS.shopLinks : genericLinks));
    const helpLinks = toArray(footer.helpLinks, isPiquim ? PIQUIM_FOOTER_DEFAULTS.helpLinks : []);
    const legalLinks = toArray(footer.legalLinks, isPiquim ? PIQUIM_FOOTER_DEFAULTS.legalLinks : [{ label: "Terminos", href: "/terms" }]);
    const socialLinks = normalizeSocials(footer).filter((item) => item?.label);
    const newsletter = { ...(isPiquim ? PIQUIM_FOOTER_DEFAULTS.newsletter : { enabled: false }), ...(footer.newsletter || {}) };
    const legalText = footer.legalText || (isPiquim ? PIQUIM_FOOTER_DEFAULTS.legalText : `(c) 2026 ${brandName}. Todos los derechos reservados.`);

    const address = footer.contact?.address || commerce.address || "Mar del Plata, Argentina";
    const contactPhone = footer.contact?.phone || commerce.phone || commerce.whatsapp_number || "";
    const contactEmail = footer.contact?.email || commerce.email || "";
    const whatsappRaw = footer.socials?.whatsapp || commerce.whatsapp_number || contactPhone || "";
    const whatsappCleaned = String(whatsappRaw || "").replace(/\D/g, "");
    const showWhatsappFooter = footer.whatsapp_enabled !== false && Boolean(whatsappCleaned);

    const handleNewsletterSubmit = (event) => {
        event.preventDefault();
        if (!email.trim()) return;
        setSubmitted(true);
        setEmail("");
    };

    if (!isPiquim) {
        const visibleSocialLinks = socialLinks.filter((item) => item?.href);

        return (
            <footer id="contacto" className="mt-20 w-full bg-[#181411] pb-8 pt-16 text-white">
                <div className="mx-auto max-w-[1280px] px-6 md:px-10">
                    <div className={`mb-8 grid grid-cols-1 gap-12 border-b border-white/10 pb-12 text-left ${showWhatsappFooter ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
                        <div>
                            <div className="mb-6 flex items-center gap-2 text-primary">
                                <Globe size={28} strokeWidth={2.5} className="text-primary" />
                                <h2 className="text-2xl font-black uppercase tracking-tight text-white">{displayBrandName}</h2>
                            </div>
                            <p className="mb-6 leading-relaxed text-white/60">{footerDescription}</p>

                            {visibleSocialLinks.length ? (
                                <div className="flex gap-4">
                                    {visibleSocialLinks.map((item, index) => {
                                        const Icon = SOCIAL_ICON_MAP[item?.type] || Globe;
                                        return (
                                            <a
                                                key={`${item.label}-${index}`}
                                                className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-white transition-colors hover:bg-primary"
                                                href={item.href}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                aria-label={item.label}
                                            >
                                                <Icon size={18} strokeWidth={2.4} />
                                            </a>
                                        );
                                    })}
                                </div>
                            ) : null}
                        </div>

                        <div>
                            <h3 className="mb-6 text-lg font-bold">Enlaces Rapidos</h3>
                            <ul className="space-y-4 text-white/60">
                                {toArray(footer.quickLinks, shopLinks).map((link, index) => (
                                    <li key={`${link.label}-${index}`}>
                                        <FooterLink href={link.href}>{link.label}</FooterLink>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div>
                            <h3 className="mb-6 text-lg font-bold">Contacto</h3>
                            <ul className="space-y-4 text-white/60">
                                {address ? (
                                    <li className="flex gap-3 text-left">
                                        <MapPin size={20} className="shrink-0 text-primary" />
                                        <span>{address}</span>
                                    </li>
                                ) : null}
                                {contactPhone ? (
                                    <li className="flex gap-3 text-left">
                                        <Phone size={18} className="shrink-0 text-primary" />
                                        <span>{contactPhone}</span>
                                    </li>
                                ) : null}
                                {contactEmail ? (
                                    <li className="flex gap-3 text-left">
                                        <Mail size={18} className="shrink-0 text-primary" />
                                        <span>{contactEmail}</span>
                                    </li>
                                ) : null}
                            </ul>
                        </div>

                        {showWhatsappFooter ? (
                            <div>
                                <h3 className="mb-6 text-lg font-bold">Atencion WhatsApp</h3>
                                <p className="mb-4 text-white/60">Contactanos directamente para presupuestos rapidos.</p>
                                <button
                                    type="button"
                                    onClick={() => window.open(`https://wa.me/${whatsappCleaned}`, "_blank", "noopener,noreferrer")}
                                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] py-3 font-bold text-white transition-opacity hover:opacity-90"
                                >
                                    <MessageCircle size={20} strokeWidth={2.5} />
                                    Enviar mensaje
                                </button>
                            </div>
                        ) : null}
                    </div>

                    <div className="flex flex-col items-center justify-between gap-4 text-sm text-white/40 md:flex-row">
                        <p>{legalText}</p>
                        <div className="flex gap-6 text-xs font-semibold uppercase tracking-widest">
                            {legalLinks.map((link, index) => (
                                <FooterLink key={`${link.label}-${index}`} href={link.href}>{link.label}</FooterLink>
                            ))}
                        </div>
                    </div>
                </div>
            </footer>
        );
    }

    return (
        <footer className="mt-0 w-full bg-[#1a1614] text-[#fffaf6]">
            <div className="mx-auto max-w-[1440px] px-5 py-14 md:px-10 md:py-20 xl:px-[120px]">
                <div className="grid gap-8 md:gap-10 lg:grid-cols-2 xl:grid-cols-[1.1fr_0.75fr_0.75fr_0.75fr_1fr] xl:gap-12">
                    <div className="space-y-7">
                        <button
                            type="button"
                            onClick={() => navigate("/")}
                            className="text-left text-[42px] font-black lowercase leading-none tracking-[-0.08em] text-[#ff4d00]"
                        >
                            piquim
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
                    <p>{legalText}</p>
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

function FooterColumn({ title, links, compact = false }) {
    const items = useMemo(() => toArray(links, []), [links]);
    return (
        <div>
            <h3 className="mb-5 text-xs font-black uppercase tracking-[0.18em] text-[#ffbe8b]">{title}</h3>
            <ul className={compact ? "space-y-3" : "space-y-4"}>
                {items.map((link, index) => (
                    <li key={`${title}-${link.label}-${index}`}>
                        <FooterLink href={link.href}>{link.label}</FooterLink>
                    </li>
                ))}
            </ul>
        </div>
    );
}
