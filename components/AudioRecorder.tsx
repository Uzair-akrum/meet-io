'use client'

import { useRef, useEffect } from 'react'

interface AudioRecorderProps {
  isRecording: boolean
  socket: WebSocket | null
}

export default function AudioRecorder({ isRecording, socket }: AudioRecorderProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)

  useEffect(() => {
    if (isRecording) {
      startRecording()
    } else {
      stopRecording()
    }
  }, [isRecording])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0 && socket) {
          socket.send(event.data)
        }
      }

      mediaRecorderRef.current.start(250)
    } catch (error) {
      console.error('Error accessing the microphone', error)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
    }
  }

  return null
}

