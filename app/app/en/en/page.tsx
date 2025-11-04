import Link from 'next/link';

export default function HomeEn() {
  return (
    <main className="flex flex-col items-center justify-center gap-4 py-20 px-4 text-center">
      <h1 className="text-3xl font-bold">Initiative Prioritizer</h1>
      <p className="max-w-md text-gray-600">
        Prioritize your business initiatives through pairwise comparisons. Click the button below to start the process.
      </p>
      <Link
        href="/compare"
        className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring"
      >
        Start Comparison
      </Link>
    </main>
  );
}
