'use client';
import { useState, useEffect, useRef } from 'react';

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
  const [loading, setLoading] = useState(false);
  const [currentTask, setCurrentTask] = useState<BannerTask | null>(null);
  const [checking, setChecking] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchLatestTask = async () => {
    try {
      const res = await fetch('/api/test-background');
      const data = await res.json();
      const tasks: BannerTask[] = data.tasks ?? [];
      if (tasks.length > 0) {
        setCurrentTask(tasks[0]);
        return tasks[0];
      }
    } catch {}
    return null;
  };

  const startPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const task = await fetchLatestTask();
      if (task?.status === 'done' || task?.status === 'failed') {
        if (pollRef.current) clearInterval(pollRef.current);
      }
    }, 5000);
  };

  useEffect(() => {
    const init = async () => {
      setChecking(true);
      const task = await fetchLatestTask();
      if (task?.status === 'pending') {
        startPolling();
      }
      setChecking(false);
    };
    init();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/test-background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (data.taskId) {
        await fetchLatestTask();
        startPolling();
      }
    } catch {}
    setLoading(false);
  };

  return (
    <div style={{ padding: 40, maxWidth: 600, margin: '0 auto', fontFamily: 'sans-serif', color: '#fff', background: '#0a0a0a', minHeight: '100vh' }}>
      <h1 style={{ color: '#C8FF00', marginBottom: 24 }}>NanoBanana Test</h1>

      <textarea
        value={prompt}
        onChange={e => setPrompt(e.target.value)}
        rows={4}
        style={{
          width: '100%', padding: 12, fontSize: 14,
          background: '#1a1a1a', color: '#fff', border: '1px solid #333',
          borderRadius: 8, resize: 'vertical', boxSizing: 'border-box',
        }}
      />

      <button
        onClick={generate}
        disabled={loading || currentTask?.status === 'pending'}
        style={{
          marginTop: 12, padding: '12px 32px', fontSize: 16,
          background: loading || currentTask?.status === 'pending' ? '#333' : '#C8FF00',
          color: loading || currentTask?.status === 'pending' ? '#666' : '#000',
          border: 'none', borderRadius: 8,
          cursor: loading || currentTask?.status === 'pending' ? 'not-allowed' : 'pointer',
          fontWeight: 700, width: '100%',
        }}
      >
        {loading ? 'Запускаем...' : currentTask?.status === 'pending' ? 'Генерация в фоне...' : 'Сгенерировать'}
      </button>

      {checking && (
        <div style={{ marginTop: 24, textAlign: 'center', color: '#666' }}>
          Проверяем задачи...
        </div>
      )}

      {currentTask && (
        <div style={{ marginTop: 32, padding: 20, background: '#1a1a1a', borderRadius: 12, border: '1px solid #333' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{
              fontWeight: 700, fontSize: 14,
              color: currentTask.status === 'done' ? '#C8FF00' : currentTask.status === 'failed' ? '#ff6666' : '#ffaa00'
            }}>
              {currentTask.status === 'done' ? '✅ Готово' : currentTask.status === 'failed' ? '❌ Ошибка' : '⏳ Генерируется в фоне...'}
            </span>
            <span style={{ color: '#555', fontSize: 12 }}>
              {new Date(currentTask.created_at).toLocaleString('ru-RU')}
            </span>
          </div>

          {currentTask.status === 'pending' && (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#555', fontSize: 13 }}>
              Крон проверяет каждые 2 минуты.<br />
              Можете закрыть страницу — картинка появится когда вернётесь.
            </div>
          )}

          {currentTask.status === 'done' && currentTask.image_url && (
            <img
              src={currentTask.image_url}
              alt="result"
              style={{ width: '100%', borderRadius: 8, marginTop: 8 }}
            />
          )}

          <button
            onClick={() => setCurrentTask(null)}
            style={{
              marginTop: 16, padding: '8px 20px', fontSize: 13,
              background: 'rgba(255,255,255,0.06)', color: '#999',
              border: '1px solid #333', borderRadius: 6, cursor: 'pointer', width: '100%',
            }}
          >
            Новая генерация
          </button>
        </div>
      )}
    </div>
  );
}
