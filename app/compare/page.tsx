'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Initiative = {
  id: string;
  businessStream: string;
  number: string;
  initiativeName: string;
  initiativeGroup: string;
  importantStatus: string;
  urgentStatus: string;
  cdekStatus: string;
  inProcessStatus: string;
};

type PairResponse = {
  done: number;
  total: number;
  pair: { left: Initiative; right: Initiative } | null;
};

export default function ComparePage() {
  const router = useRouter();
  const [data, setData] = useState<PairResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function loadPair() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch('/api/next-pair', { cache: 'no-store' });
      if (r.status === 401) {
        router.replace('/onboarding');
        return;
      }
      const json = await r.json();
      setData(json);
    } catch {
      setErr('Ошибка получения пар');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPair();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function vote(winnerId: string) {
    if (!data?.pair) return;
    const { left, right } = data.pair;
    try {
      const r = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leftId: left.id,
          rightId: right.id,
          winnerId,
        }),
      });
      if (r.status === 401) {
        router.replace('/onboarding');
        return;
      }
      await loadPair();
    } catch {
      setErr('Ошибка голосования');
    }
  }

  async function goBack() {
    try {
      const r = await fetch('/api/history/back', { method: 'POST' });
      if (r.status === 401) {
        router.replace('/onboarding');
        return;
      }
      await loadPair();
    } catch {
      setErr('Не удалось откатить последний шаг');
    }
  }

  if (loading) return <div className="p-6">Загрузка…</div>;

  if (data?.pair == null) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Спасибо! Все сравнения завершены.</h1>
        <button className="px-4 py-2 rounded bg-gray-200" onClick={() => router.push('/')}>
          На главную
        </button>
      </div>
    );
  }

  const { left, right } = data.pair;

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-semibold">Выбери более важную инициативу</h1>
        <div className="text-sm text-gray-500">
          {data?.done ?? 0} / {data?.total ?? 0}
        </div>
      </header>

      {/* прогресс */}
      <div className="w-full h-2 bg-gray-200 rounded">
        <div
          className="h-2 bg-black rounded"
          style={{
            width: `${Math.min(100, Math.floor(((data?.done ?? 0) / Math.max(1, data?.total ?? 1)) * 100))}%`,
          }}
        />
      </div>

      {err && (
        <div className="p-3 rounded bg-red-50 text-red-700 border border-red-200">{err}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[left, right].map((it, idx) => (
          <button
            key={it.id}
            onClick={() => vote(it.id)}
            className="text-left rounded-2xl border hover:shadow p-4 space-y-2"
            aria-label={idx === 0 ? 'левая важнее' : 'правая важнее'}
          >
            <div className="text-xs text-gray-500">
              {it.businessStream}-{it.number}
              <div className="opacity-70 break-words">{it.id}</div>
            </div>
            <div className="font-medium leading-snug">{it.initiativeName}</div>
            <div className="text-sm text-gray-600">{it.businessStream}</div>
            <div className="text-sm text-gray-600">{it.initiativeGroup}</div>
            <div className="text-sm">
              Важно? — {it.importantStatus}
              <br />
              Срочно? — {it.urgentStatus}
            </div>
            <div className="text-sm">Отбираем ли у СДЭК? — {it.cdekStatus}</div>
            <div className="text-sm">Делаем сейчас? — {it.inProcessStatus}</div>
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button onClick={goBack} className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200">
          Назад
        </button>
        <button onClick={() => window.location.href = '/history'} className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200">
          История
        </button>
      </div>
    </div>
  );
}
