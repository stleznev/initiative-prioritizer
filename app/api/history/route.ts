import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '../../../lib/prisma';

// GET /api/history?page=1 – returns a paginated list of votes
export async function GET(req: Request) {
  const uid = cookies().get('uid')?.value;
  if (!uid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const pageParam = url.searchParams.get('page');
  const page = Math.max(parseInt(pageParam ?? '1', 10) || 1, 1);
  const take = 20;
  const skip = (page - 1) * take;

  // Determine active dataset
  const dataset = await prisma.dataset.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  });
  if (!dataset) {
    return NextResponse.json({ error: 'No dataset' }, { status: 404 });
  }

  const [votes, total] = await Promise.all([
    prisma.vote.findMany({
      where: { userId: uid, datasetId: dataset.id },
      orderBy: { orderIndex: 'asc' },
      skip,
      take,
    }),
    prisma.vote.count({ where: { userId: uid, datasetId: dataset.id } }),
  ]);

  return NextResponse.json({
    items: votes,
    page,
    total,
    pages: Math.ceil(total / take),
  });
}
