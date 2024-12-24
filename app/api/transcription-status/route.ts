import { WebSocket } from 'ws';
import { NextResponse } from 'next/server';

const connections = new Map<string, WebSocket>();

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

export function GET(req: Request) {
  // Upgrade the HTTP connection to WebSocket
  // @ts-ignore - Next.js types don't include socket
  const socket = req.socket;
  const head = Buffer.from([]);

  const wss = new WebSocket.Server({ noServer: true });

  wss.on('connection', async (ws) => {
    ws.on('message', async (message) => {
      const data = JSON.parse(message.toString());
      const { transcriptionId } = data;

      if (transcriptionId) {
        connections.set(transcriptionId, ws);

        // Start monitoring the transcription
        const checkStatus = async () => {
          const status = await checkTranscriptionStatus(
            transcriptionId,
            process.env.ASSEMBLYAI_API_KEY!
          );

          ws.send(JSON.stringify(status));

          if (status.status === 'completed' || status.status === 'error') {
            connections.delete(transcriptionId);
            ws.close();
          } else {
            // Check again in 2 seconds
            setTimeout(checkStatus, 2000);
          }
        };

        checkStatus();
      }
    });

    ws.on('close', () => {
      // Clean up connection when WebSocket closes
      for (const [id, socket] of connections.entries()) {
        if (socket === ws) {
          connections.delete(id);
          break;
        }
      }
    });
  });

  // @ts-ignore - Next.js types don't include upgrade
  req.socket.server.ws ??= wss;
  // @ts-ignore - Next.js types don't include upgrade
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req);
  });

  return new Response(null);
}

