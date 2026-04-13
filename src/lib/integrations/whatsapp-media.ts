export async function downloadWhatsAppMedia(mediaId: string, accessToken: string) {
  const urlResponse = await fetch(`https://graph.facebook.com/v17.0/${mediaId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!urlResponse.ok) {
    throw new Error(`Unable to resolve WhatsApp media URL for ${mediaId}`);
  }

  const urlData = (await urlResponse.json()) as { url?: string };
  if (!urlData.url) {
    throw new Error(`WhatsApp media URL missing for ${mediaId}`);
  }

  const mediaResponse = await fetch(urlData.url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!mediaResponse.ok) {
    throw new Error(`Unable to download WhatsApp media ${mediaId}`);
  }

  const arrayBuffer = await mediaResponse.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
