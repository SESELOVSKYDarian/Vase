import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import OpenAI from "openai";

// Initialize Groq client using OpenAI SDK compatibility
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || '',
  baseURL: 'https://api.groq.com/openai/v1',
});

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GROQ_API_KEY no configurada." },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const messages = (body?.messages ?? []) as ChatMessage[];

    // 1. Fetch Context from Support KB and Trainer
    const [kbResult, trainerResult] = await Promise.all([
      supabaseAdmin.from('support_kb').select('question, answer'),
      supabaseAdmin.from('trainers').select('display_name, bio').limit(1).maybeSingle()
    ]);

    const kbContext = kbResult.data?.map(kb => `P: ${kb.question}\nR: ${kb.answer}`).join('\n\n') || "";
    const trainerName = trainerResult.data?.display_name || "la Coach";

    const systemPrompt = `
Eres Atlas AI, el cerebro central del sistema de gestión de ${trainerName}. Tu objetivo es asistir al administrador en la operación diaria de su negocio deportivo/salud.

**Reglas de Oro:**
1. **Identidad**: Eres eficiente, técnico pero amigable, y siempre enfocado en la productividad.
2. **Contexto de Soporte**: Tienes acceso a la Base de Conocimientos de soporte. Si el administrador pregunta sobre "cómo hacer algo" o "como funciona X", usa esta información:
${kbContext}

3. **Acciones Disponibles**: 
   - Reservas: El sistema ya maneja reservas automáticas por WhatsApp.
   - Bloqueos: El admin puede bloquear horarios desde su calendario.
   - Métricas: El dashboard muestra ingresos y sesiones en tiempo real.

4. **Estilo**: Respuestas concisas, con formato Markdown (negritas para énfasis). Si no sabes algo basado en el contexto, sugiere consultar el canal de soporte técnico de VaseLabs.

5. **Interacciones previas**: Siempre ten en cuenta que estás hablando con el DUEÑO/ADMINISTRADOR del negocio.
`.trim();

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      ],
      temperature: 0.5,
      max_tokens: 1024,
    });

    const reply = response.choices?.[0]?.message?.content ?? "";

    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error("Chat API Error (Groq/Llama):", err);
    return NextResponse.json({ error: "Error interno en el servidor de IA (Llama)." }, { status: 500 });
  }
}
