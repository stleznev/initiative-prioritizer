import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ ok: true, version: process.env.NEXT_PUBLIC_APP_NAME || 'initiative-prioritizer', datasetVersion: null });
}
