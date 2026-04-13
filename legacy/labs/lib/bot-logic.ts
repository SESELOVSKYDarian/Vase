import { supabaseAdmin } from './supabase-admin';
import { Client, Message, MessageTypes } from '@open-wa/wa-automate';
import { addDays, format, startOfDay, addHours, setHours, setMinutes, addMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { transcribeAudio, getAIResponse } from './openai';

// Simple deterministic state machine with AI fallback
export async function handleIncomingMessage(message: Message, client: Client) {
    const phone = message.from; // OpenWa format: 123456@c.us
    let text = message.body?.toLowerCase().trim();
    const senderName = message.sender.pushname || 'Cliente';

    // 1. Handle Audio / PTT
    if (message.type === 'audio' || message.type === 'ptt' || message.mimetype?.startsWith('audio')) {
        try {
            console.log(`[Bot] Recibido audio de ${phone}. Descargando y transcribiendo...`);
            const mediaData = await client.decryptMedia(message);
            const buffer = Buffer.from(mediaData.split(',')[1], 'base64');
            const transcription = await transcribeAudio(buffer);
            console.log(`[Bot] Transcripción: "${transcription}"`);
            text = transcription.toLowerCase().trim();
        } catch (err) {
            console.error("Error transcribiendo audio:", err);
            await client.sendText(phone as any, "Perdón, no pude escuchar bien el audio. ¿Podrías escribirme?");
            return;
        }
    }

    if (!text) return;

    // 2. Get or Create Conversation Context
    let { data: conversation } = await supabaseAdmin
        .from('conversations')
        .select('*')
        .eq('phone', phone)
        .single();

    if (!conversation) {
        const { data: newConv } = await supabaseAdmin
            .from('conversations')
            .insert({ phone, state: 'IDLE', context: {} })
            .select()
            .single();
        conversation = newConv;
    }

    // Register Client if not exists
    await supabaseAdmin.from('clients').upsert({ phone, name: senderName }, { onConflict: 'phone' });

    const state = conversation.state;

    // 3. Global Reset Command
    if (text === 'reset' || text === 'inicio' || text === 'hola' || text === 'menu') {
        await updateState(phone, 'IDLE', {});
        await client.sendText(phone as any, `👋 Hola ${senderName}! Soy el asistente virtual de la Coach.\n\nEscribí *turno* para reservar una cita.\nEscribí *precios* para ver valores.\nEscribí *servicios* para ver qué hacemos.`);
        return;
    }

    // 4. State Machine vs AI
    try {
        const context = conversation.context as any;

        // --- STATE: CHOOSING_SERVICE ---
        if (state === 'CHOOSING_SERVICE') {
            const selection = parseInt(text || '0');
            if (!isNaN(selection) && context.services && context.services[selection - 1]) {
                const selectedService = context.services[selection - 1];
                await handleTurnoRequest(phone, client, selectedService);
                return;
            } else if (text.includes('cancelar')) {
                await updateState(phone, 'IDLE', {});
                await client.sendText(phone as any, "Cancelado. ¿En qué más puedo ayudarte?");
                return;
            } else {
                await client.sendText(phone as any, "Por favor elegí un número válido de la lista o escribí *cancelar*.");
                return;
            }
        }

        // --- STATE: CHOOSING_OPTION (Time Slot) ---
        if (state === 'CHOOSING_OPTION') {
            const selection = parseInt(text || '0');

            if (!isNaN(selection) && context.options && context.options[selection - 1]) {
                const selected = context.options[selection - 1];
                const [_, dateStr, timeStr] = selected.id.split('_');
                // context now has serviceId from previous step if applicable
                await handleBookingConfirmation(phone, dateStr, timeStr, client, context.service);
                return;
            } else if (text.includes('cancelar')) {
                await updateState(phone, 'IDLE', {});
                await client.sendText(phone as any, "Entendido, cancelamos el proceso. ¿En qué más puedo ayudarte?");
                return;
            } else {
                await client.sendText(phone as any, "Opción no válida. Por favor escribí el NÚMERO de la opción (ej: 1) o escribí *cancelar*.");
                return;
            }
        }

        // Logic for "Requesting Turno"
        if (text.includes('turno') || text.includes('cita') || text.includes('reservar')) {
            await initiateBookingFlow(phone, client);
            return;
        }

        // 5. AI Fallback for everything else
        console.log(`[Bot] Consultando IA para: "${text}"`);
        const { data: aiConfig } = await supabaseAdmin.from('ai_settings').select('value').eq('key', 'config').single();

        // Fetch real services for AI context
        const { data: dbServices } = await supabaseAdmin.from('services').select('*');
        const servicesList = dbServices?.map(s => `${s.name} (${s.duration} min, $${s.price})`).join(', ') || '';

        // Default config
        const config = (aiConfig?.value as any) || {
            system_prompt: 'Eres un asistente.',
            knowledge_base: { services: [], prices: {}, scraped_url: '' },
            temperature: 0.7
        };

        const knowledgeStr = `Servicios Configurados: ${servicesList}\nInfo Extra: ${config.knowledge_base.services.join(', ')}\nPrecios: ${JSON.stringify(config.knowledge_base.prices)}`;
        const scrapedContent = config.knowledge_base.scraped_content;

        // Pass scrapedContent to getAIResponse
        const aiResponse = await getAIResponse(config.system_prompt, knowledgeStr, text, config.temperature, scrapedContent);

        if (aiResponse) {
            await client.sendText(phone as any, aiResponse);
            await updateState(phone, 'IDLE', {});
        } else {
            throw new Error("Empty AI response");
        }

    } catch (err) {
        console.error("Error in bot logic:", err);
        await client.sendText(phone as any, "Ocurrió un error procesando tu solicitud. Por favor intentá de nuevo más tarde.");
        await updateState(phone, 'IDLE', {});
    }
}

// Helpers

async function updateState(phone: string, newState: string, context: any) {
    await supabaseAdmin
        .from('conversations')
        .update({ state: newState, context, last_message_at: new Date() })
        .eq('phone', phone);
}

async function initiateBookingFlow(phone: string, client: Client) {
    // Check if we have multiple services
    const { data: services } = await supabaseAdmin.from('services').select('*').order('name');

    if (services && services.length > 0) {
        if (services.length === 1) {
            // Only one service, auto-select it
            await handleTurnoRequest(phone, client, services[0]);
        } else {
            // Multiple services, ask user
            let msg = "📋 *¿Qué servicio estás buscando?*\n\n";
            services.forEach((s, i) => {
                msg += `${i + 1}. *${s.name}* (${s.duration} min - $${s.price})\n`;
            });
            msg += "\nRespondé con el número de la opción.";

            await updateState(phone, 'CHOOSING_SERVICE', { services });
            await client.sendText(phone as any, msg);
        }
    } else {
        // No services configured, fallback to default 60 min generic
        await handleTurnoRequest(phone, client, { id: null, name: 'General', duration: 60, price: 0 });
    }
}

async function handleTurnoRequest(phone: string, client: Client, service: any) {
    await client.sendText(phone as any, `🗓️ Buscando horarios para *${service.name}* (${service.duration} min)...`);

    // 1. Get Rules
    const { data: rules } = await supabaseAdmin.from('availability_rules').select('*').eq('is_active', true);
    // 2. Get Blocks & Appointments
    const start = new Date();
    const end = addDays(start, 14); // Look 2 weeks ahead

    const { data: blocks } = await supabaseAdmin.from('blocks')
        .select('*')
        .gte('end_at', start.toISOString())
        .lte('start_at', end.toISOString());

    const { data: appointments } = await supabaseAdmin.from('appointments')
        .select('*')
        .eq('status', 'confirmed')
        .gte('start_at', start.toISOString())
        .lte('end_at', end.toISOString());

    // 3. Calculate Slots with DYNAMIC DURATION
    const slots = generateSlots(start, end, rules || [], blocks || [], appointments || [], service.duration);

    if (slots.length === 0) {
        await client.sendText(phone as any, "😔 No encontré turnos disponibles en los próximos 14 días. Por favor escribime manualmente.");
        return;
    }

    // 4. Offer up to 5 slots
    const offeredSlots = slots.slice(0, 5);

    let msg = `👇 *Horarios para ${service.name}:*\nRespondé con el número:\n`;
    offeredSlots.forEach((slot, idx) => {
        msg += `\n*${idx + 1}.* ${format(slot.date, "EEEE d 'de' MMMM - HH:mm", { locale: es })} hs`;
    });

    const contextOptions = offeredSlots.map(s => ({
        id: `book_${format(s.date, 'yyyy-MM-dd')}_${format(s.date, 'HH:mm')}`,
        label: format(s.date, "EEE d HH:mm", { locale: es })
    }));

    // Save service info in context to use it in confirmation
    await updateState(phone, 'CHOOSING_OPTION', { options: contextOptions, service });
    await client.sendText(phone as any, msg);
}


async function handleBookingConfirmation(phone: string, dateStr: string, timeStr: string, client: Client, service: any) {
    const duration = service?.duration || 60;

    // Construct Date
    const startAt = new Date(`${dateStr}T${timeStr}:00`);
    const endAt = addMinutes(startAt, duration);

    // 1. Double check availability (Race condition prevention)
    const { data: existing } = await supabaseAdmin.from('appointments')
        .select('id')
        .eq('status', 'confirmed')
        .or(`and(start_at.lte.${startAt.toISOString()},end_at.gt.${startAt.toISOString()}),and(start_at.lt.${endAt.toISOString()},end_at.gte.${endAt.toISOString()})`)
        .single();

    if (existing) {
        await client.sendText(phone as any, "⚠️ Uh! Ese turno se acaba de ocupar. Por favor pedime *turno* nuevamente.");
        await updateState(phone, 'IDLE', {});
        return;
    }

    // 2. Retrieve Trainer ID
    const { data: trainers } = await supabaseAdmin.from('trainers').select('id').limit(1);
    let trainerId = trainers && trainers.length > 0 ? trainers[0].id : null;

    if (!trainerId) {
        const { data: newTrainer } = await supabaseAdmin.from('trainers').insert({ display_name: 'Entrenadora' }).select().single();
        trainerId = newTrainer.id;
    }

    // 3. Create Client ID
    const { data: existingClient } = await supabaseAdmin.from('clients').select('id').eq('phone', phone).single();
    let clientId = existingClient?.id;

    if (!clientId) {
        const { data: newClient } = await supabaseAdmin.from('clients').insert({ phone, name: 'Cliente' }).select().single();
        clientId = newClient.id;
    }

    // 4. Insert Appointment
    const { error } = await supabaseAdmin.from('appointments').insert({
        trainer_id: trainerId,
        client_id: clientId,
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        status: 'confirmed',
        source: 'whatsapp',
        service_id: service?.id // Save reference if available
    });

    if (error) {
        console.error(error);
        await client.sendText(phone as any, "❌ Hubo un error al guardar el turno. Intentá de nuevo.");
    } else {
        const priceText = service?.price ? `\n💰 Valor: $${service.price}` : '';
        await client.sendText(phone as any, `✅ *Turno Confirmado!*\n\n📝 ${service?.name || 'Cita'}\n📅 ${format(startAt, "EEEE d 'de' MMMM", { locale: es })}\n⏰ ${timeStr} hs (${duration} min)${priceText}\n\nTe espero! 💪`);
    }

    await updateState(phone, 'IDLE', {});
}


// Logic to generate slots
function generateSlots(start: Date, end: Date, rules: any[], blocks: any[], appointments: any[], durationMinutes: number) {
    let slots: { date: Date }[] = [];
    let current = startOfDay(start);
    const endTime = end;

    while (current <= endTime) {
        const dayOfWeek = current.getDay() === 0 ? 7 : current.getDay();
        const dayRules = rules.filter(r => r.day_of_week === dayOfWeek);

        for (const rule of dayRules) {
            const [startH, startM] = rule.start_time.split(':').map(Number);
            const [endH, endM] = rule.end_time.split(':').map(Number);

            let slotTime = setMinutes(setHours(current, startH), startM);
            const slotEndTimeLimit = setMinutes(setHours(current, endH), endM);

            while (slotTime < slotEndTimeLimit) {
                if (slotTime > new Date()) {
                    const slotEnd = addMinutes(slotTime, durationMinutes);

                    // If slot extends beyond rule end time, skip
                    if (slotEnd > slotEndTimeLimit) break;

                    // Check blocks
                    const isBlocked = blocks.some(b => {
                        const bStart = new Date(b.start_at);
                        const bEnd = new Date(b.end_at);
                        return (slotTime < bEnd && slotEnd > bStart);
                    });

                    // Check appointments
                    const isBooked = appointments.some(a => {
                        const aStart = new Date(a.start_at);
                        const aEnd = new Date(a.end_at);
                        return (slotTime < aEnd && slotEnd > aStart);
                    });

                    if (!isBlocked && !isBooked) {
                        slots.push({ date: new Date(slotTime) });
                    }
                }
                // Step by duration or fixed interval? usually intervals like 30m or 60m are better than duration steps
                // For simplicity, let's step by 30 mins to allow flexibility
                slotTime = addMinutes(slotTime, 30);
            }
        }
        current = addDays(current, 1);
    }
    return slots;
}
