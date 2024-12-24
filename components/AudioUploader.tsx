'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'

export default function AudioUploader() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [transcriptionId, setTranscriptionId] = useState<string | null>(null)
  const [transcriptionStatus, setTranscriptionStatus] = useState<string | null>(null)
  const [transcriptionResult, setTranscriptionResult] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    let socket: WebSocket | null = null;

    if (transcriptionId) {
      console.log("🚀 ~ useEffect ~ transcriptionId:", window.location.host)
      // Connect to our Next.js WebSocket endpoint
      socket = new WebSocket(`ws://${window.location.host}/api/transcription-ws`);

      socket.onopen = () => {
        socket?.send(JSON.stringify({ transcriptionId }));
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setTranscriptionStatus(data.status);

        if (data.status === 'completed') {
          setTranscriptionResult(data.text);
        } else if (data.status === 'error') {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Transcription failed",
          });
        }
      };

      socket.onerror = () => {
        toast({
          variant: "destructive",
          title: "Error",
          description: "WebSocket connection failed",
        });
      };
    }

    return () => {
      socket?.close();
    };
  }, [transcriptionId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0])
    }
  }

  const uploadFile = async () => {
    if (!file) return

    setUploading(true)
    setUploadProgress(0)

    const formData = new FormData()
    formData.append('file', file)

    try {
      // Upload to local storage
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file')
      }

      const { filepath } = await uploadResponse.json()

      // Start transcription with local filepath
      const transcriptionResponse = await fetch('/api/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filepath }),
      })

      if (!transcriptionResponse.ok) {
        throw new Error('Failed to start transcription')
      }

      const { id } = await transcriptionResponse.json()
      setTranscriptionId(id)
      setTranscriptionStatus('processing')
    } catch (error) {
      console.error('Error:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred during upload or transcription",
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Input type="file" accept="audio/*" onChange={handleFileChange} />
      <Button onClick={uploadFile} disabled={!file || uploading}>
        {uploading ? 'Uploading...' : 'Upload and Transcribe'}
      </Button>
      {uploading && (
        <Progress value={uploadProgress} className="w-full" />
      )}
      {transcriptionStatus && (
        <div>
          <p>Transcription Status: {transcriptionStatus}</p>
          {transcriptionResult && (
            <div className="mt-4">
              <h2 className="text-xl font-semibold mb-2">Transcription Result:</h2>
              <p className="whitespace-pre-wrap">{transcriptionResult}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

