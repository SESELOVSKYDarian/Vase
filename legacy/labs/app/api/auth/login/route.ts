import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { password } = await req.json();
        const adminPassword = process.env.DASHBOARD_PASSWORD;

        if (password === adminPassword) {
            return new NextResponse(JSON.stringify({ success: true }), { status: 200 });
        } else {
            return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }
    } catch (error) {
        return new NextResponse('Error', { status: 500 });
    }
}
