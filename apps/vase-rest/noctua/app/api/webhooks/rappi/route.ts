import { NextResponse } from 'next/server';
import { RappiAdapter } from '@/services/adapters/rappi.adapter';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const adapter = new RappiAdapter();
    await adapter.receiveWebhookPayload(payload);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Rappi webhook error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
