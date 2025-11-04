// app/onboarding/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    const res = await fetch('/api/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    setLoading(false);
    if (res.ok) {
      router.push('/compare');
    } else {
      // обработайте ошибки если нужно
      alert('Произошла ошибка. Попробуйте снова.');
    }
  }

  return (
    <div className="container mx-auto max-w-md px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Добро пожаловать!</h1>
      <p className="mb-4">Пожалуйста, введите ваше имя, чтобы начать сравнение инициатив.</p>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          className="border rounded w-full p-2 mb-4"
          placeholder="Ваше имя"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Загрузка...' : 'Начать'}
        </button>
      </form>
    </div>
  );
}
