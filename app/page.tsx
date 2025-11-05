import prisma from '../lib/prisma';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Root page.  Checks whether the visitor has a uid cookie and a corresponding
 * user record.  If no valid user is found, the user is redirected to
 * /onboarding to enter their name.  Otherwise, redirect to /compare to
 * start comparing initiatives.
 */
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
