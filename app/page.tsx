import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center gap-4 py-20 px-4 text-center">
      <h1 className="text-3xl font-bold">Initiative Prioritizer</h1>
      <p className="max-w-md text-gray-600">
        Приоритизируйте ваши бизнес‑инициативы через парные сравнения. Нажмите кнопку ниже,
        чтобы начать процесс.
      </p>
      <Link
        href="/compare"
        className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring"
      >
        Начать сравнение
      </Link>
    </main>
  );
}
