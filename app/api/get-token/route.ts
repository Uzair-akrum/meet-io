import { NextResponse } from 'next/server'

export async function GET() {
  const token = process.env.ASSEMBLYAI_API_KEY

  if (!token) {
    return NextResponse.json({ error: 'AssemblyAI API key not found' }, { status: 500 })
  }

  return NextResponse.json({ token })
}

