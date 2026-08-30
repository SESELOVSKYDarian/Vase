export async function readSaveFailure(response, operation = 'guardado') {
    const status = Number(response?.status || 0);
    const rawBody = await response?.text?.().catch(() => '') || '';
    let payload = null;

    if (rawBody) {
        try {
            payload = JSON.parse(rawBody);
        } catch {
            payload = null;
        }
    }

    const payloadError = typeof payload?.error === 'string' ? payload.error : '';
    const code = payload?.code || payloadError || `save_http_${status || 'unknown'}`;
    const details =
        payload?.details ||
        payload?.message ||
        payloadError ||
        rawBody ||
        response?.statusText ||
        `La operacion respondio HTTP ${status || 'desconocido'}`;

    return {
        operation,
        code,
        error: payloadError || code,
        details: String(details),
        status,
    };
}
