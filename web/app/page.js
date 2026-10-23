'use client';
import { useState } from 'react';

const EXAMPLES = [
  { label: 'Fake JazzCash alert', text: 'URGENT: Your JazzCash account is blocked. Verify your CNIC and OTP now: http://bit.ly/abc123' },
  { label: 'Prize scam', text: 'Congratulations! You won a BISP cashback prize. Claim within 24 hours: http://bit.ly/claim-now' },
  { label: 'Normal message', text: 'Hey, dinner at 8?' },
];

const VERDICTS = {
  scam: { label: 'Likely a scam', color: '#b91c1c' },
  suspicious: { label: 'Suspicious', color: '#b45309' },
  likely_safe: { label: 'Looks safe', color: '#15803d' },
};

export default function Home() {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function scan() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      setResult(await res.json());
    } catch {
      setResult({ error: 'Could not reach the scanner. Try again.' });
    }
    setLoading(false);
  }

  const reasons = Array.isArray(result?.reasons)
    ? result.reasons
    : String(result?.reasons || '').split('; ').filter(Boolean);
  const urls = Array.isArray(result?.urls) ? result.urls : [];
  const v = VERDICTS[result?.verdict];
  const disabled = loading || !text.trim();

  return (
    <div style={{ minHeight: '100vh', background: '#fafaf9', color: '#1c1917', fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif', padding: '64px 20px' }}>
      <main style={{ maxWidth: 560, margin: '0 auto' }}>
        <h1 style={{ fontSize: 28, fontWeight: 600, margin: 0, letterSpacing: '-0.02em' }}>Scam Radar</h1>
        <p style={{ color: '#78716c', margin: '8px 0 32px', lineHeight: 1.5 }}>
          Paste a suspicious message or link to check it for common scam patterns.
        </p>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          rows={6}
          placeholder="Paste a message here"
          style={{ width: '100%', boxSizing: 'border-box', background: '#fff', color: '#1c1917', border: '1px solid #d6d3d1', borderRadius: 6, padding: 12, fontSize: 15, lineHeight: 1.5, resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
        />

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 10, fontSize: 13, color: '#78716c' }}>
          <span>Examples:</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              onClick={() => { setText(ex.text); setResult(null); }}
              style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: '#1c1917', textDecoration: 'underline', cursor: 'pointer' }}
            >
              {ex.label}
            </button>
          ))}
        </div>

        <button
          onClick={scan}
          disabled={disabled}
          style={{ marginTop: 24, padding: '10px 20px', border: 'none', borderRadius: 6, fontSize: 15, fontWeight: 500, color: '#fff', background: '#1c1917', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1 }}
        >
          {loading ? 'Scanning...' : 'Scan'}
        </button>

        {v && (
          <section style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid #e7e5e4' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: v.color }}>{v.label}</h2>
              <span style={{ fontSize: 14, color: '#78716c' }}>{result.score} / 100</span>
            </div>
            {reasons.length > 0 ? (
              <ul style={{ margin: '16px 0 0', paddingLeft: 20, lineHeight: 1.8 }}>
                {reasons.map((r) => <li key={r}>{r}</li>)}
              </ul>
            ) : (
              <p style={{ margin: '16px 0 0', color: '#78716c' }}>No scam signals found.</p>
            )}
            {urls.length > 0 && (
              <p style={{ margin: '16px 0 0', fontSize: 13, color: '#78716c', wordBreak: 'break-all' }}>
                Links found: {urls.join(', ')}
              </p>
            )}
          </section>
        )}

        {result?.error && (
          <p style={{ marginTop: 32, color: '#b91c1c' }}>{result.error}</p>
        )}

        <p style={{ marginTop: 64, fontSize: 12, color: '#a8a29e' }}>
          Rule-based scoring. Messages are not stored.
        </p>
      </main>
    </div>
  );
}