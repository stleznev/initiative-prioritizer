import prisma from '../lib/prisma';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function Home() {
  const uid = cookies().get('uid')?.value;
  if (!uid) {
    redirect('/onboarding');
    return null;
  }
  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user) {
    redirect('/onboarding');
    return null;
  }
  redirect('/compare');
  return null;
}
