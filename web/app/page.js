'use client';
import { useState } from 'react';

export default function Home() {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function scan() {
    setLoading(true);
    setResult(null);
    const res = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    setResult(await res.json());
    setLoading(false);
  }

  return (
    <main style={{ maxWidth: 600, margin: '40px auto', padding: 16 }}>
      <h1>Scam Radar</h1>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste a suspicious message or link..."
        rows={6}
        style={{ width: '100%', padding: 8 }}
      />
      <button onClick={scan} disabled={loading || !text} style={{ marginTop: 8, padding: '8px 16px' }}>
        {loading ? 'Scanning...' : 'Scan'}
      </button>
      {result?.verdict && (
        <div style={{ marginTop: 16 }}>
          <h2>{result.verdict} ({result.score}/100)</h2>
          <ul>{result.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
        </div>
      )}
      {result?.error && <p>{result.error}</p>}
    </main>
  );
}