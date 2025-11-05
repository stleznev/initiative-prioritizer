import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '../../../lib/prisma';

/**
 * Calculate the expected number of comparisons for n initiatives using a
 * binary insertion algorithm.  The total number of comparisons is
 * the sum of ceil(log2(i)) for i from 1 to n.
 */
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

  // Find the active dataset
  const dataset = await prisma.dataset.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  });
  if (!dataset) {
    return NextResponse.json({ error: 'Нет активного датасета' }, { status: 404 });
  }

  // Get or create the user state for this dataset
  let userState = await prisma.userState.findUnique({
    where: { userId_datasetId: { userId: uid, datasetId: dataset.id } },
  });
  if (!userState) {
    userState = await prisma.userState.create({
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

  // List all initiative IDs for this dataset in a stable order
  const allInitiatives = await prisma.initiative.findMany({
    where: { datasetId: dataset.id },
    select: { id: true },
    orderBy: { id: 'asc' },
  });
  const allIds = allInitiatives.map((i) => i.id);

  // Count how many votes the user has already cast for this dataset
  const votesCount = await prisma.vote.count({
    where: { userId: uid, datasetId: dataset.id },
  });

  const totalNeeded = expectedComparisons(allIds.length);
  // If the user has completed all comparisons, return null pair
  if (votesCount >= totalNeeded) {
    return NextResponse.json({ done: totalNeeded, total: totalNeeded, pair: null });
  }

  let { cursorId, low, high, orderedIds } = userState;
  const safeLow = typeof low === 'number' ? low : 0;
  const safeHigh = typeof high === 'number' ? high : (orderedIds?.length || 0) - 1;
  const ordered: string[] = Array.isArray(orderedIds) ? orderedIds : [];

  // If there is no current cursor, pick a random initiative not yet ordered
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

  // Determine the ID to compare with: either the midpoint of the ordered list or any other ID
  let compareId: string;
  if (ordered.length === 0) {
    // When the ordered list is empty, compare with another random initiative
    compareId = allIds.find((id) => id !== cursorId) ?? cursorId;
  } else {
    const mid = Math.floor((safeLow + safeHigh) / 2);
    compareId = ordered[mid];
  }

  // Fetch the initiative details for both sides
  const [left, right] = await Promise.all([
    prisma.initiative.findUnique({ where: { id: cursorId! } }),
    prisma.initiative.findUnique({ where: { id: compareId } }),
  ]);

  return NextResponse.json({
    done: votesCount,
    total: totalNeeded,
    pair: { left, right },
  });
}
