// Nube del panel: la misma de app y Labs (packages/ui/src/panel/cloud-status.tsx).
// Si hay cambios sin publicar, lo dice y muestra el puntito.
import { CloudStatus as SharedCloudStatus } from '@vase/ui/panel/cloud-status';

export default function CloudStatus({ cloud = 'saved', unpublished = false }) {
    return <SharedCloudStatus state={cloud} dot={unpublished} note={unpublished ? 'Falta publicar' : null} />;
}
