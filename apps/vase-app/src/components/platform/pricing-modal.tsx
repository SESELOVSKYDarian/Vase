"use client";

import { X, CheckCircle2, Sparkles, Building2, FlaskConical } from "lucide-react";
import Link from "next/link";
import { pricingPlans, labsPlans } from "@/config/public-site";

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PricingModal({ isOpen, onClose }: PricingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-10">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative flex h-full max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2.5rem] border border-[var(--border-subtle)] bg-[var(--background)] shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--surface-strong)] px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--foreground)]">Planes de Vase</h2>
              <p className="text-sm text-[var(--muted)]">Elige la estructura que mejor se adapte a tu negocio.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-full border border-[var(--border-subtle)] transition hover:bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-8 lg:p-10">
          <div className="grid gap-12 lg:grid-cols-2">
            
            {/* Vase Business Section */}
            <section>
              <div className="mb-6 flex items-center gap-2">
                <Building2 className="size-5 text-[var(--accent-strong)]" />
                <h3 className="text-lg font-bold uppercase tracking-wider text-[var(--muted-soft)]">Vase Business</h3>
              </div>
              <div className="grid gap-6">
                {pricingPlans.map((plan, idx) => (
                  <div 
                    key={plan.name}
                    className="relative flex flex-col rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-8 transition hover:border-[var(--accent-strong)]/30"
                  >
                    <span className="absolute right-6 top-6 rounded-full bg-[var(--accent-soft)] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[var(--accent-strong)]">
                      {plan.badge}
                    </span>
                    <h4 className="font-[family-name:var(--font-newsreader)] text-3xl italic text-[var(--foreground)]">{plan.name}</h4>
                    <p className="mt-4 text-4xl font-bold text-[var(--foreground)]">{plan.price}</p>
                    <p className="mt-3 text-sm text-[var(--muted)]">{plan.description}</p>
                    
                    <ul className="mt-6 space-y-3">
                      {plan.points.slice(0, 4).map(point => (
                        <li key={point} className="flex gap-3 text-sm text-[var(--foreground)]">
                          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--accent-strong)]" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>

                    <Link
                      href={"/app/billing" as any}
                      onClick={onClose}
                      className="mt-8 flex min-h-12 items-center justify-center rounded-full bg-[var(--accent-strong)] text-sm font-bold text-[var(--accent-contrast)] transition hover:opacity-90"
                    >
                      Comprar plan
                    </Link>
                  </div>
                ))}
              </div>
            </section>

            {/* Vase Labs Section */}
            <section>
              <div className="mb-6 flex items-center gap-2">
                <FlaskConical className="size-5 text-[var(--accent-strong)]" />
                <h3 className="text-lg font-bold uppercase tracking-wider text-[var(--muted-soft)]">Vase Labs</h3>
              </div>
              <div className="grid gap-6">
                {labsPlans.map((plan, idx) => (
                  <div 
                    key={plan.name}
                    className={`relative flex flex-col rounded-[2rem] border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-8 transition hover:border-[var(--accent-strong)]/30 ${idx === 1 ? 'ring-2 ring-[var(--accent-strong)]/20' : ''}`}
                  >
                    <span className="absolute right-6 top-6 rounded-full bg-[var(--background)] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">
                      {plan.badge}
                    </span>
                    <h4 className="font-[family-name:var(--font-newsreader)] text-3xl italic text-[var(--foreground)]">{plan.name}</h4>
                    <p className="mt-4 text-4xl font-bold text-[var(--foreground)]">{plan.price}</p>
                    <p className="mt-3 text-sm text-[var(--muted)]">{plan.description}</p>

                    <Link
                      href={"/app/billing" as any}
                      onClick={onClose}
                      className="mt-8 flex min-h-12 items-center justify-center rounded-full border border-[var(--accent-strong)] text-sm font-bold text-[var(--accent-strong)] transition hover:bg-[var(--accent-soft)]"
                    >
                      Comprar ahora
                    </Link>
                  </div>
                ))}
              </div>
            </section>

          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--border-subtle)] bg-[var(--surface)] px-8 py-5">
          <p className="text-center text-xs text-[var(--muted)]">
            Los valores publicados son bases orientativas. Consulta con soporte por requerimientos extra o integraciones personalizadas.
          </p>
        </div>
      </div>
    </div>
  );
}
