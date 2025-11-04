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

  const uid = cookies().get('uid')?.value;
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dataset = await prisma.dataset.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
  if (!dataset) return NextResponse.json({ error: 'No active dataset' }, { status: 404 });

  const state = await prisma.userState.findUnique({
    where: { userId_datasetId: { userId: uid, datasetId: dataset.id } },
  });
  if (!state) return NextResponse.json({ error: 'User state not found' }, { status: 404 });

  // 1) Сохраняем голос (orderIndex = текущее количество голосов пользователя по датасету)
  const orderIndex = await prisma.vote.count({ where: { userId: uid, datasetId: dataset.id } });

  await prisma.vote.create({
    data: {
      leftId,
      rightId,
      winnerId,
      userId: uid,
      datasetId: dataset.id,
      orderIndex,
    },
  });

  // 2) Обновляем состояние бинарной вставки
  const ordered = Array.isArray(state.orderedIds) ? [...state.orderedIds] : [];
  const cursorId = state.cursorId; // тот самый "вставляемый" элемент
  if (!cursorId) {
    // Бывает, если фронтенд дернул /vote вне шага сравнения — просто ок.
    return NextResponse.json({ success: true });
  }

  const safeLow = typeof state.low === 'number' ? state.low : 0;
  const safeHigh = typeof state.high === 'number' ? state.high : ordered.length - 1;

  // mid рассчитываем только если уже есть что сравнивать
  const mid = ordered.length > 0 ? Math.floor((safeLow + safeHigh) / 2) : 0;

  let newLow = safeLow;
  let newHigh = safeHigh;

  if (winnerId === cursorId) {
    // новая инициатива "лучше" — сужаем поиск влево
    newHigh = mid - 1;
  } else {
    // новая инициатива "хуже" — сужаем поиск вправо
    newLow = mid + 1;
  }

  let newOrdered = ordered;
  let newCursorId: string | null = cursorId;

  // если бинарный поиск закончен — вставляем cursorId в позицию newLow
  if (newLow > newHigh || ordered.length === 0) {
    const insertPos = ordered.length === 0 ? 0 : newLow;
    newOrdered = [...ordered.slice(0, insertPos), cursorId, ...ordered.slice(insertPos)];

    // выбираем следующий cursorId из оставшихся
    const allIds = await prisma.initiative.findMany({
      where: { datasetId: dataset.id },
      select: { id: true },
      orderBy: { id: 'asc' },
    });
    const remaining = allIds.map(i => i.id).filter(id => !newOrdered.includes(id));
    newCursorId = remaining.length > 0 ? remaining[Math.floor(Math.random() * remaining.length)] : null;

    // новые границы для следующей вставки
    await prisma.userState.update({
      where: { userId_datasetId: { userId: uid, datasetId: dataset.id } },
      data: {
        orderedIds: newOrdered,
        cursorId: newCursorId,
        low: 0,
        high: newOrdered.length - 1,
        currentIndex: null,
      },
    });

    return NextResponse.json({ success: true });
  }

  // иначе — продолжаем бинарный поиск (cursorId тот же, только границы сужены)
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
