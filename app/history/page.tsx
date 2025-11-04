// app/history/page.tsx
'use client';

import { useEffect, useState } from 'react';

export default function HistoryPage() {
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    async function fetchHistory() {
      const res = await fetch('/api/history?page=1');
      if (res.ok) {
        const json = await res.json();
        setHistory(json.items);
      }
    }
    fetchHistory();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">История сравнений</h1>
      {history.length === 0 ? (
        <p>История пуста.</p>
      ) : (
        <ul className="space-y-2">
          {history.map((item) => (
            <li key={item.id} className="border p-2 rounded">
              <p>
                {item.leftId} vs {item.rightId} — победитель: {item.winnerId}
              </p>
              {/* здесь можно добавить кнопку «изменить» */}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
