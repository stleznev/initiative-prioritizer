

'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface InitiativePair {
  a: any;
  b: any;
  progress: { completed: number; total: number };
}

export default function ComparePage() {
  const [pair, setPair] = useState<InitiativePair | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPair() {
      try {
        const res = await fetch('/api/next-pair');
        if (res.ok) {
          const data = await res.json();
          setPair(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchPair();
  }, []);

  if (loading) {
    return (
      <main className="flex items-center justify-center h-screen">
        <p>Загрузка…</p>
      </main>
    );
  }

  if (!pair) {
    return (
      <main className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-xl font-semibold mb-4">Нет доступных сравнений</h1>
        <Link href="/">Вернуться на главную</Link>
      </main>
    );
  }

  // Skeleton cards – in полном реализации данные по инициативам будут отображаться здесь
  return (
    <main className="flex flex-col items-center px-4 py-8 gap-4">
      <h1 className="text-2xl font-bold">Сравнение инициатив</h1>
      <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button className="p-4 bg-white rounded shadow" disabled>
          <p>Левая карточка</p>
        </button>
        <button className="p-4 bg-white rounded shadow" disabled>
          <p>Правая карточка</p>
        </button>
      </div>
      <p className="text-gray-600">Реализация страницы сравнения будет добавлена позднее.</p>
      <Link href="/">Вернуться на главную</Link>
    </main>
  );
}
