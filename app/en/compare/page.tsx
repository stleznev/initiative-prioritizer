'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function ComparePage() {
  const [pair, setPair] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/next-pair')
      .then((res) => res.json())
      .then((data) => {
        setPair(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading...</p>;

  if (!pair) {
    return (
      <div className="text-center mt-4">
        <h1 className="text-xl font-bold">No comparisons available</h1>
        <p className="mt-4">
          <Link href="/">Return to home</Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* TODO: implement comparison UI */}
    </div>
  );
}
