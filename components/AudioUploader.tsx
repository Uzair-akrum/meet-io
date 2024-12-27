'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface TranscriptionResult {
  text: string;
  words?: {
    text: string;
    start: number;
    end: number;
    confidence: number;
    speaker: string;
  }[];
}

interface Message {
  speaker: string;
  text: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function AudioUploader() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [transcriptionId, setTranscriptionId] = useState<string | null>(null)
  const [transcriptionStatus, setTranscriptionStatus] = useState<string | null>(null)
  const [transcriptionResult, setTranscriptionResult] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [summary, setSummary] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<Message[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [userInput, setUserInput] = useState('')
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  console.log("🚀 ~ AudioUploader ~ summary:", summary)
  const { toast } = useToast()

  const getSpeakerStyle = (speaker: string) => {
    switch (speaker) {
      case 'A':
        return 'bg-blue-500 text-white rounded-tl-none';
      case 'B':
        return 'bg-green-500 text-white rounded-tl-none';
      default:
        return 'bg-purple-500 text-white rounded-tl-none';
    }
  }

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const checkStatus = async () => {
      if (transcriptionId) {
        try {
          const response = await fetch(`/api/transcription-status?transcriptionId=${transcriptionId}`);
          if (response.ok) {
            const data = await response.json();
            setTranscriptionStatus(data.status);

            if (data.status === 'completed') {
              const result: TranscriptionResult = data;
              console.log("🚀 ~ checkStatus ~ result:", result)

              setTranscriptionResult(result.text);

              // Process speaker diarization
              if (result.words && result.words.length > 0) {
                const processedMessages: Message[] = [];
                let currentSpeaker: string | null = null;
                let currentMessage = '';

                result.words.forEach((word) => {
                  if (word.speaker !== currentSpeaker && word.speaker) {
                    if (currentMessage) {
                      processedMessages.push({
                        speaker: currentSpeaker!,
                        text: currentMessage.trim()
                      });
                    }
                    currentSpeaker = word.speaker;
                    currentMessage = word.text;
                  } else {
                    currentMessage += ' ' + word.text;
                  }
                });

                // Add the last message
                if (currentMessage && currentSpeaker) {
                  processedMessages.push({
                    speaker: currentSpeaker,
                    text: currentMessage.trim()
                  });
                }

                setMessages(processedMessages);
              }
              console.log('jlhjfhj')
              await generateSummary(result.text);
              clearInterval(intervalId);
            } else if (data.status === 'error') {
              toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Transcription failed',
              });
              clearInterval(intervalId);
            }
          } else {
            throw new Error('Failed to check transcription status');
          }
        } catch (error) {
          console.error('Error checking transcription status:', error);
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Error checking transcription status',
          });
          clearInterval(intervalId);
        }
      }
    };

    if (transcriptionId) {
      intervalId = setInterval(checkStatus, 2000);
    }

    return () => clearInterval(intervalId);
  }, [transcriptionId, toast]);

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
      // Upload with progress tracking
      const xhr = new XMLHttpRequest()

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100)
          setUploadProgress(progress)
        }
      }

      const uploadPromise = new Promise((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve(JSON.parse(xhr.responseText))
          } else {
            reject(new Error('Upload failed'))
          }
        }
        xhr.onerror = () => reject(new Error('Upload failed'))
      })

      xhr.open('POST', '/api/upload', true)
      xhr.send(formData)

      const { filepath } = await uploadPromise as { filepath: string }

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

  const generateSummary = async (transcriptionResult: string) => {
    if (!transcriptionResult) return;

    try {
      const response = await fetch('/api/summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: transcriptionResult }),
      });

      if (!response.ok) throw new Error('Failed to generate summary');

      const data = await response.json();
      setSummary(data.summary);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate summary",
      });
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied!",
        description: "Content copied to clipboard",
      });
    }).catch(() => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to copy content",
      });
    });
  };

  const handleSubmitChat = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    setChatLoading(true);

    // Add user message to history
    const newUserMessage: ChatMessage = {
      role: 'user',
      content: userInput
    };

    setChatHistory(prev => [...prev, newUserMessage]);
    setUserInput('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userInput,
          history: chatHistory,
          transcriptionContext: transcriptionResult
        }),
      });

      if (!response.ok) throw new Error('Failed to send chat message');

      const data = await response.json();

      // Add AI response to history
      const newAIMessage: ChatMessage = {
        role: 'assistant',
        content: data.response
      };

      setChatHistory(prev => [...prev, newAIMessage]);
    } catch (error) {
      console.error('Error in chat:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to send chat message',
      });
    } finally {
      setChatLoading(false);
    }
  };

  const cleanSummaryText = (text: string) => {
    // Remove code block markers and XML tags
    return text
      // Remove code block markers and language identifier
      .replace(/```xml\n|```\n|```/g, '')
      // Remove XML tags
      .replace(/<\/?Summary>|<\/?Section.*?>|<\/?Point>|<\/?ActionItems>|<\/?Item>/g, '')
      // Split into lines, trim whitespace, and filter empty lines
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  };

  return (
    <div className="space-y-4">
      <Input type="file" accept="audio/*" onChange={handleFileChange} />
      <Button onClick={uploadFile} disabled={!file || uploading}>
        {uploading ? 'Uploading...' : 'Upload and Transcribe'}
      </Button>
      {uploading && (
        <Progress value={uploadProgress} className="w-full" />
      )}
      {messages.length > 0 && (
        <div className="mt-8">
          <Tabs defaultValue="transcript" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="transcript">Transcript</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="chat">Chat</TabsTrigger>
            </TabsList>

            <TabsContent value="transcript">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                Conversation Transcript
              </h2>
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg max-h-[600px] overflow-y-auto">
                {messages.map((message, index) => (
                  <div key={index} className="flex justify-start">
                    <div className={`
                      max-w-[80%] 
                      rounded-2xl 
                      px-4 
                      py-3 
                      shadow-sm
                      transition-all
                      hover:shadow-md
                      rounded-tl-none
                      ${getSpeakerStyle(message.speaker)}
                    `}>
                      <div className="text-xs opacity-75 mb-1 flex items-center gap-1">
                        <div className={`
                          w-2 
                          h-2 
                          rounded-full 
                          ${message.speaker === 'A' ? 'bg-blue-300' : message.speaker === 'B' ? 'bg-green-300' : 'bg-purple-300'}
                        `} />
                        Speaker {message.speaker}
                      </div>
                      <div className="text-sm md:text-base">
                        {message.text}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="summary">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                AI Summary
              </h2>
              <div className="p-6 bg-gray-50 rounded-lg prose max-w-none">
                {summary ? (
                  <div className="space-y-6">
                    {/* Project Overview Section */}
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="text-lg font-semibold text-blue-600 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          Summary Points
                        </h3>
                      </div>
                      <div className="pl-4 border-l-2 border-blue-100">
                        {cleanSummaryText(summary).map((point, index) => (
                          <div key={index} className="flex items-start gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full bg-blue-400 mt-2"></div>
                            <p className="text-gray-700">{point}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <p className="ml-3 text-gray-500">Generating summary...</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="chat">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                Chat with AI
              </h2>
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg max-h-[600px] overflow-y-auto">
                {chatHistory.map((message, index) => (
                  <div key={index} className="flex justify-start">
                    <div className={`
                      max-w-[80%] 
                      rounded-2xl 
                      px-4 
                      py-3 
                      shadow-sm
                      transition-all
                      hover:shadow-md
                      rounded-tl-none
                      ${message.role === 'assistant'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-900'
                      }
                    `}>
                      <div className="text-xs opacity-75 mb-1 flex items-center gap-1">
                        <div className={`
                          w-2 
                          h-2 
                          rounded-full 
                          ${message.role === 'assistant' ? 'bg-blue-300' : 'bg-gray-400'}
                        `} />
                        {message.role === 'assistant' ? 'AI' : 'You'}
                      </div>
                      <div className="text-sm md:text-base">
                        {message.content}
                      </div>
                    </div>
                  </div>
                ))}

                {chatLoading && (
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                )}

                <form onSubmit={handleSubmitChat} className="mt-4 flex gap-2">
                  <Input
                    type="text"
                    placeholder="Ask a question about the conversation..."
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    disabled={chatLoading}
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    disabled={chatLoading || !userInput.trim()}
                  >
                    {chatLoading ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Sending...
                      </span>
                    ) : (
                      'Send'
                    )}
                  </Button>
                </form>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
}
