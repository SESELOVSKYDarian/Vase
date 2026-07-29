import { NextResponse } from 'next/server';
import { GlovoAdapter } from '@/services/adapters/glovo.adapter';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const adapter = new GlovoAdapter();
    await adapter.receiveWebhookPayload(payload);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Glovo webhook error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
