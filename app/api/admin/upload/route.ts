import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import * as xlsx from 'xlsx';

const REQUIRED_COLUMNS = [
  'business_stream',
  'number',
  'initiative_name',
  'initiative_group',
  'important_status',
  'urgent_status',
  'cdek_status',
  'in_process_status',
  'initiative_id',
];

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 });
    }
    const arrayBuffer = await (file as Blob).arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows: Record<string, any>[] = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Файл пуст' }, { status: 400 });
    }
    if (rows.length > 1000) {
      return NextResponse.json({ error: 'Слишком много строк. Максимум 1000.' }, { status: 400 });
    }
    const firstRow = rows[0];
    for (const col of REQUIRED_COLUMNS) {
      if (!(col in firstRow)) {
        return NextResponse.json({ error: `Отсутствует колонка ${col}` }, { status: 400 });
      }
    }
    const seen = new Set<string>();
    for (const row of rows) {
      const id = String(row['initiative_id'] ?? '').trim();
      if (!id) {
        return NextResponse.json({ error: 'Пустое поле initiative_id' }, { status: 400 });
      }
      if (seen.has(id)) {
        return NextResponse.json({ error: `Дубликат initiative_id: ${id}` }, { status: 400 });
      }
      seen.add(id);
    }
    const now = new Date();
    const yyyy_mm_dd = now.toISOString().slice(0, 10);
    const startOfDay = new Date(`${yyyy_mm_dd}T00:00:00.000Z`);
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    const countForToday = await prisma.dataset.count({
      where: {
        createdAt: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
    });
    const version = `${yyyy_mm_dd}_v${countForToday + 1}`;
    await prisma.dataset.updateMany({ data: { isActive: false } });
    const dataset = await prisma.dataset.create({
      data: {
        version,
        isActive: true,
      },
    });
    const initiatives = rows.map((row) => ({
      id: String(row['initiative_id']).trim(),
      businessStream: String(row['business_stream'] ?? ''),
      number: String(row['number'] ?? ''),
      initiativeName: String(row['initiative_name'] ?? ''),
      initiativeGroup: String(row['initiative_group'] ?? ''),
      importantStatus: String(row['important_status'] ?? ''),
      urgentStatus: String(row['urgent_status'] ?? ''),
      cdekStatus: String(row['cdek_status'] ?? ''),
      inProcessStatus: String(row['in_process_status'] ?? ''),
      meta: row,
      datasetId: dataset.id,
    }));
    await prisma.initiative.createMany({ data: initiatives });
    return NextResponse.json({ success: true, version });
  } catch (err) {
    console.error('Upload error', err);
    return NextResponse.json({ error: 'Ошибка при обработке файла' }, { status: 500 });
  }
}
