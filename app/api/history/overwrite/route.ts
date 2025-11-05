import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import prisma from '../../../../lib/prisma';

const overwriteSchema = z.object({
  orderIndex: z.number(),
  newWinnerId: z.string().min(1),
});

// POST /api/history/overwrite – change the winner of a specific vote and rebuild the ranking
export async function POST(req: Request) {
  const uid = cookies().get('uid')?.value;
  if (!uid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dataset = await prisma.dataset.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  });
  if (!dataset) {
    return NextResponse.json({ error: 'No dataset' }, { status: 404 });
  }

  const body = await req.json();
  const parsed = overwriteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const { orderIndex, newWinnerId } = parsed.data;

  // Find the vote by composite key
  const vote = await prisma.vote.findUnique({
    where: {
      userId_datasetId_orderIndex: { userId: uid, datasetId: dataset.id, orderIndex },
    },
  });
  if (!vote) {
    return NextResponse.json({ error: 'Vote not found' }, { status: 404 });
  }
  // Ensure new winner is one of the compared initiatives
  if (![vote.leftId, vote.rightId].includes(newWinnerId)) {
    return NextResponse.json({ error: 'newWinnerId must be one of the compared initiatives' }, { status: 400 });
  }

  // Update the vote record
  await prisma.vote.update({ where: { id: vote.id }, data: { winnerId: newWinnerId } });

  // Replay all votes to rebuild ranking
  const votes = await prisma.vote.findMany({
    where: { userId: uid, datasetId: dataset.id },
    orderBy: { orderIndex: 'asc' },
  });
  let ordered: string[] = [];
  for (const v of votes) {
    const currentId = ordered.includes(v.leftId) ? v.rightId : v.leftId;
    let low = 0;
    let high = ordered.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (v.winnerId === currentId) {
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }
    ordered = [...ordered.slice(0, low), currentId, ...ordered.slice(low)];
  }

  // Determine next cursor
  const allIds = await prisma.initiative.findMany({
    where: { datasetId: dataset.id },
    select: { id: true },
    orderBy: { id: 'asc' },
  });
  const remainingIds = allIds.map((i) => i.id).filter((id) => !ordered.includes(id));
  const nextCursor = remainingIds.length > 0 ? remainingIds[0] : null;

  await prisma.userState.update({
    where: { userId_datasetId: { userId: uid, datasetId: dataset.id } },
    data: {
      orderedIds: ordered,
      cursorId: nextCursor,
      low: 0,
      high: ordered.length - 1,
      currentIndex: null,
    },
  });

  return NextResponse.json({ success: true });
}
