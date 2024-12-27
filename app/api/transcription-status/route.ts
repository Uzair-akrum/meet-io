export const runtime = 'nodejs';

import { NextRequest } from 'next/server';

// Helper function to check transcription status
async function checkTranscriptionStatus(transcriptionId: string, apiKey: string) {
  try {
    const response = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptionId}`, {
      headers: {
        Authorization: apiKey,
      },
    });

    return await response.json();
  } catch (error) {
    console.error('Error checking transcription status:', error);
    return { status: 'error' };
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const transcriptionId = searchParams.get('transcriptionId');

  if (!transcriptionId) {
    return new Response('Transcription ID is required', { status: 400 });
  }

  try {
    const status = await checkTranscriptionStatus(
      transcriptionId,
      process.env.ASSEMBLYAI_API_KEY!
    );

    return new Response(JSON.stringify(status), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error checking transcription status:', error);
    return new Response('Error checking transcription status', { status: 500 });
  }
}

