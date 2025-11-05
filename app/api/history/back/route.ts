import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '../../../../lib/prisma';

// POST /api/history/back – remove the last vote and rebuild user state
export async function POST() {
  const uid = cookies().get('uid')?.value;
  if (!uid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Find the active dataset
  const dataset = await prisma.dataset.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  });
  if (!dataset) {
    return NextResponse.json({ error: 'No dataset' }, { status: 404 });
  }

  // Find the most recent vote for this user and dataset
  const lastVote = await prisma.vote.findFirst({
    where: { userId: uid, datasetId: dataset.id },
    orderBy: { orderIndex: 'desc' },
  });
  if (!lastVote) {
    return NextResponse.json({ error: 'No vote to undo' }, { status: 400 });
  }

  // Delete the last vote
  await prisma.vote.delete({ where: { id: lastVote.id } });

  // Get remaining votes ordered by orderIndex
  const votes = await prisma.vote.findMany({
    where: { userId: uid, datasetId: dataset.id },
    orderBy: { orderIndex: 'asc' },
  });

  // Rebuild the ordered list using binary insertion based on remaining votes
  let ordered: string[] = [];
  for (const v of votes) {
    const currentId = ordered.includes(v.leftId) ? v.rightId : v.leftId;
    let low = 0;
    let high = ordered.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const midId = ordered[mid];
      if (v.winnerId === currentId) {
        // current wins – search left
        high = mid - 1;
      } else {
        // current loses – search right
        low = mid + 1;
      }
    }
    ordered = [...ordered.slice(0, low), currentId, ...ordered.slice(low)];
  }

  // Determine the next cursorId – any initiative not in ordered
  const allIds = await prisma.initiative.findMany({
    where: { datasetId: dataset.id },
    select: { id: true },
    orderBy: { id: 'asc' },
  });
  const remainingIds = allIds.map((i) => i.id).filter((id) => !ordered.includes(id));
  const nextCursor = remainingIds.length > 0 ? remainingIds[0] : null;

  // Update user state
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
