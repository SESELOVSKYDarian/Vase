'use client';

import KBManagement from '@/app/super-admin/kb/page';

export default function SupportKB() {
    // Por ahora, reutilizamos el componente de gestión. 
    // En un sistema real, podríamos pasarle una prop 'readOnly' si no queremos que los agentes editen.
    return <KBManagement />;
}
