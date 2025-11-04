// app/api/history/back/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '../../../../lib/prisma';

export async function POST() {
  const uid = cookies().get('uid')?.value;
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dataset = await prisma.dataset.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
  if (!dataset) return NextResponse.json({ error: 'No dataset' }, { status: 404 });

  // находим последний голос
  const lastVote = await prisma.vote.findFirst({
    where: { userId: uid, datasetId: dataset.id },
    orderBy: { orderIndex: 'desc' },
  });

  if (!lastVote) {
    return NextResponse.json({ error: 'No vote to undo' }, { status: 400 });
  }

  // удаляем его
  await prisma.vote.delete({ where: { id: lastVote.id } });

  // пересоздаём UserState: очищаем orderedIds, сбрасываем low/high и cursorId
  // для простоты можно очищать и заново проигрывать все оставшиеся голоса (не реализовано в этом примере)
  // Пока просто сбросим состояние
  await prisma.userState.update({
    where: {
      userId_datasetId: { userId: uid, datasetId: dataset.id },
    },
    data: {
      orderedIds: [],
      cursorId: null,
      low: 0,
      high: 0,
      currentIndex: null,
    },
  });

  // Пропустим перестроение orderedIds: фронтенд запросит next-pair и заново начнёт сортировку

  return NextResponse.json({ success: true });
}
