'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import AudioRecorder from './AudioRecorder'
import { saveTranscription } from '@/lib/db'

export default function TranscriptionInterface() {
  const [isRecording, setIsRecording] = useState(false)
  const [transcription, setTranscription] = useState('')
  const transcriptionRef = useRef<HTMLTextAreaElement>(null)
  const socketRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.close()
      }
    }
  }, [])

  useEffect(() => {
    if (transcriptionRef.current) {
      transcriptionRef.current.scrollTop = transcriptionRef.current.scrollHeight
    }
  }, [transcription])

  const startTranscription = async () => {
    const response = await fetch('/api/get-token')
    const { token } = await response.json()

    socketRef.current = new WebSocket(`wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&token=${token}`)

    socketRef.current.onmessage = (message) => {
      const res = JSON.parse(message.data)
      if (res.message_type === 'FinalTranscript') {
        setTranscription((prev) => prev + ' ' + res.text)
      }
    }

    socketRef.current.onerror = (event) => {
      console.error(event)
      setIsRecording(false)
    }

    socketRef.current.onclose = () => {
      setIsRecording(false)
    }

    setIsRecording(true)
  }

  const stopTranscription = () => {
    if (socketRef.current) {
      socketRef.current.close()
    }
    setIsRecording(false)
  }

  const handleSave = async () => {
    try {
      await saveTranscription(transcription)
      alert('Transcription saved successfully!')
    } catch (error) {
      console.error('Failed to save transcription:', error)
      alert('Failed to save transcription. Please try again.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex space-x-2">
        <Button onClick={isRecording ? stopTranscription : startTranscription}>
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </Button>
        <Button onClick={handleSave} disabled={!transcription}>Save Transcription</Button>
      </div>
      <Textarea
        ref={transcriptionRef}
        value={transcription}
        readOnly
        className="h-64 overflow-y-auto"
        placeholder="Transcription will appear here..."
      />
      <AudioRecorder isRecording={isRecording} socket={socketRef.current} />
    </div>
  )
}

