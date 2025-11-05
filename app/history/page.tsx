'use client';

import { useEffect, useState } from 'react';

interface VoteItem {
  id: number;
  leftId: string;
  rightId: string;
  winnerId: string;
  orderIndex: number;
}

interface HistoryResponse {
  items: VoteItem[];
  page: number;
  total: number;
  pages: number;
}

/**
 * History page.  Displays the user's voting history in the active dataset.
 */
export default function HistoryPage() {
  const [items, setItems] = useState<VoteItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      const res = await fetch('/api/history?page=1');
      if (res.ok) {
        const json: HistoryResponse = await res.json();
        setItems(json.items);
      }
      setLoading(false);
    }
    fetchHistory();
  }, []);

  if (loading) return <p className="p-4">Загрузка…</p>;
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">История сравнений</h1>
      {items.length === 0 ? (
        <p>История пуста.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="border p-2 rounded">
              <p>
                {item.leftId} vs {item.rightId} — победитель: {item.winnerId}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
