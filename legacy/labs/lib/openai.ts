import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import os from 'os';

const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || 'ollama'; // Ollama doesn't need a real key usually
const isGroq = !!process.env.GROQ_API_KEY;
const isOllama = !!process.env.OLLAMA_BASE_URL;

if (!process.env.GROQ_API_KEY && !process.env.OPENAI_API_KEY && !process.env.OLLAMA_BASE_URL) {
    console.warn('⚠️ WARNING: No API Key (GROQ/OPENAI) or OLLAMA_BASE_URL defined. Neural features will be disabled.');
} else {
    console.log(`✅ AI Service initialized: ${isGroq ? 'Groq' : isOllama ? 'Ollama (Local)' : 'OpenAI'}`);
}

const openai = new OpenAI({
    apiKey: apiKey,
    baseURL: process.env.OLLAMA_BASE_URL || (isGroq ? 'https://api.groq.com/openai/v1' : undefined),
});

export async function transcribeAudio(buffer: Buffer) {
    const tempFile = path.join(os.tmpdir(), `audio_${Date.now()}.ogg`);
    fs.writeFileSync(tempFile, buffer);

    try {
        // Note: Ollama doesn't standardly support the audio/transcriptions endpoint yet without extensions.
        // If isOllama is true, this might fail unless they have a compatible proxy.
        // We fallback to Groq for audio if OLLAMA is selected but GROQ key is present, otherwise we try default.
        const useGroqForAudio = isGroq || (isOllama && !!process.env.GROQ_API_KEY);

        if (isOllama && !useGroqForAudio) {
            console.warn("⚠️ Ollama selected but it may not support Audio Transcription out of the box. Ensure your endpoint supports OpenAI-compatible /v1/audio/transcriptions");
        }

        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(tempFile),
            model: useGroqForAudio ? "whisper-large-v3" : "whisper-1",
        });
        return transcription.text;
    } finally {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    }
}

export async function getAIResponse(prompt: string, knowledge: string, userMessage: string, temperature: number = 0.7, scrapedContent?: string) {
    // Priority: Env Override > Groq Default > OpenAI Default
    const model = process.env.AI_MODEL || (isGroq ? "llama-3.3-70b-versatile" : "gpt-4o");

    const response = await openai.chat.completions.create({
        model: model,
        messages: [
            { role: "system", content: `${prompt}\n\nConocimiento Adicional:\n${knowledge}\n${scrapedContent ? `\n--- CONTENIDO WEB ANALIZADO ---\n${scrapedContent}\n--------------------------------` : ''}` },
            { role: "user", content: userMessage }
        ],
        temperature,
    });

    return response.choices[0].message.content;
}
