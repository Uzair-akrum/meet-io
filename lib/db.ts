import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI
console.log("🚀 ~ MONGODB_URI:", MONGODB_URI)

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local')
}

let cached = global.mongoose

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null }
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    }

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      return mongoose
    })
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    throw e
  }

  return cached.conn
}

const transcriptionSchema = new mongoose.Schema({
  text: String,
  createdAt: { type: Date, default: Date.now },
})

const Transcription = mongoose.models.Transcription || mongoose.model('Transcription', transcriptionSchema)

export async function saveTranscription(text: string) {
  await dbConnect()
  const transcription = new Transcription({ text })
  await transcription.save()
}

export default dbConnect

