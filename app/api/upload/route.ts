import { NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import path from 'path'
import fs from 'fs'

export async function POST(req: Request) {
  const data = await req.formData()
  const file: File | null = data.get('file') as unknown as File

  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
  try {
    await fs.promises.mkdir(uploadsDir, { recursive: true })
  } catch (error) {
    console.error('Error creating uploads directory:', error)
  }

  // Save file with timestamp to prevent naming conflicts
  const timestamp = Date.now()
  const filename = `${timestamp}-${file.name}`
  const filepath = path.join(uploadsDir, filename)
  await writeFile(filepath, buffer)

  // Return the local file path that we'll use for transcription
  return NextResponse.json({
    url: `/uploads/${filename}`,
    filepath: filepath
  })
}

