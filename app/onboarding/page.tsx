'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Onboarding page.  Prompts the visitor for their name and registers
 * them via the /api/setup endpoint.  Upon success, navigates to /compare.
 */
export default function OnboardingPage() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      setLoading(false);
      if (res.ok) {
        router.push('/compare');
      } else {
        const data = await res.json();
        alert(data.error || 'Ошибка регистрации. Попробуйте ещё раз.');
      }
    } catch (err) {
      setLoading(false);
      alert('Ошибка сети. Попробуйте ещё раз.');
    }
  }

  return (
    <div className="container mx-auto max-w-md px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Добро пожаловать!</h1>
      <p className="mb-4">Пожалуйста, введите ваше имя, чтобы начать сравнение инициатив.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          className="border rounded w-full p-2"
          placeholder="Ваше имя"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Загрузка…' : 'Начать'}
        </button>
      </form>
    </div>
  );
}
