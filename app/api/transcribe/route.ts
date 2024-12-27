import axios from 'axios'
import { NextResponse } from 'next/server'
import path from 'path'
import { readFile } from 'fs/promises'

interface AssemblyAITranscriptResponse {
  id: string
  status: 'queued' | 'processing' | 'completed' | 'error'
}

export async function POST(req: Request) {
  const { filepath } = await req.json()

  const apiKey = process.env.ASSEMBLYAI_API_KEY
  console.log("🚀 ~ POST ~ apiKey:", apiKey)

  if (!apiKey) {
    return NextResponse.json({ error: 'AssemblyAI API key not found' }, { status: 500 })
  }

  if (!filepath) {
    return NextResponse.json({ error: 'filepath is required' }, { status: 400 })
  }

  try {
    // First, upload the local file to AssemblyAI
    const fileBuffer = await readFile(filepath)
    const file = new Blob([fileBuffer])
    const uploadResponse = await axios.post('https://api.assemblyai.com/v2/upload',
      file,
      {
        headers: {
          Authorization: apiKey,
          'Content-Type': 'application/octet-stream',
        },
      }
    )

    // Then create the transcript using the uploaded URL
    const assemblyAIResponse = await axios.post<AssemblyAITranscriptResponse>(
      'https://api.assemblyai.com/v2/transcript',
      {
        audio_url: uploadResponse.data.upload_url,
        speaker_labels: true,

      },
      {
        headers: {
          Authorization: apiKey,
          'Content-Type': 'application/json',
        },
      }
    )

    if (assemblyAIResponse.status === 200) {
      return NextResponse.json({ id: assemblyAIResponse.data.id })
    } else {
      return NextResponse.json(
        { error: `AssemblyAI API returned an error: ${assemblyAIResponse.statusText}` },
        { status: assemblyAIResponse.status }
      )
    }
  } catch (error: any) {
    console.error('Error during API call to AssemblyAI', error)
    return NextResponse.json({ error: 'Failed to transcribe audio with AssemblyAI' }, { status: 500 })
  }
}

