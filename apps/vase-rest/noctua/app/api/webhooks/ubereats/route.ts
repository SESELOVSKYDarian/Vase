import { NextResponse } from 'next/server';
import { UberEatsAdapter } from '@/services/adapters/ubereats.adapter';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const adapter = new UberEatsAdapter();
    await adapter.receiveWebhookPayload(payload);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('UberEats webhook error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
