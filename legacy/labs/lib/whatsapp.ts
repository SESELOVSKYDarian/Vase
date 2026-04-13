export async function sendWhatsAppMessage(to: string, body: string) {
    const token = process.env.META_ACCESS_TOKEN;
    const phoneNumberId = process.env.META_PHONE_NUMBER_ID;

    if (!token || !phoneNumberId) {
        console.error("Missing Meta configuration");
        return;
    }

    const url = `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`;

    const payload = {
        messaging_product: "whatsapp",
        to: to,
        detailed: true,
        text: {
            body: body
        }
    };

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errorData = await res.json();
            console.error("Error sending WhatsApp message:", JSON.stringify(errorData, null, 2));
        }
    } catch (error) {
    }
}

export async function downloadMedia(mediaId: string): Promise<Buffer | null> {
    const token = process.env.META_ACCESS_TOKEN;
    if (!token) return null;

    try {
        // 1. Get Media URL
        const urlRes = await fetch(`https://graph.facebook.com/v17.0/${mediaId}`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!urlRes.ok) return null;

        const urlData = await urlRes.json();
        const mediaUrl = urlData.url;

        // 2. Download Binary
        const mediaRes = await fetch(mediaUrl, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!mediaRes.ok) return null;

        const arrayBuffer = await mediaRes.arrayBuffer();
        return Buffer.from(arrayBuffer);

    } catch (error) {
        console.error("Error downloading media:", error);
        return null;
    }
}
