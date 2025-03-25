import { NextRequest, NextResponse } from 'next/server';
import { ChatCompletionService } from '../../../lib/ai/chat';
import { RetrievedContext } from '../../../lib/ai/prompt-engineering';

// Initialize chat service
const chatService = new ChatCompletionService();

/**
 * Mock function to retrieve context for a query
 * In a real application, this would use the vector database
 */
async function mockRetrieveContext(query: string): Promise<RetrievedContext[]> {
  // This is a simplified version for demonstration
  return [
    {
      text: `This is a retrieved context for query: "${query}"`,
      documentTitle: 'Mock Document',
      documentId: 'mock-doc-1',
      chunkId: 'mock-chunk-1',
      score: 0.92,
      metadata: {
        type: 'text',
        source: 'mock',
        created: new Date().toISOString(),
      },
    },
    {
      text: `Another piece of context related to: "${query}"`,
      documentTitle: 'Mock Document 2',
      documentId: 'mock-doc-2',
      chunkId: 'mock-chunk-2',
      score: 0.85,
      metadata: {
        type: 'text',
        source: 'mock',
        created: new Date().toISOString(),
      },
    },
  ];
}

/**
 * POST handler for chat endpoint
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { message, options = {}, stream = false } = body;

    // Validate required fields
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: "Missing or invalid 'message' field" }, { status: 400 });
    }

    // Retrieve context (this would connect to your RAG system)
    const context = await mockRetrieveContext(message);

    // Handle streaming response
    if (stream) {
      // Set up a streaming response
      const encoder = new TextEncoder();
      const customReadable = new ReadableStream({
        async start(controller) {
          try {
            await chatService.streamWithContext(message, context, {
              ...options,
              streamResponse: true,
              streamOptions: {
                onChunk: (chunk) => {
                  controller.enqueue(encoder.encode(chunk));
                },
                onComplete: () => {
                  controller.close();
                },
                onError: (error) => {
                  console.error('Streaming error:', error);
                  controller.error(error);
                },
              },
            });
          } catch (error) {
            console.error('Stream processing error:', error);
            controller.error(error);
          }
        },
      });

      // Return the streaming response
      return new Response(customReadable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      });
    }

    // Handle non-streaming response
    const response = await chatService.completeWithContext(message, context, options);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      {
        error: `Failed to process chat request: ${error instanceof Error ? error.message : String(error)}`,
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler to check API status
 */
export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'Chat API' });
}
