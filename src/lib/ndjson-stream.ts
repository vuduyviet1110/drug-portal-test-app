export type ProgressCallback = (step: string, message: string) => void;

export const NDJSON_HEADERS = {
  'Content-Type': 'application/x-ndjson',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
} as const;

export function createNdjsonStream(
  handler: (
    sendProgress: ProgressCallback,
    sendPayload: (payload: Record<string, unknown>) => void,
  ) => Promise<void>,
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendProgress: ProgressCallback = (step, message) => {
        controller.enqueue(encoder.encode(`${JSON.stringify({ step, message })}\n`));
      };

      const sendPayload = (payload: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
      };

      try {
        await handler(sendProgress, sendPayload);
        controller.close();
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Lỗi không xác định';
        controller.enqueue(encoder.encode(`${JSON.stringify({ error: message })}\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: NDJSON_HEADERS });
}

type NdjsonEvent = {
  step?: string;
  message?: string;
  error?: string;
  result?: unknown;
};

export async function consumeNdjsonStream<T>(
  response: Response,
  onProgress?: ProgressCallback,
): Promise<T> {
  if (!response.body) {
    const fallback = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error((fallback as { error?: string }).error || `HTTP ${response.status}`);
    }
    return fallback as T;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result: T | undefined;
  let streamError: string | undefined;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line) as NdjsonEvent;

      if (event.error) {
        streamError = event.error;
        continue;
      }

      if (event.step && event.message) {
        onProgress?.(event.step, event.message);
      }

      if (event.result !== undefined) {
        result = event.result as T;
      }
    }
  }

  if (streamError) {
    throw new Error(streamError);
  }

  return result as T;
}
