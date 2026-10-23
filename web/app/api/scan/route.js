export async function POST(req) {
  const { text } = await req.json();
  if (!text || text.length > 2000) {
    return Response.json({ error: 'Invalid text' }, { status: 400 });
  }
  const res = await fetch(process.env.N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) return Response.json({ error: 'Scan failed' }, { status: 502 });
  return Response.json(await res.json());
}