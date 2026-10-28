// Server-Sent Events hub: the webhook route calls broadcast(), every open dashboard receives it.
type Client = { send: (data: string) => void };

const g = globalThis as unknown as { liveClients?: Set<Client> };
const clients: Set<Client> = g.liveClients ?? new Set();
g.liveClients = clients;

export function addClient(c: Client): () => void {
  clients.add(c);
  return () => clients.delete(c);
}

export function broadcast(event: Record<string, unknown>): void {
  const data = `data: ${JSON.stringify({ ...event, at: new Date().toISOString() })}\n\n`;
  for (const c of clients) {
    try { c.send(data); } catch { clients.delete(c); }
  }
}

export const clientCount = () => clients.size;
