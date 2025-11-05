import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';

// GET /api/me – returns onboarding information and current dataset
export async function GET() {
  const cookieStore = cookies();
  const uid = cookieStore.get('uid')?.value;
  if (!uid) {
    return NextResponse.json({ needOnboarding: true });
  }

  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user) {
    return NextResponse.json({ needOnboarding: true });
  }

  const dataset = await prisma.dataset.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    needOnboarding: false,
    user: { id: user.id, name: user.name },
    datasetId: dataset?.id ?? null,
  });
}
