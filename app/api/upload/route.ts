import { NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import path from 'path'
import fs from 'fs'
import { Readable } from 'stream'

export const config = {
  api: {
    bodyParser: false,
  }
}

export async function POST(req: Request) {
  const contentType = req.headers.get('content-type') || ''

  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'Content type must be multipart/form-data' }, { status: 400 })
  }

  try {
    const formData = await req.formData()
    const file: File | null = formData.get('file') as unknown as File

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Create uploads directory
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    await fs.promises.mkdir(uploadsDir, { recursive: true })

    // Create file path
    const timestamp = Date.now()
    const filename = `${timestamp}-${file.name}`
    const filepath = path.join(uploadsDir, filename)

    // Create write stream
    const writeStream = fs.createWriteStream(filepath)

    // Convert File to Readable stream
    const fileStream = Readable.from(Buffer.from(await file.arrayBuffer()))

    // Pipe the file stream to write stream
    await new Promise((resolve, reject) => {
      fileStream.pipe(writeStream)
        .on('finish', resolve)
        .on('error', reject)
    })

    return NextResponse.json({
      url: `/uploads/${filename}`,
      filepath: filepath
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}

