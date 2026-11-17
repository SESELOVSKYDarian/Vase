// partes: ./FooterParte.jsx
import React, { useId, useMemo, useState } from "react";
import { Instagram, Facebook, Youtube, Music2, MessageCircle, Linkedin, Globe, MapPin, Phone, Mail } from "lucide-react";
import { useTenant } from "../../context/TenantContext";
import { navigate } from "../../utils/navigation";
import { storeText } from "../../utils/storeTexts";
import { withPrivacyLink } from "../../data/legalPages";
import { PIQUIM_FOOTER_DEFAULTS } from "../../data/piquimBranding";
import { isPiquimTenantIdentity, resolveBrandLogo } from "../../utils/tenantBranding";

import FooterParte from './FooterParte.jsx';
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

const VASE_URL = "https://vase.ar";

// "(c) 2026 Vase Business. Todos los derechos reservados." -> "© 2026 Vase. ..." con Vase enlazado a vase.ar.
function LegalText({ text }) {
    const value = String(text || "").replace(/^\(c\)/i, "\u00a9");
    return (
        <>
            {value.split(/(Vase(?: Business)?)/).map((part, index) =>
                /^Vase(?: Business)?$/.test(part) ? (
                    <a
                        key={index}
                        href={VASE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold underline-offset-4 transition-colors hover:text-[var(--store-primary,#ff4d00)] hover:underline"
                    >
                        Vase
                    </a>
                ) : (
                    part
                )
            )}
        </>
    );
}

export default function Footer() {
    const { tenant, settings } = useTenant();
    const emailId = useId();
    const [email, setEmail] = useState("");
    const [submitted, setSubmitted] = useState(false);

    const branding = settings?.branding || {};
    const footer = branding.footer || {};
    const footerText = (key) => storeText("footer", key, footer.labels);
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
    const accountLinks = toArray(footer.accountLinks, isPiquim ? PIQUIM_FOOTER_DEFAULTS.accountLinks : []);
    const legalLinks = withPrivacyLink(toArray(footer.legalLinks, isPiquim ? PIQUIM_FOOTER_DEFAULTS.legalLinks : [{ label: "Terminos", href: "/terms" }]), settings);
    const socialLinks = normalizeSocials(footer).filter((item) => item?.label);
    const newsletter = { ...(isPiquim ? PIQUIM_FOOTER_DEFAULTS.newsletter : { enabled: false }), ...(footer.newsletter || {}) };
    const legalText = footer.legalText || (isPiquim ? PIQUIM_FOOTER_DEFAULTS.legalText : '© 2026 Vase. Todos los derechos reservados.');

    const address = footer.contact?.address || commerce.address || "Mar del Plata, Argentina";
    const contactPhone = footer.contact?.phone || commerce.phone || commerce.whatsapp_number || "";
    const contactEmail = footer.contact?.email || commerce.email || "";
    const whatsappRaw = footer.socials?.whatsapp || commerce.whatsapp_number || contactPhone || "";
    const whatsappCleaned = String(whatsappRaw || "").replace(/\D/g, "");
    const showWhatsappFooter = footer.whatsapp_enabled !== false && Boolean(whatsappCleaned);
    const logoSrc = resolveBrandLogo({ tenant, settings });

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
                            <h3 className="mb-6 text-lg font-bold">{footerText("links_title")}</h3>
                            <ul className="space-y-4 text-white/60">
                                {toArray(footer.quickLinks, shopLinks).map((link, index) => (
                                    <li key={`${link.label}-${index}`}>
                                        <FooterLink href={link.href}>{link.label}</FooterLink>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div>
                            <h3 className="mb-6 text-lg font-bold">{footerText("contact_title")}</h3>
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
                                <h3 className="mb-6 text-lg font-bold">{footerText("whatsapp_title")}</h3>
                                <p className="mb-4 text-white/60">{footerText("whatsapp_text")}</p>
                                <button
                                    type="button"
                                    onClick={() => window.open(`https://wa.me/${whatsappCleaned}`, "_blank", "noopener,noreferrer")}
                                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] py-3 font-bold text-white transition-opacity hover:opacity-90"
                                >
                                    <MessageCircle size={20} strokeWidth={2.5} />
                                    {footerText("whatsapp_button")}
                                </button>
                            </div>
                        ) : null}
                    </div>

                    <div className="flex flex-col items-center justify-between gap-4 text-sm text-white/40 md:flex-row">
                        <p><LegalText text={legalText} /></p>
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
        <FooterParte FooterColumn={FooterColumn} LegalText={LegalText} SOCIAL_ICON_MAP={SOCIAL_ICON_MAP} accountLinks={accountLinks} brandName={brandName} displayBrandName={displayBrandName} email={email} emailId={emailId} footerDescription={footerDescription} handleNewsletterSubmit={handleNewsletterSubmit} helpLinks={helpLinks} legalLinks={legalLinks} legalText={legalText} logoSrc={logoSrc} newsletter={newsletter} setEmail={setEmail} setSubmitted={setSubmitted} shopLinks={shopLinks} socialLinks={socialLinks} submitted={submitted} whatsappRaw={whatsappRaw} />
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
