import { create, Client, ev } from '@open-wa/wa-automate';
import { saveQRCode, setBotStatus } from './qr-store';
import { handleIncomingMessage } from './bot-logic';
import QRCode from 'qrcode';
import * as fs from 'fs';
import * as path from 'path';

export let botClient: Client | null = null;

export async function initBot() {
    console.log('🤖 initBot called - Starting OpenWa initialization flow...');
    console.log('👀 Listening for QR events...');

    // Event listener for all QR events
    ev.on('qr.**', async (qr: string, sessionId: string) => {
        try {
            console.log(`📡 [EV] QR Code Received for ${sessionId}! Length: ${qr?.length}`);

            // Direct file save
            try {
                const base64Data = qr.replace(/^data:image\/png;base64,/, "");
                const publicPath = path.join(process.cwd(), 'public');
                if (!fs.existsSync(publicPath)) fs.mkdirSync(publicPath, { recursive: true });
                const filePath = path.join(publicPath, 'whatsapp-qr.png');
                fs.writeFileSync(filePath, base64Data, 'base64');
                console.log('💾 [EV] QR Code saved to public/whatsapp-qr.png');
            } catch (err) {
                console.error('❌ [EV] Failed to save physical file:', err);
            }

            await saveQRCode(qr);
            await setBotStatus('pairing');
        } catch (err) {
            console.error('❌ [EV] Error in QR handler:', err);
        }
    });

    try {
        botClient = await create({
            sessionId: "ATLAS_COACHBOT",
            multiDevice: true,
            authTimeout: 0, // Wait forever
            blockCrashLogs: true,
            disableSpins: true,
            headless: true,
            hostNotificationLang: 'es' as any,
            logConsole: true,
            qrTimeout: 0,
            useChrome: true,
            onQrRefresh: async (qr: string) => {
                try {
                    const isImage = qr.startsWith('data:image');
                    console.log(`📸 QR Code Received (onQrRefresh)! Length: ${qr?.length}, IsImage: ${isImage}`);

                    let qrToSave = qr;
                    if (!isImage) {
                        // Force generate a high-quality black and white PNG (the "screenshot" approach)
                        try {
                            qrToSave = await QRCode.toDataURL(qr, {
                                margin: 2,
                                scale: 10,
                                color: {
                                    dark: '#000000',
                                    light: '#FFFFFF'
                                }
                            });
                            console.log('🖼️ Generated High-Quality PNG QR from raw string');
                        } catch (err) {
                            console.error('❌ Failed to generate QR image:', err);
                        }
                    }

                    // >>> Save to public folder as direct fallback <<<
                    try {
                        const base64Data = qrToSave.replace(/^data:image\/png;base64,/, "");
                        const publicPath = path.join(process.cwd(), 'public');
                        if (!fs.existsSync(publicPath)) fs.mkdirSync(publicPath, { recursive: true });

                        const filePath = path.join(publicPath, 'whatsapp-qr.png');
                        fs.writeFileSync(filePath, base64Data, 'base64');
                        console.log('💾 QR Code saved to public/whatsapp-qr.png');
                    } catch (err) {
                        console.error('❌ Failed to save physical QR file:', err);
                    }

                    await saveQRCode(qrToSave);
                    await setBotStatus('pairing');
                    console.log('✨ QR refresh processing finished successfully.');
                } catch (globalErr) {
                    console.error('❌ CRITICAL ERROR in onQrRefresh:', globalErr);
                }
            },
        });

        console.log('✅ Bot Connected successfully!');
        await setBotStatus('connected');
        await saveQRCode(''); // Clear QR code

        // Message Listener
        botClient.onMessage(async (message) => {
            // We pass the client instance so logic can reply
            await handleIncomingMessage(message, botClient!);
        });

        // State Listener
        botClient.onStateChanged(async (state) => {
            console.log('Bot State Change:', state);
            if (state === 'CONNECTED') {
                await setBotStatus('connected');
                await saveQRCode('');
            }
            if (['CONFLICT', 'UNLAUNCHED', 'DISCONNECTED', 'UNPAIRED', 'DEPRECATED'].includes(state)) {
                await setBotStatus('disconnected');
            }
        });

    } catch (err) {
        console.error('❌ Bot Initialization Failed:', err);
        await setBotStatus('disconnected');
    }
}
