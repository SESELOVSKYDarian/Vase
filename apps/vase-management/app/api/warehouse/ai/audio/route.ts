import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { WarehouseChannelService } from '@/lib/warehouse/warehouse-channel.service'
import { transcribeWarehouseAudio } from '@/lib/warehouse/warehouse-audio.service'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.companyId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const formData = await req.formData()
    const audio = formData.get('audio')
    if (!(audio instanceof File)) return NextResponse.json({ error: 'Adjuntá un archivo de audio' }, { status: 400 })
    if (!audio.type.startsWith('audio/')) return NextResponse.json({ error: 'El archivo debe ser un audio' }, { status: 400 })
    if (audio.size > 15 * 1024 * 1024) return NextResponse.json({ error: 'El audio no puede superar 15 MB' }, { status: 400 })

    const transcript = await transcribeWarehouseAudio(audio)
    const response = await WarehouseChannelService.processCommand(session.user.companyId, transcript)
    return NextResponse.json({ transcript, ...response })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error procesando audio' }, { status: 500 })
  }
}
