import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '../../../lib/prisma';

/**
 * Records a user's comparison between two initiatives and updates their
 * ranking state using the interactive insertion algorithm. Expects a JSON
 * payload with `leftId`, `rightId` and `winnerId`. The `rightId` may be
 * `null` when inserting the very first initiative. Returns a 204 No Content
 * on success or a JSON error response on failure.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { leftId, rightId, winnerId } = body || {};
    if (!leftId || typeof winnerId !== 'string') {
      return NextResponse.json({ error: 'Неверный формат запроса' }, { status: 400 });
    }
    // Identify user via cookie
    const cookieStore = cookies();
    const uid = cookieStore.get('uid')?.value;
    if (!uid) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 401 });
    }
    // Look up user
    let user = await prisma.user.findUnique({ where: { cookieId: uid } });
    if (!user) {
      // Should rarely happen; create user on the fly
      user = await prisma.user.create({ data: { cookieId: uid, name: 'Anonymous' } });
    }
    // Active dataset
    const dataset = await prisma.dataset.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
    if (!dataset) {
      return NextResponse.json({ error: 'Нет активного датасета' }, { status: 400 });
    }
    // State
    let state = await prisma.userState.findUnique({ where: { userId_datasetId: { userId: user.id, datasetId: dataset.id } } });
    if (!state) {
      state = await prisma.userState.create({ data: { userId: user.id, datasetId: dataset.id, orderedIds: [] } });
    }
    const orderedIds = state.orderedIds;
    const cursorId = state.cursorId;
    // Determine order index for the vote (0-based)
    const voteCount = await prisma.vote.count({ where: { userId: user.id, datasetId: dataset.id } });
    // Create vote record
    await prisma.vote.create({
      data: {
        userId: user.id,
        datasetId: dataset.id,
        leftId,
        rightId: rightId ?? '',
        winnerId,
        orderIndex: voteCount,
      },
    });
    // If there is no cursor (unexpected) just return
    if (!cursorId) {
      return new NextResponse(null, { status: 204 });
    }
    // Handle insertion when there are no items placed yet or rightId is null
    if (orderedIds.length === 0 || !rightId) {
      const newOrder = [...orderedIds];
      newOrder.push(cursorId);
      await prisma.userState.update({
        where: { id: state.id },
        data: {
          orderedIds: newOrder,
          cursorId: null,
          low: null,
          high: null,
        },
      });
      return new NextResponse(null, { status: 204 });
    }
    // Continue binary search. low/high may be null if uninitialised; default them.
    let low = state.low ?? 0;
    let high = state.high ?? orderedIds.length - 1;
    const mid = Math.floor((low + high) / 2);
    let newLow = low;
    let newHigh = high;
    if (winnerId === cursorId) {
      // Cursor wins against opponent; search left half
      newHigh = mid - 1;
    } else {
      // Cursor loses; search right half
      newLow = mid + 1;
    }
    if (newLow > newHigh) {
      // We found the insertion position
      const pos = Math.max(0, newLow);
      const newOrder = [...orderedIds];
      // Insert cursorId at pos
      newOrder.splice(pos, 0, cursorId);
      await prisma.userState.update({
        where: { id: state.id },
        data: {
          orderedIds: newOrder,
          cursorId: null,
          low: null,
          high: null,
        },
      });
    } else {
      // Continue search: update low/high
      await prisma.userState.update({
        where: { id: state.id },
        data: {
          low: newLow,
          high: newHigh,
        },
      });
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error('Vote error', err);
    return NextResponse.json({ error: 'Ошибка при сохранении выбора' }, { status: 500 });
  }
}
