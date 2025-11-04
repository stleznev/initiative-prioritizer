// app/api/vote/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import prisma from '../../../lib/prisma';

const voteSchema = z.object({
  leftId: z.string().min(1),
  rightId: z.string().min(1),
  winnerId: z.string().min(1),
});

export async function POST(req: Request) {
  const body = await req.json();
  const result = voteSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json({ error: result.error.message }, { status: 400 });
  }

  const { leftId, rightId, winnerId } = result.data;

  if (![leftId, rightId].includes(winnerId)) {
    return NextResponse.json({ error: 'winnerId must be either leftId or rightId' }, { status: 400 });
  }

  const cookieStore = cookies();
  const uid = cookieStore.get('uid')?.value;
  if (!uid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // находим активный датасет
  const dataset = await prisma.dataset.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
  if (!dataset) {
    return NextResponse.json({ error: 'No active dataset' }, { status: 404 });
  }

  const state = await prisma.userState.findUnique({
    where: {
      userId_datasetId: { userId: uid, datasetId: dataset.id },
    },
  });

  if (!state) {
    return NextResponse.json({ error: 'User state not found' }, { status: 404 });
  }

  // создаем запись о голосе
  const vote = await prisma.vote.create({
    data: {
      leftId,
      rightId,
      winnerId,
      userId: uid,
      datasetId: dataset.id,
      orderIndex: await prisma.vote.count({ where: { userId: uid, datasetId: dataset.id } }),
    },
  });

  // обновляем состояние
  const ordered = state.orderedIds as string[];
  let { cursorId, low, high, orderedIds } = userState;
  const safeLow = low ?? 0;
  const safeHigh = high ?? (orderedIds.length - 1);

  if (!cursorId) {
    // на всякий случай - это не должно происходить
    return NextResponse.json({ success: true });
  }

  // выбираем mid
  const mid = ordered.length > 0 ? Math.floor((safeLow + safeHigh) / 2) : 0;
  const midId = ordered[mid];

  let newOrdered = ordered;
  let newCursorId = cursorId;
  let newLow = safeLow;
  let newHigh = safeHigh;

  if (winnerId === cursorId) {
    // новая инициатива "лучше", ищем в левой половине
    newHigh = mid - 1;
  } else {
    // текущая инициатива "хуже", ищем в правой половине
    newLow = mid + 1;
  }

  if (newLow > newHigh) {
    // вставляем cursorId в orderedIds
    newOrdered = [
      ...ordered.slice(0, newLow),
      cursorId,
      ...ordered.slice(newLow),
    ];
    // выбираем новый cursorId
    const allIds = await prisma.initiative.findMany({
      where: { datasetId: dataset.id },
      select: { id: true },
      orderBy: { id: 'asc' },
    });
    const remaining = allIds
      .map((i) => i.id)
      .filter((id) => !newOrdered.includes(id));

    newCursorId = remaining.length > 0
      ? remaining[Math.floor(Math.random() * remaining.length)]
      : null;

    newLow = 0;
    newHigh = newOrdered.length - 1;
  }

  await prisma.userState.update({
    where: { userId_datasetId: { userId: uid, datasetId: dataset.id } },
    data: {
      orderedIds: newOrdered,
      cursorId: newCursorId,
      low: newLow,
      high: newHigh,
      currentIndex: null,
    },
  });

  return NextResponse.json({ success: true });
}
