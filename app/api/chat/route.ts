import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(req: Request) {
  try {
    const { message, history, transcriptionContext } = await req.json();

    if (!message) {
      return NextResponse.json(
        { error: 'No message provided' },
        { status: 400 }
      );
    }

    // Initialize the model
    const model = genAI.getGenerativeModel({
      model: "gemini-pro"
    });

    // Construct context from transcription and chat history
    const contextPrompt = `
      Context from transcript:
      ${transcriptionContext}

      Previous conversation:
      ${history.map((msg: ChatMessage) => `${msg.role}: ${msg.content}`).join('\n')}

      Current user message: ${message}

      Instructions:
      - You are a helpful AI assistant analyzing a conversation transcript
      - Use the context provided to give relevant, informed responses
      - If asked about something not in the transcript, acknowledge that
      - Keep responses clear and concise
      - Maintain a professional tone
    `;

    const result = await model.generateContent(contextPrompt);
    const response = result.response.text();

    return NextResponse.json({ response });
  } catch (error) {
    console.error('Error in chat:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}