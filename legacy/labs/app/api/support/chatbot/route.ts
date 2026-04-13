import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
    try {
        const { message, history } = await request.json();

        if (!message) {
            return NextResponse.json({ error: 'Mensaje vacío' }, { status: 400 });
        }

        // 1. Buscar en la Base de Conocimiento (KB)
        // Simplificado: Búsqueda por similitud de texto básico o tags
        const { data: kbEntries, error: kbError } = await supabaseAdmin
            .from('support_kb')
            .select('*')
            .textSearch('question', message.split(' ').join(' | '))
            .limit(1);

        if (kbError) console.error('KB Search Error:', kbError);

        let responseText = '';
        let shouldEscalate = false;

        if (kbEntries && kbEntries.length > 0) {
            responseText = kbEntries[0].answer;
        } else {
            // Lógica de fallback si no encuentra nada
            responseText = "Lo siento, no tengo una respuesta exacta para eso en mi base de conocimientos. ¿Te gustaría que te conecte con un agente humano?";
            shouldEscalate = true;
        }

        return NextResponse.json({
            response: responseText,
            shouldEscalate: shouldEscalate || message.toLowerCase().includes('humano') || message.toLowerCase().includes('agente')
        });

    } catch (error: any) {
        console.error('Chatbot error:', error);
        return NextResponse.json({ error: 'Error procesando la consulta' }, { status: 500 });
    }
}
