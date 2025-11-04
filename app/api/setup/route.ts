// app/api/setup/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import prisma from '../../../lib/prisma';

const setupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
});

// POST /api/setup
export async function POST(req: Request) {
  const body = await req.json();

  const parseResult = setupSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json({ error: parseResult.error.message }, { status: 400 });
  }

  const { name } = parseResult.data;
  const uid = crypto.randomUUID();

  // создаём пользователя
  await prisma.user.create({
    data: { id: uid, name },
  });

  // получаем текущий датасет
  const dataset = await prisma.dataset.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });

  // создаём состояние пользователя
  await prisma.userState.upsert({
    where: { userId_datasetId: { userId: uid, datasetId: dataset!.id } },
    update: {},
    create: {
      userId: uid,
      datasetId: dataset!.id,
      orderedIds: [],
      cursorId: null,
      low: 0,
      high: 0,
      currentIndex: null,
      done: false,
      historyPointer: null,
    },
  });

  // устанавливаем cookie на 30 дней
  const cookieStore = cookies();
  cookieStore.set({
    name: 'uid',
    value: uid,
    httpOnly: true,
    sameSite: 'lax',
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 дней
    path: '/',
  });

  return NextResponse.json({ success: true });
}
