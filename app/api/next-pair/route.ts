// app/api/next-pair/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '../../../lib/prisma';

/** sum_{i=1..n} ceil(log2(i)) */
function expectedComparisons(count: number): number {
  let total = 0;
  for (let i = 1; i <= count; i++) total += Math.ceil(Math.log2(i));
  return total;
}

export async function GET() {
  const jar = cookies();
  const uid = jar.get('uid')?.value;

  if (!uid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 🍪 cookie могла протухнуть: проверяем, что такой пользователь есть
  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user) {
    // сбрасываем старую cookie, чтобы фронт корректно увёл на онбординг
    jar.set({ name: 'uid', value: '', expires: new Date(0), path: '/' });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // активный датасет
  const dataset = await prisma.dataset.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  });
  if (!dataset) {
    return NextResponse.json({ error: 'Нет активного датасета' }, { status: 404 });
  }

  // состояние пользователя (создадим, если нет)
  let state = await prisma.userState.findUnique({
    where: { userId_datasetId: { userId: uid, datasetId: dataset.id } },
  });
  if (!state) {
    state = await prisma.userState.create({
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

  // все инициативы этого датасета
  const allIds = (
    await prisma.initiative.findMany({
      where: { datasetId: dataset.id },
      select: { id: true },
      orderBy: { id: 'asc' },
    })
  ).map((i) => i.id);

  const votesCount = await prisma.vote.count({
    where: { userId: uid, datasetId: dataset.id },
  });

  const totalNeeded = expectedComparisons(allIds.length);
  if (votesCount >= totalNeeded) {
    return NextResponse.json({ done: totalNeeded, total: totalNeeded, pair: null });
  }

  let { cursorId, low, high, orderedIds } = state;
  const ordered: string[] = Array.isArray(orderedIds) ? orderedIds : [];

  const safeLow = typeof low === 'number' ? low : 0;
  const safeHigh = typeof high === 'number' ? high : ordered.length - 1;

  // если курсора нет — выбираем случайный из ещё не вставленных
  if (!cursorId) {
    const remaining = allIds.filter((id) => !ordered.includes(id));
    if (remaining.length === 0) {
      return NextResponse.json({ done: votesCount, total: totalNeeded, pair: null });
    }
    cursorId = remaining[Math.floor(Math.random() * remaining.length)];
    await prisma.userState.update({
      where: { userId_datasetId: { userId: uid, datasetId: dataset.id } },
      data: { cursorId, low: 0, high: ordered.length - 1 },
    });
  }

  // с кем сравнивать
  let compareId: string;
  if (ordered.length === 0) {
    compareId = allIds.find((id) => id !== cursorId) ?? cursorId!;
  } else {
    const mid = Math.floor((safeLow + safeHigh) / 2);
    compareId = ordered[mid];
  }

  // достаём карточки
  const [left, right] = await Promise.all([
    prisma.initiative.findUnique({ where: { id: cursorId! } }),
    prisma.initiative.findUnique({ where: { id: compareId } }),
  ]);

  if (!left || !right) {
    // защита от редких рассинхронов
    return NextResponse.json({ error: 'Данные пары недоступны' }, { status: 409 });
  }

  return NextResponse.json({
    done: votesCount,
    total: totalNeeded,
    pair: { left, right },
  });
}
