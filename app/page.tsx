// app/page.tsx
import { redirect } from 'next/navigation';

export default async function Home() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ''}/api/me`, {
    cache: 'no-store',
  });
  const data = await res.json();

  // Если требуется онбординг, переходим на /onboarding
  if (data.needOnboarding) {
    redirect('/onboarding');
  }

  // иначе, отправляем на /compare
  redirect('/compare');
}
