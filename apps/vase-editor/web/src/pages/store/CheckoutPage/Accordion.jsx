// Parte de CheckoutPage.jsx: StepProgress, Accordion, PayOption, Line.
import React from "react";

export function StepProgress({ openStep }) {
    const steps = [
        { step: 1, title: "Datos", description: "Tu informacion" },
        { step: 2, title: "Entrega", description: "Envio o retiro" },
        { step: 3, title: "Pago", description: "Forma de pago" },
    ];

    return (
        <div className="flex items-start">
            {steps.map((item, idx) => {
                const isActive = openStep === item.step;
                const isDone = openStep > item.step;
                const isLast = idx === steps.length - 1;
                return (
                    <React.Fragment key={item.step}>
                        <div className="flex flex-col items-center flex-shrink-0">
                            <div className={[
                                "flex items-center justify-center w-9 h-9 rounded-full text-xs font-bold transition-all duration-300",
                                isActive
                                    ? "bg-primary text-white ring-4 ring-primary/20"
                                    : isDone
                                        ? "bg-primary/20 text-primary border border-primary/30"
                                        : "border border-gray-200 bg-white text-gray-500",
                            ].join(" ")}>
                                {isDone ? (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                ) : item.step}
                            </div>
                            <div className="mt-2 text-center px-2">
                                <p className={`text-xs font-semibold leading-tight ${isActive ? "text-primary" : isDone ? "text-gray-700" : "text-gray-500"}`}>
                                    {item.title}
                                </p>
                                <p className="mt-0.5 hidden text-[10px] text-gray-400 sm:block">{item.description}</p>
                            </div>
                        </div>
                        {!isLast && (
                            <div className={[
                                "flex-1 h-px mt-[18px] mx-3 transition-all duration-300",
                                isDone ? "bg-primary/40" : "bg-gray-200",
                            ].join(" ")} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

export function Accordion({ step, title, openStep, onOpen, children }) {
    const isOpen = openStep === step;
    const isDone = openStep > step;

    return (
        <div className={[
            "rounded-2xl border transition-all duration-200",
            isOpen
                ? "border-primary/25 bg-white shadow-[0_0_0_1px_rgba(99,102,241,0.08),0_20px_60px_-20px_rgba(148,163,184,0.28)]"
                : "border-gray-200 bg-white",
        ].join(" ")}>
            <button
                type="button"
                onClick={onOpen}
                className="flex w-full items-center justify-between gap-4 px-6 py-5"
            >
                <div className="flex items-center gap-3">
                    <div className={[
                        "flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold transition-all",
                        isOpen
                            ? "bg-primary text-white"
                            : isDone
                                ? "bg-primary/15 text-primary"
                                : "bg-gray-100 text-gray-500",
                    ].join(" ")}>
                        {isDone ? (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        ) : step}
                    </div>
                    <div className="text-left">
                        <p className={`text-sm font-semibold ${isOpen ? "text-gray-900" : "text-gray-700"}`}>{title}</p>
                        {isDone && !isOpen && (
                            <p className="mt-0.5 text-[11px] text-gray-500">Completado</p>
                        )}
                    </div>
                </div>
                <div className={`text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                </div>
            </button>
            {isOpen && (
                <div className="border-t border-gray-200 px-6 pb-6">
                    {children}
                </div>
            )}
        </div>
    );
}

export function PayOption({ active, onClick, icon, label, description, highlight, disabled = false }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={[
                "relative flex items-start gap-3 p-4 rounded-xl transition-all duration-200 border text-left w-full",
                active
                    ? "border-primary/40 bg-primary/[0.09] ring-1 ring-primary/20"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50",
                disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
            ].join(" ")}
        >
            {active && (
                <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                </div>
            )}
            <div className={[
                "flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0 transition-colors",
                active || highlight ? "bg-primary/20 text-primary" : "bg-gray-100 text-gray-500",
            ].join(" ")}>
                {icon}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
                <p className={`text-sm font-semibold ${active ? "text-gray-900" : "text-gray-800"}`}>{label}</p>
                {description && (
                    <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{description}</p>
                )}
            </div>
        </button>
    );
}

export function Line({ label, value }) {
    return (
        <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">{label}</span>
            <span className="text-sm font-medium text-gray-900">{value}</span>
        </div>
    );
}
