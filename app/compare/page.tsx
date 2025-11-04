"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Initiative {
  id: string;
  businessStream: string;
  number: string;
  initiativeName: string;
  initiativeGroup: string;
  importantStatus: string;
  urgentStatus: string;
  cdekStatus: string;
  inProcessStatus: string;
  meta?: any;
}

interface InitiativePair {
  a: Initiative;
  b: Initiative | null;
  progress: { completed: number; total: number };
}

/**
 * Page for comparing two initiatives. Fetches the next pair from the
 * backend and allows the user to choose which initiative is more important.
 * After each vote a new pair is loaded until there are no comparisons left.
 */
export default function ComparePage() {
  const [pair, setPair] = useState<InitiativePair | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchPair() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/next-pair');
      if (res.ok) {
        const data = await res.json();
        setPair(data);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Не удалось получить данные');
        setPair(null);
      }
    } catch (_err) {
      setError('Ошибка сети при загрузке данных');
      setPair(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPair();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleVote(choice: 'a' | 'b') {
    if (!pair) return;
    const leftId = pair.a.id;
    const rightId = pair.b?.id ?? null;
    const winnerId = choice === 'a' ? pair.a.id : pair.b?.id ?? pair.a.id;
    try {
      await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leftId, rightId, winnerId }),
      });
    } catch (_err) {
      // Ignore network errors; next fetch will handle
    }
    fetchPair();
  }

  const renderInitiative = (initiative: Initiative) => (
    <div className="flex flex-col items-start space-y-1 text-left">
      <p className="font-semibold">{initiative.businessStream}-{initiative.number}</p>
      <p className="font-bold text-lg">{initiative.initiativeName}</p>
      <p className="text-sm text-gray-600">Стрим: {initiative.businessStream}</p>
      <p className="text-sm text-gray-600">Группа: {initiative.initiativeGroup}</p>
      <p className="text-sm text-gray-600">Важно? - {initiative.importantStatus} Срочно? - {initiative.urgentStatus}</p>
      <p className="text-sm text-gray-600">Отбираем ли у СДЭК? - {initiative.cdekStatus}</p>
      <p className="text-sm text-gray-600">Делаем сейчас? - {initiative.inProcessStatus}</p>
    </div>
  );

  if (loading) {
    return (
      <main className="flex items-center justify-center h-screen">
        <p>Загрузка…</p>
      </main>
    );
  }
  if (error) {
    return (
      <main className="flex items-center justify-center h-screen">
        <p className="text-red-600">{error}</p>
      </main>
    );
  }
  if (!pair) {
    return (
      <main className="flex flex-col items-center justify-center h-screen space-y-4 px-4">
        <h1 className="text-xl font-semibold">Вы завершили все сравнения</h1>
        <p className="text-gray-600">Спасибо за участие!</p>
        <Link href="/" className="text-blue-600 underline">Вернуться на главную</Link>
      </main>
    );
  }
  return (
    <main className="flex flex-col items-center px-4 py-8 gap-6">
      <h1 className="text-2xl font-bold">Сравнение инициатив</h1>
      <p className="text-gray-600">{pair.progress.completed} из {pair.progress.total} завершено</p>
      <div className="w-full max-w-3xl grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => handleVote('a')}
          className="p-4 bg-white rounded shadow hover:shadow-lg transition text-left space-y-2 border border-gray-200"
        >
          {renderInitiative(pair.a)}
        </button>
        {pair.b ? (
          <button
            onClick={() => handleVote('b')}
            className="p-4 bg-white rounded shadow hover:shadow-lg transition text-left space-y-2 border border-gray-200"
          >
            {renderInitiative(pair.b)}
          </button>
        ) : (
          <div className="p-4 bg-gray-50 rounded border border-gray-200 flex items-center justify-center">
            <p className="text-gray-500">Нет второй инициативы</p>
          </div>
        )}
      </div>
    </main>
  );
}
