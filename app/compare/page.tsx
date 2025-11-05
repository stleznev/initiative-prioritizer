'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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
}

interface PairResponse {
  done: number;
  total: number;
  pair: {
    left: Initiative;
    right: Initiative;
  } | null;
}

export default function ComparePage() {
  const [data, setData] = useState<PairResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  async function fetchNextPair() {
    try {
      const res = await fetch('/api/next-pair', { cache: 'no-store' });
      if (res.status === 401) {
        // No uid cookie – redirect to onboarding
        router.push('/onboarding');
        return;
      }
      if (!res.ok) {
        alert('Ошибка получения пар');
        return;
      }
      const json: PairResponse = await res.json();
      setData(json);
      setLoading(false);
    } catch (err) {
      alert('Ошибка сети');
    }
  }

  useEffect(() => {
    fetchNextPair();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleVote(winnerId: string) {
    if (!data?.pair) return;
    const { left, right } = data.pair;
    await fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leftId: left.id,
        rightId: right.id,
        winnerId,
      }),
    });
    fetchNextPair();
  }

  async function handleBack() {
    const res = await fetch('/api/history/back', { method: 'POST' });
    if (res.ok) {
      fetchNextPair();
    }
  }

  function goToHistory() {
    router.push('/history');
  }

  if (loading) return <p className="p-4">Загрузка…</p>;
  if (!data) return null;
  if (data.pair === null) {
    return (
      <div className="container mx-auto p-4">
        <p>Спасибо за участие! Вы завершили {data.done} из {data.total} сравнений.</p>
      </div>
    );
  }
  const { left, right } = data.pair;
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Выбери более важную инициативу</h1>
      <div className="mb-4">
        <progress value={data.done} max={data.total} className="w-full h-2" />
        <p className="mt-2">{data.done} из {data.total} завершено</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InitiativeCard initiative={left} onClick={() => handleVote(left.id)} />
        <InitiativeCard initiative={right} onClick={() => handleVote(right.id)} />
      </div>
      <div className="flex justify-between mt-4">
        <button className="bg-gray-200 px-4 py-2 rounded" onClick={handleBack}>Назад</button>
        <button className="bg-gray-200 px-4 py-2 rounded" onClick={goToHistory}>История</button>
      </div>
    </div>
  );
}

function InitiativeCard({ initiative, onClick }: { initiative: Initiative; onClick: () => void }) {
  return (
    <div
      className="border rounded-lg p-4 cursor-pointer hover:shadow-md"
      onClick={onClick}
    >
      <h2 className="font-bold text-lg mb-2">{initiative.businessStream}-{initiative.number}</h2>
      <p className="italic mb-2">{initiative.initiativeName}</p>
      <p>Стрим: {initiative.businessStream}</p>
      <p>Группа: {initiative.initiativeGroup}</p>
      <p>Важно? — {initiative.importantStatus}</p>
      <p>Срочно? — {initiative.urgentStatus}</p>
      <p>Отбираем ли у СДЭК? — {initiative.cdekStatus}</p>
      <p>Делаем сейчас? — {initiative.inProcessStatus}</p>
    </div>
  );
}
