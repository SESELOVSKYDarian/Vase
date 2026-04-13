import React from "react";

const normalizeAlignment = (value = "text-center") => {
  if (value === "left") return "text-left";
  if (value === "right") return "text-right";
  if (value === "center") return "text-center";
  return value || "text-center";
};

function ServiceCard({ icon, title, text, description, styles = {} }) {
  const {
    cardBg = "bg-white dark:bg-[#3d2e21]",
    cardBackgroundColor = "",
    iconColor = "var(--color-primary, #f97316)",
    iconBackgroundColor = "rgba(249, 115, 22, 0.1)",
    titleSize = "text-xl",
    cardTitleColor = "#181411",
    cardTextColor = "#8a7560",
  } = styles;
  const body = text ?? description ?? "";

  const ICON_MAP = {
    support_agent: (
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14c0 2 1.5 3 3.5 3 2 0 3.5-1 3.5-3s-1.5-3-3.5-3c-2 0-3.5 1-3.5 3z"></path><path d="M12 14c0 2 1.5 3 3.5 3 2 0 3.5-1 3.5-3s-1.5-3-3.5-3c-2 0-3.5 1-3.5 3z"></path><path d="M7 11V7a5 5 0 0 1 10 0v4"></path><path d="M12 17v4"></path><path d="M8 21h8"></path></svg>
    ),
    local_shipping: (
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
    ),
    construction: (
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
    ),
    package: (
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16.5 9.4 7.55 4.24"></path><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><path d="M3.27 6.96 12 12.01l8.73-5.05"></path><path d="M12 22.08V12"></path></svg>
    ),
    shield: (
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V6l8-4 8 4z"></path><path d="m9 12 2 2 4-4"></path></svg>
    )
  };

  const isImageUrl = typeof icon === "string" && (
    icon.startsWith("http://") ||
    icon.startsWith("https://") ||
    icon.startsWith("/uploads/") ||
    icon.startsWith("data:")
  );

  let iconNode = null;
  if (React.isValidElement(icon)) {
    iconNode = icon;
  } else if (typeof icon === "string") {
    if (ICON_MAP[icon]) {
      iconNode = ICON_MAP[icon];
    } else if (isImageUrl) {
      iconNode = <img src={icon} alt="" className="h-10 w-10 object-contain" loading="lazy" />;
    } else {
      iconNode = ICON_MAP.support_agent;
    }
  } else {
    iconNode = ICON_MAP.support_agent;
  }

  return (
    <div
      className={`flex flex-col items-center text-center p-8 rounded-2xl shadow-sm ${cardBackgroundColor ? "" : cardBg}`}
      style={cardBackgroundColor ? { backgroundColor: cardBackgroundColor } : undefined}
    >
      <div
        className="mb-4 flex h-16 w-16 items-center justify-center rounded-full"
        style={{ backgroundColor: iconBackgroundColor, color: iconColor }}
      >
        {iconNode}
      </div>
      <h3 className={`${titleSize} font-bold mb-2`} style={{ color: cardTitleColor }}>{title}</h3>
      <p style={{ color: cardTextColor }}>{body}</p>
    </div>
  );
}

export default function Services({
  title = "Te acompanamos en cada compra",
  subtitle = "Asesoria, entrega y soporte para que elijas con confianza.",
  items = [
    { icon: "support_agent", title: "Asesoramiento experto", text: "Te ayudamos a elegir la opcion correcta segun tu obra o renovacion." },
    { icon: "local_shipping", title: "Entrega coordinada", text: "Retiro en sucursal o envio segun la cobertura disponible para tu zona." },
    { icon: "shield", title: "Compra con respaldo", text: "Atencion clara y seguimiento para una experiencia de compra mas simple." }
  ],
  styles = {}
}) {
  const normalizedAlignment = normalizeAlignment(styles.alignment);
  const {
    titleSize = "text-3xl",
    subtitleSize = "text-base",
    titleColor = styles.textColor || "#181411",
    subtitleColor = styles.subtitleColor || styles.textColor || "#8a7560",
    sectionBg = "bg-[#f0edea] dark:bg-[#2a1f14]",
    cardStyles = {}
  } = styles;
  const sectionBackgroundColor = styles.backgroundColor || styles.sectionBackgroundColor || "";
  const mergedCardStyles = {
    ...cardStyles,
    cardBackgroundColor:
      styles.cardBackgroundColor ||
      styles.cardBackground ||
      cardStyles.cardBackgroundColor ||
      cardStyles.cardBackground ||
      "",
    cardTitleColor: styles.cardTitleColor || cardStyles.cardTitleColor || "#181411",
    cardTextColor: styles.cardTextColor || cardStyles.cardTextColor || "#8a7560",
    iconColor: styles.iconColor || cardStyles.iconColor || "var(--color-primary, #f97316)",
    iconBackgroundColor: styles.iconBackgroundColor || cardStyles.iconBackgroundColor || "rgba(249, 115, 22, 0.1)",
  };

  return (
    <section
      className={`px-4 py-16 md:px-10 ${sectionBackgroundColor ? "" : sectionBg}`}
      style={sectionBackgroundColor ? { backgroundColor: sectionBackgroundColor } : undefined}
    >
      <div className="mx-auto max-w-[1408px]">
        <div className={`mb-12 ${normalizedAlignment}`}>
          <h2 className={`${titleSize} font-bold tracking-tight`} style={{ color: titleColor }}>
            {title}
          </h2>
          <p
            className={`${subtitleSize} max-w-2xl mt-2 ${normalizedAlignment === "text-center" ? "mx-auto" : ""}`}
            style={{ color: subtitleColor }}
          >
            {subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {items.map((item, i) => (
            <ServiceCard
              key={i}
              icon={item.icon}
              title={item.title}
              text={item.text}
              description={item.description}
              styles={mergedCardStyles}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

