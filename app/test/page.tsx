'use client';
import { useState, useEffect } from 'react';

interface BannerTask {
  id: string;
  task_id: string;
  status: string;
  image_url: string | null;
  prompt: string;
  created_at: string;
}

export default function TestPage() {
  const [prompt, setPrompt] = useState('A cute cat sitting on a red chair, professional photography');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Фоновая генерация
  const [bgLoading, setBgLoading] = useState(false);
  const [bgMessage, setBgMessage] = useState('');
  const [bgTasks, setBgTasks] = useState<BannerTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  const fetchTasks = async () => {
    setLoadingTasks(true);
    try {
      const res = await fetch('/api/test-background');
      const data = await res.json();
      setBgTasks(data.tasks ?? []);
    } catch {
      // ignore
    }
    setLoadingTasks(false);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

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

  const generateBackground = async () => {
    setBgLoading(true);
    setBgMessage('');
    try {
      const res = await fetch('/api/test-background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (data.taskId) {
        setBgMessage(`Генерация запущена (taskId: ${data.taskId}). Можете закрыть страницу — результат появится через 1-2 минуты.`);
        setTimeout(fetchTasks, 3000);
      } else {
        setBgMessage(`Ошибка: ${data.error || 'unknown'}`);
      }
    } catch (e: any) {
      setBgMessage(`Ошибка: ${e.message}`);
    }
    setBgLoading(false);
  };

  const statusColor = (s: string) =>
    s === 'done' ? '#B5D334' : s === 'failed' ? '#ff6666' : '#ffaa00';

  return (
    <div style={{ padding: 40, maxWidth: 700, margin: '0 auto', fontFamily: 'sans-serif', color: '#fff' }}>
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

      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        <button
          onClick={generate}
          disabled={loading}
          style={{
            padding: '12px 24px', fontSize: 16,
            background: loading ? '#555' : '#B5D334', color: '#000',
            border: 'none', borderRadius: 8, cursor: loading ? 'wait' : 'pointer',
            fontWeight: 600,
          }}
        >
          {loading ? 'Генерация (до 60 сек)...' : 'Сгенерировать'}
        </button>

        <button
          onClick={generateBackground}
          disabled={bgLoading}
          style={{
            padding: '12px 24px', fontSize: 16,
            background: bgLoading ? '#555' : '#3477D3', color: '#fff',
            border: 'none', borderRadius: 8, cursor: bgLoading ? 'wait' : 'pointer',
            fontWeight: 600,
          }}
        >
          {bgLoading ? 'Отправка...' : '🔄 Фоновый тест'}
        </button>
      </div>

      {bgMessage && (
        <div style={{
          marginTop: 16, padding: 16, background: '#1a2a1a',
          border: '1px solid #2a4a2a', borderRadius: 8, fontSize: 14,
        }}>
          {bgMessage}
        </div>
      )}

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

      {/* Фоновые задачи */}
      <div style={{ marginTop: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>Фоновые задачи</h2>
          <button
            onClick={fetchTasks}
            disabled={loadingTasks}
            style={{
              padding: '6px 16px', fontSize: 13,
              background: 'rgba(255,255,255,0.1)', color: '#fff',
              border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            {loadingTasks ? '...' : 'Обновить'}
          </button>
        </div>

        {bgTasks.length === 0 ? (
          <p style={{ color: '#666' }}>Нет задач</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {bgTasks.map(task => (
              <div
                key={task.id}
                style={{
                  padding: 16, background: '#1a1a1a',
                  border: '1px solid #333', borderRadius: 8,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: statusColor(task.status), fontWeight: 600, fontSize: 13 }}>
                    {task.status === 'done' ? '✅ Готово' : task.status === 'failed' ? '❌ Ошибка' : '⏳ В процессе'}
                  </span>
                  <span style={{ color: '#666', fontSize: 12 }}>
                    {new Date(task.created_at).toLocaleString('ru-RU')}
                  </span>
                </div>
                <p style={{ color: '#999', fontSize: 12, margin: '0 0 8px' }}>
                  {task.prompt?.slice(0, 100)}{task.prompt?.length > 100 ? '...' : ''}
                </p>
                {task.status === 'done' && task.image_url && (
                  <img
                    src={task.image_url}
                    alt="banner"
                    style={{ width: '100%', maxWidth: 400, borderRadius: 8 }}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
