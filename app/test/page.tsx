'use client';
import { useState } from 'react';

export default function TestPage() {
  const [prompt, setPrompt] = useState('A cute cat sitting on a red chair, professional photography');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/test-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setResult({ error: e.message });
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: 40, maxWidth: 600, margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1>NanoBanana Test</h1>
      <textarea
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        rows={4}
        style={{
          width: '100%', padding: 12, fontSize: 14,
          background: '#1a1a1a', color: '#fff', border: '1px solid #333',
          borderRadius: 8, resize: 'vertical',
        }}
      />
      <button
        onClick={generate}
        disabled={loading}
        style={{
          marginTop: 12, padding: '12px 24px', fontSize: 16,
          background: loading ? '#555' : '#B5D334', color: '#000',
          border: 'none', borderRadius: 8, cursor: loading ? 'wait' : 'pointer',
          fontWeight: 600,
        }}
      >
        {loading ? 'Генерация (до 60 сек)...' : 'Сгенерировать'}
      </button>

      {result && (
        <div style={{ marginTop: 20 }}>
          {result.imageUrl ? (
            <div>
              <p style={{ color: '#B5D334' }}>Готово за {result.polls * 5} сек</p>
              <img src={result.imageUrl} alt="result" style={{ width: '100%', borderRadius: 8 }} />
            </div>
          ) : (
            <pre style={{
              color: '#ff6666', background: '#1a1a1a',
              padding: 16, borderRadius: 8, overflow: 'auto',
              fontSize: 12,
            }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
