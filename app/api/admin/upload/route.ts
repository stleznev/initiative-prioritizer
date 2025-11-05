import { NextRequest, NextResponse } from 'next/server';
import prisma from '../../../../lib/prisma';
import * as xlsx from 'xlsx';

// Required columns for each row in the Excel file
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

/**
 * Upload handler for admin to import initiatives from an Excel file.
 *
 * Accepts a multipart/form-data POST request with a single file field
 * called "file".  Parses the file using sheetjs, validates required
 * columns and row counts, versioning datasets by date, and stores
 * initiatives in the database.  Marks any previous datasets as inactive
 * and creates initial user states for all existing users.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || !(file as any).arrayBuffer) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 400 });
    }

    // Read file into ArrayBuffer
    const arrayBuffer = await (file as any).arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const workbook = xlsx.read(uint8Array);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = xlsx.utils.sheet_to_json(sheet);

    // Validate row count
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Файл пуст' }, { status: 400 });
    }
    if (rows.length > 1000) {
      return NextResponse.json({ error: 'Слишком много строк (максимум 1000)' }, { status: 400 });
    }

    // Validate required columns and collect initiative IDs
    const ids = new Set<string>();
    for (const row of rows) {
      for (const col of REQUIRED_COLUMNS) {
        if (!(col in row)) {
          return NextResponse.json({ error: `Отсутствует колонка ${col}` }, { status: 400 });
        }
      }
      const initiativeId = String(row['initiative_id']).trim();
      if (!initiativeId) {
        return NextResponse.json({ error: 'Пустой initiative_id' }, { status: 400 });
      }
      if (ids.has(initiativeId)) {
        return NextResponse.json({ error: `Дубликат initiative_id: ${initiativeId}` }, { status: 400 });
      }
      ids.add(initiativeId);
    }

    // Determine dataset version: YYYY-MM-DD_vN
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const datePrefix = `${year}-${month}-${day}`;
    // Count existing datasets for today
    const todayDatasets = await prisma.dataset.findMany({
      where: { version: { startsWith: datePrefix } },
    });
    const versionSuffix = todayDatasets.length + 1;
    const version = `${datePrefix}_v${versionSuffix}`;

    // Mark all existing datasets inactive
    await prisma.dataset.updateMany({ data: { isActive: false } });

    // Create new dataset
    const dataset = await prisma.dataset.create({
      data: { version, isActive: true },
    });

    // Prepare initiatives for bulk insert with unique IDs per dataset
    const initiativesData = rows.map((row) => ({
      id: `${dataset.id}-${String(row['initiative_id']).trim()}`,
      businessStream: String(row['business_stream']).trim(),
      number: String(row['number']).trim(),
      initiativeName: String(row['initiative_name']).trim(),
      initiativeGroup: String(row['initiative_group']).trim(),
      importantStatus: String(row['important_status']).trim(),
      urgentStatus: String(row['urgent_status']).trim(),
      cdekStatus: String(row['cdek_status']).trim(),
      inProcessStatus: String(row['in_process_status']).trim(),
      datasetId: dataset.id,
      meta: row,
    }));

    await prisma.initiative.createMany({ data: initiativesData });

    // For every existing user, create a blank UserState for the new dataset
    const users = await prisma.user.findMany();
    await Promise.all(
      users.map((user) =>
        prisma.userState.upsert({
          where: { userId_datasetId: { userId: user.id, datasetId: dataset.id } },
          update: {},
          create: {
            userId: user.id,
            datasetId: dataset.id,
            orderedIds: [],
            cursorId: null,
            low: 0,
            high: 0,
            currentIndex: null,
            done: false,
            historyPointer: null,
          },
        })
      )
    );

    return NextResponse.json({ success: true, version });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Ошибка загрузки файла' }, { status: 500 });
  }
}
