// Parte de OrderSuccessPage: handleUploadProof.
import { getApiBase } from '../../utils/api';
import { getTenantHeaders } from '../../utils/api';

/** Arma handleUploadProof con lo que necesita del componente. */
export function makeHandleUploadProof({ order, proofFile, setOrder, setProofError, setProofFile, setProofUploading, setProofUrl }) {
    return async () => {
        if (!order?.id) return;
        if (!proofFile) {
            setProofError("Seleccioná un comprobante.");
            return;
        }
        setProofUploading(true);
        setProofError("");
        try {
            const formData = new FormData();
            formData.append("proof", proofFile);
            const token = localStorage.getItem('teflon_token');
            const res = await fetch(`${getApiBase()}/api/orders/${order.id}/proof`, {
                method: "POST",
                headers: {
                    ...getTenantHeaders(),
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                },
                body: formData,
            });
            if (!res.ok) {
                const msg = await res.text();
                throw new Error(msg || "No se pudo subir el comprobante");
            }
            const data = await res.json();
            const nextUrl = data.proof_url || "";
            setProofUrl(nextUrl);
            const nextOrder = { ...order, payment_proof_url: nextUrl };
            setOrder(nextOrder);
            localStorage.setItem("teflon_last_order", JSON.stringify(nextOrder));
            setProofFile(null);
        } catch (err) {
            console.error("Error al subir comprobante", err);
            setProofError("No se pudo subir el comprobante.");
        } finally {
            setProofUploading(false);
        }
    };
}
