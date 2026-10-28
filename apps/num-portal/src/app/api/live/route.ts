// GET /api/live – Server-Sent Events stream used by the dashboard for real-time updates.
import { addClient } from '@/lib/live';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  const encoder = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream({
    start(controller) {
      const send = (data: string) => controller.enqueue(encoder.encode(data));
      send(`data: ${JSON.stringify({ type: 'hello' })}\n\n`);
      const remove = addClient({ send });
      const ping = setInterval(() => { try { send(': ping\n\n'); } catch { /* closed */ } }, 25_000);
      cleanup = () => { clearInterval(ping); remove(); };
      req.signal.addEventListener('abort', () => { cleanup(); try { controller.close(); } catch { /* closed */ } });
    },
    cancel() { cleanup(); },
  });
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' },
  });
}
