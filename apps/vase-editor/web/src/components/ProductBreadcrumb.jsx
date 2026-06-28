import React from "react";
import { navigate } from "../utils/navigation";

export default function ProductBreadcrumb({ items = [], className = "", dark = false }) {
    if (!items.length) return null;
    const muted = dark ? "text-white/60" : "text-[#8a7560]";
    const current = dark ? "text-white" : "text-[#FF4D00] dark:text-[#FF8A4C]";
    const hover = dark ? "hover:text-white" : "hover:text-primary";

    return (
        <nav className={`flex flex-wrap items-center gap-2 text-sm ${muted} ${className}`} aria-label="Breadcrumb">
            {items.map((item, index) => {
                const isLast = index === items.length - 1;
                return (
                    <React.Fragment key={`${item.label}-${index}`}>
                        {index > 0 ? <span>›</span> : null}
                        {item.href && !isLast ? (
                            <button type="button" onClick={() => navigate(item.href)} className={`transition-colors ${hover}`}>
                                {item.label}
                            </button>
                        ) : (
                            <span className={isLast ? current : undefined}>{item.label}</span>
                        )}
                    </React.Fragment>
                );
            })}
        </nav>
    );
}
