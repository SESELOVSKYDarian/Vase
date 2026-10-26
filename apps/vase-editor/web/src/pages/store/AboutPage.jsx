import React, { useEffect, useMemo, useState } from 'react';
import StoreLayout from '../../components/layout/StoreLayout';
import PageBuilder from '../../components/PageBuilder';
import { fetchPublicPage, getCachedPage, sameSections } from '../../utils/publicPageCache';
import { normalizeAboutSectionsForBrand } from '../../utils/aboutSections';
import { useTenant } from '../../context/TenantContext';
import { isPiquimTenantIdentity } from '../../utils/tenantBranding';

export default function AboutPage() {
    const { tenant, settings } = useTenant();
    const isPiquim = isPiquimTenantIdentity({ tenant, settings });
    // Lo guardado en el panel admin, tal cual: arranca con lo precargado (si ya se pidio) y se
    // actualiza una sola vez cuando llega la respuesta. No se muestran contenidos de relleno antes.
    const [fetched, setFetched] = useState(() => getCachedPage('about'));
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let active = true;
        fetchPublicPage('about').then((fresh) => {
            if (!active) return;
            if (fresh) setFetched((current) => (sameSections(current, fresh) ? current : fresh));
            else setFailed(true);
        });
        return () => {
            active = false;
        };
    }, []);

    // Misma regla que el panel admin (utils/aboutSections.js): lo que se edita es lo que se ve.
    const visibleSections = useMemo(() => {
        if (!Array.isArray(fetched) && !failed) return null;
        return normalizeAboutSectionsForBrand(settings, tenant, fetched || []).filter((section) => section.enabled !== false);
    }, [fetched, failed, settings, tenant]);

    return (
        <StoreLayout>
            {visibleSections ? (
                <div className={isPiquim ? 'pt-8 md:pt-10' : undefined}>
                    <PageBuilder sections={visibleSections} />
                </div>
            ) : (
                <div className="min-h-[60vh]" aria-busy="true" />
            )}
        </StoreLayout>
    );
}
