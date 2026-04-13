import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import OpenAI from 'openai';

// Initialize Groq client using OpenAI SDK compatibility
const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY || '',
    baseURL: 'https://api.groq.com/openai/v1',
});

export async function POST(req: NextRequest) {
    try {
        const { message } = await req.json();
        const userMessage = message || '';

        // 1. Fetch Knowledge Base Context
        const { data: kbEntries } = await supabaseAdmin
            .from('support_kb')
            .select('question, answer, category');

        const kbContext = kbEntries?.map(entry =>
            `Pregunta: ${entry.question}\nRespuesta: ${entry.answer}\nCategoría: ${entry.category}`
        ).join('\n\n') || 'No hay información previa en la base de conocimientos.';

        // 2. Build System Prompt for Vase AI
        const systemPrompt = `
Eres Vase AI, el asistente experto de VaseLabs dentro de esta plataforma. Tu objetivo es ayudar a los usuarios y administradores de negocios a navegar y usar este sistema de gestión deportiva y de salud.

**Reglas de Comportamiento:**
- **Foco en el Sistema**: Solo responde preguntas relacionadas con el funcionamiento de la plataforma (reservas, clientes, pagos, configuración de negocio, etc.). Si te preguntan algo fuera de este contexto, redirige amablemente al usuario hacia funciones de la plataforma.
- **Privacidad de Infrastructura**: NUNCA menciones la existencia del "Panel de Super Admin", "Master Admin", "Root Protocol" o configuraciones globales del sistema. Para el usuario final y el administrador normal, tú eres el asistente del sistema que ellos ven.
- **Personalidad**: Eres Vase. Eres eficiente, amigable y sumamente profesional.
- **Conocimiento Específico**: Usa la base de conocimientos adjunta para dar respuestas precisas. Si algo no está ahí, usa tu lógica de IA para deducir cómo funcionaría una plataforma de gestión moderna, pero siempre enfocada en este software.

**Contexto de la Plataforma (Base de Conocimientos):**
${kbContext}

**Instrucciones de Respuesta:**
1. **Valor Añadido**: No repitas trozos de texto. Explica los procesos paso a paso como si estuvieras guiando a alguien en vivo.
2. **Escalación Silenciosa**: Si piden ayuda humana, no digas "soy una IA y no puedo", di: "He registrado tu solicitud y mi equipo humano de VaseLabs te contactará a la brevedad para darte soporte personalizado".
3. **Restricción de Temas**: No hables de política, religión, otros softwares ajenos, o temas generales que no aporten al uso de VaseLabs.
4. Usa Markdown para resaltar pasos clave.
`.trim();

        // 3. Generate Completion with Groq (Llama 3.3)
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage },
            ],
            model: 'llama-3.3-70b-versatile', // Fast, capable, and currently supported
            temperature: 0.7,
            max_tokens: 1024,
        });

        const reply = chatCompletion.choices[0]?.message?.content || "Lo siento, mi núcleo Vase está experimentando una interferencia temporal. ¿Podrías repetir eso?";

        return NextResponse.json({ reply });

    } catch (error: any) {
        console.error('Groq AI Error:', error);

        // Fallback friendly message for API errors
        return NextResponse.json({
            reply: "¡Hola! Soy Vase. Parece que mi conexión con el servidor central está un poco lenta en este momento. 😅 ¿Podrías intentar escribirme de nuevo en unos segundos? Estaré encantado de ayudarte."
        }, { status: 500 });
    }
}
