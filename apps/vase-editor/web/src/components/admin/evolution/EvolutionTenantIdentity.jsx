import React from 'react';
import { cn } from '../../../utils/cn';

const getInitial = (value = '') => String(value || 'E').trim().charAt(0).toUpperCase() || 'E';

const EvolutionTenantIdentity = ({ branding, compact = false, className = '' }) => {
    const title = branding?.companyName || branding?.title || 'Empresa';
    const logo = branding?.logo_url || '';

    return (
        <div className={cn('flex min-w-0 items-center gap-2.5', className)}>
            <div
                className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--admin-border-soft)] bg-[var(--admin-accent)] text-xs font-black text-[var(--admin-accent-contrast)]"
                aria-hidden="true"
            >
                {logo ? (
                    <img src={logo} alt="" className="size-7 object-contain" />
                ) : (
                    getInitial(title)
                )}
            </div>
            {!compact ? (
                <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--admin-muted-soft)]">
                        Empresa
                    </p>
                    <p className="truncate text-[13px] font-semibold admin-text-primary">{title}</p>
                </div>
            ) : null}
        </div>
    );
};

export default EvolutionTenantIdentity;
