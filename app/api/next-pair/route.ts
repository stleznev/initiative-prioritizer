import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * Returns the next pair of initiatives for a user to compare. This implements
 * the interactive insertion algorithm with binary search to avoid asking
 * redundant comparisons. If no active dataset exists or the user has
 * completed all comparisons, `null` is returned.
 */
export async function GET() {
  // Get or create a cookie-based user identifier
  const cookieStore = cookies();
  let uid = cookieStore.get('uid')?.value;
  const responseInit: any = {};
  if (!uid) {
    // Generate a new UUID as cookie ID
    uid = crypto.randomUUID();
    // Set cookie on response later
    responseInit.cookies = [];
    responseInit.cookies.push({
      name: 'uid',
      value: uid,
      path: '/',
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  }
  // Find or create user
  let user = await prisma.user.findUnique({ where: { cookieId: uid } });
  if (!user) {
    user = await prisma.user.create({ data: { cookieId: uid, name: 'Anonymous' } });
  }
  // Get the currently active dataset
  const dataset = await prisma.dataset.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
  if (!dataset) {
    const res = NextResponse.json(null);
    // attach cookie if we just created one
    if (responseInit.cookies) {
      responseInit.cookies.forEach((c: any) => res.cookies.set(c.name, c.value, { path: c.path, httpOnly: c.httpOnly, maxAge: c.maxAge }));
    }
    return res;
  }
  // Retrieve or initialise user state for this dataset
  let state = await prisma.userState.findUnique({ where: { userId_datasetId: { userId: user.id, datasetId: dataset.id } } });
  if (!state) {
    state = await prisma.userState.create({ data: { userId: user.id, datasetId: dataset.id, orderedIds: [] } });
  }
  // Load all initiative ids for this dataset
  const initiatives = await prisma.initiative.findMany({ where: { datasetId: dataset.id }, select: { id: true } });
  const ids = initiatives.map((i) => i.id);
  // Determine which initiatives have not yet been placed in the user's order
  const orderedIds = state.orderedIds;
  let cursorId = state.cursorId;
  let low = state.low;
  let high = state.high;
  if (!cursorId) {
    // Choose the next unplaced initiative
    const unplaced = ids.filter((id) => !orderedIds.includes(id));
    if (unplaced.length === 0) {
      // All initiatives placed: mark done and return null
      if (!state.done) {
        await prisma.userState.update({ where: { id: state.id }, data: { done: true } });
      }
      const res = NextResponse.json(null);
      if (responseInit.cookies) {
        responseInit.cookies.forEach((c: any) => res.cookies.set(c.name, c.value, { path: c.path, httpOnly: c.httpOnly, maxAge: c.maxAge }));
      }
      return res;
    }
    cursorId = unplaced[0];
    low = 0;
    high = orderedIds.length - 1;
    await prisma.userState.update({ where: { id: state.id }, data: { cursorId, low, high } });
  }
  // When no initiatives have been placed, the first comparison is trivial: compare
  // against null to insert the first initiative
  if (orderedIds.length === 0) {
    const initiativeA = await prisma.initiative.findUnique({ where: { id: cursorId } });
    const res = NextResponse.json({
      a: initiativeA,
      b: null,
      progress: { completed: 0, total: ids.length },
    });
    if (responseInit.cookies) {
      responseInit.cookies.forEach((c: any) => res.cookies.set(c.name, c.value, { path: c.path, httpOnly: c.httpOnly, maxAge: c.maxAge }));
    }
    return res;
  }
  // Compute midpoint index for binary search
  const mid = Math.floor(((low as number) + (high as number)) / 2);
  const opponentId = orderedIds[mid];
  const [initiativeA, initiativeB] = await Promise.all([
    prisma.initiative.findUnique({ where: { id: cursorId } }),
    prisma.initiative.findUnique({ where: { id: opponentId } }),
  ]);
  const res = NextResponse.json({
    a: initiativeA,
    b: initiativeB,
    progress: { completed: orderedIds.length, total: ids.length },
  });
  if (responseInit.cookies) {
    responseInit.cookies.forEach((c: any) => res.cookies.set(c.name, c.value, { path: c.path, httpOnly: c.httpOnly, maxAge: c.maxAge }));
  }
  return res;
}
