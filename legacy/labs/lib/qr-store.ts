import { supabaseAdmin } from './supabase-admin';

export async function saveQRCode(qr: string) {
    if (qr) {
        console.log(`💾 Saving QR to Supabase. Length: ${qr.length}, Prefix: ${qr.substring(0, 30)}...`);
    } else {
        console.log('💾 Clearing QR from Supabase (connected or idle).');
    }

    const { error } = await supabaseAdmin
        .from('system_status')
        .upsert({ key: 'qr_code', value: JSON.stringify(qr) });

    if (error) console.error('❌ Error saving QR to Supabase:', error);
}

export async function setBotStatus(status: 'connected' | 'disconnected' | 'pairing') {
    await supabaseAdmin
        .from('system_status')
        .upsert({ key: 'bot_status', value: JSON.stringify(status) });
}

export async function getQRCode() {
    const { data } = await supabaseAdmin
        .from('system_status')
        .select('value')
        .eq('key', 'qr_code')
        .single();

    return data?.value ? JSON.parse(data.value) : null;
}

export async function getBotStatus() {
    const { data } = await supabaseAdmin
        .from('system_status')
        .select('value')
        .eq('key', 'bot_status')
        .single();

    return data?.value ? JSON.parse(data.value) : 'disconnected';
}
