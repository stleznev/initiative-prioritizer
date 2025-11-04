// app/api/next-pair/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '../../../lib/prisma';

function expectedComparisons(count: number): number {
  let total = 0;
  for (let i = 1; i <= count; i++) {
    total += Math.ceil(Math.log2(i));
  }
  return total;
}

export async function GET() {
  const cookieStore = cookies();
  const uid = cookieStore.get('uid')?.value;

  if (!uid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // активный датасет
  const dataset = await prisma.dataset.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
  if (!dataset) {
    return NextResponse.json({ error: 'No active dataset' }, { status: 404 });
  }

  const userState = await prisma.userState.findUnique({
    where: {
      userId_datasetId: { userId: uid, datasetId: dataset.id },
    },
  });

  if (!userState) {
    return NextResponse.json({ error: 'User state not found' }, { status: 404 });
  }

  // список всех id инициатив в текущем датасете
  const allInitiatives = await prisma.initiative.findMany({
    where: { datasetId: dataset.id },
    select: { id: true },
    orderBy: { id: 'asc' },
  });
  const allIds = allInitiatives.map((i) => i.id);

  // количество голосов пользователя
  const votesCount = await prisma.vote.count({ where: { userId: uid, datasetId: dataset.id } });

  // если всё завершено
  const totalNeeded = expectedComparisons(allIds.length);
  if (votesCount >= totalNeeded) {
    return NextResponse.json({ done: totalNeeded, total: totalNeeded, pair: null });
  }

  // если у пользователя нет текущего cursorId, выбираем случайно
  let { cursorId, low, high, orderedIds } = userState;
  // если low или high равны null, подставим безопасные значения
  const safeLow = typeof low === 'number' ? low : 0;
  const safeHigh = typeof high === 'number' ? high : orderedIds.length - 1;
  if (!cursorId) {
    const remaining = allIds.filter((id) => !orderedIds.includes(id));
    if (remaining.length === 0) {
      return NextResponse.json({ done: votesCount, total: totalNeeded, pair: null });
    }
    cursorId = remaining[Math.floor(Math.random() * remaining.length)];
    low = 0;
    high = orderedIds.length - 1;
    await prisma.userState.update({
      where: { userId_datasetId: { userId: uid, datasetId: dataset.id } },
      data: { cursorId, low, high },
    });
  }

  // определяем mid
  let mid;
  let compareId;
  if (orderedIds.length === 0) {
    compareId = allIds.find((id) => id !== cursorId) ?? cursorId;
  } else {
    mid = Math.floor((safeLow + safeHigh) / 2);
    compareId = orderedIds[mid];
  }

  // загружаем данные инициатив
  const [left, right] = await Promise.all([
    prisma.initiative.findUnique({ where: { id: cursorId } }),
    prisma.initiative.findUnique({ where: { id: compareId } }),
  ]);

  return NextResponse.json({
    done: votesCount,
    total: totalNeeded,
    pair: { left, right },
  });
}
