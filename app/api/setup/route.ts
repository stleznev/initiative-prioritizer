import { NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import prisma from '../../../lib/prisma';

const setupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
});

// POST /api/setup – create a user and initialise their state
export async function POST(req: Request) {
  const body = await req.json();
  const parsed = setupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const { name } = parsed.data;
  const uid = crypto.randomUUID();

  // Create the user
  await prisma.user.create({ data: { id: uid, name } });

  // Ensure there is an active dataset
  const dataset = await prisma.dataset.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  });
  if (dataset) {
    // Initialise user state for the active dataset
    await prisma.userState.create({
      data: {
        userId: uid,
        datasetId: dataset.id,
        orderedIds: [],
        cursorId: null,
        low: 0,
        high: 0,
        currentIndex: null,
        done: false,
        historyPointer: null,
      },
    });
  }

  // Set the uid cookie for 30 days
  const cookieStore = cookies();
  cookieStore.set({
    name: 'uid',
    value: uid,
    httpOnly: true,
    sameSite: 'lax',
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    path: '/',
  });

  return NextResponse.json({ success: true });
}
