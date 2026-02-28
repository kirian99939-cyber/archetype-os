'use client';
import { useState, useEffect } from 'react';

const MESSAGES = [
  'Думаю над креативом...',
  'Прошу банану работать быстрее 🍌',
  'Подбираю идеальную композицию...',
  'Колдую над цветовой палитрой 🎨',
  'Архетип шепчет мне на ухо...',
  'Уговариваю нейросеть постараться...',
  'Магия в процессе ✨',
  'Рисую что-то грандиозное...',
  'Ещё чуть-чуть, почти готово...',
  'Добавляю последние штрихи...',
  'Банан трудится изо всех сил 💪',
  'Нейросеть вдохновляется вашим брифом...',
  'Применяю секретные техники дизайна...',
  'Создаю шедевр, одну секунду...',
  'Ваш баннер будет огонь 🔥',
  'Прокачиваю пиксели до совершенства...',
  'AI думает... это хороший знак!',
  'Скоро всё будет красиво...',
  'Готовлю что-то особенное для вас...',
  'Миксую архетипы с креативом...',
];

interface LoadingMessagesProps {
  intervalMs?: number;
  className?: string;
}

export default function LoadingMessages({ intervalMs = 3000, className = '' }: LoadingMessagesProps) {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * MESSAGES.length));
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIndex(prev => (prev + 1) % MESSAGES.length);
        setFade(true);
      }, 300);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return (
    <p className={className} style={{
      opacity: fade ? 1 : 0,
      transition: 'opacity 0.3s ease',
      color: 'rgba(255,255,255,0.5)',
      fontSize: 14,
      textAlign: 'center',
      minHeight: 20,
    }}>
      {MESSAGES[index]}
    </p>
  );
}
